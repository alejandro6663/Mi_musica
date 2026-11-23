"use strict";

// Portada ABC (vista de administrador) y tienda (vista de cliente).
const abcShell = (() => {
  const svg = (path) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  const icons = {
    home: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/>'),
    music: svg('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
    tools: svg('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
    compare: svg('<path d="M4 7h11l-3-3"/><path d="M20 17H9l3 3"/>'),
    legal: svg('<path d="M12 3v18"/><path d="M5 21h14"/><path d="m5 8 7-3 7 3"/><path d="M5 8 2 15a3 3 0 0 0 6 0z"/><path d="m19 8-3 7a3 3 0 0 0 6 0z"/>'),
    panel: svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v7M14 17.5h7"/>'),
    menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    link: svg('<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>')
  };

  // Secciones de ABC. route: destino interno; null = Próximamente.
  const sections = [
    { id: "musica", name: "Mi Música", icon: "music", route: "#inicio", note: "Tu biblioteca y reproductor" },
    { id: "ferreteria", name: "Ferretería", icon: "tools", route: null, store: "ferreteria", note: "Tienda para clientes" },
    { id: "comparador", name: "Comparador ABC", icon: "compare", route: null, note: "Comparar precios y proveedores" },
    { id: "legal", name: "Legal", icon: "legal", route: "#legal", note: "Políticas y avisos" }
  ];

  let toastTimer;

  function escape(text) {
    return String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  function toast(message) {
    let element = document.querySelector("#abc-toast");
    if (!element) {
      element = document.createElement("div");
      element.id = "abc-toast";
      element.className = "abc-toast";
      element.setAttribute("role", "status");
      document.body.append(element);
    }
    element.textContent = message;
    element.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("visible"), 3600);
  }

  function folder(section) {
    const attrs = section.route
      ? 'href="' + section.route + '"'
      : 'href="#abc" data-abc="pronto" data-name="' + escape(section.name) + '"' + (section.store ? ' data-store="' + section.store + '"' : "");
    return '<a class="abc-folder" ' + attrs + '>'
      + '<span class="abc-folder-icon">' + icons[section.icon] + '</span>'
      + '<strong>' + escape(section.name) + '</strong>'
      + '<small>' + (section.route ? escape(section.note) : "Próximamente") + '</small></a>';
  }

  function sidebar(current, state) {
    const item = (href, icon, label, active, extra = "") => '<a class="abc-nav-item" href="' + href + '"' + (active ? ' aria-current="page"' : "") + extra + '>'
      + icons[icon] + '<span>' + label + '</span></a>';
    return '<aside class="abc-sidebar" id="abc-sidebar" aria-label="Secciones de ABC">'
      + '<div class="abc-traffic" aria-hidden="true"><i></i><i></i><i></i></div>'
      + '<div class="abc-side-brand"><span class="abc-logo">ABC</span><span>Abastecimiento</span></div>'
      + '<nav class="abc-nav">'
      + '<span class="abc-nav-label">Favoritos</span>'
      + item("#abc", "home", "Inicio", current === "abc")
      + sections.map((section) => section.route
        ? item(section.route, section.icon, escape(section.name), current === section.id)
        : item("#abc", section.icon, escape(section.name) + ' <em>Pronto</em>', false,
          ' data-abc="pronto" data-name="' + escape(section.name) + '"' + (section.store ? ' data-store="' + section.store + '"' : ""))).join("")
      + '<span class="abc-nav-label">Administración</span>'
      + item("#panel", "panel", "Panel", current === "panel")
      + '</nav>'
      + '<button type="button" class="abc-nav-item abc-account" data-action="account">' + icons.user + '<span>'
      + (state.user ? escape(state.user.email ?? "Cuenta") : "Cuenta") + '</span></button>'
      + '</aside>';
  }

  function home(state) {
    return '<section class="abc-hero">'
      + '<span class="abc-short">ABC</span>'
      + '<h1>Abastecimiento</h1>'
      + '<p>Elige una carpeta para entrar.</p></section>'
      + (state.setup ? '<p class="abc-notice"><strong>Modo configuración.</strong> Falta el UID del administrador en <code>abc/abc-config.js</code> o la configuración de Firebase en <code>cloud-config.js</code>. Mientras tanto, esta portada se ve en cualquier dispositivo que abra el inicio.</p>' : "")
      + '<div class="abc-grid">' + sections.map(folder).join("") + '</div>';
  }

  function locked() {
    return '<section class="abc-locked abc-glass">'
      + '<span class="abc-short">ABC</span><h1>Abastecimiento</h1>'
      + '<p>Esta zona es solo para el administrador. Inicia sesión con tu cuenta para continuar.</p>'
      + '<button type="button" class="primary" data-action="account">Iniciar sesión</button></section>';
  }

  function adminLayout(root, context) {
    const { route, access } = context;
    const current = route.name === "legal" ? "legal" : route.name;
    let content = "";
    if (route.name === "abc") content = home(access);
    root.innerHTML = '<div class="abc-desktop">'
      + sidebar(current, access)
      + '<div class="abc-scrim" data-abc="close-menu"></div>'
      + '<section class="abc-window">'
      + '<header class="abc-toolbar abc-glass">'
      + '<button type="button" class="abc-icon-button abc-menu-button" data-abc="menu" aria-label="Abrir menú" aria-controls="abc-sidebar" aria-expanded="false">' + icons.menu + '</button>'
      + '<a class="abc-toolbar-title" href="#abc"><span class="abc-logo">ABC</span><span>Abastecimiento</span></a>'
      + '<a class="secondary abc-panel-button" href="#panel"' + (route.name === "panel" ? ' aria-current="page"' : "") + '>' + icons.panel + 'Panel</a>'
      + '</header>'
      + '<div class="abc-content" id="abc-content">' + content + '</div>'
      + '</section></div>';
    const container = root.querySelector("#abc-content");
    if (route.name === "panel") abcPanel.render(container, context);
    if (route.name === "legal") abcLegal.render(container, route.rest[0], context);
    document.title = route.name === "panel" ? "Panel · ABC" : route.name === "legal" ? "Legal · ABC" : "ABC – Abastecimiento";
  }

  function clientLayout(root, context) {
    const { route, access, config } = context;
    const stores = config.tiendas ?? {};
    const key = route.name === "tienda" ? route.rest[0] : context.lastStore;
    const store = stores[key];
    const name = store?.nombre ?? "ABC Abastecimiento";
    let content;
    if (route.name === "legal") {
      content = '<a class="abc-back-link" href="' + (store ? "#tienda/" + key : "#legal") + '">← ' + (store ? "Volver a " + escape(name) : "Documentos legales") + '</a>'
        + '<div id="abc-legal"></div>';
    } else if (!store) {
      content = '<section class="abc-store-hero abc-glass"><h1>Tienda no encontrada</h1><p>Revisa el enlace que te compartieron.</p></section>';
    } else {
      content = '<section class="abc-store-hero abc-glass">'
        + '<span class="abc-folder-icon abc-store-icon">' + icons.tools + '</span>'
        + '<h1>' + escape(name) + '</h1><p>' + escape(store.descripcion ?? "") + '</p>'
        + '<p class="abc-soon">Próximamente: estamos preparando el catálogo.</p></section>';
    }
    root.innerHTML = '<div class="abc-client">'
      + (access.admin ? '<div class="abc-admin-bar">Estás viendo la vista de cliente. <a href="#abc">Volver a ABC</a></div>' : "")
      + '<header class="abc-client-head"><span class="abc-logo">ABC</span><strong>' + escape(name) + '</strong></header>'
      + '<main class="abc-client-main">' + content + '</main>'
      + abcLegal.footer(config, store ? escape(name) : "") + '</div>';
    if (route.name === "legal") abcLegal.render(root.querySelector("#abc-legal"), route.rest[0], context);
    document.title = route.name === "legal" ? "Legal · " + name : name + " · ABC";
  }

  function render(root, context) {
    const { route, access, client } = context;
    if (client) clientLayout(root, context);
    else if (!access.admin) {
      root.innerHTML = '<div class="abc-client">' + locked() + '</div>';
      document.title = "ABC – Abastecimiento";
    } else adminLayout(root, context);
    if (route.name !== "legal") root.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function setMenu(open) {
    const desktop = document.querySelector(".abc-desktop");
    if (!desktop) return;
    desktop.classList.toggle("menu-open", open);
    document.querySelector(".abc-menu-button")?.setAttribute("aria-expanded", String(open));
    if (open) document.querySelector("#abc-sidebar .abc-nav-item")?.focus();
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-abc]");
    if (event.target.closest(".abc-sidebar a")) setMenu(false);
    if (!target) return;
    const kind = target.dataset.abc;
    if (kind === "menu") setMenu(!document.querySelector(".abc-desktop")?.classList.contains("menu-open"));
    if (kind === "close-menu") setMenu(false);
    if (kind === "pronto") {
      event.preventDefault();
      setMenu(false);
      const store = target.dataset.store;
      toast(target.dataset.name + ": próximamente." + (store ? " Vista de cliente: #tienda/" + store : ""));
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.querySelector(".abc-desktop.menu-open")) {
      setMenu(false);
      document.querySelector(".abc-menu-button")?.focus();
    }
  });

  return { render, toast, escape, icons };
})();
