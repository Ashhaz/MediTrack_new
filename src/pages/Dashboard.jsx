import { useEffect, useMemo, useState } from "react"
import { 
  Clock, 
  Calendar, 
  AlertTriangle, 
  Package, 
  Activity, 
  CheckCircle2, 
  Layers,
  XCircle,
  BarChart3,
  Timer,
  BellRing,
  Info
} from "lucide-react"
import { 
  getTodayKey, 
  parseReminderTime,
  isMedicineScheduledOnDate, 
  getMinutesNow, 
  formatTimeForStorage, 
  formatTimeForDisplay
} from "../utils/medicineUtils.js"
import { calculateWeeklyAdherence } from "../utils/adherenceUtils.js"
import MedicineName from "../components/MedicineName"
import { getStockStatus } from "../utils/stockUtils.js"

import AddMedicineModal from "../components/AddMedicineModal"
import CalendarModal from "../components/CalendarModal"
import MedicineCard from "../components/MedicineCard"
import NotificationCenter from "../components/NotificationCenter.jsx"
import { medicines } from "../data/medicines"
import { readJsonFromStorage } from "../utils/storageUtils.js"

const STORAGE_KEY = "meditrack.medicines"
const CLEAR_KEY = "meditrack.historyCleared"
const statusStyles = {
  "Due Now": "bg-amber-400/20 text-amber-100 border border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.1)]",
  "Due Soon": "bg-emerald-400/15 text-emerald-100 border border-emerald-500/20",
  "Delayed": "bg-rose-400/20 text-rose-100 border border-rose-500/30",
  Upcoming: "bg-teal-400/10 text-teal-100/70 border border-white/5",
  Missed: "bg-rose-500/15 text-rose-100 border border-rose-500/20 shadow-rose-950/20",
  Taken: "bg-emerald-400/15 text-emerald-100 shadow-emerald-950/20",
  "Completed Course": "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30",
}

const emptyForm = {
  name: "",
  dosage: "",
  scheduleTimes: ["08:00"],
  instructions: "",
  status: "Upcoming",
  dosesPerDay: 1,
  frequencyType: "Daily",
  medicineType: "Tablet",
  mealTiming: "With Food",
  stock: 30,
  duration: "Until Stopped",
  startDate: getTodayKey(),
  endDate: "",
  customDays: [],
}

