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

const STORAGE_KEY = "meditrack.medicines"
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
  console.log("[MediTrack Reminders] notifyDoseDue called", {
    medicineId: medicine?.id,
    medicineName: medicine?.name,
    time,
    permission: "Notification" in window ? Notification.permission : "unsupported",
  })

  if (!("Notification" in window) || Notification.permission !== "granted") {
    console.warn(
      "[MediTrack Notifications] Dose reminder skipped because permission is not granted",
      "Notification" in window ? Notification.permission : "unsupported",
    )
    return false
  }

  const displayTime = formatTimeForDisplay(time)
  const title = `Time to take ${medicine.name}`
  const slot = (medicine.scheduleSlots || []).find(s => s.time === time);
  const mealTiming = slot?.mealTiming || medicine.mealTiming || "After Food";
  const message = `Scheduled for ${displayTime}${medicine.dosage ? ` (${medicine.dosage})` : ""}${mealTiming ? ` - ${mealTiming}` : ""}.`
  const notificationResult = await showServiceWorkerNotification(title, {
    body: message,
    tag: `meditrack-${medicine.id}-${getTodayKey()}-${time}`,
    requireInteraction: true,
  })

  console.log("[MediTrack Reminders] Browser notification result", {
    medicineId: medicine?.id,
    medicineName: medicine?.name,
    time,
    shown: notificationResult.shown,
    method: notificationResult.method,
    error: notificationResult.error,
  })

  if (!notificationResult.shown) {
    console.warn("[MediTrack Reminders] Browser notification was not shown; saving in-app notification for visibility", {
      medicineId: medicine?.id,
      medicineName: medicine?.name,
      time,
      method: notificationResult.method,
      error: notificationResult.error,
    })
  }

  console.log("[MediTrack Reminders] addNotification called for dose reminder", {
    title,
    message,
    medicineId: medicine?.id,
    time,
  })
  const savedNotification = addNotification({
    title,
    message,
    type: "reminder",
  })

  return Boolean(savedNotification)
}

const readMedicines = () => {
  const medicines = readJsonFromStorage(STORAGE_KEY, [])
  if (!Array.isArray(medicines)) {
    console.warn("[MediTrack Reminders] Stored medicines were not an array; using an empty list", {
      storedType: typeof medicines,
    })
    return []
  }

  console.log("[MediTrack Reminders] Medicines read from storage", {
    count: medicines.length,
  })
  return medicines
}

const writeMedicines = (medicines) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines))
  console.log("[MediTrack Reminders] Medicines written after reminder check", {
    count: medicines.length,
  })
  window.dispatchEvent(new Event("meditrack-data-updated"))
}

const checkMedicationReminders = async () => {
  const notificationSettings = getNotificationSettings()
  if (notificationSettings.doseReminders === false) {
    console.log("[MediTrack Reminders] Reminder check skipped because dose reminders are disabled", {
      notificationSettings,
    })
    return
  }

  const today = new Date()
  const todayKey = getTodayKey(today)
  const minutesNow = getMinutesNow()
  const historyCleared = Number(localStorage.getItem(CLEAR_KEY) || 0)
  const medicines = readMedicines()
  let didChange = false

  console.log("[MediTrack Reminders] Reminder check start", {
    todayKey,
    currentTime: today.toLocaleTimeString(),
    minutesNow,
    historyCleared,
    medicineCount: medicines.length,
    notificationPermission:
      "Notification" in window ? Notification.permission : "unsupported",
    notificationSettings,
  })

  const nextMedicines = await Promise.all(
    medicines.map(async (medicine) => {
      const scheduledToday = isMedicineScheduledOnDate(medicine, today)
      console.log("[MediTrack Reminders] Medicine scanned", {
        medicineId: medicine?.id,
        medicineName: medicine?.name,
        archived: Boolean(medicine?.archived),
        hasScheduleTimes: Array.isArray(medicine?.scheduleTimes),
        scheduleTimes: medicine?.scheduleTimes,
        scheduledToday,
        notificationSentFor: medicine?.notificationSentFor || null,
      })

      if (
        medicine?.archived ||
        !Array.isArray(medicine?.scheduleTimes) ||
        !scheduledToday
      ) {
        console.log("[MediTrack Reminders] Medicine skipped", {
          medicineId: medicine?.id,
          medicineName: medicine?.name,
          reason: medicine?.archived
            ? "archived"
            : !Array.isArray(medicine?.scheduleTimes)
              ? "missing scheduleTimes"
              : "not scheduled today",
        })
        return medicine
      }

      let medCopy = medicine

      for (const time of medicine.scheduleTimes) {
        const reminderMinutes = parseReminderTime(time)
        if (reminderMinutes === null) {
          console.warn("[MediTrack Reminders] Dose skipped because reminder time is invalid", {
            medicineId: medicine?.id,
            medicineName: medicine?.name,
            time,
          })
          continue
        }

        const doseDateTime = new Date(`${todayKey}T${time}`).getTime()
        if (doseDateTime < historyCleared) {
          console.log("[MediTrack Reminders] Dose skipped because it is before history reset", {
            medicineId: medicine?.id,
            medicineName: medicine?.name,
            time,
            doseDateTime,
            historyCleared,
          })
          continue
        }

        if (!isDoseAfterMedicineCreation(medicine, todayKey, time)) {
          console.log("[MediTrack Reminders] Dose skipped because it was scheduled before medicine creation", {
            medicineId: medicine?.id,
            medicineName: medicine?.name,
            time,
            doseDateTime,
            createdAt: medicine?.createdAt,
          })
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
        const notificationAlreadySent =
          medCopy.notificationSentFor === notificationKey

        console.log("[MediTrack Reminders] Dose status calculated", {
          medicineId: medCopy?.id,
          medicineName: medCopy?.name,
          time,
          reminderMinutes,
          minutesNow,
          doseStatus,
          notificationSentFor: medCopy?.notificationSentFor || null,
          expectedNotificationSentFor: notificationKey,
          notificationAlreadySent,
        })

        if (
          ["Due Soon", "Due Now", "Delayed"].includes(doseStatus) &&
          !notificationAlreadySent
        ) {
          const didNotify = await notifyDoseDue(medCopy, time)

          if (didNotify) {
            medCopy = {
              ...medCopy,
              notificationSentFor: notificationKey,
              updatedAt: Date.now(),
            }
            didChange = true
            console.log("[MediTrack Reminders] notificationSentFor updated", {
              medicineId: medCopy?.id,
              medicineName: medCopy?.name,
              notificationSentFor: notificationKey,
            })
          } else {
            console.warn("[MediTrack Reminders] notifyDoseDue returned false; notificationSentFor was not updated", {
              medicineId: medCopy?.id,
              medicineName: medCopy?.name,
              time,
              notificationSentFor: medCopy?.notificationSentFor || null,
            })
          }

          continue
        }

        if (
          ["Due Soon", "Due Now", "Delayed"].includes(doseStatus) &&
          notificationAlreadySent
        ) {
          console.log("[MediTrack Reminders] notificationSentFor prevented duplicate notification", {
            medicineId: medCopy?.id,
            medicineName: medCopy?.name,
            time,
            notificationSentFor: medCopy?.notificationSentFor,
          })
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
