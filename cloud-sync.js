"use strict";

const cloudMusic = (() => {
  const version = "12.7.0";
  const sdk = "https://www.gstatic.com/firebasejs/" + version + "/";
  const config = globalThis.miMusicaFirebaseConfig;
  const activeKey = "mi-musica-cloud-active:" + (config?.projectId ?? "");
  let connection, auth, firestore, api, user, unwatch, timer, conflict, readLocal, applyLocal, pending = false;
  let message = config ? "Inicia sesión con Google para activar la sincronización." : "Firebase está pendiente de configurar.";
  let observed = "";

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  function enabled() {
    return user && read(activeKey) === user.uid;
  }
  function baseKey(uid) {
    return "mi-musica-cloud-base:" + config.projectId + ":" + uid;
  }
  function status(text) {
    message = text;
    document.dispatchEvent(new Event("music-cloud-status"));
  }
  function init(getData, applyData) {
    readLocal = getData;
    applyLocal = applyData;
    observed = JSON.stringify(readLocal());
    window.addEventListener("online", () => {
      if (config) connect().then(() => schedule()).catch(() => {});
    });
    window.addEventListener("offline", () => {
      if (enabled()) status("Sin conexión. Los cambios quedan guardados en el dispositivo.");
    });
    if (config && navigator.onLine) connect().catch(() => {});
  }
  function connect() {
    if (!config) return Promise.resolve();
    if (!connection) connection = (async () => {
      const [app, authentication, database] = await Promise.all([
        import(sdk + "firebase-app.js"), import(sdk + "firebase-auth.js"), import(sdk + "firebase-firestore.js")
      ]);
      const instance = app.getApps().find((entry) => entry.name === "mi-musica") ?? app.initializeApp(config, "mi-musica");
      api = { ...authentication, ...database };
      auth = api.getAuth(instance);
      firestore = api.getFirestore(instance);
      api.onAuthStateChanged(auth, (account) => {
        unwatch?.();
        user = account;
        conflict = undefined;
        if (enabled()) watch();
        status(user ? "Cuenta conectada." : "Inicia sesión con Google para activar la sincronización.");
        schedule();
      });
      status("Firebase está listo.");
    })().catch((error) => {
      auth = undefined;
      connection = undefined;
      status("Firebase no está disponible. Revisa la configuración o la conexión.");
      throw error;
    });
    return connection;
  }
  function reference(uid) {
    return api.doc(firestore, "users", uid, "miMusica", "library");
  }
  function watch() {
    unwatch?.();
    unwatch = api.onSnapshot(reference(user.uid), { includeMetadataChanges:true },
      (snapshot) => { if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) schedule(); },
      () => status("Firestore no está disponible o sus reglas impiden el acceso."));
  }
  function schedule() {
    if (!enabled() || conflict) return;
    clearTimeout(timer);
    if (navigator.onLine) timer = setTimeout(() => sync(), 800);
    else status("Sin conexión. Los cambios quedan guardados en el dispositivo.");
  }
  function changed() {
    const data = JSON.stringify(readLocal());
    if (observed === data) return;
    observed = data;
    schedule();
  }
  async function sync(choice) {
    if (!enabled() || !navigator.onLine) return;
    if (pending) { schedule(); return; }
    pending = true;
    const uid = user.uid;
    const local = readLocal();
    const baseline = read(baseKey(uid));
    const ref = reference(uid);
    try {
      const result = await api.runTransaction(firestore, async (transaction) => {
        const doc = await transaction.get(ref);
        const record = doc.exists() ? doc.data() : null;
        if (record && (record.schema !== 1 || !Number.isSafeInteger(record.revision) || !record.data)) {
          throw new Error("La versión de los datos remotos no es compatible.");
        }
        const remote = record?.data;
        const revision = record?.revision ?? 0;
        if (choice && (!conflict || conflict.revision !== revision || !musicMerge.equals(conflict.local, local))) {
          const next = remote ? musicMerge.merge(baseline?.data, local, remote) : { data:local, conflicts:[] };
          return { ...next, revision, local, remote, reconsider:true };
        }
        let data = local;
        if (remote && !musicMerge.equals(local, remote)) {
          if (baseline && musicMerge.equals(baseline.data, local)) data = remote;
          else if (!baseline || !musicMerge.equals(baseline.data, remote)) {
            const merged = musicMerge.merge(baseline?.data, local, remote, choice);
            if (merged.conflicts.length && !choice) return { ...merged, revision, local, remote };
            data = merged.data;
          }
        }
        if (musicMerge.equals(data, remote)) return { data, revision };
        if (new Blob([JSON.stringify(data)]).size > 800000) {
          throw new Error("Los datos exceden el tamaño de sincronización. Puedes exportar un respaldo local.");
        }
        transaction.set(ref, { schema:1, revision:revision + 1, data, updatedAt:api.serverTimestamp() });
        return { data, revision:revision + 1 };
      });
      if (user?.uid !== uid || !enabled()) return;
      if (result.reconsider || result.conflicts?.length) {
        conflict = result.conflicts.length ? result : undefined;
        if (conflict) status("Hay cambios que necesitan tu decisión.");
        else schedule();
        return;
      }

      // An edit during the transaction belongs to a new, pending local revision.
      const latest = readLocal();
      write(baseKey(uid), result);
      conflict = undefined;
      if (!musicMerge.equals(latest, local)) {
        const merged = musicMerge.merge(local, latest, result.data);
        if (merged.conflicts.length) {
          conflict = { ...merged, local:latest, remote:result.data, revision:result.revision };
          status("Hay cambios que necesitan tu decisión.");
          return;
        }
        applyLocal(merged.data);
        schedule();
      } else if (!musicMerge.equals(result.data, local)) applyLocal(result.data);
      observed = JSON.stringify(readLocal());
      status("Biblioteca y preferencias sincronizadas.");
    } catch (error) {
      if (user?.uid === uid) status(navigator.onLine
        ? "Sincronización pendiente. " + (error.code ? "Revisa Firebase (" + error.code + ")." : error.message)
        : "Sin conexión. Los cambios quedan guardados en el dispositivo.");
    } finally { pending = false; }
  }

  async function action(kind) {
    if (!config) return;
    try {
      if (kind === "cloud-login") {
        if (auth) await api.signInWithPopup(auth, new api.GoogleAuthProvider());
        else await connect();
      }
      if (kind === "cloud-logout" && auth) {
        await api.signOut(auth);
      }
      if (kind === "cloud-enable" && user) {
        write(activeKey, user.uid);
        watch();
        status("Sincronización activada.");
        schedule();
      }
      if (kind === "cloud-now") {
        if (conflict) status("Resuelve el conflicto para continuar.");
        else if (enabled()) await sync();
      }
      if (kind === "cloud-local" || kind === "cloud-remote") {
        if (!conflict) return;
        write("mi-musica-cloud-conflict:" + user.uid, { local:conflict.local, remote:conflict.remote });
        await sync(kind === "cloud-local" ? "local" : "remote");
      }
    } catch (error) {
      status("No se pudo completar la conexión con Google. " + (error.code ?? ""));
    }
  }
  function view() {
    return { configured:Boolean(config), ready:Boolean(auth), user, message, conflict, enabled:Boolean(enabled()) };
  }
  return { init, connect, action, view, changed };
})();

