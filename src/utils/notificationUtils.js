import { readJsonFromStorage } from "./storageUtils.js"

export const NOTIFICATION_STORAGE_KEY = "meditrack.notifications"
export const NOTIFICATION_SETTINGS_KEY = "meditrack.notificationSettings"
export const NOTIFICATIONS_UPDATED_EVENT = "meditrack-notifications-updated"

const validTypes = new Set(["reminder", "missed", "refill", "system"])

const normalizeNotification = (notification) => {
  if (!notification || typeof notification !== "object") return null

  return {
    id: Number(notification.id) || Date.now(),
    title: String(notification.title || "MediTrack notification"),
    message: String(notification.message || ""),
    timestamp: Number(notification.timestamp) || Date.now(),
    read: Boolean(notification.read),
    type: validTypes.has(notification.type) ? notification.type : "system",
  }
}

const emitNotificationsUpdated = () => {
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT))
}

export const getNotifications = () => {
  const storedNotifications = readJsonFromStorage(NOTIFICATION_STORAGE_KEY, [])

  return Array.isArray(storedNotifications)
    ? storedNotifications
        .map(normalizeNotification)
        .filter(Boolean)
        .sort((first, second) => second.timestamp - first.timestamp)
    : []
}

export const addNotification = ({
  title,
  message,
  type = "system",
  timestamp = Date.now(),
  read = false,
}) => {
  const notification = normalizeNotification({
    id: timestamp + Math.floor(Math.random() * 1000),
    title,
    message,
    timestamp,
    read,
    type,
  })

  if (!notification) {
    return null
  }

  const nextNotifications = [notification, ...getNotifications()].slice(0, 100)
  localStorage.setItem(
    NOTIFICATION_STORAGE_KEY,
    JSON.stringify(nextNotifications),
  )
  emitNotificationsUpdated()

  return notification
}

export const markAllRead = () => {
  const nextNotifications = getNotifications().map((notification) => ({
    ...notification,
    read: true,
  }))

  localStorage.setItem(
    NOTIFICATION_STORAGE_KEY,
    JSON.stringify(nextNotifications),
  )
  emitNotificationsUpdated()

  return nextNotifications
}

export const clearNotifications = () => {
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify([]))
  emitNotificationsUpdated()
}
