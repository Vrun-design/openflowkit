// Phase 12.6: v1 registered this path as an app-shell worker. The browser re-fetches it on
// navigation, finds these bytes, and this worker replaces v1's: it clears every cache,
// unregisters itself and reloads open tabs onto the network. v2 never registers a worker.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Unregister even if storage refuses the cache deletes: a worker left behind would never reinstall.
    try {
      await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
    } finally {
      await self.registration.unregister();
    }
    const tabs = await self.clients.matchAll({ type: 'window' });
    await Promise.all(tabs.map((tab) => tab.navigate(tab.url).catch(() => undefined)));
  })());
});
