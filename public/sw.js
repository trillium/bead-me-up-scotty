// Minimal service worker for PWA installability only — this is a single-user
// local tool that always needs a live `bd` connection, so there is no offline
// bead-data caching here. Cache-first for this app's own static assets;
// everything else (especially /api/*, which must always be live) passes
// straight through to the network.
const CACHE_NAME = "bmus-static-v1";

function isOwnStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname === "/manifest.webmanifest" ||
      url.pathname === "/icon" ||
      url.pathname === "/apple-icon" ||
      url.pathname === "/icon-192" ||
      url.pathname === "/icon-512" ||
      url.pathname === "/icon-512-maskable")
  );
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  if (!isOwnStaticAsset(url)) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    }),
  );
});
