// Service worker Fly Horizons (27/09) : uniquement les notifications push de
// l'app ajoutée à l'écran d'accueil (espace pilote, admin). Pas de cache
// hors ligne : les pages restent servies par le réseau.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "Fly Horizons", body: event.data?.text() }; }
  const title = data.title || "Fly Horizons";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || undefined,
      data: { url: data.url || "/pilote" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/pilote", self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // App déjà ouverte : on la montre et on lui demande de naviguer (PushNavigator).
    // client.navigate() est peu fiable sur iPhone et recharge toute la page.
    for (const c of all) {
      try {
        await c.focus();
        c.postMessage({ type: "navigate", url: new URL(url).pathname + new URL(url).search });
        return;
      } catch { /* fenêtre morte : on essaie la suivante */ }
    }
    await self.clients.openWindow(url);
  })());
});
