/**
 * Helper functions for medicine-related logic.
 */

export const getTodayKey = () => new Date().toISOString().slice(0, 10);

export const parseReminderTime = (time) => {
  if (!time || typeof time !== 'string') return null;
  const normalizedTime = time.trim().toUpperCase();
  const timeMatch = normalizedTime.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/)

  if (!timeMatch) return null

  let hours = Number(timeMatch[1])
  const minutes = Number(timeMatch[2])
  const period = timeMatch[3]

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes > 59) {
    return null
  }

  if (period === "PM" && hours < 12) {
    hours += 12
  }

  if (period === "AM" && hours === 12) {
    hours = 0
  }

  if (hours > 23) return null

  return hours * 60 + minutes
}

export const getMinutesNow = () => {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export const formatTimeForStorage = (time) => {
  const reminderMinutes = parseReminderTime(time)

  if (reminderMinutes === null) {
    return time
  }

  const hours = Math.floor(reminderMinutes / 60)
  const minutes = reminderMinutes % 60

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export const formatTimeForDisplay = (time) => {
  const reminderMinutes = parseReminderTime(time)

  if (reminderMinutes === null) {
    return time
  }

  const hours = Math.floor(reminderMinutes / 60)
  const minutes = reminderMinutes % 60
  const period = hours >= 12 ? "PM" : "AM"
  const displayHours = hours % 12 || 12

  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`
}

export const isMedicineScheduledOnDate = (medicine, date) => {
  const dateKey = date.toISOString().slice(0, 10);
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

  if (medicine.startDate && dateKey < medicine.startDate) return false;
  if (medicine.endDate && dateKey > medicine.endDate) return false;
  if (medicine.status === "Completed Course") return false;

  if (medicine.frequencyType === "Weekly") {
    const [y, m, d] = medicine.startDate.split("-").map(Number);
    const startDayName = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
    return dayName === startDayName;
  }

  if (medicine.frequencyType === "Custom Days") return medicine.customDays?.includes(dayName);

  return true;
};