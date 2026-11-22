"use strict";

const icons = {
  wave: '<path d="M3 12h2l2-5 3 10 3-13 3 16 2-8h3"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 4.5 4.5"/>',
  library: '<path d="M4 5v14M9 5v14M14 5l5 14"/>',
  headphones: '<path d="M3 14v-3a9 9 0 0 1 18 0v3M3 13h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm18 0h-3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2z"/>',
  folder: '<path d="M2 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="m15 5 4 4M4 20l4-.8L20 7l-3-3L5 16z"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  play: '<path d="M8 5v14l12-7z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7 5h4v14H7zm6 0h4v14h-4z" fill="currentColor" stroke="none"/>',
  next: '<path d="M5 5v14l11-7zm12 0h2v14h-2z" fill="currentColor" stroke="none"/>',
  previous: '<path d="M19 5v14L8 12zM5 5h2v14H5z" fill="currentColor" stroke="none"/>'
};

const demos = [
  { id: "pulso", title: "Pulso nocturno", artist: "Órbita", seconds: 222, color: "#3e69ff" },
  { id: "horizonte", title: "Horizonte azul", artist: "Luz Polar", seconds: 198, color: "#9560f6" },
  { id: "cinta", title: "Cinta magnética", artist: "Circuito Sur", seconds: 246, color: "#27a9b4" },
  { id: "gravedad", title: "Gravedad cero", artist: "Nova Prisma", seconds: 211, color: "#e27865" }
];
let tracks = [...demos];

const initialState = {
  order: "name",
  selectedTrack: "pulso",
  folders: [
    { id: "nocturnas", name: "Sesiones nocturnas", color: "#7596ff", created: 1, tracks: ["pulso", "gravedad"] },
    { id: "electronica", name: "Electrónica", color: "#ac85ff", created: 2, tracks: ["horizonte", "cinta", "pulso"] },
    { id: "descubrir", name: "Por descubrir", color: "#55c9cc", created: 3, tracks: ["gravedad"] }
  ]
};

const storageKey = "mi-musica-v2";
const main = document.querySelector("main");
const dialog = document.querySelector("#dialog");
const form = document.querySelector("#dialog-form");
const fields = document.querySelector("#dialog-fields");
const submit = document.querySelector("#dialog-submit");
const timeline = document.querySelector("#timeline");
const play = document.querySelector("#play");
const status = document.querySelector("#status");
const audio = document.querySelector("#audio");
const fullPlayer = document.querySelector("#full-player");
const fullTimeline = document.querySelector("#full-timeline");
const validColor = /^#[0-9a-f]{6}$/i;
const pages = ["inicio", "buscar", "biblioteca", "dj", "spotify"];
let previousInvalidState;
const state = loadState();
let folderId = null;
let query = "";
let searchField = "any";
let externalEnabled = true;
let searchCountry = countryFromBrowser();
let catalogGroups = null;
let catalogRequest;
let compareRequest;
let seconds = state.position ?? 0;
let startedAt = null;
let pendingSave = null;
let toastTimer;
let progressTimer;
let audioUrl;
let audioTrackId;
let audioLoad = 0;
let lastCheckpoint = 0;
let musicBusy = false;
let libraryReady = false;
let sleepTimer;
let gesture;
let gestureClick;
let spotifyLists = [];
let spotifySelected;
let spotifyOffset = 0;
let spotifyLink = "";
let spotifyMessage = "";
let spotifyBusy = false;
let onlineTrack;
let onlineQueue = [];
let onlineOriginal = [];
const onlineResults = new Map();
const unavailableStreams = new Set();

function validTrackId(id) {
  return typeof id === "string" && (demos.some((track) => track.id === id) || /^local:[0-9a-f]{64}$/.test(id));
}

function trackIds(ids) {
  return Array.isArray(ids) ? [...new Set(ids.filter(validTrackId))] : [];
}

function icon(name) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[name] + "</svg>";
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function loadState() {
  for (const key of [storageKey, "mi-musica-v1"]) {
    let raw;
    try {
      raw = localStorage.getItem(key);
      if (raw === null) continue;
      const saved = JSON.parse(raw);
      if (saved && Array.isArray(saved.folders)) return normalizedState(saved);
    } catch { /* Try the previous local snapshot. */ }
    if (key === storageKey && typeof raw === "string") previousInvalidState = raw;
  }
  return normalizedState(initialState);
}

function writeState(data) {
  if (previousInvalidState !== undefined) {
    localStorage.setItem(storageKey + ":copia-" + Date.now(), previousInvalidState);
    previousInvalidState = undefined;
  }
  localStorage.setItem(storageKey, JSON.stringify(data));
}

function normalizedState(saved) {
  return {
    order: saved.order === "date" ? "date" : "name",
    selectedTrack: validTrackId(saved.selectedTrack) ? saved.selectedTrack : demos[0].id,
    position: Number.isFinite(saved.position) ? Math.max(0, saved.position) : 0,
    favorites: trackIds(saved.favorites),
    queue: trackIds(saved.queue),
    queueOriginal: trackIds(saved.queueOriginal ?? saved.queue),
    history: (Array.isArray(saved.history) ? saved.history.filter(validTrackId) : []).slice(-200),
    shuffle: saved.shuffle === true,
    repeat: ["off", "list", "one"].includes(saved.repeat) ? saved.repeat : "off",
    sleepUntil: Number.isFinite(saved.sleepUntil) ? Math.max(0, saved.sleepUntil) : 0,
    volume: Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : 1,
    folders: saved.folders.filter((folder) => folder && typeof folder.id === "string"
      && typeof folder.name === "string" && validColor.test(folder.color)
      && Number.isFinite(folder.created) && Array.isArray(folder.tracks)).map((folder) => ({
        id: folder.id, name: folder.name, color: folder.color, created: folder.created, tracks: trackIds(folder.tracks)
      }))
  };
}

function saveState(message, synchronize = true) {
  try {
    writeState(state);
    if (synchronize) cloudMusic.changed();
    if (message) notify(message);
  } catch {
    notify("El navegador bloqueó el guardado. Los cambios duran hasta cerrar o recargar la página.");
  }
}

function notify(message) {
  status.textContent = message;
  const playerNotice = document.querySelector("#full-message");
  if (fullPlayer.open) playerNotice.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { status.textContent = playerNotice.textContent = ""; }, 4200);
}

function page() {
  const hash = location.hash.slice(1);
  return pages.includes(hash) ? hash : "inicio";
}

function selectedTrack() {
  return onlineTrack ?? tracks.find((track) => track.id === state.selectedTrack) ?? demos[0];
}

function currentTrackId() {
  return onlineTrack?.id ?? state.selectedTrack;
}

