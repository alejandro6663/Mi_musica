"use strict";

const scope = new URL(self.registration.scope);
const cachePrefix = "mi-musica:" + scope.pathname + ":";
const cacheName = cachePrefix + "1.4.0";
const entry = new URL("index.html", scope).href;
const mobileArt = new URL("vinilo-movil.webp", scope).href;
const desktopArt = new URL("vinilo-escritorio.webp", scope).href;
const core = [
  entry,
  new URL("estilos.css", scope).href,
  new URL("app.js", scope).href,
  new URL("media.js", scope).href,
  new URL("cloud-config.js", scope).href,
  new URL("cloud-merge.js", scope).href,
  new URL("cloud-sync.js", scope).href,
  new URL("catalog.js", scope).href,
  new URL("recovery.js", scope).href,
  new URL("spotify-config.js", scope).href,
  new URL("spotify.js", scope).href,
  new URL("media-session.js", scope).href,
  new URL("abc/abc-config.js", scope).href,
  new URL("abc/abc.js", scope).href,
  new URL("abc/abc.css", scope).href,
  new URL("abc/abc-shell.js", scope).href,
  new URL("abc/panel.js", scope).href,
  new URL("abc/legal.js", scope).href,
  new URL("manifest.webmanifest", scope).href,
  new URL("iconos/mi-musica-192.png", scope).href,
  new URL("iconos/mi-musica-512.png", scope).href,
  new URL("iconos/spotify-blanco.svg", scope).href,
  mobileArt
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => {
    return cache.addAll(core.map((url) => new Request(url, { cache: "reload" })));
  }));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(cachePrefix) && name !== cacheName)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function serveDesktopArt(request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(desktopArt);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(desktopArt, response.clone()).catch(() => {});
      return response;
    }
  } catch {
    // The mobile artwork is already available in the application cache.
  }
  return (await cache.match(mobileArt)) ?? Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin) return;
  url.search = "";
  url.hash = "";

  if (url.href === desktopArt) {
    event.respondWith(serveDesktopArt(request));
    return;
  }

  const isStart = request.mode === "navigate" && url.href === scope.href;
  const asset = isStart ? entry : url.href;
  if (core.includes(asset)) {
    event.respondWith((async () => {
      const cache = await caches.open(cacheName);
      return (await cache.match(asset)) ?? fetch(request);
    })());
  }
});
