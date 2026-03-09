/**
 * Tu Joyita Miami Dashboard — Service Worker
 *
 * Phase 1: Cache-first for static assets (HTML, JS, CSS, images).
 *          Network-first for API calls.
 * Phase 2 (future): Offline POS with IndexedDB queue.
 *
 * @version 1.0.0
 */

const CACHE_NAME = "jewd-v3.38.0";

// Assets to pre-cache on install
// NOTE: Production uses bundled dist/ files, not individual JS modules.
const PRECACHE_ASSETS = [
  "/dashboard/",
  "/dashboard/dist/bundle.min.css",
  "/dashboard/dist/bundle.min.js",
  "/dashboard/manifest.json",
  "/dashboard/icons/icon-192.png",
  "/dashboard/icons/icon-512.png",
];

// ═══════════════════════════════════════════════════════════════════════════
// INSTALL — pre-cache core assets
// ═══════════════════════════════════════════════════════════════════════════
self.addEventListener("install", (event) => {
  console.log("[SW] Installing", CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Some assets failed to pre-cache:", err);
        // Pre-cache what we can, don't block install
        return Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            cache.add(url).catch(() => console.warn("[SW] Failed:", url))
          )
        );
      });
    })
  );
  // Activate immediately (don't wait for existing tabs to close)
  self.skipWaiting();
});

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVATE — clean up old caches
// ═══════════════════════════════════════════════════════════════════════════
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating", CACHE_NAME);
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      )
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ═══════════════════════════════════════════════════════════════════════════
// FETCH — routing strategy
// ═══════════════════════════════════════════════════════════════════════════
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip chrome-extension, ws://, etc.
  if (!url.protocol.startsWith("http")) return;

  // ── API calls → Network-first, fall back to cache ──
  if (isAPIRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ── .env.js → Network-only (never cache credentials) ──
  if (url.pathname.includes(".env.js")) {
    return; // Let browser handle it normally
  }

  // ── Static assets → Cache-first, fall back to network ──
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── Dashboard HTML → Network-first (ensures latest HTML always loads) ──
  if (url.pathname.startsWith("/dashboard") || url.pathname === "/") {
    event.respondWith(networkFirst(request));
    return;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STRATEGIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cache-first: serve from cache, refresh from network in background.
 * Falls back to network if not cached.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Stale-while-revalidate: return cached immediately, update in background
    refreshCache(request);
    return cached;
  }
  // Not cached — fetch from network and cache
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline and not cached — return offline fallback
    return offlineFallback();
  }
}

/**
 * Network-first: try network, fall back to cache.
 * Good for API data that should be fresh when possible.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: "offline", message: "Sin conexión a Internet" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Refresh cache in background (stale-while-revalidate).
 */
async function refreshCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
  } catch {
    // Network unavailable — keep stale cache
  }
}

/**
 * Offline fallback page.
 */
function offlineFallback() {
  return new Response(
    `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Tu Joyita Miami — Sin conexión</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0;
           display: flex; align-items: center; justify-content: center; min-height: 100vh;
           margin: 0; text-align: center; }
    .offline-box { max-width: 400px; padding: 2rem; }
    h1 { color: #d4a843; font-size: 2rem; }
    p { color: #94a3b8; line-height: 1.6; }
    button { background: #d4a843; color: #0f172a; border: none; padding: 0.75rem 1.5rem;
             border-radius: 8px; font-size: 1rem; cursor: pointer; margin-top: 1rem; }
    button:hover { background: #b8922e; }
  </style>
</head>
<body>
  <div class="offline-box">
    <h1>💎 Sin conexión</h1>
    <p>No hay conexión a Internet. Verifica tu red e intenta de nuevo.</p>
    <button onclick="location.reload()">Reintentar</button>
  </div>
</body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function isAPIRequest(url) {
  return (
    url.pathname.includes("/wp-json/") ||
    url.pathname.includes("/wc/") ||
    url.pathname.includes("/jewelry/")
  );
}

function isStaticAsset(url) {
  return /\.(js|css|png|jpg|jpeg|webp|svg|gif|woff2?|ttf|eot|ico)(\?|$)/.test(
    url.pathname
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE — handle messages from main thread
// ═══════════════════════════════════════════════════════════════════════════
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
  if (event.data === "clearCache") {
    caches.delete(CACHE_NAME).then(() => {
      console.log("[SW] Cache cleared");
    });
  }
});
