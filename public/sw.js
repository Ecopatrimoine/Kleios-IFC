// public/sw.js — Service Worker Kleios IFC
// Stratégie : network-first (données toujours fraîches) + cache offline en fallback

const CACHE_NAME = "kleios-ifc-v1";

// Ressources statiques à pré-cacher (shell de l'app)
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

// ── Installation : pré-cache le shell ────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activation : nettoyer les anciens caches ──────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch : network-first, fallback cache ─────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et les APIs externes
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/functions/")) return; // Edge Functions Supabase
  if (url.protocol === "chrome-extension:") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Mettre en cache la réponse fraîche
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        // Réseau indisponible → fallback cache
        caches.match(request).then((cached) => cached || caches.match("/"))
      )
  );
});
