"use strict";

const musicRecovery = (() => {
  function signature(folder) {
    return JSON.stringify([folder.name, folder.color, [...folder.tracks].sort()]);
  }

  function candidates(current, snapshots) {
    const exact = new Set(current.map(signature));
    const output = [];
    for (const { source, folders } of snapshots) {
      for (const folder of folders) {
        const fingerprint = signature(folder);
        if (exact.has(fingerprint)) continue;
        const copyName = folder.name.slice(0, 46) + " (recuperada)";
        if (current.some((item) => item.name === copyName && signature({ ...item, name:folder.name }) === fingerprint)) continue;
        exact.add(fingerprint);
        output.push({ source, folder, collision:current.some((item) => item.id === folder.id) });
      }
    }
    return output;
  }

  function recover(current, chosen, makeId) {
    const output = [...current];
    const ids = new Set(current.map((folder) => folder.id));
    for (const { folder, collision } of candidates(current, [{ source:"Respaldo", folders:chosen }])) {
      if (collision || ids.has(folder.id)) {
        const id = makeId();
        output.push({ ...folder, id, name:folder.name.slice(0, 46) + " (recuperada)" });
        ids.add(id);
      } else {
        output.push({ ...folder });
        ids.add(folder.id);
      }
    }
    return output;
  }

  function snapshots(storage, normalize) {
    const result = [];
    function list(value, source) {
      if (value && Array.isArray(value.folders)) result.push({ source, folders:normalize(value).folders });
    }
    function read(key) {
      try { return JSON.parse(storage.getItem(key)); } catch { return null; }
    }
    list(read("mi-musica-v1"), "Biblioteca de 1.0 o 1.1");
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith("mi-musica-cloud-conflict:")) {
        const previous = read(key);
        list(previous?.local, "Copia local de un conflicto");
        list(previous?.remote, "Copia remota de un conflicto");
      } else if (key?.startsWith("mi-musica-cloud-base:")) {
        list(read(key)?.data, "Última revisión guardada de sincronización");
      }
    }
    return result;
  }

  return { candidates, recover, snapshots };
})();

