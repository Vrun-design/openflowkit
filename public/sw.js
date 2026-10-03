// Phase 12.6: v1 registered this path as an app-shell worker. The browser re-fetches it on
// navigation, finds these bytes, and installs this worker over v1's. The removal starts at
// install: activation waits for v1's worker to finish its in-flight fetches, which a long
// request can hold open indefinitely. If activation does come, open tabs are reloaded onto
// the network. v2 never registers a worker.
self.addEventListener('install', (event) => {
  self.skipWaiting();
  // Not awaited: unregister is a registration job, and it queues behind this install job.
  // Awaiting it here would deadlock; fired, it runs the moment install ends.
  self.registration.unregister();
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).catch(() => undefined));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window' });
    await Promise.all(tabs.map((tab) => tab.navigate(tab.url).catch(() => undefined)));
  })());
});
