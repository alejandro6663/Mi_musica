"use strict";

const spotifyMusic = (() => {
  const clientId = String(globalThis.miMusicaSpotifyClientId ?? "").trim();
  const apiOrigin = "https://api.spotify.com";
  const accounts = "https://accounts.spotify.com";
  const directory = new URL("./", location.href);
  const redirect = directory.href;
  const key = "mi-musica-spotify:" + directory.pathname + ":" + clientId;
  const day = 24 * 60 * 60 * 1000;
  const idPattern = /^[A-Za-z0-9]{22}$/;
  let refreshInFlight, db, epoch = 0;
  let savedSession = readSession("session");
  const ready = /^[a-f0-9]{32}$/i.test(clientId) && Boolean(globalThis.crypto?.subtle)
    && (directory.protocol === "https:" || (directory.protocol === "http:" && ["127.0.0.1", "[::1]"].includes(directory.hostname)));

  function readSession(part) {
    try { return JSON.parse(sessionStorage.getItem(key + ":" + part)); }
    catch { return null; }
  }

  function writeSession(part, value) {
    if (value === null) sessionStorage.removeItem(key + ":" + part);
    else sessionStorage.setItem(key + ":" + part, JSON.stringify(value));
  }

  function setSession(value) {
    savedSession = value;
    writeSession("session", value);
  }

  function base64url(bytes) {
    return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  }

  function randomString(length) {
    return base64url(crypto.getRandomValues(new Uint8Array(length)));
  }

  function playlistId(input) {
    const value = String(input ?? "").trim();
    const urn = /^spotify:playlist:([A-Za-z0-9]{22})$/.exec(value);
    if (urn) return urn[1];
    try {
      const url = new URL(value);
      if (url.origin !== "https://open.spotify.com" || url.username || url.password) return null;
      return /^\/(?:intl-[a-z]{2,3}(?:-[a-zA-Z]{2,8})?\/)?playlist\/([A-Za-z0-9]{22})\/?$/.exec(url.pathname)?.[1] ?? null;
    } catch { return null; }
  }

  async function authorize(pendingInput = "") {
    if (!ready) throw new Error("Configura el Client ID de Spotify y abre la app con HTTPS o 127.0.0.1.");
    const pendingPlaylist = pendingInput ? playlistId(pendingInput) : "";
    if (pendingInput && !pendingPlaylist) throw new Error("Pega un enlace de playlist de open.spotify.com.");
    const verifier = randomString(48);
    const state = randomString(32);
    const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
    writeSession("pending", { verifier, state, playlist:pendingPlaylist, time:Date.now() });
    const url = new URL("/authorize", accounts);
    url.search = new URLSearchParams({
      client_id:clientId, response_type:"code", redirect_uri:redirect,
      scope:"playlist-read-private playlist-read-collaborative user-read-private",
      state, code_challenge_method:"S256", code_challenge:challenge
    });
    location.assign(url.href);
  }

  async function tokenRequest(params) {
    const body = new URLSearchParams({ ...params, client_id:clientId });
    const response = await fetch(accounts + "/api/token", {
      method:"POST", body, credentials:"omit", redirect:"error", cache:"no-store",
      signal:AbortSignal.timeout(12000)
    });
    const result = await response.json();
    if (!response.ok || typeof result.access_token !== "string" || !(Number(result.expires_in) > 0)) {
      const error = new Error(result.error === "invalid_grant"
        ? "La autorización caducó. Vuelve a conectar Spotify." : "Spotify no pudo completar la autorización.");
      error.invalidGrant = result.error === "invalid_grant";
      throw error;
    }
    return result;
  }

  function saveTokens(result, previous) {
    const value = {
      account:previous?.account ?? "", token:result.access_token,
      refresh:result.refresh_token || previous?.refresh || "",
      expires:Date.now() + Number(result.expires_in) * 1000
    };
    setSession(value);
    return value.token;
  }

  async function callback() {
    const url = new URL(location.href);
    const pending = readSession("pending");
    if ((!url.searchParams.has("code") && !url.searchParams.has("error"))
      || (url.pathname !== directory.pathname && url.pathname !== directory.pathname + "index.html")) return null;
    const code = url.searchParams.get("code");
    const authorized = url.searchParams.get("state") === pending?.state && pending
      && Date.now() - pending.time < 10 * 60 * 1000;
    history.replaceState(null, "", directory.pathname + "#spotify");
    if (!authorized || !ready) throw new Error("El retorno de Spotify no coincide con una autorización iniciada en esta pestaña.");
    writeSession("pending", null);
    if (!code) throw new Error("Autorización de Spotify cancelada o denegada.");
    const result = await tokenRequest({ grant_type:"authorization_code", code, redirect_uri:redirect, code_verifier:pending.verifier });
    const token = result.access_token;
    const profile = await request(new URL("/v1/me", apiOrigin), token);
    if (typeof profile.id !== "string" || !profile.id) throw new Error("Spotify no devolvió la cuenta.");
    saveTokens(result, { account:profile.id });
    return { playlist:pending.playlist };
  }

  async function getToken(force = false) {
    if (!savedSession) throw new Error("Conecta tu cuenta de Spotify para importar.");
    if (!force && savedSession.expires - Date.now() > 30000) return savedSession.token;
    if (!savedSession.refresh) throw new Error("Vuelve a conectar Spotify.");
    if (!refreshInFlight) {
      const before = savedSession;
      const version = epoch;
      refreshInFlight = tokenRequest({ grant_type:"refresh_token", refresh_token:before.refresh })
        .then((result) => {
          if (version !== epoch) throw new Error("La sesión de Spotify se cerró.");
          return saveTokens(result, before);
        }).catch((error) => {
          if (error.invalidGrant && version === epoch) setSession(null);
          throw error;
        }).finally(() => { refreshInFlight = undefined; });
    }
    return refreshInFlight;
  }

  async function request(url, token) {
    if (url.origin !== apiOrigin || !url.pathname.startsWith("/v1/") || url.username || url.password) {
      throw new Error("Spotify devolvió una ruta inesperada.");
    }
    const response = await fetch(url, { headers:{Authorization:"Bearer " + token}, credentials:"omit",
      signal:AbortSignal.timeout(15000), cache:"no-store", redirect:"error" });
    if (!response.ok) {
      const delay = Number(response.headers.get("Retry-After"));
      const messages = {
        401:"La autorización de Spotify caducó.",
        403:"Spotify no permite acceder. Comprueba los permisos, los usuarios autorizados y si eres dueño o colaborador.",
        404:"La playlist no existe o Spotify no da acceso a sus contenidos.",
        429:"Spotify limitó las consultas. " + (delay > 0 ? "Reintenta en " + delay + " s." : "Reintenta en unos minutos.")
      };
      const error = new Error(messages[response.status] ?? "Spotify no pudo responder a la consulta.");
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  async function api(url) {
    try { return await request(url, await getToken()); }
    catch (error) {
      if (error.status !== 401) throw error;
      return request(url, await getToken(true));
    }
  }

  function artUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && (["i.scdn.co","mosaic.scdn.co"].includes(url.hostname)
        || /^image-cdn-[a-z0-9-]+\.spotifycdn\.com$/.test(url.hostname))
        && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
  }

  function normalizeItem(row) {
    const track = row?.item ?? row?.track;
    if (!track || row.is_local || track.is_local || track.type !== "track" || !idPattern.test(track.id ?? "")
      || typeof track.name !== "string") return null;
    const images = Array.isArray(track.album?.images) ? [...track.album.images] : [];
    const cover = images.sort((a,b) => (a?.width ?? Infinity) - (b?.width ?? Infinity))
      .find((image) => artUrl(image?.url) && (image.width ?? 128) >= 64);
    return {
      id:track.id, uri:"spotify:track:" + track.id, url:"https://open.spotify.com/track/" + track.id,
      title:track.name, artist:Array.isArray(track.artists) ? track.artists.map((artist) => artist?.name).filter(Boolean).join(", ") : "",
      album:typeof track.album?.name === "string" ? track.album.name : "",
      seconds:Number.isFinite(track.duration_ms) && track.duration_ms >= 0 ? track.duration_ms / 1000 : null,
      cover:artUrl(cover?.url), explicit:track.explicit === true, preview:Boolean(track.preview_url)
    };
  }

  async function fetchPlaylist(id, getter = api) {
    if (!idPattern.test(id ?? "")) throw new Error("Enlace de playlist inválido.");
    const path = "/v1/playlists/" + id;
    const detailURL = new URL(path, apiOrigin);
    detailURL.searchParams.set("fields", "id,name,snapshot_id,items(total),tracks(total)");
    const details = await getter(detailURL);
    let endpoint = path + "/items";
    let current = new URL(endpoint + "?limit=50", apiOrigin);
    let page;
    try { page = await getter(current); }
    catch (error) {
      if (![404,405].includes(error.status) || !details.tracks || details.items) throw error;
      endpoint = path + "/tracks";
      current = new URL(endpoint + "?limit=50", apiOrigin);
      page = await getter(current);
    }
    const seen = new Set([current.href]);
    const tracks = [];
    let omitted = 0;
    while (true) {
      if (!Array.isArray(page.items)) throw new Error("Spotify no devolvió las canciones de esta playlist.");
      for (const entry of page.items) {
        const track = normalizeItem(entry);
        if (track) tracks.push(track);
        else omitted++;
      }
      if (!page.next) break;
      const next = new URL(page.next, apiOrigin);
      if (next.origin !== apiOrigin || next.pathname !== endpoint || next.username || next.password
        || seen.has(next.href) || seen.size >= 220) throw new Error("Spotify devolvió una paginación inesperada.");
      seen.add(next.href);
      page = await getter(next);
    }
    if (tracks.length + omitted > 50 && details.snapshot_id) {
      const latestUrl = new URL(path + "?fields=snapshot_id", apiOrigin);
      const latest = await getter(latestUrl);
      if (latest.snapshot_id !== details.snapshot_id) throw new Error("La playlist cambió durante la importación. Inicia la consulta de nuevo.");
    }
    return { id, name:typeof details.name === "string" && details.name ? details.name : "Playlist",
      url:"https://open.spotify.com/playlist/" + id, tracks, omitted, savedAt:Date.now() };
  }

  function open() {
    if (!db) db = new Promise((resolve, reject) => {
      const operation = indexedDB.open("mi-musica-spotify", 1);
      operation.onupgradeneeded = () => operation.result.createObjectStore("playlists", {keyPath:["account","id"]});
      operation.onsuccess = () => {
        operation.result.onversionchange = () => { operation.result.close(); db = undefined; };
        resolve(operation.result);
      };
      operation.onerror = () => reject(operation.error);
    }).catch((error) => { db = undefined; throw error; });
    return db;
  }

  async function storage(action, record, account = savedSession?.account) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction("playlists", "readwrite");
      const store = tx.objectStore("playlists");
      const list = [];
      tx.oncomplete = () => resolve(list);
      tx.onabort = () => reject(tx.error ?? new Error("No se pudo guardar la importación."));
      if (action === "save") { store.put(record); return; }
      const cursor = store.openCursor();
      cursor.onsuccess = () => {
        const row = cursor.result;
        if (!row) return;
        const item = row.value;
        const owns = account && item.account === account;
        if (Date.now() - item.savedAt >= day || (action === "disconnect" && owns)) row.delete();
        else if (owns) list.push(item);
        row.continue();
      };
    });
  }

  async function importPlaylist(id) {
    const account = savedSession?.account;
    const version = epoch;
    if (!account) throw new Error("Conecta Spotify para importar una playlist.");
    const result = await fetchPlaylist(id);
    if (version !== epoch || account !== savedSession?.account) throw new Error("La sesión de Spotify cambió.");
    await storage("save", { ...result, account });
    return result;
  }

  async function disconnect() {
    epoch++;
    const account = savedSession?.account;
    setSession(null);
    writeSession("pending", null);
    if (account) await storage("disconnect", undefined, account);
  }

  async function list() {
    if (!ready) return [];
    const result = await storage("list");
    return result.sort((a,b) => b.savedAt - a.savedAt);
  }

  return { ready, redirect, connected:() => Boolean(savedSession?.account), authorize, callback, list,
    importPlaylist, disconnect, playlistId, fetchPlaylist, normalizeItem };
})();

