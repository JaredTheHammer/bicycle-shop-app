// ─── LES Bike Shop Service Worker ───────────────────────────────────
// Phase 7.4: Offline Support (PWA)
// Strategy: Cache app shell for offline access. localStorage handles data.
// When Phase 5 (backend) lands, add network-first for API routes + sync queue drain.

const CACHE_NAME = "les-bikeshop-v1";

// App shell assets populated at install time by fetching the root document
// and letting the browser resolve hashed Vite filenames.
const SHELL_URLS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

// ─── Install: pre-cache app shell ──────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache the shell URLs; Vite-hashed assets get cached on first fetch
      return cache.addAll(SHELL_URLS);
    })
  );
  // Activate immediately (don't wait for old tabs to close)
  self.skipWaiting();
});

// ─── Activate: clean up old caches ─────────────────────────────────
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
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ─── Fetch: stale-while-revalidate for assets, network-first for API ──
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (form submissions, etc.)
  if (request.method !== "GET") return;

  // Skip cross-origin requests (CDNs will be cached on first load)
  if (url.origin !== self.location.origin) return;

  // ── Future API routes: network-first with offline fallback ──
  // When Phase 5 backend lands, API calls go through /api/*
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // ── App shell & assets: stale-while-revalidate ──
  // Serve from cache immediately, update cache in background
  event.respondWith(staleWhileRevalidate(request));
});

// ─── Caching strategies ────────────────────────────────────────────

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Fire off network fetch in background to update cache
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // Network failed; cachedResponse (if any) is already being returned
      return null;
    });

  // Return cached version immediately, or wait for network if no cache
  return cachedResponse || fetchPromise;
}

async function networkFirstWithCache(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Network failed; try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;
    // No cache either; return offline JSON stub
    return new Response(
      JSON.stringify({ error: "offline", message: "No network connection" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ─── Sync Queue (Phase 5 stub) ─────────────────────────────────────
// When backend migration happens, the app will push mutations to IndexedDB
// via the sync module (src/syncQueue.js). This listener drains the queue
// when connectivity returns.

self.addEventListener("sync", (event) => {
  if (event.tag === "les-sync-queue") {
    event.waitUntil(drainSyncQueue());
  }
});

async function drainSyncQueue() {
  // Phase 5 implementation:
  // 1. Open IndexedDB "les-sync" store
  // 2. Read all pending mutations
  // 3. POST each to /api/sync endpoint
  // 4. On success, delete from IndexedDB
  // 5. On failure, leave in queue for next sync event
  //
  // For now, this is a no-op stub.
  console.log("[SW] Sync queue drain requested (stub - no backend yet)");
}

// ─── Push notifications (Phase 4.4 stub) ───────────────────────────
self.addEventListener("push", (event) => {
  // Phase 4.4 implementation:
  // Parse push payload and show notification
  const data = event.data ? event.data.json() : {};
  const title = data.title || "LES Bike Shop";
  const options = {
    body: data.body || "You have a new update",
    icon: "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
    data: data.url || "/",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Focus existing tab or open new one
      for (const client of clients) {
        if (client.url === event.notification.data && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(event.notification.data);
    })
  );
});
