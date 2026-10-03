const APP_SHELL_CACHE = 'openflowkit-app-shell-v1';
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/Logo_openflowkit.svg',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_SHELL_CACHE);
    await Promise.allSettled(APP_SHELL_ASSETS.map((asset) => cache.add(asset)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheKeys = await caches.keys();
    await Promise.all(
      cacheKeys
        .filter((key) => key !== APP_SHELL_CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(APP_SHELL_CACHE);
        cache.put('/index.html', networkResponse.clone());
        return networkResponse;
      } catch {
        const cachedResponse = await caches.match('/index.html');
        if (cachedResponse) {
          return cachedResponse;
        }

        throw new Error('Offline app shell unavailable.');
      }
    })());
    return;
  }

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(APP_SHELL_CACHE);
    const cachedResponse = await cache.match(request);

    const networkPromise = fetch(request)
      .then((response) => {
        cache.put(request, response.clone());
        return response;
      })
      .catch(() => cachedResponse);

    return cachedResponse ?? networkPromise;
  })());
});
