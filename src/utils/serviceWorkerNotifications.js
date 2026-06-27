const SERVICE_WORKER_FILE = "meditrack-sw.js"
const SERVICE_WORKER_READY_TIMEOUT_MS = 5000

const getServiceWorkerUrl = () =>
  new URL(`${import.meta.env.BASE_URL}${SERVICE_WORKER_FILE}`, window.location.origin)

const getServiceWorkerScope = () =>
  new URL(import.meta.env.BASE_URL, window.location.origin)

const waitForServiceWorkerReady = () =>
  Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => {
      window.setTimeout(
        () => reject(new Error("Service worker ready timed out")),
        SERVICE_WORKER_READY_TIMEOUT_MS,
      )
    }),
  ])

const createNotificationOptions = (options = {}) => ({
  icon: `${import.meta.env.BASE_URL}favicon.svg`,
  badge: `${import.meta.env.BASE_URL}favicon.svg`,
  ...options,
  data: {
    url: `${import.meta.env.BASE_URL}#/dashboard`,
    ...(options.data || {}),
  },
})

export const registerMediTrackServiceWorker = async () => {
  const serviceWorkerUrl = getServiceWorkerUrl()
  const serviceWorkerScope = getServiceWorkerScope()

  if (!("serviceWorker" in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register(
      serviceWorkerUrl,
      { scope: serviceWorkerScope },
    )


    return registration
  } catch (error) {
    console.error(
      "[MediTrack Notifications] Service worker registration failed",
      error,
    )
    return null
  }
}

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    return "unsupported"
  }

  if (Notification.permission !== "default") {
    return Notification.permission
  }

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    console.error("[MediTrack Notifications] Notification permission request failed", error)
    return Notification.permission
  }
}

const showConstructorNotification = (title, options) => {
  const notification = new Notification(title, options)

  notification.onclick = (event) => {
    event.preventDefault()
    window.focus()
    notification.close()
  }

  return {
    shown: true,
    method: "notification-constructor",
    error: null,
  }
}

export const showServiceWorkerNotification = async (title, options = {}) => {
  const notificationOptions = createNotificationOptions(options)

  if (!("Notification" in window)) {
    return {
      shown: false,
      method: "unsupported",
      error: "Notification API is not supported",
    }
  }

  if (Notification.permission !== "granted") {
    return {
      shown: false,
      method: "permission",
      error: `Notification permission is ${Notification.permission}`,
    }
  }

  if (!("serviceWorker" in navigator)) {
    try {
      return showConstructorNotification(title, notificationOptions)
    } catch (error) {
      console.error("[MediTrack Notifications] Constructor fallback failed", error)
      return {
        shown: false,
        method: "notification-constructor",
        error,
      }
    }
  }

  try {
    await registerMediTrackServiceWorker()
    const registration = await waitForServiceWorkerReady()

    if (typeof registration.showNotification !== "function") {
      throw new Error("registration.showNotification is unavailable")
    }

    await registration.showNotification(title, notificationOptions)

    return {
      shown: true,
      method: "service-worker",
      error: null,
    }
  } catch (error) {
    console.error("[MediTrack Notifications] Service worker notification failed", error)

    try {
      return showConstructorNotification(title, notificationOptions)
    } catch (fallbackError) {
      console.error("[MediTrack Notifications] Constructor fallback failed", fallbackError)
      return {
        shown: false,
        method: "service-worker",
        error: fallbackError,
      }
    }
  }
}
