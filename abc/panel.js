"use strict";

// Panel de administración (estructura base). Los bloques se guardarán en la fase 2.
const abcPanel = (() => {
  const blocks = [
    { id: "texto", name: "Texto", hint: "Párrafo o título", glyph: "Aa" },
    { id: "imagen", name: "Imagen", hint: "Foto en formato WebP", glyph: "▣" },
    { id: "producto", name: "Producto", hint: "Nombre, precio y foto", glyph: "◈" },
    { id: "aviso", name: "Aviso", hint: "Mensaje destacado", glyph: "!" },
    { id: "enlace", name: "Enlace", hint: "Botón hacia otra página", glyph: "↗" }
  ];
  const sectionsList = [["ferreteria", "Ferretería"], ["comparador", "Comparador ABC"], ["legal", "Legal"]];

  function menu() {
    return '<div class="abc-block-menu abc-glass" id="abc-block-menu" hidden>'
      + '<input type="search" class="abc-block-filter" placeholder="Filtrar bloques…" aria-label="Filtrar bloques" autocomplete="off">'
      + '<span class="abc-nav-label">Bloques básicos</span>'
      + '<div role="menu" aria-label="Agregar bloque">'
      + blocks.map((block) => '<button type="button" role="menuitem" class="abc-block-option" data-block="' + block.id + '">'
        + '<span class="abc-block-glyph" aria-hidden="true">' + block.glyph + '</span>'
        + '<span><strong>' + block.name + '</strong><small>' + block.hint + '</small></span></button>').join("")
      + '<p class="abc-block-empty" hidden>Sin resultados</p>'
      + '</div></div>';
  }

  function render(container) {
    container.innerHTML = '<section class="abc-panel">'
      + '<header class="abc-panel-head"><div><span class="abc-short">Administración</span><h1>Panel</h1></div>'
      + '<label class="abc-select">Sección <select id="abc-panel-section">'
      + sectionsList.map(([id, name]) => '<option value="' + id + '">' + name + '</option>').join("") + '</select></label></header>'
      + '<div class="abc-canvas abc-glass">'
      + '<p class="abc-canvas-empty">Esta sección todavía no tiene contenido. Pulsa <strong>+</strong> o escribe <kbd>/</kbd> para agregar un bloque.</p>'
      + '<div class="abc-add-row"><button type="button" class="abc-add" id="abc-add" aria-haspopup="menu" aria-expanded="false" aria-controls="abc-block-menu" aria-label="Agregar bloque">+</button>'
      + menu() + '</div></div>'
      + '<p class="abc-muted">Fase 1: el menú muestra las opciones. Guardar productos y contenido llegará en la siguiente fase.</p>'
      + '</section>';
  }

  function elements() {
    return { menu: document.querySelector("#abc-block-menu"), add: document.querySelector("#abc-add") };
  }

  function visibleOptions() {
    return [...document.querySelectorAll("#abc-block-menu .abc-block-option")].filter((option) => !option.hidden);
  }

  function open(show) {
    const { menu, add } = elements();
    if (!menu) return;
    menu.hidden = !show;
    add.setAttribute("aria-expanded", String(show));
    if (show) {
      const filter = menu.querySelector(".abc-block-filter");
      filter.value = "";
      filterOptions("");
      filter.focus();
    }
  }

  function filterOptions(text) {
    const term = text.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[̀-ͯ]/g, "");
    for (const option of document.querySelectorAll("#abc-block-menu .abc-block-option")) {
      const label = option.textContent.toLocaleLowerCase("es").normalize("NFD").replace(/[̀-ͯ]/g, "");
      option.hidden = Boolean(term) && !label.includes(term);
    }
    const empty = document.querySelector("#abc-block-menu .abc-block-empty");
    if (empty) empty.hidden = visibleOptions().length > 0;
  }

  function choose(id) {
    const block = blocks.find((item) => item.id === id);
    open(false);
    elements().add?.focus();
    const section = document.querySelector("#abc-panel-section");
    abcShell.toast("Bloque «" + block.name + "» para " + section.selectedOptions[0].textContent + ": disponible en la próxima fase.");
  }

  document.addEventListener("click", (event) => {
    const { menu } = elements();
    if (!menu) return;
    if (event.target.closest("#abc-add")) { open(menu.hidden); return; }
    const option = event.target.closest(".abc-block-option");
    if (option) { choose(option.dataset.block); return; }
    if (!menu.hidden && !event.target.closest("#abc-block-menu")) open(false);
  });

  document.addEventListener("input", (event) => {
    if (event.target.classList?.contains("abc-block-filter")) filterOptions(event.target.value);
  });

  document.addEventListener("keydown", (event) => {
    const { menu, add } = elements();
    if (!menu) return;
    if (menu.hidden) {
      const typing = event.target.closest?.("input, textarea, select, [contenteditable]");
      if (event.key === "/" && !typing && !document.querySelector("dialog[open]")) { event.preventDefault(); open(true); }
      return;
    }
    const options = visibleOptions();
    const index = options.indexOf(document.activeElement);
    if (event.key === "Escape") { event.preventDefault(); open(false); add.focus(); }
    else if (event.key === "ArrowDown") { event.preventDefault(); options[(index + 1) % options.length]?.focus(); }
    else if (event.key === "ArrowUp") { event.preventDefault(); options[(index - 1 + options.length) % options.length]?.focus(); }
    else if (event.key === "Enter" && event.target.classList.contains("abc-block-filter") && options[0]) { event.preventDefault(); choose(options[0].dataset.block); }
  });

  return { render, blocks };
})();
