/**
 * Service worker — cache-first strategy for offline support.
 *
 * Cache strategy:
 *   chess-app-v1    — app shell (HTML, JS bundles, CSS, icons, manifest)
 *   chess-engine-v1 — Stockfish WASM (7 MB, cached lazily on first load,
 *                     NOT during install to avoid install timeout)
 *
 * Update flow: bump SHELL_CACHE or ENGINE_CACHE version string to invalidate
 * old caches on next visit.
 */

const SHELL_CACHE = 'chess-app-v1';
const ENGINE_CACHE = 'chess-engine-v1';

const SHELL_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install ─────────────────────────────────────────────────────────────────
// Pre-cache only lightweight shell assets. Stockfish WASM is cached lazily.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
// Delete stale caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== ENGINE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  const isWasm = url.pathname.endsWith('.wasm');
  const isStockfishJs = url.pathname.includes('stockfish');

  if (isWasm || isStockfishJs) {
    // Engine assets — cache lazily in a dedicated cache
    event.respondWith(engineCacheFirst(request));
  } else {
    // Everything else — cache-first, fall back to network
    event.respondWith(shellCacheFirst(request));
  }
});

async function shellCacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached — return a simple offline fallback for navigation
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503 });
  }
}

async function engineCacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(ENGINE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Engine unavailable offline', { status: 503 });
  }
}
