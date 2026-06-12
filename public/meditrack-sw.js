self.addEventListener("install", () => {
  console.log("[MediTrack SW] Installed")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("[MediTrack SW] Activated")
  event.waitUntil(self.clients.claim())
})

self.addEventListener("notificationclick", (event) => {
  console.log("[MediTrack SW] Notification clicked", event.notification?.tag)
  event.notification.close()

  const targetUrl =
    event.notification?.data?.url ||
    new URL("./#/dashboard", self.registration.scope).href

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const matchingClient = clients.find((client) =>
          client.url.startsWith(self.registration.scope),
        )

        if (matchingClient) {
          return matchingClient.focus()
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }

        return undefined
      })
      .catch((error) => {
        console.error("[MediTrack SW] Failed to handle notification click", error)
      }),
  )
})
