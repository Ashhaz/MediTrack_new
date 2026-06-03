import { useEffect } from "react"
import {
  formatTimeForDisplay,
  getMinutesNow,
  getTodayKey,
  isMedicineScheduledOnDate,
  parseReminderTime,
} from "../utils/medicineUtils.js"
import {
  addNotification,
  NOTIFICATION_SETTINGS_KEY,
} from "../utils/notificationUtils.js"

const STORAGE_KEY = "meditrack.medicines"
const CLEAR_KEY = "meditrack.historyCleared"
const REMINDER_WINDOW_MINUTES = 30
const CHECK_INTERVAL_MS = 30000

const getDoseStatus = (medicine, time, minutesNow, targetDate, lastReset) => {
  const dateKey = getTodayKey(targetDate)
  const existingEntry = (medicine.adherenceHistory || []).find(
    (entry) => entry.date === dateKey && entry.time === time,
  )

  if (existingEntry) return existingEntry.status
  if (medicine.status === "Completed Course") return "Completed Course"

  const reminderMinutes = parseReminderTime(time)
  if (reminderMinutes === null) return "Upcoming"

  const doseDateTime = new Date(`${dateKey}T${time}`).getTime()
  if (doseDateTime < lastReset) return "Upcoming"

  if (
    minutesNow >= reminderMinutes &&
    minutesNow <= reminderMinutes + REMINDER_WINDOW_MINUTES
  ) {
    return "Due Now"
  }

  if (
    reminderMinutes - minutesNow <= REMINDER_WINDOW_MINUTES &&
    reminderMinutes - minutesNow > 0
  ) {
    return "Due Soon"
  }

  if (
    minutesNow > reminderMinutes + REMINDER_WINDOW_MINUTES &&
    minutesNow < reminderMinutes + 120
  ) {
    return "Delayed"
  }

  if (minutesNow >= reminderMinutes + 120) return "Missed"

  return "Upcoming"
}

const getNotificationSettings = () => {
  const defaults = { doseReminders: true }

  try {
    const savedSettings = localStorage.getItem(NOTIFICATION_SETTINGS_KEY)
    if (savedSettings) {
      return {
        ...defaults,
        ...JSON.parse(savedSettings),
      }
    }

    const legacyNotifications = JSON.parse(
      localStorage.getItem("meditrack.notifications") || "null",
    )

    if (legacyNotifications && !Array.isArray(legacyNotifications)) {
      return {
        ...defaults,
        ...legacyNotifications,
      }
    }

    return {
      ...defaults,
    }
  } catch {
    return defaults
  }
}

const notifyDoseDue = (medicine, time) => {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return false
  }

  const displayTime = formatTimeForDisplay(time)
  const notification = new Notification(`Time to take ${medicine.name}`, {
    body: `Scheduled for ${displayTime}${medicine.dosage ? ` (${medicine.dosage})` : ""}${medicine.mealTiming ? ` - ${medicine.mealTiming}` : ""}.`,
    tag: `meditrack-${medicine.id}-${getTodayKey()}-${time}`,
    requireInteraction: true,
  })

  addNotification({
    title: `Time to take ${medicine.name}`,
    message: `Scheduled for ${displayTime}${medicine.dosage ? ` (${medicine.dosage})` : ""}${medicine.mealTiming ? ` - ${medicine.mealTiming}` : ""}.`,
    type: "reminder",
  })

  notification.onclick = (event) => {
    event.preventDefault()
    window.focus()
    notification.close()
  }

  return true
}

const readMedicines = () => {
  try {
    const medicines = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    return Array.isArray(medicines) ? medicines : []
  } catch {
    return []
  }
}

const writeMedicines = (medicines) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines))
  window.dispatchEvent(new Event("meditrack-data-updated"))
}

const checkMedicationReminders = () => {
  if (getNotificationSettings().doseReminders === false) {
    return
  }

  const today = new Date()
  const todayKey = getTodayKey(today)
  const minutesNow = getMinutesNow()
  const historyCleared = Number(localStorage.getItem(CLEAR_KEY) || 0)
  const medicines = readMedicines()
  let didChange = false

  const nextMedicines = medicines.map((medicine) => {
    if (
      medicine?.archived ||
      !Array.isArray(medicine?.scheduleTimes) ||
      !isMedicineScheduledOnDate(medicine, today)
    ) {
      return medicine
    }

    let medCopy = medicine

    medicine.scheduleTimes.forEach((time) => {
      const reminderMinutes = parseReminderTime(time)
      if (reminderMinutes === null) return

      const doseDateTime = new Date(`${todayKey}T${time}`).getTime()
      if (doseDateTime < historyCleared) return

      const doseStatus = getDoseStatus(
        medCopy,
        time,
        minutesNow,
        today,
        historyCleared,
      )

      if (
        ["Due Soon", "Due Now", "Delayed"].includes(doseStatus) &&
        medCopy.notificationSentFor !== `${todayKey}-${time}`
      ) {
        notifyDoseDue(medCopy, time)
        medCopy = {
          ...medCopy,
          notificationSentFor: `${todayKey}-${time}`,
          updatedAt: Date.now(),
        }
        didChange = true
        return
      }

      const alreadyRecorded = (medCopy.adherenceHistory || []).some(
        (entry) => entry.date === todayKey && entry.time === time,
      )

      if (doseStatus === "Missed" && !alreadyRecorded) {
        medCopy = {
          ...medCopy,
          adherenceHistory: [
            ...(medCopy.adherenceHistory || []),
            { date: todayKey, time, status: "Missed" },
          ],
          updatedAt: Date.now(),
        }
        didChange = true
      }
    })

    return medCopy
  })

  if (didChange) {
    writeMedicines(nextMedicines)
  }
}

export function useMedicationReminders() {
  useEffect(() => {
    checkMedicationReminders()
    const reminderTimer = window.setInterval(
      checkMedicationReminders,
      CHECK_INTERVAL_MS,
    )

    return () => window.clearInterval(reminderTimer)
  }, [])
}
