/**
 * Helper functions for medicine-related logic.
 */

export const getTodayKey = (date = new Date()) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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

export const TIME_SLOT_OPTIONS = [
  { value: "Morning", label: "🌅 Morning" },
  { value: "Afternoon", label: "☀️ Afternoon" },
  { value: "Evening", label: "🌆 Evening" },
  { value: "Night", label: "🌙 Night" },
]

export const DEFAULT_TIME_SLOT = "Morning"

const timeSlotIcons = {
  Morning: "🌅",
  Afternoon: "☀️",
  Evening: "🌆",
  Night: "🌙",
}

export const normalizeTimeSlot = (timeSlot) =>
  TIME_SLOT_OPTIONS.some((option) => option.value === timeSlot)
    ? timeSlot
    : DEFAULT_TIME_SLOT

export const getTimeSlotDisplay = (timeSlot) => {
  const label = normalizeTimeSlot(timeSlot)

  return `${timeSlotIcons[label]} ${label}`
}

export const getTimeSlotFromTime = (time) => {
  const reminderMinutes = parseReminderTime(time)

  if (reminderMinutes === null) {
    return DEFAULT_TIME_SLOT
  }

  if (reminderMinutes >= 5 * 60 && reminderMinutes < 12 * 60) {
    return "Morning"
  }

  if (reminderMinutes >= 12 * 60 && reminderMinutes < 17 * 60) {
    return "Afternoon"
  }

  if (reminderMinutes >= 17 * 60 && reminderMinutes < 21 * 60) {
    return "Evening"
  }

  return "Night"
}

export const getSlotOrder = (timeSlot) =>
  TIME_SLOT_OPTIONS.findIndex((option) => option.value === normalizeTimeSlot(timeSlot))

export const normalizeScheduleSlots = (medicine = {}) => {
  const rawSlots = Array.isArray(medicine.scheduleSlots) ? medicine.scheduleSlots : []
  const sourceSlots = rawSlots.length > 0
    ? rawSlots
    : (Array.isArray(medicine.scheduleTimes) ? medicine.scheduleTimes : medicine.reminderTimes || [medicine.time || "08:00"])
        .map((time, index) => ({
          slot: index === 0 ? normalizeTimeSlot(medicine.timeSlot) : getTimeSlotFromTime(time),
          time,
        }))

  const seenSlots = new Set()
  const normalizedSlots = sourceSlots
    .map((entry) => ({
      slot: normalizeTimeSlot(entry?.slot),
      time: rawSlots.length > 0
        ? (entry?.time ? formatTimeForStorage(entry.time) : "")
        : formatTimeForStorage(entry?.time || "08:00"),
    }))
    .filter((entry) => {
      if (seenSlots.has(entry.slot)) return false
      seenSlots.add(entry.slot)
      return true
    })
    .sort((first, second) => getSlotOrder(first.slot) - getSlotOrder(second.slot))

  return normalizedSlots.length > 0
    ? normalizedSlots
    : [{ slot: DEFAULT_TIME_SLOT, time: "08:00" }]
}

export const getScheduleTimesFromSlots = (scheduleSlots) =>
  normalizeScheduleSlots({ scheduleSlots })
    .map((entry) => entry.time)
    .filter(Boolean)

export const formatTimeWithSlotLabel = (time, timeSlot) => {
  const label = normalizeTimeSlot(timeSlot)
  const displayTime = formatTimeForDisplay(time)

  return `${displayTime} • ${timeSlotIcons[label]} ${label}`
}

export const isDoseAfterMedicineCreation = (medicine, dateKey, time) => {
  if (medicine?.createdAt === undefined || medicine?.createdAt === null || medicine?.createdAt === "") {
    return true
  }

  const createdAtValue =
    typeof medicine.createdAt === "string" && /^\d+$/.test(medicine.createdAt)
      ? Number(medicine.createdAt)
      : medicine.createdAt
  const createdAt = new Date(createdAtValue).getTime()
  if (Number.isNaN(createdAt)) return true

  const doseDateTime = new Date(`${dateKey}T${time}`).getTime()
  if (Number.isNaN(doseDateTime)) return true

  return doseDateTime >= createdAt
}

export const isMedicineScheduledOnDate = (medicine, date) => {
  const dateKey = getTodayKey(date);
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