const DEMO_MEDS = [
  {
    id: 1,
    name: "Metformin",
    dosage: "500mg",
    scheduleTimes: ["08:00", "20:00"],
    instructions: "Take after meals for blood sugar support.",
    status: "Upcoming",
    dosesPerDay: 2,
    frequencyType: "Daily",
    medicineType: "Tablet",
    mealTiming: "After Food",
    stock: 45,
    startDate: getTodayKey(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    adherenceHistory: [{ date: getTodayKey(), time: "08:00", status: "Taken" }]
  },
  {
    id: 2,
    name: "Vitamin D3",
    dosage: "2000 IU",
    scheduleTimes: ["09:00"],
    instructions: "Support bone health and immunity.",
    status: "Upcoming",
    dosesPerDay: 1,
    frequencyType: "Daily",
    medicineType: "Capsule",
    mealTiming: "With Food",
    stock: 60,
    startDate: getTodayKey(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    adherenceHistory: []
  }
]

const REMINDER_WINDOW_MINUTES = 30

const frequencyOptions = ["Daily", "Weekly", "Custom Days"]

const normalizeMedicine = (medicine) => {
  if (!medicine || typeof medicine !== 'object') return null;
  
  // Migration logic
  const scheduleTimes = medicine.scheduleTimes || medicine.reminderTimes || [medicine.time || "08:00"];
  const dosesPerDay = medicine.dosesPerDay || (
    medicine.dosageFrequency === "Four Times Daily" ? 4 :
    medicine.dosageFrequency === "Three Times Daily" ? 3 :
    medicine.dosageFrequency === "Twice Daily" ? 2 : 1
  );

  return {
    ...medicine,
    name: medicine.name || "Unknown Medicine",
    dosage: medicine.dosage || "No dosage set",
    medicineType: medicine.medicineType || medicine.type || "Tablet",
    mealTiming: medicine.mealTiming || "With Food",
    stock: Number(medicine.stock ?? 30),
    dosesPerDay: Number(dosesPerDay),
    scheduleTimes: Array.isArray(scheduleTimes) ? scheduleTimes.map(formatTimeForStorage) : ["08:00"],
    frequencyType: medicine.frequencyType || medicine.frequency || "Daily",
    instructions: medicine.instructions || medicine.instruction || "No instructions",
    createdAt: medicine.createdAt || medicine.id || Date.now(),
    updatedAt: medicine.updatedAt || Date.now(),
  }
}

const getDoseStatus = (medicine, time, minutesNow = getMinutesNow(), targetDate = new Date(), lastReset = 0) => {
  const dateKey = getTodayKey(targetDate)
  const entry = (medicine.adherenceHistory || []).find(h => h.date === dateKey && h.time === time)
  if (entry) return entry.status
  
  // If the dose was scheduled before the history was cleared, treat it as Upcoming (not Missed)
  const doseDateTime = new Date(`${dateKey}T${time}`).getTime()
  if (doseDateTime < lastReset) return "Upcoming"

  if (medicine.status === "Completed Course") return "Completed Course"

  const reminderMinutes = parseReminderTime(time)
  if (reminderMinutes === null) return "Upcoming"
  
  const isToday = targetDate.toDateString() === new Date().toDateString()
  if (!isToday) return "Upcoming"

  if (minutesNow >= reminderMinutes && minutesNow <= reminderMinutes + REMINDER_WINDOW_MINUTES) return "Due Now"
  if (reminderMinutes - minutesNow <= REMINDER_WINDOW_MINUTES && reminderMinutes - minutesNow > 0) return "Due Soon"
  if (minutesNow > reminderMinutes + REMINDER_WINDOW_MINUTES && minutesNow < reminderMinutes + 120) return "Delayed"
  if (minutesNow >= reminderMinutes + 120) return "Missed"
  
  return "Upcoming"
}

const isMedicineScheduledToday = (medicine) => isMedicineScheduledOnDate(medicine, new Date())

const normalizeInitialStatus = (medicine) => ({
  ...medicine,
  // We let getDoseStatus calculate the visual status dynamically, 
  // but we ensure the base object has a valid starting status if new.
  status: medicine?.status || "Upcoming",
})

const getInitialMedicines = () => {
  const parsedMedicines = readJsonFromStorage(STORAGE_KEY, [])
  const validMeds = Array.isArray(parsedMedicines) ? parsedMedicines : []

  return validMeds
    .map(normalizeMedicine)
    .filter(Boolean)
    .map(normalizeInitialStatus)
}

const medicineListsMatch = (firstList, secondList) =>
  JSON.stringify(firstList) === JSON.stringify(secondList)

function Dashboard() {
  const [medicineList, setMedicineList] = useState(getInitialMedicines)
  const [searchQuery, setSearchQuery] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [medicineToDelete, setMedicineToDelete] = useState(null)
  const [medicineToEdit, setMedicineToEdit] = useState(null)
  const [medicineToRefill, setMedicineToRefill] = useState(null)
  const [refillAmount, setRefillAmount] = useState(30)
  const [refillSuccess, setRefillSuccess] = useState(false)
  const [nameError, setNameError] = useState("")
  const [form, setForm] = useState(emptyForm)
  const [timeTick, setTimeTick] = useState(Date.now())
  const [notificationPermission, setNotificationPermission] = useState(() =>
    "Notification" in window ? Notification.permission : "unsupported",
  )

  useEffect(() => {
    // Save medicine list to localStorage whenever it changes
    localStorage.setItem(STORAGE_KEY, JSON.stringify(medicineList))
    window.dispatchEvent(new Event('meditrack-data-updated')); // Dispatch custom event
  }, [medicineList])

  useEffect(() => {
    const syncMedicinesFromStorage = () => {
      const storedMedicines = getInitialMedicines()
      setMedicineList((currentMedicines) =>
        medicineListsMatch(currentMedicines, storedMedicines)
          ? currentMedicines
          : storedMedicines,
      )
    }

    window.addEventListener("meditrack-data-updated", syncMedicinesFromStorage)
    window.addEventListener("storage", syncMedicinesFromStorage)

    return () => {
      window.removeEventListener("meditrack-data-updated", syncMedicinesFromStorage)
      window.removeEventListener("storage", syncMedicinesFromStorage)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setTimeTick(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!("Notification" in window)) {
      return
    }

    if (Notification.permission === "default") {
      Notification.requestPermission().then(setNotificationPermission)
    }
  }, [])

  const activeMedicines = medicineList.filter(m => !m.archived && isMedicineScheduledToday(m));
  const completedMedicines = medicineList.filter(m => !m.archived && !isMedicineScheduledToday(m) && (m.status === "Completed Course" || (m.endDate && getTodayKey() > m.endDate)));

  const filteredMedicines = activeMedicines.filter((medicine) =>
    (medicine?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  ).map(med => {
    const historyCleared = Number(localStorage.getItem(CLEAR_KEY) || 0)
    // Find the next upcoming or missed dose to display on the card
    const rTimes = Array.isArray(med?.scheduleTimes) ? med.scheduleTimes : ["08:00"]
    const doses = rTimes.map(t => ({ time: t, status: getDoseStatus(med, t, getMinutesNow(), new Date(), historyCleared) }))
    const activeDose =
      doses.find((d) => d.status !== "Taken") ||
      doses[doses.length - 1] ||
      { time: "08:00", status: "Upcoming" }
    return { ...med, status: activeDose.status, time: activeDose.time }
  })

  const greeting = useMemo(() => {
    const hour = new Date(timeTick).getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 18) return "Good Afternoon"
    return "Good Evening"
  }, [timeTick])

  const priorityDose = useMemo(() => {
    const now = new Date(timeTick)
    const minutesNow = now.getHours() * 60 + now.getMinutes()
    const historyCleared = Number(localStorage.getItem(CLEAR_KEY) || 0)
    
    const candidates = medicineList
      .filter(m => !m.archived && isMedicineScheduledToday(m))
      .flatMap(m => m.scheduleTimes.map(time => ({
        medicine: m,
        time,
        minutes: parseReminderTime(time),
        status: getDoseStatus(m, time, minutesNow, now, historyCleared)
      })))
      .filter(d => ["Due Now", "Due Soon", "Delayed"].includes(d.status))
      .sort((a, b) => {
        const rank = { "Due Now": 0, "Delayed": 1, "Due Soon": 2 }
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status]
        return a.minutes - b.minutes
      })

    return candidates[0] || null
  }, [medicineList, timeTick])

  const weekSchedule = useMemo(() => { // Used by CalendarModal
    const schedule = []
    const minutesNow = getMinutesNow()
    const historyCleared = Number(localStorage.getItem(CLEAR_KEY) || 0)
    
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      const dateKey = getTodayKey(date)
      
      const dayMeds = medicineList
        .filter(m => !m.archived && isMedicineScheduledOnDate(m, date))
        .flatMap(m => m.scheduleTimes.map(time => ({
          time: formatTimeForDisplay(time),
          name: m.name,
          dosage: m.dosage,
          status: getDoseStatus(m, time, minutesNow, date, historyCleared),
          rawTime: parseReminderTime(time),
          stock: m.stock
        })))
        .sort((a, b) => a.rawTime - b.rawTime)

      if (dayMeds.length > 0) schedule.push({ date, items: dayMeds })
    }
    return schedule
  }, [medicineList, timeTick])

  const filteredCompleted = completedMedicines.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).map(m => ({ ...m, status: "Completed Course", time: m.scheduleTimes[0] }));

  const upcomingReminders = useMemo(
    () => {
      const allDoses = []
      const historyCleared = Number(localStorage.getItem(CLEAR_KEY) || 0)
      const todayKey = getTodayKey()

      medicineList.filter(m => isMedicineScheduledOnDate(m, new Date())).forEach(med => {
        med.scheduleTimes.forEach(time => {
          const status = getDoseStatus(med, time, getMinutesNow(), new Date(), historyCleared)
          if (status !== "Taken") {
            allDoses.push({
              time,
              name: med.name,
              dosage: med.dosage || "Dose set",
              mealTiming: med.mealTiming || "With Food",
              stock: med.stock || 0,
              status,
              rawTime: parseReminderTime(time)
            })
          }
        })
      })
      return allDoses
        .sort((a, b) => (a.rawTime ?? 0) - (b.rawTime ?? 0))
        .slice(0, 3)
        .map(d => ({
          displayTime: formatTimeForDisplay(d.time),
          name: d.name,
          dosage: d.dosage,
          status: d.status,
          mealTiming: d.mealTiming,
          stock: d.stock
        }))
    },
    [medicineList],
  )
  const adherenceStats = useMemo(() => {
    const activeList = medicineList.filter(m => !m.archived && isMedicineScheduledOnDate(m, new Date()));
    const historyCleared = Number(localStorage.getItem(CLEAR_KEY) || 0)
    
    let total = 0
    let completed = 0
    let missed = 0
    let lowStockCount = 0
    let upcomingCount = 0

    // Streak Logic
    let streak = 0;
    const history = medicineList.filter(m => !m.archived);

    for (let i = 0; i < 30; i++) {
      const date = getTodayKey(new Date(new Date().setDate(new Date().getDate() - i)));
      const dayMeds = history.filter(m => m.startDate <= date && (!m.endDate || m.endDate >= date));
      if (dayMeds.length === 0) { if (i === 0) continue; streak = 0; break; }
      const perfect = dayMeds.every(m => {
        const doses = m.scheduleTimes.length;
        const taken = (m.adherenceHistory || []).filter(h => h.date === date && h.status === "Taken").length;
        return taken >= doses;
      });
      if (perfect) streak++;
      else if (i > 0) break;
    }

    // Intelligence Panel Logic
    const totalActiveMeds = history.length;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextRunningOut = history.length > 0 
      ? [...history].sort((a, b) => (a.stock || 0) - (b.stock || 0))[0].name 
      : "None";
    
    let tomorrowDoses = 0;
    const timeFreq = {};

    history.forEach(med => {
      if (isMedicineScheduledOnDate(med, tomorrow)) {
        tomorrowDoses += med.scheduleTimes.length;
      }
      med.scheduleTimes.forEach(t => {
        const display = formatTimeForDisplay(t);
        timeFreq[display] = (timeFreq[display] || 0) + 1;
      });
    });

    const busiestTime = Object.keys(timeFreq).length > 0
      ? Object.keys(timeFreq).reduce((a, b) => timeFreq[a] > timeFreq[b] ? a : b)
      : "None";
    
    const lowStockNames = history
      .filter(m => m.stock <= 5)
      .map(m => m.name)
      .join(", ");

    activeList.forEach(med => {
      if (med.stock <= 5) lowStockCount++
      const todayKey = getTodayKey()
      med.scheduleTimes.forEach(t => {
        const doseDateTime = new Date(`${todayKey}T${t}`).getTime()
        // Only count as a "Scheduled Dose" for stats if it happened after the reset
        const isAfterReset = doseDateTime >= historyCleared

        if (isMedicineScheduledOnDate(med, new Date()) && isAfterReset) total++
        
        const s = getDoseStatus(med, t, getMinutesNow(), new Date(), historyCleared)
        if (s === "Taken") completed++
        else if (s === "Missed") missed++
        else upcomingCount++
      })
    })

    const actualTotal = total;
    const weeklyPercentage = calculateWeeklyAdherence(medicineList);
    const dailyScore = Math.min(100, Math.max(0, Math.round(((completed + (actualTotal - completed - missed) * 0.5) / (actualTotal || 1)) * 100)));

    return {
      completed,
      missed,
      upcomingCount,
      weeklyPercentage,
      streak,
      dailyScore,
      lowStockCount,
      totalDosesToday: actualTotal,
      totalActiveMeds,
      tomorrowDoses,
      busiestTime,
      lowStockNames,
      nextRunningOut
    }
  }, [medicineList])

  const hasAdherenceData = adherenceStats.weeklyPercentage !== null;
  
  const criticalInventory = useMemo(() => 
    medicineList.filter(m => !m.archived && getStockStatus(m.stock, m.dosesPerDay).status !== "Healthy"), 
    [medicineList]
  );

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported")
      return
    }

    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
  }

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setMedicineToEdit(null)
    setForm(emptyForm)
  }

  const handleFormSubmit = (event) => {
    event.preventDefault()

    const trimmedName = form.name.trim()
    if (trimmedName.length < 1) {
      setNameError("Name is required")
      return
    }
    if (trimmedName.length > 60) {
      setNameError("Name exceeds 60 characters")
      return
    }
    setNameError("")

    if (form.endDate && form.endDate < form.startDate) {
      alert("End date cannot be before start date.")
      return
    }

    if (medicineToEdit) {
      setMedicineList(current => current.map(m => 
        m.id === medicineToEdit.id ? {
          ...m,
          ...form,
          scheduleTimes: form.scheduleTimes.map(formatTimeForStorage),
          startDate: form.startDate || getTodayKey(),
          updatedAt: Date.now()
        } : m
      ))
    } else {
      addMedicine()
    }

    closeModal()
  }

  const addMedicine = () => {
    setMedicineList((current) => [
      ...current,
      {
        id: Date.now(),
        name: form.name,
        dosage: form.dosage,
        scheduleTimes: form.scheduleTimes.map(formatTimeForStorage),
        instructions: form.instructions,
        status: form.status,
        previousStatus: form.status,
        dosesPerDay: form.dosesPerDay || 1,
        frequencyType: form.frequencyType || "Daily",
        medicineType: form.medicineType || "Tablet",
        mealTiming: form.mealTiming || "With Food",
        stock: form.stock || 0,
        customDays: form.customDays || [],
        duration: form.duration,
        startDate: form.startDate || getTodayKey(), // Use centralized utility
        endDate: form.endDate,
        notificationSentFor: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        missedFor: null,
      },
    ])
  }

  const markMedicineMissed = (medicineId) => {
    setMedicineList((current) =>
      current.map((medicine) => {
        if (medicine.id !== medicineId) {
          return medicine
        }
        
        const todayKey = getTodayKey()
        const doseToMark = medicine.scheduleTimes.find(t => {
          const status = getDoseStatus(medicine, t)
          return status !== "Taken" && status !== "Missed"
        })

        if (!doseToMark) {
          return medicine
        }

        // Filter out any existing entries for this specific time
        const cleanHistory = (medicine.adherenceHistory || []).filter(
          h => !(h.date === todayKey && h.time === doseToMark)
        )

        return {
          ...medicine,
          adherenceHistory: [
            ...cleanHistory,
            { date: todayKey, time: doseToMark, status: "Missed" }
          ],
          updatedAt: Date.now()
        }
      }),
    )
  }

  const markMedicineTaken = (medicineId) => {
    setMedicineList((current) =>
      current.map((medicine) => {
        if (medicine.id !== medicineId) {
          return medicine
        }
        
        const todayKey = getTodayKey() // Use centralized utility
        const doseToMark = medicine.scheduleTimes.find(t => getDoseStatus(medicine, t) !== "Taken")

        if (!doseToMark) {
          // Unmark the last dose of the day if all are completed
          const lastEntry = (medicine.adherenceHistory || []).find(h => h.date === todayKey && h.time === medicine.scheduleTimes[medicine.scheduleTimes.length - 1]);
          const lastDoseTime = medicine.scheduleTimes[medicine.scheduleTimes.length - 1]
          return {
            ...medicine,
            stock: (medicine.stock || 0) + (lastEntry?.status === 'Taken' ? 1 : 0),
            adherenceHistory: (medicine.adherenceHistory || []).filter(
              h => !(h.date === todayKey && h.time === lastDoseTime)
            ),
          }
        }

        // Filter out any existing entries for this specific time (e.g., if it was previously "Missed")
        // to ensure the "Taken" status is the only one persisted for this dose window.
        const cleanHistory = (medicine.adherenceHistory || []).filter(
          h => !(h.date === todayKey && h.time === doseToMark)
        )

        return {
          ...medicine,
          stock: Math.max(0, (medicine.stock || 0) - 1),
          adherenceHistory: [
            ...cleanHistory,
            { date: todayKey, time: doseToMark, status: "Taken" }
          ],
          updatedAt: Date.now()
        }
      }),
    )
  }

  const openEditModal = (medicine) => {
    setMedicineToEdit(medicine)
    setForm({
      ...medicine,
      scheduleTimes: medicine.scheduleTimes.map(t => formatTimeForStorage(t))
    })
    setIsModalOpen(true)
  }

  const handleRefill = (medicineId) => {
    const med = medicineList.find(m => m.id === medicineId)
    setMedicineToRefill(med)
    setRefillAmount(30)
    setRefillSuccess(false)
  }

  const confirmRefill = () => {
    setRefillSuccess(true)
    setTimeout(() => {
      setMedicineList(current => current.map(m => 
        m.id === medicineToRefill.id ? { ...m, stock: (m.stock || 0) + refillAmount } : m
      ))
      setMedicineToRefill(null)
      setRefillSuccess(false)
    }, 1200)
  }

  const handleRestart = (medicineId) => {
    setMedicineList(current => current.map(m => 
      m.id === medicineId ? { 
        ...m, 
        startDate: getTodayKey(), 
        endDate: "", // Reset end date when restarting
        status: "Upcoming",
        adherenceHistory: [] 
      } : m
    ))
  }

  const handleArchive = (medicineId) => {
    setMedicineList(current => current.map(m => 
      m.id === medicineId ? { ...m, archived: !m.archived } : m
    ))
  }

  const confirmDeleteMedicine = () => {
    if (!medicineToDelete) {
      return
    }

    setMedicineList((current) =>
      current.filter((medicine) => medicine.id !== medicineToDelete.id),
    )
    setMedicineToDelete(null)
  }

  return (
    <div className="min-h-screen w-full bg-[#04110f] text-white overflow-x-hidden">
      <style>
        {`
          @keyframes modalIn {
            from {
              opacity: 0;
              transform: translateY(18px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}
      </style>

      <header className="mb-3 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-3 shadow-2xl shadow-slate-950/20 backdrop-blur-xl sm:mb-4 sm:rounded-3xl sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-emerald-100 sm:text-sm">
            {new Date().toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="mt-0.5 truncate text-2xl font-black tracking-tight sm:mt-1 sm:text-4xl">
            {greeting}, Ashhaz 👋
          </h1>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:flex sm:flex-row sm:items-center sm:gap-3">
          <label className="flex min-h-12 min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-slate-300 shadow-lg shadow-slate-950/10 transition focus-within:border-emerald-300/35 focus-within:bg-emerald-400/10 sm:w-72 sm:gap-3 sm:px-4 sm:py-3">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-none stroke-emerald-200/80 stroke-2"
            >
              <path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" />
            </svg>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search medicines"
              className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-slate-500"
            />
          </label>

          <NotificationCenter />

          <div className="flex h-12 min-w-12 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-1.5 shadow-lg shadow-slate-950/10 sm:min-w-0 sm:justify-start sm:px-3 sm:py-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-sm font-black shadow-lg shadow-emerald-950/30">
              AA
            </div>
            <div className="hidden pr-2 sm:block">
              <p className="text-sm font-bold">Ashhaz</p>
              <p className="text-xs text-slate-400">Care profile</p>
            </div>
          </div>
        </div>
      </header>

      <section
        id="overview"
        className="relative rounded-3xl border border-emerald-200/15 bg-white/[0.06] p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-xl transition duration-500 hover:border-emerald-300/30 hover:bg-white/[0.08] sm:rounded-[2.5rem] sm:p-8 lg:p-10"
      >
        <div className="absolute inset-0 overflow-hidden rounded-3xl sm:rounded-[2.5rem] pointer-events-none">
          <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="absolute -bottom-14 left-10 h-36 w-36 rounded-full bg-teal-500/10 blur-2xl" />
        </div>

        <div className="relative flex flex-col gap-5 sm:gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
              Health Summary
            </h2>
            
            <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 sm:h-10 sm:w-10">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{adherenceStats.upcomingCount} Doses</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Upcoming Today</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${adherenceStats.missed > 0 ? 'bg-amber-400/10 text-amber-400' : 'bg-slate-400/10 text-slate-500'}`}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{adherenceStats.missed} Missed</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Needs attention</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 shadow-lg shadow-orange-950/20 sm:h-10 sm:w-10">
                  🔥
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{adherenceStats.streak} Day Streak</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Consistency</p>
                </div>
              </div>

              {adherenceStats.lowStockCount > 0 && (
                <div className="flex min-h-10 items-center gap-3 rounded-2xl bg-rose-500/10 px-3 py-2 ring-1 ring-rose-500/20 sm:px-4">
                  <span className="flex h-2 w-2 animate-pulse rounded-full bg-rose-400" />
                  <p className="text-xs font-bold text-rose-300">Refill needed soon</p>
                </div>
              )}
            </div>

            {priorityDose && (
              <div className="mt-5 flex flex-col justify-between gap-4 rounded-2xl border border-amber-500/20 bg-amber-400/5 p-4 transition duration-300 group hover:border-amber-500/40 sm:mt-8 sm:flex-row sm:items-center sm:p-5">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 flex items-center justify-center rounded-xl bg-amber-400/20 text-amber-400 animate-pulse">
                    <BellRing size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-amber-100 font-black tracking-tight">{priorityDose.medicine.name} is {priorityDose.status.toLowerCase()}</p>
                    <p className="text-xs text-slate-500 font-medium">Scheduled for {formatTimeForDisplay(priorityDose.time)}</p>
                  </div>
                </div>
                <button onClick={() => markMedicineTaken(priorityDose.medicine.id)} className="min-h-12 rounded-xl bg-amber-500 px-5 py-3 text-xs font-black text-black transition hover:bg-amber-400 sm:min-h-0 sm:px-4 sm:py-2">Mark Taken</button>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-black/40 p-6 shadow-inner ring-1 ring-white/10 sm:rounded-[2rem] sm:p-8 lg:w-56">
            <div className="relative flex h-16 w-16 items-center justify-center sm:h-24 sm:w-24">
              <svg viewBox="0 0 96 96" className="absolute h-full w-full -rotate-90">
                <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                <circle 
                  cx="48" 
                  cy="48" 
                  r="44" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray={276} 
                  strokeDashoffset={276 - (276 * (adherenceStats.weeklyPercentage || 0)) / 100} 
                  strokeLinecap="round" 
                  className={`${hasAdherenceData ? 'text-emerald-500' : 'text-white/10'} transition-all duration-1000`} 
                />
              </svg>
              <p className={`${hasAdherenceData ? 'text-lg sm:text-2xl' : 'text-[10px] sm:text-sm'} font-black text-white text-center`}>
                {hasAdherenceData ? `${adherenceStats.weeklyPercentage}%` : "No Data"}
              </p>
            </div>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">7-Day Adherence</p>
            {!hasAdherenceData && (
              <p className="mt-1 text-[9px] text-slate-500 text-center leading-tight max-w-[120px]">
                Add medicines to start tracking
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:mt-10 sm:grid-cols-2 lg:flex">
            <button
              onClick={() => setIsModalOpen(true)}
              className="min-h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/35 transition duration-300 hover:-translate-y-0.5 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-500/20"
            >
              Add medicine
            </button>
            <button
              onClick={() => setIsCalendarOpen(true)}
              className="min-h-12 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-center text-sm font-bold text-slate-200 shadow-lg shadow-slate-950/10 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/30 hover:bg-emerald-400/10 hover:text-white"
            >
              Calendar
            </button>
          </div>
      </section>

      {priorityDose && (
        <div className="mt-10 animate-[modalIn_0.4s_ease-out]">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">Priority Workflow</h3>
          </div>
          <div className="rounded-[2rem] border border-amber-300/20 bg-amber-400/[0.03] p-6 shadow-xl shadow-amber-950/10 backdrop-blur-xl transition duration-500 hover:border-amber-300/40">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400 ring-1 ring-amber-500/20"><Timer size={28} /></div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                     <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-100">{priorityDose.status}</span>
                  </div>
                  <div className="mt-1 min-w-0">
                    <MedicineName name={priorityDose.medicine.name} truncate={true} className="text-2xl font-black text-white" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">{priorityDose.medicine.dosage} • {priorityDose.medicine.mealTiming}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => markMedicineTaken(priorityDose.medicine.id)} className="flex min-h-12 items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-amber-400"><CheckCircle2 size={18} /> Take Now</button>
                <button onClick={() => markMedicineMissed(priorityDose.medicine.id)} className="flex min-h-12 items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-6 py-3 text-sm font-bold text-rose-400 transition hover:bg-rose-500/20"><XCircle size={18} /> Missed</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Alerts Section - Updated to use getStockStatus utility */}
      {criticalInventory.length > 0 && (
        <section className="mt-8 animate-[modalIn_0.5s_ease-out]">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)]" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-rose-400">Inventory Critical</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {criticalInventory.map(med => {
              const stockInfo = getStockStatus(med.stock, med.dosesPerDay);
              if (stockInfo.status === "Healthy") return null;
              
              return (
                <div 
                  key={`alert-bottom-${med.id}`}
                  className={`group relative overflow-hidden rounded-3xl border ${stockInfo.border} ${stockInfo.bg} p-5 backdrop-blur-xl transition hover:opacity-80`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className={`text-[10px] font-black uppercase tracking-widest text-${stockInfo.color} mb-1`}>{stockInfo.badgeText}</p>
                      <h4 className="text-lg font-black text-white truncate">{med.name}</h4>
                      <p className="text-sm font-medium text-slate-400">
                        Estimated <span className={`text-${stockInfo.color} font-bold`}>{stockInfo.daysLeft} days</span> remaining
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black text-white">{med.stock}</p>
                      <p className="text-[10px] font-bold uppercase text-slate-500">Units</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRefill(med.id)} 
                    className={`mt-4 w-full rounded-xl bg-${stockInfo.color}/10 py-2 text-[10px] font-black uppercase tracking-widest text-${stockInfo.color} transition hover:bg-${stockInfo.color} hover:text-white`}
                  >
                    Refill Inventory
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section id="medicines" className="mt-5">
        <div className="mb-5">
          <div>
            <p className="text-sm font-semibold text-emerald-200">Medicines</p>
            <h2 className="mt-1 text-2xl font-black">Medicine reminders</h2>
          </div>
        </div>

        {filteredMedicines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-[2.5rem] border border-white/5 bg-white/[0.02]">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] text-slate-600">
              <Package size={32} />
            </div>
            <h3 className="text-xl font-bold text-white">No active medications</h3>
            <p className="mt-2 max-w-sm text-sm text-slate-500">Your reminder list is currently empty. Check back later or add a new schedule.</p>
          </div>
        ) : (
          <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredMedicines.map((medicine, index) => (
              <MedicineCard
                key={medicine.id}
                id={medicine.id}
                name={medicine.name}
                dosage={medicine.dosage}
                medicineType={medicine.medicineType}
                stock={medicine.stock}
                scheduleTimes={medicine.scheduleTimes}
                time={formatTimeForDisplay(medicine.time)}
                instructions={medicine.instructions}
                status={medicine.status}
                accentIndex={index}
                onMarkTaken={markMedicineTaken}
                onMarkMissed={markMedicineMissed}
                onEdit={() => openEditModal(medicine)}
                onRefill={() => handleRefill(medicine.id)}
                onRestart={() => handleRestart(medicine.id)}
                onArchive={() => handleArchive(medicine.id)}
                onDelete={() => setMedicineToDelete(medicine)}
              />
            ))}
          </div>
        )}
      </section>

      <section
        id="reminders"
        className="mt-7 rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl shadow-slate-950/30 backdrop-blur-xl transition duration-500 hover:border-emerald-300/20"
      >
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Operational Timeline</p>
            <h2 className="mt-1 text-2xl font-black text-white">Medication Command Center</h2>
          </div>
          <button 
            onClick={() => setIsCalendarOpen(true)}
            className="rounded-xl border border-white/10 bg-black/25 px-5 py-2.5 text-sm font-bold text-slate-200 transition hover:border-emerald-300/30 hover:bg-emerald-400/10"
          >
            Calendar View
          </button>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1fr_300px]">
          {/* Left Side: Schedule Timeline */}
          <div className="space-y-6">
            {/* Subtle Daily Progress */}
            <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span className="flex items-center gap-2"><BarChart3 className="h-3 w-3 text-emerald-500" /> Daily Flow</span>
                <span>{adherenceStats.completed} / {adherenceStats.totalDosesToday} Doses Taken</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000" 
                  style={{ width: `${(adherenceStats.completed / (adherenceStats.totalDosesToday || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid gap-3">
              {adherenceStats.totalDosesToday === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-sm font-semibold text-slate-400 shadow-lg">
                  No medications scheduled for today.
                </div>
              ) : adherenceStats.completed >= adherenceStats.totalDosesToday ? (
                <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-6 text-sm font-semibold text-emerald-100 shadow-lg shadow-emerald-950/20">
                  All medications for today have been completed.
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 text-sm font-semibold text-slate-400 shadow-lg mb-3">
                    {adherenceStats.totalDosesToday - adherenceStats.completed} {adherenceStats.totalDosesToday - adherenceStats.completed === 1 ? 'medication' : 'medications'} remaining today.
                  </div>
                  {upcomingReminders.map((item) => (
                    <div
                      key={`${item.displayTime}-${item.name}`}
                      className="group grid gap-4 rounded-2xl border border-white/10 bg-black/25 p-5 transition duration-300 hover:border-emerald-500/20 hover:bg-emerald-500/5 sm:grid-cols-[100px_1fr_auto] sm:items-center mb-3 last:mb-0"
                    >
                      <p className="text-xl font-black text-white">{item.displayTime}</p>
                      <div className="min-w-0">
                        <div className="text-lg font-bold text-slate-100 group-hover:text-white flex min-w-0">
                          <MedicineName name={item.name} truncate={true} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 text-[10px] font-bold uppercase tracking-tight text-slate-500">
                          <span>{item.dosage}</span>
                          <span className="h-1 w-1 rounded-full bg-white/10" />
                          <span className="text-emerald-500/80">{item.mealTiming}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest shadow-sm ${
                            statusStyles[item.status] || statusStyles.Upcoming
                          }`}
                        >
                          {item.status}
                        </span>
                        <p className={`text-[9px] font-bold uppercase ${item.stock <= 5 ? 'text-rose-400' : 'text-slate-600'}`}>
                          {item.stock} left
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Right Side: Quick Insights */}
          <div className="flex flex-col gap-6 border-white/10 lg:border-l lg:pl-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Operational Insights</h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              <div className="group flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition group-hover:scale-110"><Activity size={18} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white">{adherenceStats.totalActiveMeds} Active Courses</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Treatment Plan</p>
                </div>
              </div>
              
              <div className="group flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 transition group-hover:scale-110"><Clock size={18} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white">{adherenceStats.busiestTime}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Peak Load Time</p>
                </div>
              </div>

              <div className="group flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 transition group-hover:scale-110"><Calendar size={18} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white">{adherenceStats.tomorrowDoses} Doses Due</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tomorrow's Forecast</p>
                </div>
              </div>

              <div className="group flex items-center gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition group-hover:scale-110 ${adherenceStats.lowStockCount > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {adherenceStats.lowStockCount > 0 ? <AlertTriangle size={18} /> : <Package size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-black flex min-w-0 ${adherenceStats.lowStockCount > 0 ? 'text-rose-400' : 'text-white'}`}>
                    {adherenceStats.lowStockCount > 0 ? <><span className="mr-1">Refill</span> <MedicineName name={adherenceStats.nextRunningOut} truncate={true} /></> : 'Inventory Healthy'}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{adherenceStats.lowStockCount} items at low volume</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {filteredCompleted.length > 0 && (
        <section id="completed-medicines" className="mt-12">
          <div className="mb-5 flex items-center gap-4">
            <h2 className="text-2xl font-black text-slate-500">Completed Courses</h2>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3 opacity-75 grayscale-[0.5] transition hover:grayscale-0">
            {filteredCompleted.map((medicine, index) => (
              <MedicineCard
                key={medicine.id}
                id={medicine.id}
                name={medicine.name}
                dosage={medicine.dosage}
                type={medicine.type}
                stock={medicine.stock}
                reminderTimes={medicine.reminderTimes}
                time={formatTimeForDisplay(medicine.time)}
                instruction={medicine.instruction}
                status={medicine.status}
                accentIndex={index}
                onRestart={() => handleRestart(medicine.id)}
                onArchive={() => handleArchive(medicine.id)}
                onDelete={() => setMedicineToDelete(medicine)}
              />
            ))}
          </div>
        </section>
      )}

      {isModalOpen && (
        <AddMedicineModal
          form={form}
          onChange={updateForm}
          onClose={closeModal}
          onSubmit={handleFormSubmit}
        />
      )}

      {isCalendarOpen && (
        <CalendarModal
          schedule={weekSchedule}
          onClose={() => setIsCalendarOpen(false)}
        />
      )}

      {medicineToRefill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 py-8 backdrop-blur-xl">
          <div
            className="w-full max-w-sm rounded-[2.5rem] border border-emerald-200/20 bg-[#071412]/95 p-8 shadow-2xl shadow-slate-950/60"
            style={{ animation: "modalIn 220ms ease-out both" }}
          >
            {refillSuccess ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <svg viewBox="0 0 24 24" className="h-10 w-10 fill-none stroke-current stroke-[3]">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h3 className="mt-6 text-2xl font-black text-white">Stock Updated!</h3>
                <p className="mt-2 text-sm text-slate-400">Added {refillAmount} units to {medicineToRefill.name}</p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Refill Stock</p>
                  <MedicineName name={medicineToRefill.name} truncate={true} className="mt-2 text-2xl font-black text-white" />
                </div>

                <div className="mt-8 space-y-6">
                  <div className="flex items-center justify-between rounded-2xl bg-black/30 p-4">
                    <span className="text-sm font-medium text-slate-400">Current Stock</span>
                    <span className="text-lg font-bold text-white">{medicineToRefill.stock} units</span>
                  </div>

                  <div className="space-y-3 text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Refill Quantity</p>
                    <div className="flex items-center justify-center gap-6">
                      <button 
                        onClick={() => setRefillAmount(prev => Math.max(1, prev - 5))}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl font-bold text-white transition hover:bg-white/10"
                      >
                        -
                      </button>
                      <input 
                        type="number" 
                        value={refillAmount}
                        onChange={(e) => setRefillAmount(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-20 bg-transparent text-center text-3xl font-black text-emerald-400 outline-none"
                      />
                      <button 
                        onClick={() => setRefillAmount(prev => prev + 5)}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl font-bold text-white transition hover:bg-white/10"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="relative h-12 overflow-hidden rounded-2xl bg-emerald-500/5 px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <span className="text-slate-400">New Total:</span>
                      <span className="font-bold text-emerald-300">
                        {medicineToRefill.stock} + {refillAmount} = {medicineToRefill.stock + refillAmount} units
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setMedicineToRefill(null)}
                      className="rounded-2xl border border-white/10 bg-white/5 py-3.5 text-sm font-bold text-slate-300 transition hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmRefill}
                      className="group relative overflow-hidden rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-950/40 transition hover:-translate-y-0.5 hover:bg-emerald-400"
                    >
                      <span className="relative z-10">Add Stock</span>
                      <div className="absolute inset-0 z-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {medicineToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 py-8 backdrop-blur-xl">
          <div
            className="w-full max-w-md rounded-3xl border border-rose-200/20 bg-[#071412]/95 p-6 shadow-2xl shadow-slate-950/60"
            style={{ animation: "modalIn 220ms ease-out both" }}
          >
            <p className="text-sm font-semibold text-rose-100">
              Delete medicine
            </p>
            <div className="mt-2 text-2xl font-black flex flex-wrap gap-x-2 text-white">
              <span>Remove</span>
              <MedicineName name={medicineToDelete.name} />?
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              This will remove the reminder from your schedule and update your
              adherence dashboard.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMedicineToDelete(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-emerald-300/30 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMedicine}
                className="rounded-xl bg-rose-500/85 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-950/30 transition hover:-translate-y-0.5 hover:bg-rose-400"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
