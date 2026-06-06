self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || 'PermutApp';
  const options = {
    body: payload.body || 'Tienes una nueva notificación.',
    data: payload.data || {},
  };

  event.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'PERMUTAPP_PUSH_RECEIVED' }));
    }),
  ]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const route = event.notification.data?.ruta || '/notifications';
  const targetUrl = new URL(route, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find((client) => client.url.startsWith(self.location.origin));
      if (matchingClient) {
        matchingClient.navigate(targetUrl);
        return matchingClient.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
