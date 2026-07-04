/* WhataHotel service worker — receives live-agent push alerts and opens the
   Conversations dashboard when tapped. Works with the tab/browser closed. */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { title: "WhataHotel", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "WhataHotel";
  const options = {
    body: data.body || "",
    tag: data.tag || "wah-agent",
    renotify: true,
    icon: "/logo.png",
    badge: "/logo.png",
    data: { url: data.url || "/dashboard/conversations" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard/conversations";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if (c.url.includes("/dashboard/conversations") && "focus" in c) return c.focus();
      }
      return self.clients.openWindow(target);
    })(),
  );
});
