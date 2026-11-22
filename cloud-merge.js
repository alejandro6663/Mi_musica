"use strict";

const musicMerge = (() => {
  const equals = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const fields = ["order", "queue", "queueOriginal", "shuffle", "repeat"];

  function merge(base, local, remote, preference) {
    const conflicts = [];
    function value(a, b, c, label) {
      if (equals(b, c)) return b;
      if (base && equals(a, b)) return c;
      if (base && equals(a, c)) return b;
      conflicts.push(label);
      return preference === "remote" ? c : b;
    }
    function set(a, b, c) {
      const ids = [...new Set([...b, ...c, ...a])];
      return ids.filter((id) => {
        const l = b.includes(id);
        const r = c.includes(id);
        const old = a.includes(id);
        return l === r ? l : l === old ? r : l;
      });
    }

    const result = { folders:[], favorites:set(base?.favorites ?? [], local.favorites, remote.favorites) };
    const folders = [base?.folders ?? [], local.folders, remote.folders].map((list) => new Map(list.map((folder) => [folder.id, folder])));
    const ids = new Set([...folders[1].keys(), ...folders[2].keys(), ...folders[0].keys()]);
    for (const id of ids) {
      const [a, b, c] = folders.map((group) => group.get(id));
      const label = "Carpeta «" + (b?.name ?? c?.name ?? a?.name) + "»";
      if (b && c && a) {
        result.folders.push({
          id, name:value(a.name,b.name,c.name,label + " · nombre"),
          color:value(a.color,b.color,c.color,label + " · color"), created:a.created,
          tracks:set(a.tracks,b.tracks,c.tracks)
        });
      } else {
        const folder = !base && (!b || !c) ? (b ?? c) : value(a,b,c,label);
        if (folder) result.folders.push(folder);
      }
    }
    for (const key of fields) result[key] = value(base?.[key], local[key], remote[key], ({
      order:"Orden de carpetas", queue:"Cola de reproducción", queueOriginal:"Orden de la cola",
      shuffle:"Modo aleatorio", repeat:"Repetición"
    })[key]);
    return { data:result, conflicts };
  }
  return { merge, equals };
})();