function sortedFolders() {
  return [...state.folders].sort((a, b) => state.order === "date"
    ? b.created - a.created
    : a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
}

function vinyl(track) {
  return '<span class="vinyl" style="--tone:' + track.color + '" aria-hidden="true"><span class="label"></span></span>';
}

function trackGrid(list) {
  if (!list.length) return '<p class="empty">No hay canciones para mostrar.</p>';
  return '<div class="record-grid">' + list.map((track) => '<article class="record-card" data-track="' + track.id + '" style="--tone:' + track.color + '">'
    + '<button class="track-demo" type="button" data-action="demo" data-id="' + track.id + '" aria-pressed="false">'
    + vinyl(track) + '<strong>' + escapeText(track.title) + '</strong><small>' + escapeText(track.artist) + '</small></button>'
    + (state.favorites.includes(track.id) ? '<span class="favorite-mark" aria-label="Me gusta">♥</span>' : "")
    + '<button class="icon-button" type="button" data-action="context" data-id="' + track.id + '" aria-label="Opciones de ' + escapeText(track.title) + '">' + icon("more") + '</button>'
    + '</article>').join("") + '</div>';
}

function folderGrid(folders) {
  if (!folders.length) return '<p class="empty">Crea una carpeta para organizar tus canciones.</p>';
  return '<div class="folder-grid">' + folders.map((folder) => {
    const id = escapeText(folder.id);
    const name = escapeText(folder.name);
    const count = folder.tracks.length;
    return '<article class="folder-card">'
      + '<button class="folder-open" type="button" data-action="folder" data-id="' + id + '">'
      + '<span class="folder-icon" style="--tone:' + folder.color + '">' + icon("folder") + '</span>'
      + '<span style="min-width:0"><strong class="folder-name">' + name + '</strong><small class="folder-count">'
      + count + (count === 1 ? " canción" : " canciones") + '</small></span></button>'
      + '<button class="icon-button" type="button" data-action="edit" data-id="' + id + '" aria-label="Editar ' + name + '">' + icon("more") + '</button></article>';
  }).join("") + '</div>';
}

function heading(title, description) {
  return '<header class="page-heading"><h1>' + title + '</h1><p>' + description + '</p></header>';
}

function section(title, content, action = "") {
  return '<section class="section"><div class="section-head"><h2>' + title + '</h2>' + action + '</div>' + content + '</section>';
}

function home() {
  return '<section class="hero"><div class="hero-copy"><span class="eyebrow">Biblioteca musical</span>'
    + '<h1>Tu música,<br><span>a tu ritmo.</span></h1>'
    + '<p>Importa tu música y crea tu propia colección.</p>'
    + '<a class="primary" href="#biblioteca">' + icon("library") + ' Explorar biblioteca</a></div></section>'
    + section(tracks.length > demos.length ? "Tu música" : "Vinilos de muestra", trackGrid(tracks.slice(0, 4)), '<a href="#biblioteca">Ver biblioteca</a>')
    + section("Tus carpetas", folderGrid(sortedFolders().slice(0, 3)),
      '<button class="text-button" type="button" data-action="new">+ Nueva carpeta</button>');
}

function library() {
  if (folderId === "@favorites") {
    return '<button type="button" class="text-button" data-action="all-folders">Volver a Biblioteca</button>'
      + heading("Me gusta", "Canciones marcadas como favoritas.")
      + section("Canciones", trackGrid(tracks.filter((track) => state.favorites.includes(track.id))));
  }
  const folder = state.folders.find((item) => item.id === folderId);
  if (folder) {
    return '<button type="button" class="text-button" data-action="all-folders">Volver a Biblioteca</button>'
      + heading(escapeText(folder.name), folder.tracks.length + (folder.tracks.length === 1 ? " canción" : " canciones"))
      + section("Canciones", folder.tracks.length
        ? trackGrid(tracks.filter((track) => folder.tracks.includes(track.id)))
        : '<p class="empty">Usa «Editar carpeta» para añadir canciones.</p>',
      '<button class="secondary" type="button" data-action="edit" data-id="' + escapeText(folder.id) + '">' + icon("edit") + ' Editar carpeta</button>');
  }
  const tools = '<div class="tools"><select id="folder-order" aria-label="Ordenar carpetas">'
    + '<option value="name">Alfabéticamente</option><option value="date">Más recientes primero</option></select>'
    + '<button class="primary" type="button" data-action="new">' + icon("plus") + ' Nueva carpeta</button></div>';
  return heading("Biblioteca", "Importa canciones de este dispositivo y organízalas en tus carpetas.")
    + '<div class="tools"><button class="primary" data-action="import">' + icon("plus") + ' Importar música</button>'
    + '<a class="secondary" href="#spotify">Importar playlist de Spotify</a>'
    + '<button class="secondary" data-action="favorites">Me gusta (' + state.favorites.length + ')</button>'
    + '<button class="secondary" data-action="storage">Almacenamiento y respaldo</button></div>'
    + section("Tus carpetas", folderGrid(sortedFolders()), tools)
    + section("Todas las canciones", trackGrid(tracks));
}

function search() {
  return heading("Buscar", "Busca por canción, artista o álbum en tu biblioteca y en catálogos compatibles.")
    + '<form class="search-box" id="search-form" role="search">'
    + '<div class="query-row"><input class="field" type="search" id="query" maxlength="120" aria-label="Canción, artista o álbum" placeholder="Canción, artista o álbum" value="' + escapeText(query) + '">'
    + '<button class="primary" type="submit">' + icon("search") + ' Buscar</button></div>'
    + '<div class="search-options"><label>Buscar por <select id="search-field" aria-label="Buscar por">'
    + [["any","Todo"],["title","Canción"],["artist","Artista"],["album","Álbum"]].map(([value,label]) => (
      '<option value="' + value + '"' + (value === searchField ? ' selected' : '') + '>' + label + '</option>')).join("")
    + '</select></label><label>País de iTunes <input class="field country-field" id="search-country" aria-label="País de iTunes" maxlength="2" pattern="[A-Za-z]{2}" required value="' + searchCountry + '"></label>'
    + '<label class="check"><input type="checkbox" id="search-online"' + (externalEnabled ? ' checked' : '') + '> Consultar iTunes Store y Audius</label></div></form>'
    + '<div id="results"></div><div id="external-results" aria-live="polite"></div>';
}

function dj() {
  return heading("DJ personal", "Tu futuro asistente musical conversacional.")
    + '<section class="feature"><span>' + icon("headphones") + '</span><h2>Asistente en preparación</h2>'
    + '<p>Aquí podrás pedir sugerencias según tus gustos, tu estado de ánimo o lo que quieras escuchar.</p></section>';
}

function spotifyScreen() {
  const configured = spotifyMusic.ready;
  const connected = spotifyMusic.connected();
  const freshLists = connected ? spotifyLists.filter((item) => Date.now() - item.savedAt < 86400000) : [];
  const selected = freshLists.find((item) => item.id === spotifySelected);
  const logo = '<img class="spotify-logo" src="iconos/spotify-blanco.svg" alt="Spotify">';
  const button = (action, label, disabled = false) => '<button type="button" class="secondary" data-action="' + action
    + '"' + (disabled ? ' disabled' : '') + '>' + label + '</button>';
  const source = (url, text) => '<a class="secondary" href="' + escapeText(url)
    + '" target="_blank" rel="noopener noreferrer">' + text + '</a>';
  const pageSize = 20;
  const body = !selected ? "" : '<div class="spotify-playlist section"><div class="section-head"><h2>'
    + escapeText(selected.name) + '</h2>' + source(selected.url, "Abrir playlist en Spotify") + '</div><p>'
    + selected.tracks.length + ' canciones importadas'
    + (selected.omitted ? ' · ' + selected.omitted + ' omitidas por tipo o disponibilidad' : '')
    + '</p><div class="external-grid section">'
    + selected.tracks.slice(spotifyOffset, spotifyOffset + pageSize).map((track) => {
      const art = track.cover
        ? '<img class="spotify-art" src="' + escapeText(track.cover)
          + '" width="56" height="56" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">'
        : '<span class="external-art" aria-hidden="true">' + icon("wave") + '</span>';
      return '<article class="external-card spotify-row">' + art + '<div><strong>' + escapeText(track.title)
        + (track.explicit ? ' <abbr title="Contenido explícito" class="explicit-label">E</abbr>' : '')
        + '</strong><p>' + escapeText([track.artist, track.album,
          track.seconds === null ? "" : formatTime(track.seconds)].filter(Boolean).join(" · ")) + '</p>'
        + '<small>' + (track.preview ? "Spotify informa una vista previa" : "Canción encontrada") + '</small></div>'
        + '<div class="external-links">' + source(track.url,
          'Abrir en <img class="spotify-row-logo" src="iconos/spotify-blanco.svg" alt="Spotify">') + '</div></article>';
    }).join("") + '</div>' + (selected.tracks.length > pageSize ? '<div class="tools spotify-pages">'
      + button("spotify-prev", "Anterior", spotifyOffset === 0) + '<span>' + (spotifyOffset + 1) + '–'
      + Math.min(spotifyOffset + pageSize, selected.tracks.length) + ' de ' + selected.tracks.length + '</span>'
      + button("spotify-next", "Siguiente", spotifyOffset + pageSize >= selected.tracks.length) + '</div>' : '') + '</div>';
  return '<a class="text-button" href="#biblioteca">Volver a Biblioteca</a>'
    + heading("Importar playlist de Spotify", "Consulta los metadatos de una playlist que tu cuenta pueda leer.")
    + '<section class="feature spotify-feature">' + logo
    + '<form id="spotify-form" class="spotify-form"><label class="form-label">Enlace de playlist'
    + '<input class="field" id="spotify-link" name="playlist" type="text" inputmode="url" maxlength="360" required '
    + 'placeholder="https://open.spotify.com/playlist/…" value="' + escapeText(spotifyLink) + '"></label>'
    + '<div class="tools"><button type="submit" class="primary"' + (!configured || spotifyBusy ? ' disabled' : '') + '>'
    + (connected ? "Importar y actualizar" : "Conectar e importar") + '</button>'
    + (configured && !connected ? button("spotify-connect", "Conectar Spotify", spotifyBusy) : '')
    + (connected ? button("spotify-disconnect", "Desconectar Spotify", spotifyBusy) : '') + '</div></form>'
    + '<p class="spotify-status" role="status">' + escapeText(spotifyMessage || (!configured
      ? "Configura el Client ID de Spotify para habilitar la importación."
      : connected ? "Cuenta conectada. La copia de metadatos se conserva hasta 24 horas."
        : "Se abrirá Spotify para autorizar la lectura de playlists.")) + '</p></section>'
    + (freshLists.length ? section("Playlists importadas", '<div class="tools">' + freshLists.map((item) =>
      '<button type="button" class="secondary" data-action="spotify-list" data-id="' + escapeText(item.id)
      + '" aria-pressed="' + (item.id === spotifySelected) + '">' + escapeText(item.name) + '</button>').join("") + '</div>') : '')
    + body;
}

async function loadSpotifyLists() {
  spotifyLists = await spotifyMusic.list();
  if (!spotifyLists.some((item) => item.id === spotifySelected)) spotifySelected = spotifyLists[0]?.id;
  if (page() === "spotify") render();
}

async function spotifyOperation(run) {
  if (spotifyBusy) return;
  spotifyBusy = true;
  spotifyMessage = "Consultando Spotify…";
  if (page() === "spotify") render();
  try { await run(); }
  catch (error) {
    spotifyMessage = error.name === "TimeoutError" ? "Spotify tardó demasiado en responder." : error.message;
  } finally {
    spotifyBusy = false;
    if (page() === "spotify") render();
  }
}

async function importSpotify(id) {
  const result = await spotifyMusic.importPlaylist(id);
  spotifySelected = result.id;
  spotifyOffset = 0;
  spotifyMessage = "Playlist importada. Las canciones se abren en Spotify.";
  await loadSpotifyLists();
}

function renderResults() {
  const terms = musicCatalog.normalize(query).split(" ");
  const matches = tracks.filter((track) => {
    const haystack = musicCatalog.normalize(searchField === "any"
      ? [track.title, track.artist, track.album].filter(Boolean).join(" ") : track[searchField]);
    return terms.every((term) => haystack.includes(term));
  });
  document.querySelector("#results").innerHTML = section("Biblioteca local", trackGrid(matches));
  renderExternal();
  updatePlayback();
}

function countryFromBrowser() {
  try {
    const region = new Intl.Locale(navigator.language).region;
    return /^[A-Z]{2}$/.test(region ?? "") ? region : "US";
  } catch { return "US"; }
}

const matchLabel = {
  confirmed:"Coincidencia exacta · ISRC", metadata:"Coincidencia exacta por metadatos · Grabación sin confirmar",
  alternate:"Versión alternativa", unconfirmed:"Coincidencia no confirmada"
};

function catalogCard(track, index) {
  const provider = musicCatalog.providerNames[track.provider];
  const onlineId = "audius:" + track.id;
  const playable = track.provider === "audius" && track.playback && !unavailableStreams.has(onlineId) && navigator.onLine;
  if (playable) onlineResults.set(onlineId, { ...track, id:onlineId, color:"#547af5" });
  const availability = playable
    ? (track.playback.kind === "preview" ? "Vista previa disponible" : "Reproducción completa disponible")
    : "Canción encontrada · Abrir en el servicio";
  const art = track.image ? '<img src="' + escapeText(track.image) + '" alt="" width="56" height="56" loading="lazy" decoding="async" referrerpolicy="no-referrer">'
    : '<span class="external-art" aria-hidden="true">' + icon("wave") + '</span>';
  return '<article class="external-card">' + art + '<div><strong>' + escapeText(track.title) + '</strong><p>'
    + escapeText([track.artist, track.album, provider].filter(Boolean).join(" · ")) + '</p>'
    + '<small>' + availability + '</small>'
    + (track.match ? '<small>' + matchLabel[track.match] + '</small>' : '') + '</div><div class="external-links">'
    + (playable ? '<button class="primary" type="button" data-action="play-online" data-id="' + onlineId + '">'
      + (track.playback.kind === "preview" ? "Escuchar vista previa" : "Escuchar completa") + '</button>'
      + '<button class="text-button" type="button" data-action="queue-online" data-id="' + onlineId + '">Añadir a cola en línea</button>' : '')
    + '<a class="secondary" target="_blank" rel="noopener noreferrer" href="' + escapeText(track.url) + '">Abrir en ' + provider + '</a>'
    + (index === undefined ? '' : '<button type="button" class="text-button" data-action="compare" data-provider="' + track.provider + '" data-index="' + index + '">Comparar</button>')
    + '</div></article>';
}

function renderExternal() {
  const target = document.querySelector("#external-results");
  if (!target) return;
  if (!catalogGroups) {
    if (catalogRequest) target.innerHTML = '<p class="empty">Consultando catálogos…</p>';
    else if (query && externalEnabled && !navigator.onLine) target.innerHTML = '<p class="empty">Sin conexión. La búsqueda local sigue disponible.</p>';
    else target.textContent = "";
    return;
  }
  target.innerHTML = catalogGroups.map((group) => {
    const title = musicCatalog.providerNames[group.id] + (group.id === "itunes" ? " · " + searchCountry : "");
    const message = group.error ? "No se pudo consultar este catálogo. Vuelve a intentar."
      : group.unsupported ? "La búsqueda por álbum está disponible en iTunes Store."
      : "No se encontraron resultados en esta consulta.";
    const body = group.results.length ? '<div class="external-grid">' + group.results.map(catalogCard).join("") + '</div>'
      : '<p class="empty">' + message + '</p>';
    return section(title, body);
  }).join("");
}

async function externalSearch() {
  catalogRequest?.abort();
  catalogRequest = undefined;
  catalogGroups = null;
  if (!query || !externalEnabled || !navigator.onLine) {
    renderResults();
    return;
  }
  const request = new AbortController();
  catalogRequest = request;
  renderResults();
  const results = await musicCatalog.search(query, { field:searchField, country:searchCountry, signal:request.signal });
  if (request.signal.aborted) return;
  catalogRequest = undefined;
  catalogGroups = results;
  renderExternal();
}

async function compareTrack(provider, index) {
  const track = catalogGroups?.find((item) => item.id === provider)?.results[index];
  if (!track) return;
  compareRequest?.abort();
  const request = new AbortController();
  compareRequest = request;
  openDialog("Comparar canción", catalogCard(track) + '<p class="empty">Buscando en el otro catálogo…</p>', "Listo", () => {});
  const comparison = await musicCatalog.compare(track, { country:searchCountry, signal:request.signal });
  if (request.signal.aborted || !dialog.open || compareRequest !== request) return;
  fields.innerHTML = catalogCard(track) + '<p class="comparison-note">Los resultados corresponden a esta consulta. La disponibilidad de reproducción depende del servicio y la región.</p>'
    + comparison.map((group) => '<h3>' + musicCatalog.providerNames[group.id] + '</h3>'
      + (group.results.length ? group.results.map((item) => catalogCard(item)).join("")
        : '<p class="empty">' + (group.error ? "Catálogo temporalmente inaccesible." : "Sin coincidencias comprobadas en esta consulta.") + '</p>')).join("");
}

function render() {
  const current = page();
  const screens = { inicio: home, biblioteca: library, buscar: search, dj, spotify: spotifyScreen };
  main.innerHTML = screens[current]();
  for (const link of document.querySelectorAll("[data-page]")) {
    if (link.dataset.page === (current === "spotify" ? "biblioteca" : current)) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  const order = document.querySelector("#folder-order");
  if (order) order.value = state.order;
  if (current === "buscar") renderResults();
  else updatePlayback();
}

function formatTime(value) {
  const whole = Math.floor(value);
  return Math.floor(whole / 60) + ":" + String(whole % 60).padStart(2, "0");
}

function updateProgress() {
  const duration = playbackDuration();
  const position = Math.min(duration, seconds);
  for (const [slider, prefix] of [[timeline, ""], ...(fullPlayer.open ? [[fullTimeline, "full-"]] : [])]) {
    slider.disabled = selectedTrack().id !== currentTrackId() || duration <= 0;
    slider.max = duration || 1;
    slider.value = position;
    slider.style.setProperty("--played", (duration ? position / duration * 100 : 0) + "%");
    slider.setAttribute("aria-valuetext", formatTime(position) + " de " + formatTime(duration));
    document.querySelector("#" + prefix + "elapsed").textContent = formatTime(position);
    document.querySelector("#" + prefix + "duration").textContent = duration > 0 ? formatTime(duration) : "—";
  }
  const track = selectedTrack();
  playerSystem.update(track.size || onlineTrack ? track : null, playing(), position, duration);
}

function updatePlayback() {
  const current = selectedTrack();
  const isPlaying = playing();
  for (const slot of document.querySelectorAll(fullPlayer.open ? "#mini-disc, #full-disc" : "#mini-disc")) {
    if (slot.dataset.id !== current.id) {
      slot.innerHTML = vinyl(current);
      slot.dataset.id = current.id;
    }
    slot.firstElementChild.classList.toggle("spinning", isPlaying);
  }
  const missing = current.id !== currentTrackId();
  const sourceText = onlineTrack ? (current.playback.kind === "preview" ? "Vista previa de Audius" : "Audius · En línea") : "";
  document.querySelector("#track-title").textContent = missing ? "Canción no importada" : current.title;
  document.querySelector("#track-caption").textContent = missing ? "Disponible al importar el archivo" : sourceText || (current.size
    ? current.artist : "Demo visual · Sin audio");
  for (const button of [play, ...(fullPlayer.open ? [document.querySelector("#full-play")] : [])]) {
    button.innerHTML = icon(isPlaying ? "pause" : "play");
    button.setAttribute("aria-label", isPlaying ? "Pausar" : "Reproducir");
    button.disabled = missing;
  }
  if (fullPlayer.open) {
    document.querySelector("#full-title").textContent = missing ? "Canción no importada" : current.title;
    document.querySelector("#full-artist").textContent = missing ? "Importa el archivo en este dispositivo." : [current.artist, current.album,
      sourceText || (current.size ? "" : "Demo visual · Sin audio")].filter(Boolean).join(" · ");
    const source = document.querySelector("#full-source");
    source.hidden = !onlineTrack;
    if (onlineTrack) source.href = current.url;
    document.querySelector("#queue-heading").textContent = onlineTrack ? "Cola en línea de Audius" : "Cola de reproducción";
    document.querySelector("#back-local").hidden = !onlineTrack;
    document.querySelector("#shuffle").setAttribute("aria-pressed", String(state.shuffle));
    document.querySelector("#repeat").value = state.repeat;
    updateSleepLabel();
    renderQueue();
  }
  for (const button of document.querySelectorAll(".track-demo")) {
    const active = button.dataset.id === current.id;
    button.classList.toggle("is-current", active);
    button.setAttribute("aria-pressed", String(active && isPlaying));
    button.querySelector(".vinyl").classList.toggle("spinning", active && isPlaying);
  }
  updateProgress();
  scheduleProgress();
}

function scheduleProgress() {
  clearTimeout(progressTimer);
  if (startedAt !== null && !document.hidden) {
    const nextSecond = (Math.floor(seconds) + 1) * 1000;
    progressTimer = setTimeout(syncProgress, Math.max(0, startedAt + nextSecond - performance.now() + 8));
  }
}

function syncProgress() {
  if (startedAt === null) return;
  seconds = Math.min(selectedTrack().seconds, (performance.now() - startedAt) / 1000);
  if (seconds >= selectedTrack().seconds) {
    startedAt = null;
    checkpoint(true);
    if (!nextTrack(true)) updatePlayback();
  } else {
    updateProgress();
    checkpoint();
    scheduleProgress();
  }
}

function toggleDemo() {
  if (onlineTrack) {
    if (playing()) audio.pause();
    else if (audioTrackId === onlineTrack.id) startAudio();
    else playOnline(onlineTrack.id);
    return;
  }
  if (!libraryReady && state.selectedTrack.startsWith("local:")) return;
  if (selectedTrack().id !== state.selectedTrack) return notify("Importa la canción en este dispositivo para escucharla.");
  if (selectedTrack().size) {
    if (playing()) audio.pause();
    else if (audioTrackId === state.selectedTrack) startAudio();
    else loadAudio(state.selectedTrack, seconds, true);
    return;
  }
  if (startedAt === null) {
    if (seconds >= selectedTrack().seconds) seconds = 0;
    startedAt = performance.now() - seconds * 1000;
  } else {
    seconds = Math.min(selectedTrack().seconds, (performance.now() - startedAt) / 1000);
    startedAt = null;
  }
  checkpoint(true);
  updatePlayback();
}

function changeTrack(trackId, start, remember = true) {
  onlineTrack = undefined;
  if (remember && state.selectedTrack !== trackId) {
    state.history.push(state.selectedTrack);
    if (state.history.length > 200) state.history.shift();
  }
  resetAudio();
  state.selectedTrack = trackId;
  seconds = 0;
  const local = selectedTrack().size;
  startedAt = start && !local ? performance.now() : null;
  if (local) loadAudio(trackId, 0, start);
  state.position = 0;
  saveState();
  updatePlayback();
}

function playableQueue() {
  if (onlineTrack) return onlineQueue.filter((id) => !unavailableStreams.has(id));
  return playableLocalQueue();
}

function playableLocalQueue() {
  const current = tracks.find((track) => track.id === state.selectedTrack) ?? demos[0];
  return state.queue.length ? state.queue.filter((id) => tracks.some((track) => track.id === id))
    : tracks.filter((track) => Boolean(track.size) === Boolean(current.size)).map((track) => track.id);
}

function nextTrack(automatic = false) {
  const current = selectedTrack();
  const queue = playableQueue();
  const index = queue.indexOf(current.id);
  const start = automatic || playing();
  if (automatic && state.repeat === "one") {
    if (onlineTrack) return playOnline(current.id);
    else changeTrack(current.id, true, false);
    return true;
  }
  let next = queue[index + 1];
  if (!next && (state.repeat === "list" || (!onlineTrack && !automatic && !current.size && !state.queue.length))) {
    if (state.shuffle && queue.length > 1) {
      const order = shuffled(queue.filter((id) => id !== current.id));
      if (onlineTrack) onlineQueue = [...order, current.id];
      else state.queue = [...order, current.id];
      next = order[0];
    } else next = queue[0];
  }
  if (next) {
    if (onlineTrack) return playOnline(next, start);
    else changeTrack(next, start);
  }
  else if (!automatic) notify("Llegaste al final de la cola.");
  return Boolean(next);
}

function previousTrack() {
  const position = audioTrackId === currentTrackId() ? audio.currentTime : seconds;
  if (position > 1.5) return seek(0);
  if (onlineTrack) {
    const queue = playableQueue();
    const previous = queue[queue.indexOf(onlineTrack.id) - 1];
    return previous ? playOnline(previous, playing()) : seek(0);
  }
  let previous;
  while (state.history.length && !previous) {
    const id = state.history.pop();
    if (tracks.some((track) => track.id === id)) previous = id;
  }
  const queue = playableQueue();
  previous ??= queue[queue.indexOf(state.selectedTrack) - 1];
  if (previous) changeTrack(previous, playing(), false);
  else seek(0);
}

function shuffled(ids) {
  const list = [...ids];
  for (let index = list.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [list[swap], list[index]] = [list[index], list[swap]];
  }
  return list;
}

function playCard(id, card) {
  if (onlineTrack) returnLocal();
  if (id === state.selectedTrack) return toggleDemo();
  const kind = Boolean(tracks.find((track) => track.id === id)?.size);
  const ids = [...card.closest(".record-grid").querySelectorAll("[data-track]")].map((item) => item.dataset.track)
    .filter((item) => Boolean(tracks.find((track) => track.id === item)?.size) === kind);
  state.queueOriginal = trackIds(ids);
  state.queue = state.shuffle ? [id, ...shuffled(ids.filter((item) => item !== id))] : [...ids];
  if (!ids.includes(state.selectedTrack)) state.history = [];
  changeTrack(id, true, ids.includes(state.selectedTrack));
}

function setQueue(ids, online = false) {
  if (online) onlineQueue = onlineOriginal = [...new Set(ids)];
  else {
    state.queue = trackIds(ids);
    state.queueOriginal = [...state.queue];
    saveState();
  }
  renderQueue();
}

function enqueue(id) {
  if (id.startsWith("audius:")) {
    if (!onlineResults.has(id) || unavailableStreams.has(id)) return;
    if (id === onlineTrack?.id) return notify("Esta canción ya está seleccionada.");
    const queue = onlineQueue.filter((item) => item !== id);
    const after = onlineTrack ? queue.indexOf(onlineTrack.id) + 1 : queue.length;
    queue.splice(after, 0, id);
    setQueue(queue, true);
    notify("Añadida a la cola en línea de Audius.");
    return;
  }
  if (id === state.selectedTrack) return notify("Esta canción ya está seleccionada.");
  let queue = (state.queue.length ? state.queue : playableLocalQueue()).filter((item) => item !== id);
  if (!queue.includes(state.selectedTrack)) queue = [state.selectedTrack, ...queue];
  queue.splice(queue.indexOf(state.selectedTrack) + 1, 0, id);
  setQueue(queue);
  notify("Añadida para reproducir a continuación.");
}

function removeFromQueue(id) {
  if (id === currentTrackId() || id === state.selectedTrack) return notify("La canción actual sigue en la cola.");
  const online = id.startsWith("audius:");
  const queue = online ? onlineQueue : (state.queue.length ? state.queue : playableLocalQueue());
  if (!queue.includes(id)) return notify("Esta canción no está en la cola.");
  setQueue(queue.filter((item) => item !== id), online);
  notify("Canción retirada de la cola.");
}

function moveQueue(id, target) {
  const online = id.startsWith("audius:");
  const ids = [...(online ? onlineQueue : (state.queue.length ? state.queue : playableLocalQueue()))];
  const from = ids.indexOf(id);
  if (from < 0 || target < 0 || target >= ids.length || target === from) return;
  ids.splice(target, 0, ids.splice(from, 1)[0]);
  setQueue(ids, online);
  if (fullPlayer.open && !gesture) {
    [...document.querySelectorAll("#queue [data-action]")].find((button) => button.dataset.id === id
      && button.dataset.action === (target < from ? "queue-up" : "queue-down"))?.focus();
  }
}

function renderQueue() {
  if (!fullPlayer.open) return;
  const ids = onlineTrack ? onlineQueue : (state.queue.length ? state.queue : playableLocalQueue());
  const lookup = (id) => onlineTrack ? onlineResults.get(id) : tracks.find((track) => track.id === id);
  const list = document.querySelector("#queue");
  const signature = JSON.stringify([currentTrackId(), ids.map((id) => [id, lookup(id)?.title, unavailableStreams.has(id)])]);
  if (list.dataset.signature === signature) return;
  list.dataset.signature = signature;
  list.innerHTML = ids.map((id, index) => {
    const track = lookup(id);
    const current = id === currentTrackId();
    return '<li class="queue-item" data-queue-id="' + id + '"' + (current ? ' aria-current="true"' : '') + '>'
      + '<button class="queue-track" type="button" data-action="queue-play" data-id="' + id + '"'
      + (!track || unavailableStreams.has(id) ? ' disabled' : '') + '>' + escapeText(track?.title ?? "Canción no importada")
      + '<small>' + (current ? "Actual · " : "") + escapeText(track?.artist ?? "Importa el archivo en este dispositivo") + '</small></button>'
      + '<div class="queue-buttons"><span class="drag-handle" aria-hidden="true">⠿</span>'
      + '<button class="icon-button" data-action="queue-up" data-id="' + id + '" aria-label="Subir" data-index="' + index + '"' + (index === 0 ? ' disabled' : '') + '>↑</button>'
      + '<button class="icon-button" data-action="queue-down" data-id="' + id + '" aria-label="Bajar" data-index="' + index + '"' + (index === ids.length-1 ? ' disabled' : '') + '>↓</button>'
      + '<button class="icon-button" data-action="queue-remove" data-id="' + id + '" aria-label="Quitar de la cola"' + (current ? ' disabled' : '') + '>' + icon("close") + '</button></div></li>';
  }).join("");
}

function toggleShuffle() {
  if (onlineTrack) {
    state.shuffle = !state.shuffle;
    onlineQueue = state.shuffle ? [onlineTrack.id, ...shuffled(onlineOriginal.filter((id) => id !== onlineTrack.id))] : [...onlineOriginal];
    saveState();
    updatePlayback();
    return;
  }
  const queue = state.queue.length ? state.queue : playableQueue();
  state.shuffle = !state.shuffle;
  if (state.shuffle) {
    state.queueOriginal = [...queue];
    state.queue = [state.selectedTrack, ...shuffled(queue.filter((id) => id !== state.selectedTrack))];
  } else state.queue = [...state.queueOriginal];
  saveState();
  updatePlayback();
}

function updateSleepLabel() {
  const left = Math.ceil((state.sleepUntil - Date.now()) / 60000);
  document.querySelector("#sleep").textContent = left > 0 ? "Apagar en " + left + " min" : "Temporizador";
}

function scheduleSleep() {
  clearTimeout(sleepTimer);
  if (state.sleepUntil) {
    const left = state.sleepUntil - Date.now();
    if (left <= 0) {
      state.sleepUntil = 0;
      if (startedAt !== null) toggleDemo();
      audio.pause();
      saveState();
      notify("Reproducción pausada por el temporizador.");
    } else sleepTimer = setTimeout(scheduleSleep, Math.min(left, 60000));
  }
  updateSleepLabel();
}

function sleepSettings() {
  openDialog("Temporizador de apagado",
    '<label class="form-label">Pausar después de<select name="minutes"><option value="15">15 minutos</option>'
    + '<option value="30">30 minutos</option><option value="60">60 minutos</option><option value="90">90 minutos</option>'
    + '<option value="0">Desactivar temporizador</option></select></label>',
    "Guardar", (data) => {
      const minutes = Number(data.get("minutes"));
      state.sleepUntil = minutes ? Date.now() + minutes * 60000 : 0;
      saveState(minutes ? "Temporizador activado." : "Temporizador desactivado.");
      scheduleSleep();
    });
}

function expandPlayer() {
  if (!fullPlayer.open) fullPlayer.showModal();
  updatePlayback();
}

function stopGesture() {
  if (!gesture) return;
  clearTimeout(gesture.hold);
  gesture.row?.classList.remove("queue-dragging");
  gesture = undefined;
}

function blockGestureClick(target) {
  gestureClick = { target, until:performance.now() + 380 };
}

document.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  const card = event.target.closest("[data-track]");
  const row = event.target.closest("[data-queue-id]");
  const mini = event.target.closest(".playing-track");
  const full = event.target.closest(".full-head, #full-disc");
  if (!card && !row && !mini && !full) return;
  if (row && event.target.closest(".queue-buttons button")) return;
  stopGesture();
  gesture = { pointer:event.pointerId, x:event.clientX, y:event.clientY, card, row, mini, full };
  if (row && event.target.closest(".drag-handle")) {
    event.target.setPointerCapture(event.pointerId);
    gesture.hold = setTimeout(() => {
      gesture.drag = true;
      row.classList.add("queue-dragging");
    }, 340);
  } else if (card && !event.target.closest("[data-action='context']")) {
    gesture.hold = setTimeout(() => {
      blockGestureClick(card);
      trackContext(card.dataset.track);
      stopGesture();
    }, 530);
  }
});

