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
  next: '<path d="M5 5v14l11-7zm12 0h2v14h-2z" fill="currentColor" stroke="none"/>'
};

const tracks = [
  { id: "pulso", title: "Pulso nocturno", artist: "Órbita", seconds: 222, color: "#3e69ff" },
  { id: "horizonte", title: "Horizonte azul", artist: "Luz Polar", seconds: 198, color: "#9560f6" },
  { id: "cinta", title: "Cinta magnética", artist: "Circuito Sur", seconds: 246, color: "#27a9b4" },
  { id: "gravedad", title: "Gravedad cero", artist: "Nova Prisma", seconds: 211, color: "#e27865" }
];

const initialState = {
  order: "name",
  selectedTrack: "pulso",
  folders: [
    { id: "nocturnas", name: "Sesiones nocturnas", color: "#7596ff", created: 1, tracks: ["pulso", "gravedad"] },
    { id: "electronica", name: "Electrónica", color: "#ac85ff", created: 2, tracks: ["horizonte", "cinta", "pulso"] },
    { id: "descubrir", name: "Por descubrir", color: "#55c9cc", created: 3, tracks: ["gravedad"] }
  ]
};

const storageKey = "mi-musica-v1";
const main = document.querySelector("main");
const dialog = document.querySelector("#dialog");
const form = document.querySelector("#dialog-form");
const fields = document.querySelector("#dialog-fields");
const submit = document.querySelector("#dialog-submit");
const timeline = document.querySelector("#timeline");
const play = document.querySelector("#play");
const status = document.querySelector("#status");
const validColor = /^#[0-9a-f]{6}$/i;
const pages = ["inicio", "buscar", "biblioteca", "dj"];
const state = loadState();
let folderId = null;
let query = "";
let seconds = 0;
let startedAt = null;
let pendingSave = null;
let toastTimer;
let progressTimer;

function icon(name) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[name] + "</svg>";
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Array.isArray(saved.folders)) {
      return {
        order: saved.order === "date" ? "date" : "name",
        selectedTrack: tracks.some((track) => track.id === saved.selectedTrack) ? saved.selectedTrack : tracks[0].id,
        folders: saved.folders.filter((folder) => folder
          && typeof folder.id === "string"
          && typeof folder.name === "string"
          && validColor.test(folder.color)
          && Number.isFinite(folder.created)
          && Array.isArray(folder.tracks)).map((folder) => ({
            ...folder,
            tracks: tracks.filter((track) => folder.tracks.includes(track.id)).map((track) => track.id)
          }))
      };
    }
  } catch {
    // A blocked or invalid local store still allows the demo to run.
  }
  return initialState;
}

function saveState(message) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    if (message) notify(message);
  } catch {
    notify("El navegador bloqueó el guardado. Los cambios duran hasta cerrar o recargar la página.");
  }
}

function notify(message) {
  status.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { status.textContent = ""; }, 4200);
}

function page() {
  const hash = location.hash.slice(1);
  return pages.includes(hash) ? hash : "inicio";
}

