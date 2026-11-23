"use strict";

// Enrutador ligero de ABC. Se carga siempre (antes que app.js) y solo descarga el resto de ABC
// cuando la ruta lo necesita. No lee ni escribe las claves de Mi Música.
const abc = (() => {
  const routes = ["abc", "tienda", "legal", "panel"];
  const adminKey = "abc-admin-dispositivo";
  const storeKey = "abc-ultima-tienda";
  const base = new URL("./", document.currentScript?.src ?? location.href);
  const loaded = new Map();
  const musicTitle = document.title;
  let root;

  function storageGet(store, key) {
    try { return store.getItem(key); } catch { return null; }
  }
  function storageSet(store, key, value) {
    try { value === null ? store.removeItem(key) : store.setItem(key, value); } catch { /* almacenamiento bloqueado */ }
  }

  function route() {
    let hash = location.hash.slice(1);
    try { hash = decodeURIComponent(hash); } catch { /* se usa tal cual */ }
    const [name = "", ...rest] = hash.split("/").filter(Boolean);
    return { name, rest };
  }

  function config() {
    return globalThis.abcConfig ?? {};
  }

  // Estado de acceso. La separación es visual: la protección real de datos se hará con reglas de Firestore.
  function access() {
    const adminUid = config().adminUid;
    const firebase = Boolean(globalThis.miMusicaFirebaseConfig);
    if (!adminUid || !firebase) return { admin: true, setup: true };
    const user = typeof cloudMusic === "object" ? cloudMusic.view().user : undefined;
    if (user) return { admin: user.uid === adminUid, setup: false, user };
    return { admin: storageGet(localStorage, adminKey) === adminUid, setup: false, user };
  }

  function rememberAdmin() {
    if (typeof cloudMusic !== "object") return;
    const user = cloudMusic.view().user;
    const adminUid = config().adminUid;
    if (!adminUid) return;
    if (user && user.uid === adminUid) storageSet(localStorage, adminKey, adminUid);
    // user === null solo ocurre cuando Firebase confirmó que no hay sesión iniciada.
    else if (user !== undefined) storageSet(localStorage, adminKey, null);
  }

  function load(file) {
    if (!loaded.has(file)) loaded.set(file, new Promise((resolve, reject) => {
      const url = new URL(file, base).href;
      const element = file.endsWith(".css") ? document.createElement("link") : document.createElement("script");
      element.onload = () => resolve();
      element.onerror = () => { loaded.delete(file); element.remove(); reject(new Error("No se pudo cargar " + file)); };
      if (element.tagName === "LINK") { element.rel = "stylesheet"; element.href = url; }
      else element.src = url;
      document.head.append(element);
    }));
    return loaded.get(file);
  }

  function leave() {
    document.body.classList.remove("abc-activo", "abc-cliente");
    if (root) root.hidden = true;
    if (document.title !== musicTitle) document.title = musicTitle;
  }

  async function show() {
    const current = route();
    if (!routes.includes(current.name)) return leave();
    if (current.name === "tienda" && current.rest[0]) storageSet(sessionStorage, storeKey, current.rest[0]);
    const state = access();
    const client = current.name === "tienda" || (current.name === "legal" && !state.admin);
    root ??= document.querySelector("#abc-root");
    document.body.classList.add("abc-activo");
    document.body.classList.toggle("abc-cliente", client);
    root.hidden = false;
    if (!root.firstChild) root.innerHTML = '<p class="abc-cargando">Cargando…</p>';
    try {
      const files = ["abc.css", "abc-shell.js"];
      if (current.name === "panel" && state.admin) files.push("panel.js");
      if (current.name === "legal" || current.name === "tienda") files.push("legal.js");
      await Promise.all(files.map(load));
      if (route().name !== current.name || route().rest.join("/") !== current.rest.join("/")) return;
      abcShell.render(root, { route: current, access: state, client, config: config(), lastStore: storageGet(sessionStorage, storeKey) });
    } catch (error) {
      root.innerHTML = '<p class="abc-cargando">No se pudo abrir esta sección. Revisa la conexión e inténtalo de nuevo.</p>';
      console.warn("ABC:", error);
    }
  }

  // Al abrir la app sin ruta, la primera pantalla es ABC. Se respeta el retorno de Spotify (?code=…).
  const params = new URLSearchParams(location.search);
  if (!location.hash && !params.has("code") && !params.has("error")) {
    history.replaceState(history.state, "", location.pathname + location.search + "#abc");
  }

  window.addEventListener("hashchange", show);
  let lastAccess = "";
  document.addEventListener("music-cloud-status", () => {
    rememberAdmin();
    const signature = JSON.stringify({ ...access(), user: access().user?.uid ?? null });
    if (signature === lastAccess) return;
    lastAccess = signature;
    if (routes.includes(route().name)) show();
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", show, { once: true });
  else show();

  return { show, route, access, load, base };
})();
