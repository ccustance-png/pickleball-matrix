/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: { title: string; body: string; url?: string };
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Pickleball ELO', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      data: { url: payload.url ?? '/' },
    })
  );
});

// Open the app when a notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url: string = (event.notification.data as { url: string })?.url ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        self.clients.openWindow(url);
      }
    })
  );
});