document.addEventListener("pointermove", (event) => {
  if (!gesture || gesture.pointer !== event.pointerId || gesture.drag) return;
  if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 12) clearTimeout(gesture.hold);
});

document.addEventListener("pointerup", (event) => {
  if (!gesture || gesture.pointer !== event.pointerId) return;
  const { x, y, card, row, mini, full, drag } = gesture;
  const dx = event.clientX - x;
  const dy = event.clientY - y;
  stopGesture();
  if (drag) {
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-queue-id]");
    if (target) moveQueue(row.dataset.queueId, [...document.querySelectorAll("#queue li")].indexOf(target));
  } else if (Math.abs(dx) > 56 && Math.abs(dx) > 1.4 * Math.abs(dy) && (card || row)) {
    const id = card?.dataset.track ?? row.dataset.queueId;
    if (dx > 0) enqueue(id);
    else removeFromQueue(id);
  } else if (Math.abs(dy) > 42 && Math.abs(dy) > Math.abs(dx) && (mini && dy < 0 || full && dy > 0)) {
    if (mini) expandPlayer();
    else fullPlayer.close();
  } else return;
  blockGestureClick(card ?? row ?? mini ?? full);
});

document.addEventListener("pointercancel", stopGesture);
document.addEventListener("contextmenu", (event) => {
  const card = event.target.closest("[data-track]");
  if (!card) return;
  event.preventDefault();
  if (!dialog.open) trackContext(card.dataset.track);
});

