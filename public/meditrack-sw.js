self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("notificationclick", (event) => {
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

self.addEventListener("push", (event) => {
  // This listener prepares the Service Worker for future Firebase/OneSignal integration.
  // When a push message is received (even if the app is closed), this wakes up the SW.
  if (event.data) {
    try {
      const data = event.data.json()
      
      const title = data.title || "MediTrack"
      const options = {
        body: data.body || "You have a new notification.",
        icon: data.icon || "/favicon.svg",
        badge: data.badge || "/favicon.svg",
        data: data.data || { url: "/#/dashboard" }
      }
      
      event.waitUntil(self.registration.showNotification(title, options))
    } catch (e) {
      // Fallback for plain text push messages
      event.waitUntil(
        self.registration.showNotification("MediTrack", {
          body: event.data.text(),
          icon: "/favicon.svg"
        })
      )
    }
  }
})
