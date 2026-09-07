// Minimal no-op service worker for the main TMS app.
// Purpose: satisfy Chrome's installability criteria so the native
// install prompt fires on the main site. It performs no caching —
// every request falls through to the network as if it were absent.
// No clients.claim(): it must never take control of /pwa/ pages,
// which are managed by the field app's own service worker.
self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("fetch", () => {
    // Intentionally empty: pass-through, no caching, no offline.
});
