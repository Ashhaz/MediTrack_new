import { useEffect } from "react"
import {
  formatTimeForDisplay,
  getMinutesNow,
  getTodayKey,
  isDoseAfterMedicineCreation,
  isMedicineScheduledOnDate,
  parseReminderTime,
} from "../utils/medicineUtils.js"
import {
  addNotification,
  NOTIFICATION_SETTINGS_KEY,
} from "../utils/notificationUtils.js"
import { showServiceWorkerNotification } from "../utils/serviceWorkerNotifications.js"
import { readJsonFromStorage, safeParseJson } from "../utils/storageUtils.js"
import { supabase } from "../lib/supabase.js"
import { mapFromDb } from "../utils/medicineMapper.js"

const CLEAR_KEY = "meditrack.historyCleared"
const REMINDER_WINDOW_MINUTES = 30
const CHECK_INTERVAL_MS = 30000

const getDoseStatus = (medicine, time, minutesNow, targetDate, lastReset) => {
  const dateKey = getTodayKey(targetDate)
  const isAfterCreation = isDoseAfterMedicineCreation(medicine, dateKey, time)
  const existingEntry = (medicine.adherenceHistory || []).find(
    (entry) => entry.date === dateKey && entry.time === time,
  )

  if (existingEntry) {
    return existingEntry.status === "Missed" && !isAfterCreation
      ? "Upcoming"
      : existingEntry.status
  }
  if (medicine.status === "Completed Course") return "Completed Course"

  const reminderMinutes = parseReminderTime(time)
  if (reminderMinutes === null) return "Upcoming"

  const doseDateTime = new Date(`${dateKey}T${time}`).getTime()
  if (doseDateTime < lastReset) return "Upcoming"
  if (!isAfterCreation) return "Upcoming"

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
        ...safeParseJson(savedSettings, {}, NOTIFICATION_SETTINGS_KEY),
      }
    }

    const legacyNotifications = readJsonFromStorage(
      "meditrack.notifications",
      null,
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
  } catch (error) {
    console.error("[MediTrack Storage] Failed to read notification settings", error)
    return defaults
  }
}

const notifyDoseDue = async (medicine, time) => {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return false
  }

  const displayTime = formatTimeForDisplay(time)
  const title = `Time to take ${medicine.name}`
  const slot = (medicine.scheduleSlots || []).find(s => s.time === time);
  const mealTiming = slot?.mealTiming || medicine.mealTiming || "After Food";
  const message = `Scheduled for ${displayTime}${medicine.dosage ? ` (${medicine.dosage})` : ""}${mealTiming ? ` - ${mealTiming}` : ""}.`

  await showServiceWorkerNotification(title, {
    body: message,
    tag: `meditrack-${medicine.id}-${getTodayKey()}-${time}`,
    requireInteraction: true,
  })

  const savedNotification = addNotification({
    title,
    message,
    type: "reminder",
  })

  return Boolean(savedNotification)
}

const readMedicines = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .eq("user_id", session.user.id)

  if (error) {
    console.error("Failed to fetch medicines for reminders:", error)
    return []
  }

  const medicines = data ? data.map(mapFromDb) : []
  return medicines
}

const writeMedicines = (medicines) => {
  localStorage.setItem("meditrack.medicines", JSON.stringify(medicines))
  window.dispatchEvent(new Event("meditrack-data-updated"))
}

const checkMedicationReminders = async () => {
  const notificationSettings = getNotificationSettings()
  if (notificationSettings.doseReminders === false) {
    return
  }

  const today = new Date()
  const todayKey = getTodayKey(today)
  const minutesNow = getMinutesNow()
  const historyCleared = Number(localStorage.getItem(CLEAR_KEY) || 0)
  const medicines = await readMedicines()
  let didChange = false

  const nextMedicines = await Promise.all(
    medicines.map(async (medicine) => {
      const scheduledToday = isMedicineScheduledOnDate(medicine, today)
      if (
        medicine?.archived ||
        !Array.isArray(medicine?.scheduleTimes) ||
        !scheduledToday
      ) {
        return medicine
      }

      let medCopy = medicine

      for (const time of medicine.scheduleTimes) {
        const reminderMinutes = parseReminderTime(time)
        if (reminderMinutes === null) {
          continue
        }

        const doseDateTime = new Date(`${todayKey}T${time}`).getTime()
        if (doseDateTime < historyCleared) {
          continue
        }

        if (!isDoseAfterMedicineCreation(medicine, todayKey, time)) {
          continue
        }

        const doseStatus = getDoseStatus(
          medCopy,
          time,
          minutesNow,
          today,
          historyCleared,
        )
        const notificationKey = `${todayKey}-${time}`
        const alreadyNotified =
          medCopy.notificationSentFor === notificationKey

        const conditionMet = ["Due Soon", "Due Now", "Delayed"].includes(doseStatus) && !alreadyNotified;

        if (conditionMet) {
          const didNotify = await notifyDoseDue(medCopy, time)

          if (didNotify) {
            medCopy = {
              ...medCopy,
              notificationSentFor: notificationKey,
              updatedAt: Date.now(),
            }
            didChange = true
          }
          continue
        }



        const alreadyRecorded = (medCopy.adherenceHistory || []).some(
          (entry) => entry.date === todayKey && entry.time === time,
        )

        if (
          doseStatus === "Missed" &&
          !alreadyRecorded &&
          isDoseAfterMedicineCreation(medCopy, todayKey, time)
        ) {
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
      }

      return medCopy
    }),
  )

  if (didChange) {
    writeMedicines(nextMedicines)
  }
}

export function useMedicationReminders() {
  useEffect(() => {
    void checkMedicationReminders()
    const reminderTimer = window.setInterval(
      () => void checkMedicationReminders(),
      CHECK_INTERVAL_MS,
    )

    return () => window.clearInterval(reminderTimer)
  }, [])
}