function playing() {
  return startedAt !== null || (audioTrackId === currentTrackId() && !audio.paused && !audio.ended);
}

function playbackDuration() {
  if (audioTrackId === currentTrackId() && Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration;
  if (onlineTrack?.playback.kind === "preview") return 0;
  return Number.isFinite(selectedTrack().seconds) ? selectedTrack().seconds : 0;
}

function resetAudio() {
  audioLoad++;
  const old = audioUrl;
  audioTrackId = audioUrl = undefined;
  if (!old) return;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  if (old.startsWith("blob:")) URL.revokeObjectURL(old);
}

function returnLocal() {
  if (!onlineTrack) return;
  onlineTrack = undefined;
  resetAudio();
  seconds = state.position;
  if (selectedTrack().size) loadAudio(state.selectedTrack, seconds, false);
  updatePlayback();
}

function playOnline(id, autoplay = true) {
  const track = onlineResults.get(id);
  if (!track || unavailableStreams.has(id) || !navigator.onLine) return false;
  if (!onlineTrack) {
    if (startedAt !== null) {
      seconds = Math.min(selectedTrack().seconds, (performance.now() - startedAt) / 1000);
      startedAt = null;
    }
    checkpoint(true);
  }
  resetAudio();
  onlineTrack = track;
  if (!onlineQueue.includes(id)) {
    onlineQueue = [...onlineQueue, id];
    onlineOriginal = [...onlineOriginal, id];
  }
  seconds = 0;
  audioTrackId = id;
  audioUrl = track.playback.url;
  audio.src = audioUrl;
  updatePlayback();
  if (autoplay) startAudio();
  return true;
}

async function loadAudio(id, position, autoplay) {
  const request = ++audioLoad;
  try {
    const record = await musicStore.get(id);
    if (request !== audioLoad) return;
    if (!record?.blob) throw new Error("Importa esta canción en este dispositivo para escucharla.");
    audioUrl = URL.createObjectURL(record.blob);
    audioTrackId = id;
    audio.src = audioUrl;
    const target = Number.isFinite(seconds) ? seconds : position;
    if (target > 0) audio.currentTime = Math.min(target, record.seconds);
    if (autoplay) await startAudio();
  } catch (error) {
    if (request === audioLoad) notify(error.message || "No se pudo abrir la canción.");
  }
}

async function startAudio() {
  const version = audioLoad;
  try {
    if (audio.ended) audio.currentTime = 0;
    await audio.play();
  } catch (error) {
    if (version === audioLoad && error.name !== "AbortError") notify("No se pudo iniciar el audio. Pulsa Reproducir para reintentar.");
  }
}

function checkpoint(force = false) {
  if (onlineTrack) return;
  if (!libraryReady && state.selectedTrack.startsWith("local:")) return;
  if (!force && Date.now() - lastCheckpoint < 2000) return;
  lastCheckpoint = Date.now();
  state.position = seconds;
  saveState(undefined, false);
}

function seek(position) {
  seconds = Math.min(playbackDuration(), Math.max(0, position));
  if (audioTrackId === currentTrackId()) audio.currentTime = seconds;
  if (startedAt !== null) startedAt = performance.now() - seconds * 1000;
  updateProgress();
  scheduleProgress();
  checkpoint(true);
}

function adjustVolume(value, persist = true) {
  const volume = Number(value);
  if (!Number.isFinite(volume) || volume < 0 || volume > 1) return;
  state.volume = volume;
  audio.volume = volume;
  document.querySelector("#volume").value = volume;
  document.querySelector("#volume-value").textContent = Math.round(volume * 100) + " %";
  if (persist) saveState(undefined, false);
}

async function refreshTracks() {
  const local = await musicStore.list();
  tracks = [...local, ...demos];
  libraryReady = true;
  render();
}

async function importMusic(files) {
  let added = 0;
  let duplicate = 0;
  let rejected = 0;
  let errorMessage = "";
  for (const file of files) {
    try {
      if (await musicStore.importFile(file)) added++;
      else duplicate++;
    } catch (error) {
      rejected++;
      errorMessage = error.name === "QuotaExceededError" ? "Espacio insuficiente." : error.message;
    }
  }
  await refreshTracks();
  if (added && !selectedTrack().size) changeTrack(tracks.find((item) => item.size).id, false);
  notify([added + " importadas", duplicate + " duplicadas", rejected + " rechazadas"].join(" · ")
    + (errorMessage ? ". " + errorMessage : ""));
}

function readableBytes(bytes) {
  if (!Number.isFinite(bytes)) return "No disponible";
  const unit = ["B", "KB", "MB", "GB", "TB"];
  const power = Math.min(unit.length - 1, Math.max(0, Math.floor(Math.log(Math.max(1, bytes)) / Math.log(1024))));
  return (bytes / 1024 ** power).toLocaleString("es", { maximumFractionDigits: 1 }) + " " + unit[power];
}

async function storageDetails() {
  const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
  const persistent = await navigator.storage?.persisted?.().catch(() => false);
  const music = tracks.reduce((sum, track) => sum + (track.size ?? 0), 0);
  const metadata = new Blob([JSON.stringify(state)]).size;
  openDialog("Almacenamiento y respaldo",
    '<div class="storage-stats"><p>Música <strong>' + readableBytes(music) + '</strong></p>'
    + '<p>Datos y caché <strong>' + readableBytes(estimate ? Math.max(0, estimate.usage - music) + metadata : metadata) + '</strong></p>'
    + '<p>Disponible estimado <strong>' + readableBytes(estimate ? Math.max(0, estimate.quota - estimate.usage) : undefined) + '</strong></p></div>'
    + '<p>' + (persistent ? "Almacenamiento persistente concedido." : "El navegador administra el espacio disponible.") + '</p>'
    + '<div class="tools storage-actions"><button type="button" class="secondary" data-action="persist">Solicitar persistencia</button>'
    + '<button type="button" class="secondary" data-action="export">Exportar respaldo</button>'
    + '<button type="button" class="secondary" data-action="restore">Restaurar respaldo</button>'
    + '<button type="button" class="secondary" data-action="recover-folders">Recuperar carpetas antiguas</button></div>', "Listo", () => {});
}

async function exportMusic() {
  checkpoint(true);
  const blob = await musicStore.backup(state);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "Mi-Musica-" + new Date().toISOString().slice(0, 10) + ".mimusica";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function restoreMusic(file) {
  if (file.name.toLowerCase().endsWith(".json")) {
    if (file.size > 5 * 1024 * 1024) throw new Error("El JSON supera el tamaño de respaldo admitido.");
    const legacy = JSON.parse(await file.text());
    if (!Array.isArray(legacy?.folders)) throw new Error("El archivo JSON no contiene una biblioteca reconocida.");
    recoveryFolders([{ source:"Respaldo JSON", folders:normalizedState(legacy).folders }]);
    return;
  }
  const backup = await musicStore.readBackup(file);
  const imported = normalizedState(backup.state);
  await musicStore.restore(backup.records);
  // Preserve both versions when an existing folder has independent edits.
  for (const folder of imported.folders) {
    const existing = state.folders.find((item) => item.id === folder.id);
    if (!existing) state.folders.push(folder);
    else if (JSON.stringify(existing) !== JSON.stringify(folder)) {
      const copy = { ...folder, name: (folder.name.slice(0, 47) + " (respaldo)") };
      if (!state.folders.some((item) => item.name === copy.name && item.color === copy.color
        && JSON.stringify(item.tracks) === JSON.stringify(copy.tracks))) {
        state.folders.push({ ...copy, id: crypto.randomUUID() });
      }
    }
  }
  state.order = imported.order;
  state.favorites = trackIds([...state.favorites, ...imported.favorites]);
  for (const key of ["queue", "queueOriginal", "history", "shuffle", "repeat"]) state[key] = imported[key];
  adjustVolume(imported.volume, false);
  await refreshTracks();
  changeTrack(imported.selectedTrack, false);
  seek(imported.position);
  saveState("Respaldo restaurado.");
}

async function musicOperation(run) {
  if (musicBusy) return notify("Hay una operación de música en curso.");
  musicBusy = true;
  try { await run(); }
  catch (error) { notify(error.message || "No se pudo completar la operación."); }
  finally { musicBusy = false; }
}

function openDialog(title, body, action, onSave, destructive = false) {
  document.querySelector("#dialog-title").textContent = title;
  fields.innerHTML = body;
  submit.textContent = action;
  submit.hidden = !action;
  submit.className = destructive ? "danger" : "primary";
  pendingSave = onSave;
  if (!dialog.open) dialog.showModal();
  fields.querySelector("[data-focus]")?.focus();
}

function recoveryFolders(snapshots) {
  const groups = snapshots ?? musicRecovery.snapshots(localStorage, normalizedState);
  const available = musicRecovery.candidates(state.folders, groups);
  openDialog("Recuperar carpetas antiguas", '<p>Revisa las copias detectadas en este navegador. Selecciona las carpetas que quieras recuperar.</p>'
    + (available.length ? '<fieldset><legend>Carpetas disponibles</legend>' + available.map(({ source, folder, collision }, index) =>
      '<label class="check recovery-item"><input type="checkbox" name="recover" value="' + index + '"><span><strong>'
      + escapeText(folder.name) + '</strong><small>' + escapeText(source) + ' · ' + folder.tracks.length
      + ' canciones' + (collision ? ' · se guardará una copia' : '') + '</small></span></label>').join("") + '</fieldset>'
      : '<p class="comparison-note">No hay carpetas distintas en las copias disponibles de este origen. Puedes importar un respaldo de otro dispositivo.</p>'),
  available.length ? "Recuperar selección" : "Listo", (data) => {
    if (!available.length) return;
    const chosen = data.getAll("recover").map((index) => available[Number(index)]?.folder).filter(Boolean);
    if (!chosen.length) return false;
    state.folders = musicRecovery.recover(state.folders, chosen,
      () => globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + "-" + Math.random().toString(36).slice(2));
    saveState("Selección recuperada en tu biblioteca.");
  });
}

function editFolder(folder, initialTracks = []) {
  const selected = folder?.tracks ?? initialTracks;
  const options = tracks.map((track) => '<label class="check"><input type="checkbox" name="track" value="'
    + track.id + '"' + (selected.includes(track.id) ? " checked" : "") + '> ' + escapeText(track.title) + '</label>').join("");
  openDialog(folder ? "Editar carpeta" : "Nueva carpeta",
    '<label class="form-label">Nombre <input class="field" name="name" required maxlength="60" value="' + escapeText(folder?.name ?? "") + '" data-focus></label>'
    + '<label class="form-label">Color <input class="field" name="color" type="color" value="' + (folder?.color ?? "#7596ff") + '"></label>'
    + '<fieldset><legend>Canciones</legend>' + options + '</fieldset>'
    + (folder ? '<button class="text-button" style="color:#ffa6b7" type="button" data-action="delete" data-id="' + escapeText(folder.id) + '">Eliminar carpeta</button>' : ""),
    folder ? "Guardar cambios" : "Crear carpeta", (data) => {
      const name = data.get("name").trim();
      if (!name) {
        form.elements.name.setCustomValidity("Escribe un nombre para la carpeta.");
        form.elements.name.reportValidity();
        return false;
      }
      const changes = { name, color: data.get("color"), tracks: trackIds([
        ...data.getAll("track"), ...selected.filter((id) => !tracks.some((track) => track.id === id))
      ]) };
      if (folder) Object.assign(folder, changes);
      else state.folders.push({ id: Date.now().toString(36) + "-" + Math.random().toString(36).slice(2), created: Date.now(), ...changes });
      saveState(folder ? "Carpeta actualizada." : "Carpeta creada.");
    });
}

function confirmDelete(folder) {
  openDialog("Eliminar carpeta", '<p>¿Eliminar «' + escapeText(folder.name) + '»? Sus canciones seguirán disponibles en la biblioteca.</p>',
    "Eliminar carpeta", () => {
      state.folders = state.folders.filter((item) => item.id !== folder.id);
      if (folderId === folder.id) folderId = null;
      saveState("Carpeta eliminada.");
    }, true);
  form.querySelector(".dialog-buttons .secondary").focus();
}

function assignTrack(trackId) {
  const track = tracks.find((item) => item.id === trackId);
  if (!state.folders.length) {
    editFolder(undefined, [trackId]);
    return;
  }
  const choices = sortedFolders().map((folder) => '<label class="check"><input type="checkbox" name="folder" value="'
    + escapeText(folder.id) + '"' + (folder.tracks.includes(trackId) ? " checked" : "") + '> ' + escapeText(folder.name) + '</label>').join("");
  openDialog(track.title, '<fieldset><legend>Guardar en carpetas</legend>' + choices + '</fieldset>',
    "Guardar cambios", (data) => {
      const assigned = new Set(data.getAll("folder"));
      for (const folder of state.folders) {
        const unique = new Set(folder.tracks);
        if (assigned.has(folder.id)) unique.add(trackId);
        else unique.delete(trackId);
        folder.tracks = [...unique];
      }
      saveState("Carpetas actualizadas.");
    });
}

function trackContext(id) {
  const track = tracks.find((item) => item.id === id);
  if (!track) return;
  const control = (action, label) => '<button type="button" class="secondary" data-action="' + action + '" data-id="' + id + '">' + label + '</button>';
  openDialog(track.title, '<div class="track-actions">'
    + control("enqueue", "Reproducir a continuación")
    + control("favorite", state.favorites.includes(id) ? "Quitar de Me gusta" : "Añadir a Me gusta")
    + control("assign", "Mover o guardar en carpetas")
    + control("new-with-track", "Crear carpeta con esta canción")
    + (state.folders.some((folder) => folder.id === folderId) ? control("remove-folder-track", "Quitar de esta carpeta") : "")
    + (track.size ? control("metadata", "Editar título, artista y álbum") : "")
    + '</div>', "", null);
}

function trackMetadata(id) {
  const track = tracks.find((item) => item.id === id);
  const label = (key, name) => '<label class="form-label">' + name + '<input class="field" name="' + key
    + '" maxlength="200" value="' + escapeText(track[key] ?? "") + '"' + (key === "title" ? " required data-focus" : "") + '></label>';
  openDialog("Editar información", label("title", "Título") + label("artist", "Artista") + label("album", "Álbum"), "Guardar cambios", (data) => {
    const title = data.get("title").trim();
    if (!title) return false;
    musicOperation(async () => {
      await musicStore.updateMetadata(id, { title, artist:data.get("artist").trim(), album:data.get("album").trim() });
      await refreshTracks();
      notify("Información actualizada.");
    });
  });
}

const cloudFields = ["folders", "favorites", "order", "queue", "queueOriginal", "shuffle", "repeat"];

function readCloudData() {
  return Object.fromEntries(cloudFields.map((key) => [key, structuredClone(state[key])]));
}

function applyCloudData(data) {
  const sanitized = normalizedState({
    ...state, ...data, folders: Array.isArray(data.folders) ? data.folders : state.folders
  });
  const candidate = { ...state };
  for (const key of cloudFields) candidate[key] = sanitized[key];
  writeState(candidate);
  Object.assign(state, candidate);
  if (folderId && folderId !== "@favorites" && !state.folders.some((folder) => folder.id === folderId)) folderId = null;
  render();
}

function accountContents() {
  const cloud = cloudMusic.view();
  const control = (action, label) => '<button type="button" class="secondary" data-action="' + action + '">' + label + '</button>';
  return '<div data-cloud-account><p role="status">' + escapeText(cloud.message) + '</p>'
    + '<p>Las carpetas, los favoritos, la cola y algunas preferencias pueden sincronizarse. Los archivos de audio permanecen en este dispositivo.</p>'
    + (cloud.user ? '<p class="account-name">' + escapeText(cloud.user.email ?? cloud.user.displayName ?? "Cuenta de Google") + '</p>' : '')
    + (cloud.conflict ? '<h3>Cambios en ambos dispositivos</h3><ul>'
      + cloud.conflict.conflicts.map((item) => '<li>' + escapeText(item) + '</li>').join("")
      + '</ul><p>Elige qué versión mantener para estos cambios. Los cambios compatibles se combinan.</p>' : '')
    + '<div class="tools storage-actions">'
    + (!cloud.configured ? "" : cloud.conflict ? control("cloud-local", "Mantener estos cambios")
      + control("cloud-remote", "Usar cambios de la nube")
      : cloud.user ? (cloud.enabled ? control("cloud-now", "Sincronizar ahora") : control("cloud-enable", "Sincronizar esta biblioteca"))
      : control("cloud-login", cloud.ready ? "Iniciar sesión con Google" : "Cargar inicio de sesión"))
    + (cloud.user ? control("cloud-logout", "Cerrar sesión") : "") + '</div></div>';
}

document.addEventListener("music-cloud-status", () => {
  const cloud = cloudMusic.view();
  const account = document.querySelector(".account-button");
  account.classList.toggle("account-conflict", Boolean(cloud.conflict));
  account.setAttribute("aria-label", cloud.conflict ? "Cuenta · Conflictos de sincronización" : "Cuenta");
  if (!dialog.open || !fields.querySelector("[data-cloud-account]")) return;
  const action = document.activeElement?.dataset.action;
  fields.innerHTML = accountContents();
  if (action) [...fields.querySelectorAll("button")].find((button) => button.dataset.action === action)?.focus();
});

document.addEventListener("click", (event) => {
  if (event.detail && gestureClick?.target.contains(event.target) && performance.now() < gestureClick.until) {
    gestureClick = undefined;
    event.preventDefault();
    return;
  }
  const libraryTab = event.target.closest('[data-page="biblioteca"]');
  if (libraryTab && page() === "biblioteca" && folderId !== null) {
    event.preventDefault();
    folderId = null;
    render();
    window.scrollTo(0, 0);
    return;
  }
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (action.startsWith("cloud-")) {
    cloudMusic.action(action);
    return;
  }
  const folder = state.folders.find((item) => item.id === id);
  switch (action) {
    case "recover-folders": recoveryFolders(); break;
    case "spotify-connect":
      spotifyOperation(() => spotifyMusic.authorize()); break;
    case "spotify-disconnect":
      openDialog("Desconectar Spotify", "<p>Se quitarán de este dispositivo la sesión y las copias temporales de esta cuenta.</p>",
        "Desconectar", () => {
          spotifyOperation(async () => {
            await spotifyMusic.disconnect();
            spotifyLists = [];
            spotifySelected = undefined;
            spotifyMessage = "Cuenta desconectada.";
          });
        }, true);
      break;
    case "spotify-list": spotifySelected = id; spotifyOffset = 0; render(); break;
    case "spotify-prev": spotifyOffset = Math.max(0, spotifyOffset - 20); render(); break;
    case "spotify-next": spotifyOffset += 20; render(); break;
    case "account":
      openDialog("Cuenta y sincronización", accountContents(), "Listo", () => {});
      cloudMusic.connect().catch(() => {});
      break;
    case "compare": compareTrack(button.dataset.provider, Number(button.dataset.index)); break;
    case "expand": expandPlayer(); break;
    case "collapse": fullPlayer.close(); break;
    case "play-online": playOnline(id); break;
    case "queue-online": enqueue(id); break;
    case "back-local": returnLocal(); break;
    case "play": toggleDemo(); break;
    case "previous": previousTrack(); break;
    case "next": nextTrack(); break;
    case "shuffle": toggleShuffle(); break;
    case "sleep": sleepSettings(); break;
    case "queue-up": moveQueue(id, Number(button.dataset.index) - 1); break;
    case "queue-down": moveQueue(id, Number(button.dataset.index) + 1); break;
    case "queue-remove": removeFromQueue(id); break;
    case "queue-play":
      if (id.startsWith("audius:")) {
        if (id === onlineTrack?.id) toggleDemo();
        else playOnline(id);
      } else if (!tracks.some((item) => item.id === id)) notify("Importa esta canción para escucharla en este dispositivo.");
      else if (id === state.selectedTrack) toggleDemo();
      else changeTrack(id, true);
      break;
    case "context": trackContext(id); break;
    case "metadata": trackMetadata(id); break;
    case "new-with-track": editFolder(undefined, [id]); break;
    case "enqueue": if (dialog.open) dialog.close(); enqueue(id); break;
    case "favorite":
      state.favorites = state.favorites.includes(id) ? state.favorites.filter((item) => item !== id) : [...state.favorites, id];
      saveState(state.favorites.includes(id) ? "Añadida a Me gusta." : "Retirada de Me gusta.");
      dialog.close();
      render();
      break;
    case "favorites": folderId = "@favorites"; render(); window.scrollTo(0, 0); break;
    case "remove-folder-track": {
      const current = state.folders.find((item) => item.id === folderId);
      if (current) current.tracks = current.tracks.filter((item) => item !== id);
      saveState("Canción retirada de esta carpeta.");
      dialog.close();
      render();
      break;
    }
    case "import": document.querySelector("#audio-files").click(); break;
    case "storage": musicOperation(storageDetails); break;
    case "export": musicOperation(exportMusic); break;
    case "restore": document.querySelector("#backup-file").click(); break;
    case "persist":
      musicOperation(async () => {
        const granted = await navigator.storage?.persist?.();
        notify(granted ? "Almacenamiento persistente concedido." : "El navegador no concedió almacenamiento persistente.");
        await storageDetails();
      });
      break;
    case "demo": playCard(id, button); break;
    case "folder":
      folderId = id;
      if (page() === "biblioteca") {
        render();
        window.scrollTo(0, 0);
      } else location.hash = "biblioteca";
      break;
    case "all-folders":
      folderId = null;
      render();
      break;
    case "new": editFolder(); break;
    case "edit": if (folder) editFolder(folder); break;
    case "delete": if (folder) confirmDelete(folder); break;
    case "assign": assignTrack(id); break;
    case "close": dialog.close(); break;
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "repeat") {
    state.repeat = event.target.value;
    saveState();
    return;
  }
  if (event.target.id !== "folder-order") return;
  state.order = event.target.value;
  saveState();
  render();
  document.querySelector("#folder-order").focus();
});

document.addEventListener("submit", (event) => {
  if (event.target.id === "spotify-form") {
    event.preventDefault();
    spotifyLink = new FormData(event.target).get("playlist").trim();
    const id = spotifyMusic.playlistId(spotifyLink);
    if (!id) {
      spotifyMessage = "Pega un enlace de playlist de open.spotify.com.";
      render();
      return;
    }
    spotifyOperation(() => spotifyMusic.connected() ? importSpotify(id) : spotifyMusic.authorize(spotifyLink));
    return;
  }
  if (event.target.id !== "search-form") return;
  event.preventDefault();
  query = document.querySelector("#query").value.trim();
  searchField = document.querySelector("#search-field").value;
  searchCountry = document.querySelector("#search-country").value.toUpperCase();
  externalEnabled = document.querySelector("#search-online").checked;
  externalSearch();
});

document.addEventListener("input", (event) => {
  if (event.target.id === "spotify-link") spotifyLink = event.target.value;
});

dialog.addEventListener("close", () => {
  if (compareRequest && !dialog.open) compareRequest.abort();
});

form.addEventListener("input", (event) => {
  if (event.target.name === "name") event.target.setCustomValidity("");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (pendingSave?.(new FormData(form)) === false) return;
  dialog.close();
  render();
});

window.addEventListener("hashchange", () => {
  if (page() !== "biblioteca") folderId = null;
  render();
  window.scrollTo(0, 0);
});

play.addEventListener("click", toggleDemo);
document.querySelector("#next").addEventListener("click", () => nextTrack());
timeline.addEventListener("input", () => seek(Number(timeline.value)));
fullTimeline.addEventListener("input", () => seek(Number(fullTimeline.value)));
document.querySelector("#volume").addEventListener("input", (event) => adjustVolume(event.target.value, false));
document.querySelector("#volume").addEventListener("change", (event) => adjustVolume(event.target.value));

for (const type of ["loadedmetadata", "timeupdate", "seeked", "play", "pause", "ended", "error"]) {
  audio.addEventListener(type, () => {
    if (audioTrackId !== currentTrackId()) return;
    seconds = audio.currentTime;
    if (type === "timeupdate") updateProgress();
    else updatePlayback();
    if (type !== "loadedmetadata") checkpoint(type !== "timeupdate");
    if (type === "error") {
      if (onlineTrack) {
        unavailableStreams.add(onlineTrack.id);
        returnLocal();
        renderExternal();
        if (dialog.open) {
          for (const button of fields.querySelectorAll('[data-action="play-online"], [data-action="queue-online"]')) {
            if (unavailableStreams.has(button.dataset.id)) button.hidden = true;
          }
        }
        notify("Audius no pudo servir esta pista. Puedes abrirla en Audius.");
      } else notify("El navegador no pudo reproducir esta canción.");
    }
    if (type === "ended") nextTrack(true);
  });
}

playerSystem.controls({
  play:() => { if (!playing() && (onlineTrack || selectedTrack().size)) toggleDemo(); },
  pause:() => audio.pause(),
  stop:() => { audio.pause(); seek(0); },
  previoustrack:() => { if (onlineTrack || selectedTrack().size) previousTrack(); },
  nexttrack:() => { if (onlineTrack || selectedTrack().size) nextTrack(); },
  seekbackward:(details) => seek(seconds - (details.seekOffset ?? 10)),
  seekforward:(details) => seek(seconds + (details.seekOffset ?? 10)),
  seekto:(details) => { if (Number.isFinite(details.seekTime)) seek(details.seekTime); }
});

window.addEventListener("offline", () => {
  if (onlineTrack) {
    returnLocal();
    notify("Se perdió la conexión. Tu cola local sigue disponible.");
  }
  renderExternal();
});
window.addEventListener("online", renderExternal);

document.querySelector("#audio-files").addEventListener("change", (event) => {
  const files = [...event.target.files];
  event.target.value = "";
  if (files.length) musicOperation(() => importMusic(files));
});

document.querySelector("#backup-file").addEventListener("change", (event) => {
  const [file] = event.target.files;
  event.target.value = "";
  if (file) openDialog("Restaurar respaldo",
    "<p>Se añadirán las canciones y carpetas del respaldo. Se conservarán las carpetas locales y se recuperarán las preferencias del respaldo.</p>",
    "Restaurar", () => { musicOperation(() => restoreMusic(file)); });
});

document.addEventListener("visibilitychange", () => {
  document.documentElement.classList.toggle("page-hidden", document.hidden);
  if (document.hidden) {
    clearTimeout(progressTimer);
    checkpoint(true);
  }
  else {
    scheduleSleep();
    syncProgress();
  }
});

window.addEventListener("pagehide", () => checkpoint(true));
cloudMusic.init(readCloudData, applyCloudData);
scheduleSleep();
adjustVolume(state.volume, false);

for (const target of document.querySelectorAll("[data-icon]")) target.innerHTML = icon(target.dataset.icon);
render();
spotifyMusic.callback().then(async (result) => {
  if (result) {
    render();
    spotifyMessage = "Cuenta conectada.";
    if (result.playlist) {
      spotifyLink = "https://open.spotify.com/playlist/" + result.playlist;
      await spotifyOperation(() => importSpotify(result.playlist));
    }
  }
  await loadSpotifyLists();
}).catch((error) => {
  spotifyMessage = error.message;
  if (page() === "spotify") render();
});
refreshTracks().then(() => {
  if (selectedTrack().size) loadAudio(state.selectedTrack, seconds, false);
  else if (state.selectedTrack !== selectedTrack().id) notify("La última canción no está almacenada en este dispositivo.");
}).catch(() => notify("El almacenamiento de audio no está disponible en este navegador."));

if (location.protocol !== "file:" && window.isSecureContext && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Mi Música: no se pudo activar la caché de la aplicación.", error);
    });
  }, { once: true });
}

