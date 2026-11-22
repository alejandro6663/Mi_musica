"use strict";

const musicCatalog = (() => {
  const providerNames = { itunes:"iTunes Store", audius:"Audius" };
  const variants = /\b(remaster(?:ed)?|remix|mix|live|acoustic|acustic[ao]|en vivo|instrumental|radio edit|demo|version|edit|extended|cover|sped up|slowed)\b/;
  const recent = new Map();

  function text(value) {
    return typeof value === "string" ? value.trim().slice(0, 240) : "";
  }

  function normalize(value) {
    return text(value).normalize("NFD").toLowerCase().replace(/\p{M}/gu, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }

  function https(value, hosts) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password
        && (!hosts || hosts.includes(url.hostname)) ? url.href : "";
    } catch { return ""; }
  }

  async function json(endpoint, params, signal) {
    const url = new URL(endpoint);
    url.search = new URLSearchParams(params);
    const response = await fetch(url, { signal:AbortSignal.any([signal, AbortSignal.timeout(8500)]),
      credentials:"omit", referrerPolicy:"no-referrer" });
    if (!response.ok) throw new Error("El catálogo respondió con HTTP " + response.status + ".");
    return response.json();
  }

  const providers = {
    async itunes(term, { field, country, signal }) {
      const attributes = { title:"songTerm", artist:"artistTerm", album:"albumTerm" };
      const params = { term, country, limit:"16", media:"music", entity:"song",
        ...(attributes[field] ? { attribute:attributes[field] } : {}) };
      const data = await json("https://itunes.apple.com/search", params, signal);
      if (!Array.isArray(data.results)) throw new Error("Respuesta de iTunes incompatible.");
      return data.results.filter((track) => track?.kind === "song").map((track) => ({
        provider:"itunes", id:String(track.trackId), title:text(track.trackName), artist:text(track.artistName),
        album:text(track.collectionName), seconds:Number(track.trackTimeMillis) / 1000,
        url:https(track.trackViewUrl, ["music.apple.com","itunes.apple.com"])
      }));
    },
    async audius(term, { field, signal }) {
      if (field === "album") return null;
      const data = await json("https://api.audius.co/v1/tracks/search", { query:term, limit:"16", app_name:"MiMusica" }, signal);
      if (!Array.isArray(data.data)) throw new Error("Respuesta de Audius incompatible.");
      return data.data.filter(Boolean).map((track) => ({
        provider:"audius", id:text(track.id), title:text(track.title), artist:text(track.user?.name),
        album:text(track.album_backlink?.playlist_name ?? track.album_backlink?.title),
        seconds:Number(track.duration), isrc:text(track.isrc).toUpperCase(),
        image:https(track.artwork?.["150x150"]),
        url:typeof track.permalink === "string" && /^\/(?!\/)/.test(track.permalink)
          ? https(new URL(track.permalink, "https://audius.co").href, ["audius.co"]) : ""
      })).filter((track) => field === "any" || normalize(track[field]).includes(normalize(term)));
    }
  };

  async function search(term, options) {
    const ids = options.ids ?? Object.keys(providers);
    return Promise.all(ids.map(async (id) => {
      const key = JSON.stringify([id, term, options.field, options.country]);
      const hit = recent.get(key);
      if (hit && Date.now() - hit.at < 120000) return hit.value;
      try {
        const found = await providers[id](term, options);
        if (!found) return { id, unsupported:true, results:[] };
        const unique = new Map(found.filter((track) => track.id && track.url && track.title)
          .map((track) => [track.id, track]));
        const value = { id, results:[...unique.values()] };
        if (recent.size >= 16) recent.delete(recent.keys().next().value);
        recent.set(key, { at:Date.now(), value });
        return value;
      } catch {
        return { id, error:true, results:[] };
      }
    }));
  }

  function identify(a, b) {
    if (a.isrc && b.isrc && a.isrc === b.isrc) return "confirmed";
    function title(track) {
      const words = normalize(track.title);
      const artist = normalize(track.artist);
      return artist && words.startsWith(artist + " ") ? words.slice(artist.length + 1) : words;
    }
    function base(track) {
      const full = title(track);
      return full.replace(new RegExp(variants.source + ".*$"), "").trim();
    }
    const aTitle = title(a);
    const bTitle = title(b);
    const sameArtist = Boolean(normalize(a.artist)) && normalize(a.artist) === normalize(b.artist);
    const sameTitle = Boolean(aTitle) && aTitle === bTitle;
    const sameAlbum = Boolean(normalize(a.album)) && normalize(a.album) === normalize(b.album);
    const near = a.seconds > 0 && b.seconds > 0 && Math.abs(a.seconds - b.seconds) <= 3;
    if (sameTitle && sameArtist && sameAlbum && near && !(a.isrc && b.isrc)) return "metadata";
    if (sameArtist && aTitle !== bTitle && base(a) && base(a) === base(b)
      && (variants.test(aTitle) || variants.test(bTitle))) return "alternate";
    return "unconfirmed";
  }

  async function compare(reference, options) {
    const ids = Object.keys(providers).filter((id) => id !== reference.provider);
    const term = [reference.title, reference.artist].filter(Boolean).join(" ").slice(0,120);
    const data = await search(term, { ...options, field:"any", ids });
    return data.map((group) => ({
      ...group,
      results:group.results.map((track) => ({...track, match:identify(reference, track)}))
        .sort((a,b) => ["confirmed","metadata","alternate","unconfirmed"].indexOf(a.match)
          - ["confirmed","metadata","alternate","unconfirmed"].indexOf(b.match)).slice(0, 5)
    }));
  }

  return { search, compare, identify, normalize, providerNames };
})();

