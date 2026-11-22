"use strict";

const musicStore = (() => {
  const audioTypes = {
    mp3:"audio/mpeg", mpga:"audio/mpeg", wav:"audio/wav", wave:"audio/wav", ogg:"audio/ogg",
    oga:"audio/ogg", opus:"audio/ogg; codecs=opus", flac:"audio/flac", m4a:"audio/mp4",
    mp4:"audio/mp4", aac:"audio/aac", webm:"audio/webm"
  };
  const signature = "MIMUS12\n";
  let database;

  function open() {
    if (!database) database = new Promise((resolve, reject) => {
      const request = indexedDB.open("mi-musica-audio", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("tracks", { keyPath: "id" });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        request.result.onversionchange = () => { request.result.close(); database = undefined; };
        resolve(request.result);
      };
    }).catch((error) => { database = undefined; throw error; });
    return database;
  }

  async function transact(mode, execute) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("tracks", mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(tx.error ?? new Error("La operación se canceló."));
      try {
        execute(tx.objectStore("tracks"), (value) => { result = value; });
      } catch (error) {
        tx.abort();
        reject(error);
      }
    });
  }

  function get(id) {
    return transact("readonly", (store, done) => {
      const request = store.get(id);
      request.onsuccess = () => done(request.result);
    });
  }

  function list(withAudio = false) {
    return transact("readonly", (store, done) => {
      const items = [];
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return done(items);
        const { blob, ...metadata } = cursor.value;
        items.push(withAudio ? { ...metadata, blob } : metadata);
        cursor.continue();
      };
    });
  }

  async function hash(blob) {
    if (!globalThis.crypto?.subtle) throw new Error("Abre Mi Música con HTTPS o localhost para importar audio.");
    const bytes = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    return "local:" + [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function inspect(blob) {
    return new Promise((resolve, reject) => {
      const probe = document.createElement("audio");
      const url = URL.createObjectURL(blob);
      const timer = setTimeout(() => finish(new Error("No se pudo leer el audio a tiempo.")), 12000);
      function finish(error) {
        const duration = probe.duration;
        clearTimeout(timer);
        probe.onloadedmetadata = null;
        probe.onerror = null;
        probe.removeAttribute("src");
        probe.load();
        URL.revokeObjectURL(url);
        if (error) reject(error);
        else if (!Number.isFinite(duration) || duration <= 0) reject(new Error("Duración de audio inválida."));
        else resolve(duration);
      }
      probe.preload = "metadata";
      probe.onloadedmetadata = () => finish();
      probe.onerror = () => finish(new Error("Formato de audio incompatible o archivo dañado."));
      probe.src = url;
    });
  }

  async function readTags(blob) {
    const bytes = new Uint8Array(await blob.slice(0, 512 * 1024).arrayBuffer());
    if (bytes.length < 20 || String.fromCharCode(...bytes.slice(0,3)) !== "ID3"
      || ![3, 4].includes(bytes[3]) || (bytes[5] & 0xe0)) return {};
    const fields = { TIT2: "title", TPE1: "artist", TALB: "album" };
    const tags = {};
    const syncInt = (at) => bytes[at] * 2097152 + bytes[at+1] * 16384 + bytes[at+2] * 128 + bytes[at+3];
    const length = Math.min(bytes.length, 10 + syncInt(6));
    const view = new DataView(bytes.buffer);
    for (let at = 10; at + 10 < length;) {
      const frame = String.fromCharCode(...bytes.slice(at, at + 4));
      const size = bytes[3] === 4 ? syncInt(at + 4) : view.getUint32(at + 4);
      if (!size || at + 10 + size > length) break;
      if (fields[frame] && bytes[at + 9] === 0) {
        const encoding = ["iso-8859-1", "utf-16le", "utf-16be", "utf-8"][bytes[at + 10]];
        try {
          const data = bytes.subarray(at + 11, at + 10 + size);
          const decoder = encoding === "utf-16le" && data[0] === 254 && data[1] === 255
            ? "utf-16be" : encoding;
          if (decoder) tags[fields[frame]] = new TextDecoder(decoder).decode(data).split("\u0000")[0].trim().slice(0, 200);
        } catch { /* Filename remains available. */ }
      }
      at += 10 + size;
    }
    return tags;
  }

  async function importFile(file) {
    const extension = file.name.split(".").pop().toLowerCase();
    const type = audioTypes[extension] ?? (file.type.startsWith("audio/") ? file.type : "");
    if (!type || !file.size) throw new Error("Selecciona un archivo de audio compatible.");
    const id = await hash(file);
    if (await get(id)) return false;
    const blob = file.slice(0, file.size, type.split(";")[0]);
    const seconds = await inspect(blob);
    const tags = extension === "mp3" ? await readTags(blob) : {};
    const name = file.name.replace(/\.[^.]+$/, "");
    const match = name.match(/^(.+?)\s+-\s+(.+)$/);
    const track = { id, seconds, size:file.size, type:blob.type,
      title:(tags.title || match?.[2] || name || "Canción").slice(0,200),
      artist:(tags.artist || match?.[1] || "Artista desconocido").slice(0,200),
      album:tags.album || "", color:"#5485ff", blob };
    try {
      await transact("readwrite", (store) => store.add(track));
      return true;
    } catch (error) {
      if (await get(id)) return false;
      throw error;
    }
  }

  async function updateMetadata(id, changes) {
    return transact("readwrite", (store) => {
      const request = store.get(id);
      request.onsuccess = () => {
        if (request.result) store.put({ ...request.result, ...changes });
      };
    });
  }

  async function backup(state) {
    const records = await list(true);
    const metadata = records.map(({ blob, ...track }) => track);
    const header = new Blob([JSON.stringify({ version:1, state, tracks:metadata })]);
    return new Blob([signature, String(header.size).padStart(12, "0"), header,
      ...records.map((record) => record.blob)], { type:"application/octet-stream" });
  }

  async function readBackup(file) {
    const prefix = await file.slice(0, 20).text();
    const size = Number(prefix.slice(8));
    if (!prefix.startsWith(signature) || !/^\d{12}$/.test(prefix.slice(8))
      || size < 2 || size > 10 * 1024 * 1024 || 20 + size > file.size) throw new Error("Archivo de respaldo inválido.");
    const header = JSON.parse(await file.slice(20, 20 + size).text());
    if (header.version !== 1 || !header.state || !Array.isArray(header.state.folders) || !Array.isArray(header.tracks)) {
      throw new Error("Respaldo incompatible.");
    }
    let position = 20 + size;
    const records = [];
    for (const track of header.tracks) {
      const { id, title, artist, album, seconds, size, type } = track;
      if (typeof id !== "string" || !/^local:[0-9a-f]{64}$/.test(id) || !Number.isSafeInteger(size)
        || size <= 0 || position + size > file.size || !Number.isFinite(seconds) || seconds <= 0
        || typeof type !== "string" || !type.startsWith("audio/")) throw new Error("Pista de respaldo inválida.");
      const blob = file.slice(position, position + size, type);
      if (await hash(blob) !== id) throw new Error("El respaldo contiene audio dañado.");
      records.push({ id, title:String(title || "Canción").slice(0,200), artist:String(artist || "").slice(0,200),
        album:String(album || "").slice(0,200), seconds, size, type, color:"#5485ff", blob });
      position += size;
    }
    if (position !== file.size) throw new Error("Longitud de respaldo inválida.");
    return { state:header.state, records };
  }

  async function restore(records) {
    await transact("readwrite", (store) => {
      for (const track of records) {
        const existing = store.get(track.id);
        existing.onsuccess = () => {
          if (!existing.result) store.put(track);
        };
      }
    });
  }

  return { list, get, importFile, updateMetadata, backup, readBackup, restore };
})();

