self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));

    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    await self.registration.unregister();

    clients.forEach((client) => {
      client.postMessage({ type: 'APP_CACHE_CLEARED' });
      if ('navigate' in client) {
        client.navigate(client.url);
      }
    });
  })());
});