function selectedTrack() {
  return tracks.find((track) => track.id === state.selectedTrack);
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
  return '<div class="record-grid">' + list.map((track) => '<article class="record-card" style="--tone:' + track.color + '">'
    + '<button class="track-demo" type="button" data-action="demo" data-id="' + track.id + '" aria-pressed="false">'
    + vinyl(track) + '<strong>' + track.title + '</strong><small>' + track.artist + '</small></button>'
    + '<button class="icon-button" type="button" data-action="assign" data-id="' + track.id + '" aria-label="Organizar ' + track.title + ' en carpetas">' + icon("more") + '</button>'
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
    + '<p>Explora canciones de muestra y crea tu propia colección.</p>'
    + '<a class="primary" href="#biblioteca">' + icon("library") + ' Explorar biblioteca</a></div></section>'
    + section("Vinilos de muestra", trackGrid(tracks), '<a href="#biblioteca">Ver biblioteca</a>')
    + section("Tus carpetas", folderGrid(sortedFolders().slice(0, 3)),
      '<button class="text-button" type="button" data-action="new">+ Nueva carpeta</button>');
}

function library() {
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
  return heading("Biblioteca", "Organiza las canciones de muestra en tus propias carpetas.")
    + section("Tus carpetas", folderGrid(sortedFolders()), tools)
    + section("Todas las canciones", trackGrid(tracks));
}

function search() {
  return heading("Buscar", "Busca por canción o artista en el catálogo de muestra.")
    + '<form class="search-box" id="search-form" role="search">'
    + '<input class="field" type="search" id="query" maxlength="120" aria-label="Canción o artista" placeholder="Canción o artista" value="' + escapeText(query) + '">'
    + '<button class="primary" type="submit">' + icon("search") + ' Buscar</button></form>'
    + '<section class="feature"><span>' + icon("search") + '</span><h2>Comparador multiplataforma</h2>'
    + '<p>Espacio reservado para comparar la disponibilidad de canciones cuando se conecten los servicios.</p></section>'
    + '<div id="results"></div>';
}

function dj() {
  return heading("DJ personal", "Tu futuro asistente musical conversacional.")
    + '<section class="feature"><span>' + icon("headphones") + '</span><h2>Asistente en preparación</h2>'
    + '<p>Aquí podrás pedir sugerencias según tus gustos, tu estado de ánimo o lo que quieras escuchar.</p></section>';
}

function renderResults() {
  const normalize = (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const matches = tracks.filter((track) => normalize(track.title + " " + track.artist).includes(normalize(query)));
  document.querySelector("#results").innerHTML = section(query ? "Resultados de muestra" : "Catálogo de muestra", trackGrid(matches));
  updatePlayback();
}

function render() {
  const current = page();
  const screens = { inicio: home, biblioteca: library, buscar: search, dj };
  main.innerHTML = screens[current]();
  for (const link of document.querySelectorAll("[data-page]")) {
    if (link.dataset.page === current) link.setAttribute("aria-current", "page");
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
  const duration = selectedTrack().seconds;
  timeline.max = duration;
  timeline.value = Math.floor(seconds);
  timeline.style.setProperty("--played", (seconds / duration * 100) + "%");
  timeline.setAttribute("aria-valuetext", formatTime(seconds) + " de " + formatTime(duration));
  document.querySelector("#elapsed").textContent = formatTime(seconds);
  document.querySelector("#duration").textContent = formatTime(duration);
}

function updatePlayback() {
  const current = selectedTrack();
  const isPlaying = startedAt !== null;
  const mini = document.querySelector("#mini-disc");
  if (mini.dataset.id !== current.id) {
    mini.innerHTML = vinyl(current);
    mini.dataset.id = current.id;
  }
  mini.firstElementChild.classList.toggle("spinning", isPlaying);
  document.querySelector("#track-title").textContent = current.title;
  play.innerHTML = icon(isPlaying ? "pause" : "play");
  play.setAttribute("aria-label", isPlaying ? "Pausar demo visual" : "Iniciar demo visual");
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
    updatePlayback();
  } else {
    updateProgress();
    scheduleProgress();
  }
}

function toggleDemo() {
  if (startedAt === null) {
    if (seconds >= selectedTrack().seconds) seconds = 0;
    startedAt = performance.now() - seconds * 1000;
  } else {
    seconds = Math.min(selectedTrack().seconds, (performance.now() - startedAt) / 1000);
    startedAt = null;
  }
  updatePlayback();
}

function changeTrack(trackId, start) {
  state.selectedTrack = trackId;
  seconds = 0;
  startedAt = start ? performance.now() : null;
  saveState();
  updatePlayback();
}

function nextTrack() {
  const index = tracks.findIndex((track) => track.id === state.selectedTrack);
  changeTrack(tracks[(index + 1) % tracks.length].id, startedAt !== null);
}

function openDialog(title, body, action, onSave, destructive = false) {
  document.querySelector("#dialog-title").textContent = title;
  fields.innerHTML = body;
  submit.textContent = action;
  submit.className = destructive ? "danger" : "primary";
  pendingSave = onSave;
  if (!dialog.open) dialog.showModal();
  fields.querySelector("[data-focus]")?.focus();
}

function editFolder(folder, initialTracks = []) {
  const selected = folder?.tracks ?? initialTracks;
  const options = tracks.map((track) => '<label class="check"><input type="checkbox" name="track" value="'
    + track.id + '"' + (selected.includes(track.id) ? " checked" : "") + '> ' + track.title + '</label>').join("");
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
      const changes = { name, color: data.get("color"), tracks: data.getAll("track") };
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

document.addEventListener("click", (event) => {
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
  const folder = state.folders.find((item) => item.id === id);
  switch (action) {
    case "demo":
      if (id === state.selectedTrack) toggleDemo();
      else changeTrack(id, true);
      break;
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
  if (event.target.id !== "folder-order") return;
  state.order = event.target.value;
  saveState();
  render();
  document.querySelector("#folder-order").focus();
});

document.addEventListener("submit", (event) => {
  if (event.target.id !== "search-form") return;
  event.preventDefault();
  query = document.querySelector("#query").value.trim();
  renderResults();
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
document.querySelector("#next").addEventListener("click", nextTrack);
timeline.addEventListener("input", () => {
  seconds = Number(timeline.value);
  if (startedAt !== null) startedAt = performance.now() - seconds * 1000;
  if (startedAt !== null && seconds >= selectedTrack().seconds) syncProgress();
  else {
    updateProgress();
    scheduleProgress();
  }
});

document.addEventListener("visibilitychange", () => {
  document.documentElement.classList.toggle("page-hidden", document.hidden);
  if (document.hidden) clearTimeout(progressTimer);
  else syncProgress();
});

for (const target of document.querySelectorAll("[data-icon]")) target.innerHTML = icon(target.dataset.icon);
render();

if (location.protocol !== "file:" && window.isSecureContext && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Mi Música: no se pudo activar la caché de la aplicación.", error);
    });
  }, { once: true });
}

