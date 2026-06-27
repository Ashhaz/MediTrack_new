import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import MedicineName from "../components/MedicineName.jsx"
import { getStockStatus } from "../utils/stockUtils.js"
import {
  getTodayKey,
  parseReminderTime,
  getMinutesNow,
  formatTimeForDisplay,
  getScheduleTimesFromSlots,
  getSlotOrder,
  getTimeSlotDisplay,
  normalizeScheduleSlots,
  normalizeTimeSlot,
  TIME_SLOT_OPTIONS,
  isDoseAfterMedicineCreation,
  isMedicineScheduledOnDate
} from "../utils/medicineUtils.js"

import { supabase } from "../lib/supabase.js"

import { mapFromDb, mapToDb } from "../utils/medicineMapper.js"
import { medicineCache } from "../store/medicineCache.js"

const REMINDER_WINDOW_MINUTES = 30

const statusStyles = {
  Upcoming: "bg-teal-400/15 text-teal-100 shadow-teal-950/20",
  Taken: "bg-emerald-400/15 text-teal-100 shadow-teal-950/20",
  Missed: "bg-amber-400/15 text-amber-100 shadow-amber-950/20",
  "Completed Course": "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30",
}
const schedStyles = {
  "Scheduled Today": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "Active": "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  "Completed Course": "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  "Upcoming Start": "bg-amber-500/10 text-amber-400 border border-amber-500/20",
}

const filterTabs = ["All", "Upcoming", "Taken", "Missed", "Archived"]

const emptyEditForm = {
  name: "",
  dosage: "",
  scheduleTimes: [],
  scheduleSlots: [{ slot: "Morning", time: "08:00" }],
  timeSlot: "Morning",
  instructions: "",
  status: "Upcoming",
  frequencyType: "Daily",
  duration: "Until Stopped",
  startDate: getTodayKey(),
  endDate: "",
  customDays: [],
}

const sortOptions = ["Time", "Status", "Medicine Name", "Most Missed"]
const frequencyOptions = ["Daily", "Weekly", "Custom Days"]

const statusRank = {
  Missed: 0,
  Upcoming: 1,
  Taken: 2,
  "Completed Course": 3,
}

const formatDuration = (minutes) => {
  const absoluteMinutes = Math.max(0, Math.abs(minutes))
  const hours = Math.floor(absoluteMinutes / 60)
  const mins = absoluteMinutes % 60

  if (hours === 0) {
    return `${mins}m`
  }

  if (mins === 0) {
    return `${hours}h`
  }

  return `${hours}h ${mins}m`
}

const getDoseStatus = (medicine, time, minutesNow = getMinutesNow(), lastReset = 0) => {
  const todayKey = getTodayKey()
  const isAfterCreation = isDoseAfterMedicineCreation(medicine, todayKey, time)
  const historyEntry = (medicine?.adherenceHistory || []).find(
    h => h.date === todayKey && h.time === time
  )
  if (historyEntry) {
    return historyEntry.status === "Missed" && !isAfterCreation
      ? "Upcoming"
      : historyEntry.status
  }
  if (medicine?.status === "Completed Course") return "Completed Course"

  const reminderMinutes = parseReminderTime(time)
  if (reminderMinutes === null) {
    return "Upcoming"
  }

  // Ignore Missed status if scheduled before history reset
  const doseDateTime = new Date(`${todayKey}T${time}`).getTime()
  if (doseDateTime < lastReset) return "Upcoming"
  if (!isAfterCreation) return "Upcoming"

  if (minutesNow >= reminderMinutes && minutesNow <= reminderMinutes + REMINDER_WINDOW_MINUTES) return "Due Now"
  if (minutesNow > reminderMinutes + REMINDER_WINDOW_MINUTES && minutesNow < reminderMinutes + 120) return "Delayed"
  if (minutesNow >= reminderMinutes + 120) return "Missed"
  return "Upcoming"
}

const enrichMedicine = (medicine, minutesNow = getMinutesNow()) => {
  if (!medicine) return null
  const scheduleTimes = Array.isArray(medicine.scheduleTimes)
    ? medicine.scheduleTimes
    : ["08:00"]

  const historyCleared = Number(localStorage.getItem("meditrack.historyCleared") || 0)
  const doses = scheduleTimes.map((t) => ({
    time: t,
    status: getDoseStatus(medicine, t, minutesNow, historyCleared),
  }))
  const activeDose =
    doses.find((d) => d.status !== "Taken") ||
    doses[doses.length - 1] ||
    { time: "08:00", status: "Upcoming" }

  return {
    ...medicine,
    time: activeDose.time,
    status: activeDose.status,
  }
}

const normalizeMedicine = (medicine) => {
  if (!medicine || typeof medicine !== "object") return null

  const todayKey = getTodayKey()

  const scheduleSlots = normalizeScheduleSlots(medicine)
  const scheduleTimes = getScheduleTimesFromSlots(scheduleSlots)
  const dosesPerDay = medicine.dosesPerDay || (
    medicine?.dosageFrequency === "Four Times Daily" ? 4 :
      medicine?.dosageFrequency === "Three Times Daily" ? 3 :
        medicine?.dosageFrequency === "Twice Daily" ? 2 : 1
  );

  return {
    ...medicine,
    id: medicine.id || Date.now() + Math.random(),
    name: medicine.name || "Unknown Medicine",
    dosage: medicine.dosage || "No dosage set",
    instructions: medicine.instructions || medicine.instruction || "No instructions",
    scheduleSlots,
    scheduleTimes,
    timeSlot: scheduleSlots[0]?.slot || normalizeTimeSlot(medicine.timeSlot),
    dosesPerDay: scheduleSlots.length || Number(dosesPerDay || 1),
    frequencyType: medicine.frequencyType || medicine.frequency || "Daily",
    medicineType: medicine.medicineType || medicine.type || "Tablet",
    duration: medicine.duration || "Until Stopped",
    startDate: medicine.startDate || todayKey,
    stock: Number(medicine.stock ?? 0),
    adherenceHistory: Array.isArray(medicine.adherenceHistory) ? medicine.adherenceHistory : [],
    createdAt: medicine.createdAt || medicine.id || Date.now(),
    updatedAt: medicine.updatedAt || Date.now()
  }
}

const getDoseTimingLabel = (medicine, minutesNow = getMinutesNow()) => {
  if (!medicine || !medicine.time) return "Schedule pending"

  const { status, time, frequencyType, scheduleTimes } = medicine
  const reminderMinutes = parseReminderTime(time)

  if (reminderMinutes === null) {
    return "Schedule pending"
  }

  if (status === "Taken") {
    // If status is "Taken", it implies all scheduled doses for today are completed
    // because enrichment only falls back to the last "Taken" dose if none are remaining.
    const times = Array.isArray(scheduleTimes) ? scheduleTimes : ["08:00"]
    if (frequencyType === "Daily") {
      return `Tomorrow at ${formatTimeForDisplay(times[0])}`
    }
    return "Next scheduled occurrence"
  }

  if (status === "Missed") {
    return `Missed ${formatDuration(minutesNow - reminderMinutes)} ago`
  }

  const minutesUntilDose = reminderMinutes - minutesNow

  return minutesUntilDose <= 0
    ? "Due now"
    : `Next in ${formatDuration(minutesUntilDose)}`
}

const getHistorySummary = (medicine) => {
  const history =
    Array.isArray(medicine?.adherenceHistory) ? medicine.adherenceHistory : []
  if (history.length === 0) {
    return medicine?.status === "Taken"
      ? "Marked taken today"
      : "No completed doses recorded yet"
  }

  return history
    .slice(-3)
    .map((entry) => {
      const d = new Date(entry.date);
      const dateStr = isNaN(d.getTime()) ? entry.date : d.toLocaleDateString();
      return `${dateStr}: ${entry.status}`;
    })
    .join(" · ")
}



function Medicines() {
  const [medicineList, setMedicineList] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("All")
  const [sortBy, setSortBy] = useState("Time")
  const [medicineToDelete, setMedicineToDelete] = useState(null)
  const [medicineToEdit, setMedicineToEdit] = useState(null)
  const [medicineToRefill, setMedicineToRefill] = useState(null)
  const [refillAmount, setRefillAmount] = useState(30)
  const [refillSuccess, setRefillSuccess] = useState(false)

  const [selectedMedicine, setSelectedMedicine] = useState(null)
  const [nameError, setNameError] = useState("")
  const [editForm, setEditForm] = useState(emptyEditForm)

  useEffect(() => {
    const fetchMedicines = async () => {
      // --- Stale-while-revalidate: show cached data immediately ---
      const cached = medicineCache.get()
      if (cached) {
        const mappedRows = cached.map(mapFromDb).map(m => normalizeMedicine(m, getMinutesNow())).filter(Boolean)
        setMedicineList(mappedRows)
      }

      // Deduplicate: skip if another page is already fetching
      if (medicineCache.isFetching()) return
      medicineCache.setFetching(true)

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data, error } = await supabase
          .from('medicines')
          .select('*')
          .eq('user_id', session.user.id);

        if (error) {
          console.error("Query error:", error);
          return;
        }

        if (data) {
          // Update cache with fresh raw rows
          medicineCache.set(data)
          const mappedRows = data.map(mapFromDb).map(m => normalizeMedicine(m, getMinutesNow())).filter(Boolean);
          setMedicineList(mappedRows);
        }
      } finally {
        medicineCache.setFetching(false)
      }
    };

    fetchMedicines();

    const channel = supabase.channel('public:medicines-medicines-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicines' }, fetchMedicines)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, [])

  const handleRefill = (medicineId) => {
    const med = medicineList.find((m) => m.id === medicineId)
    if (med) {
      setMedicineToRefill(med)
      setRefillAmount(30)
      setRefillSuccess(false)
    }
  }

  const confirmRefill = async () => {
    setRefillSuccess(true)
    const newStock = (Number(medicineToRefill.stock) || 0) + Number(refillAmount)

    await supabase.from('medicines').update({ stock: newStock }).eq('id', medicineToRefill.id);

    setTimeout(() => {
      setMedicineList((current) =>
        current.map((m) =>
          m.id === medicineToRefill.id
            ? { ...m, stock: newStock, updatedAt: Date.now() }
            : m
        )
      )
      // Keep cache in sync
      medicineCache.update(rows => rows.map(r =>
        r.id === medicineToRefill.id ? { ...r, stock: newStock } : r
      ))
      setMedicineToRefill(null)
      setRefillSuccess(false)
    }, 1200)
  }

  const stats = useMemo(() => {
    const activeList = medicineList.filter(m => isMedicineScheduledOnDate(m, new Date()));
    let totalDoses = 0;
    let taken = 0;
    let upcoming = 0;
    let missed = 0;

    activeList.forEach(med => {
      med?.scheduleTimes?.forEach(time => {
        if (!isDoseAfterMedicineCreation(med, getTodayKey(), time)) return;

        totalDoses++;
        const status = getDoseStatus(med, time);
        if (status === "Taken") taken++;
        else if (status === "Upcoming") upcoming++;
        else if (status === "Missed") missed++;
      })
    })

    return {
      total: totalDoses,
      upcoming,
      taken,
      missed,
    }
  }, [medicineList])

  const filteredMedicines = useMemo(() => {
    const matchingMedicines = medicineList.map((medicine) => {
      const enriched = enrichMedicine(medicine)
      const matchesSearch = (enriched?.name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())

      const matchesFilter = activeFilter === "All" ? !enriched?.archived :
        activeFilter === "Archived" ? enriched?.archived :
          (!enriched?.archived && enriched.status === activeFilter)

      return {
        ...enriched,
        matchesSearch,
        matchesFilter
      }
    }).filter(m => m.matchesSearch && m.matchesFilter)

    return [...matchingMedicines].sort((firstMedicine, secondMedicine) => {
      if (sortBy === "Medicine Name") {
        return (firstMedicine?.name || "").localeCompare(secondMedicine?.name || "")
      }

      if (sortBy === "Status") {
        return (
          (statusRank[firstMedicine?.status] ?? 9) -
          (statusRank[secondMedicine?.status] ?? 9)
        )
      }

      if (sortBy === "Most Missed") {
        const missedA = (firstMedicine?.adherenceHistory || []).filter(
          h => h.status === 'Missed' && isDoseAfterMedicineCreation(firstMedicine, h.date, h.time),
        ).length;
        const missedB = (secondMedicine?.adherenceHistory || []).filter(
          h => h.status === 'Missed' && isDoseAfterMedicineCreation(secondMedicine, h.date, h.time),
        ).length;
        return missedB - missedA;
      }

      return (
        (parseReminderTime(firstMedicine?.time) ?? 0) -
        (parseReminderTime(secondMedicine?.time) ?? 0)
      )
    })
  }, [activeFilter, medicineList, searchQuery, sortBy])

  const selectedMedicineDetails = useMemo(() => {
    if (!selectedMedicine) return null
    const med = medicineList.find((m) => m.id === selectedMedicine.id)
    return enrichMedicine(med)
  }, [selectedMedicine, medicineList])



  const updateEditForm = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }))
  }

  const updateEditScheduleSlots = (nextSlots) => {
    const scheduleSlots = normalizeScheduleSlots({ scheduleSlots: nextSlots })
    setEditForm((current) => ({
      ...current,
      scheduleSlots,
      scheduleTimes: getScheduleTimesFromSlots(scheduleSlots),
      dosesPerDay: scheduleSlots.length,
      timeSlot: scheduleSlots[0]?.slot || "Morning",
    }))
  }

  const toggleEditScheduleSlot = (slot) => {
    const scheduleSlots = normalizeScheduleSlots(editForm)
    const isSelected = scheduleSlots.some((entry) => entry.slot === slot)
    if (isSelected && scheduleSlots.length === 1) return

    const nextSlots = isSelected
      ? scheduleSlots.filter((entry) => entry.slot !== slot)
      : [...scheduleSlots, { slot, time: "" }]

    updateEditScheduleSlots(nextSlots.sort((first, second) => getSlotOrder(first.slot) - getSlotOrder(second.slot)))
  }

  const updateEditScheduleSlotTime = (slot, time) => {
    updateEditScheduleSlots(
      normalizeScheduleSlots(editForm).map((entry) =>
        entry.slot === slot ? { ...entry, time } : entry
      )
    )
  }

  const closeEditModal = () => {
    setMedicineToEdit(null)
    setNameError("")
    setEditForm(emptyEditForm)
  }

  const saveMedicineEdits = (event) => {
    event.preventDefault()

    const trimmedName = editForm.name.trim()

    if (trimmedName.length < 1) {
      setNameError("Medicine name is required.")
      return
    }

    if (trimmedName.length > 60) {
      setNameError("Medicine name cannot exceed 60 characters.")
      return
    }

    setNameError("")
    const scheduleSlots = normalizeScheduleSlots(editForm)
    if (scheduleSlots.length < 1 || scheduleSlots.some((entry) => !entry.time)) {
      alert("Select at least one schedule slot and set a reminder time.")
      return
    }

    const updatedMed = {
      ...medicineToEdit,
      name: trimmedName,
      dosage: editForm.dosage,
      scheduleSlots,
      scheduleTimes: getScheduleTimesFromSlots(scheduleSlots),
      timeSlot: scheduleSlots[0]?.slot || normalizeTimeSlot(editForm.timeSlot),
      dosesPerDay: scheduleSlots.length,
      instructions: editForm.instructions,
      status: editForm.status,
      frequencyType: editForm.frequencyType,
      customDays: editForm.customDays,
      duration: editForm.duration,
      startDate: editForm.startDate,
      endDate: editForm.endDate,
      previousStatus: editForm.status,
    };

    const saveToDb = async () => {
      await supabase.from('medicines').update(mapToDb(updatedMed)).eq('id', medicineToEdit.id);
    };
    saveToDb();

    setMedicineList((current) =>
      current.map((medicine) => {
        if (medicine.id !== medicineToEdit.id) {
          return medicine
        }

        return normalizeMedicine(updatedMed)
      }),
    )
    // Keep cache in sync
    medicineCache.update(rows => rows.map(r =>
      r.id === medicineToEdit.id ? { ...r, ...mapToDb(updatedMed), id: r.id } : r
    ))

    setSelectedMedicine((current) =>
      current?.id === medicineToEdit.id
        ? {
          ...current,
          name: trimmedName,
          dosage: editForm.dosage,
          scheduleSlots,
          scheduleTimes: getScheduleTimesFromSlots(scheduleSlots),
          timeSlot: scheduleSlots[0]?.slot || normalizeTimeSlot(editForm.timeSlot),
          dosesPerDay: scheduleSlots.length,
          instructions: editForm.instructions,
          frequencyType: editForm.frequencyType,
          customDays: editForm.customDays,
          duration: editForm.duration,
          startDate: editForm.startDate,
          endDate: editForm.endDate,
        }
        : current,
    )
    closeEditModal()
  }

  const confirmDeleteMedicine = async () => {
    if (!medicineToDelete) {
      return
    }

    const { error } = await supabase
      .from("medicines")
      .delete()
      .eq("id", medicineToDelete.id);

    if (error) {
      console.error("[DELETE] Failed to delete medicine:", error);
      return;
    }

    setMedicineList((current) =>
      current.filter((medicine) => medicine.id !== medicineToDelete.id),
    )
    // Keep cache in sync
    medicineCache.update(rows => rows.filter(r => r.id !== medicineToDelete.id))
    setSelectedMedicine((current) =>
      current?.id === medicineToDelete.id ? null : current,
    )
    setMedicineToDelete(null)
  }

  const statCards = [
    { label: "Total Medicines", value: stats.total },
    { label: "Upcoming", value: stats.upcoming },
    { label: "Taken Today", value: stats.taken },
    { label: "Missed Today", value: stats.missed },
    { label: "Medicines Taken", value: stats.taken },
  ]

  const getSchedulingStatus = (medicine) => {
    const today = getTodayKey()
    if (medicine?.endDate && today > medicine.endDate) return "Completed Course"
    if (medicine?.startDate && today < medicine.startDate) return "Upcoming Start"
    if (isMedicineScheduledOnDate(medicine, new Date())) return "Scheduled Today"
    return "Active"
  }

  return (
    <div className="min-h-screen w-full bg-[#04110f] text-white p-1">
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

          @keyframes drawerIn {
            from {
              opacity: 0;
              transform: translateX(24px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}
      </style>

      <div className="grid gap-5">
        <header className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
          <p className="text-sm font-semibold text-emerald-200">Medicines</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Medicine Management
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Track, edit, and organize all medication schedules.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map((stat) => (
            <article
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-xl shadow-slate-950/15 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.075]"
            >
              <p className="text-sm text-slate-400">{stat.label}</p>
              <p className="mt-2 text-3xl font-black text-white">
                {stat.value}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-300 transition focus-within:border-emerald-300/35 focus-within:bg-emerald-400/10 lg:w-96">
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

            <div className="grid grid-cols-2 gap-2 sm:flex">
              {filterTabs.map((filter) => {
                const isActive = activeFilter === filter

                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 ${isActive
                        ? "border-emerald-300/35 bg-emerald-400/15 text-emerald-50 shadow-lg shadow-emerald-950/20"
                        : "border-white/10 bg-black/20 text-slate-300 hover:border-emerald-300/20 hover:bg-emerald-400/10"
                      }`}
                  >
                    {filter}
                  </button>
                )
              })}
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-slate-300 transition focus-within:border-emerald-300/35 focus-within:bg-emerald-400/10">
              Sort
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="bg-transparent font-bold text-white outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option} value={option} className="bg-[#071412]">
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <div className="sticky top-0 z-10 hidden grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr_1fr_110px_200px] gap-4 border-b border-white/10 bg-[#071412]/95 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 backdrop-blur-xl lg:grid">
              <p>Medicine</p>
              <p>Dosage</p>
              <p>Scheduled</p>
              <p>Stock</p>
              <p>Next dose</p>
              <p>Status</p>
              <p className="text-right">Actions</p>
            </div>

            <div className="divide-y divide-white/10">
              {filteredMedicines.length === 0 && (
                <div className="grid place-items-center bg-black/15 px-4 py-12 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl border border-emerald-300/15 bg-emerald-400/10 text-2xl">
                    +
                  </div>
                  <h3 className="mt-4 text-lg font-black text-white">
                    {stats.total === 0
                      ? "No medicines to manage"
                      : "No medicines found"}
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                    {stats.total === 0
                      ? "Add a medicine from the dashboard to start building a clear, reliable medication schedule."
                      : "Try a different search term or adjust your status filter."}
                  </p>
                  {stats.total === 0 && (
                    <Link
                      to="/dashboard"
                      className="mt-5 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/30 transition hover:-translate-y-0.5 hover:bg-emerald-500"
                    >
                      + Add medicine
                    </Link>
                  )}
                </div>
              )}

              {filteredMedicines.map((medicine) => (
                <article
                  key={medicine?.id}
                  onClick={() => setSelectedMedicine(medicine)}
                  className="grid cursor-pointer gap-3 bg-black/15 px-4 py-4 transition duration-300 hover:bg-emerald-400/[0.07] lg:grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr_1fr_110px_200px] lg:gap-4 lg:items-center overflow-hidden"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white flex min-w-0">
                      <MedicineName name={medicine?.name} truncate={true} />
                    </p>
                    <p className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${schedStyles[getSchedulingStatus(medicine)]
                      }`}>
                      {getSchedulingStatus(medicine)}
                    </p>
                    {medicine?.instructions && (
                      <p className="mt-1 text-xs text-slate-500 lg:hidden">
                        {medicine.instructions}
                      </p>
                    )}
                  </div>
                  <p className="truncate text-sm text-slate-300">{medicine?.dosage || "N/A"}</p>
                  <div className="min-w-0 text-sm font-semibold text-white">
                    {normalizeScheduleSlots(medicine).map((entry) => (
                      <p key={entry.slot} className="truncate">
                        {getTimeSlotDisplay(entry.slot)} • {formatTimeForDisplay(entry.time)}
                      </p>
                    ))}
                  </div>
                <div className="flex flex-col min-w-0">
                  {(() => {
                    const stockInfo = getStockStatus(medicine?.stock, medicine?.dosesPerDay);
                    return (
                      <>
                        <p className={`text-sm font-bold text-${stockInfo.color}`}>{medicine?.stock ?? 0} left</p>
                        <p className="truncate text-[10px] text-slate-500">
                          {stockInfo.daysLeft} days supply
                        </p>
                      </>
                    );
                  })()}
                </div>
                  <p className="truncate text-sm text-slate-300">
                    {getDoseTimingLabel(medicine)}
                  </p>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold shadow-lg border border-transparent ${
                      statusStyles[medicine?.status] || statusStyles.Upcoming
                    }`}
                  >
                    {medicine?.status || "Upcoming"}
                  </span>
                  <div className="inline-flex gap-2 whitespace-nowrap lg:justify-self-end">
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        handleRefill(medicine?.id)
                      }}
                      className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-bold transition ${
                        medicine?.stock <= 5 
                          ? "border-rose-500/50 bg-rose-500/10 text-rose-300" 
                          : "border-white/10 bg-white/[0.04] text-slate-200"
                      } hover:bg-emerald-400/10 hover:text-white`}
                    >
                      Refill
                    </button>
                    <button
                      onClick={async (event) => {
                        event.stopPropagation()
                        const newArchived = !medicine?.archived;
                        await supabase.from('medicines').update({ archived: newArchived }).eq('id', medicine?.id);
                        setMedicineList(prev => prev.map(m => m.id === medicine?.id ? { ...m, archived: newArchived } : m))
                      }}
                      className="whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-emerald-400/10 hover:text-white"
                    >
                      {medicine?.archived ? "Restore" : "Archive"}
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        setMedicineToDelete(medicine || null)
                      }}
                      className="whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 hover:text-white"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
      </div>
    </div>
        </section >
      </div >

    { selectedMedicineDetails && (
      <div className="fixed inset-0 z-40 flex justify-end bg-black/35 backdrop-blur-sm">
        <button
          type="button"
          aria-label="Close medicine details"
          onClick={() => setSelectedMedicine(null)}
          className="absolute inset-0 cursor-default"
        />
        <aside
          className="relative z-10 h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#071412]/95 p-6 shadow-2xl shadow-slate-950/60 backdrop-blur-xl"
          style={{ animation: "drawerIn 260ms ease-out both" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-200">
                Medicine details
              </p>
              <div className="mt-2 min-w-0">
                <MedicineName name={selectedMedicineDetails?.name} truncate={true} className="text-3xl font-black text-white" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMedicine(null)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              x
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Next dose
              </p>
              <p className="mt-2 text-xl font-black text-white">
                {getDoseTimingLabel(selectedMedicineDetails)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Dosage
                </p>
                <p className="mt-2 font-semibold text-slate-100">
                  {selectedMedicineDetails?.dosage || "No dosage set"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Medication Schedule
                </p>
                <div className="mt-2 space-y-1 font-semibold text-slate-100">
                  {normalizeScheduleSlots(selectedMedicineDetails).map((entry) => (
                    <p key={entry.slot}>
                      {getTimeSlotDisplay(entry.slot)} • {formatTimeForDisplay(entry.time)}
                    </p>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Stock Remaining
                </p>
                <p
                  className={`mt-2 font-black ${(selectedMedicineDetails?.stock ?? 0) <= 5 ? "text-rose-400" : "text-emerald-400"
                    }`}
                >
                  {selectedMedicineDetails?.stock ?? 0} units
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Status
                </p>
                <span
                  className={`mt-2 inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold shadow-lg ${statusStyles[selectedMedicineDetails?.status] ||
                    statusStyles.Upcoming
                    }`}
                >
                  {selectedMedicineDetails?.status || "Unknown"}
                </span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Frequency
                </p>
                <p className="mt-2 font-semibold text-slate-100">
                  {selectedMedicineDetails?.frequencyType || "Daily"}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Instructions
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {selectedMedicineDetails?.instructions || "No instructions"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Adherence history
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {getHistorySummary(selectedMedicineDetails)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Reminder frequency
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {selectedMedicineDetails?.frequencyType || "Daily"} reminders are
                active for this medication.
              </p>
            </div>
          </div>
        </aside>
      </div>
    )
}

{
  medicineToEdit && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 py-8 backdrop-blur-xl">
      <form
        onSubmit={saveMedicineEdits}
        className="w-full max-w-lg rounded-3xl border border-emerald-200/20 bg-[#071412]/95 p-6 shadow-2xl shadow-slate-950/60"
        style={{ animation: "modalIn 220ms ease-out both" }}
      >
        <p className="text-sm font-semibold text-emerald-200">
          Edit medicine
        </p>
        <MedicineName name={medicineToEdit.name} truncate={true} className="mt-2 text-2xl font-black text-white" />

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-slate-200">
            <div className="flex justify-between items-center">
              <span>Medicine name</span>
              <span className={`text-[10px] ${editForm.name.length > 60 ? 'text-rose-400' : 'text-slate-500'}`}>
                {editForm.name.length} / 60
              </span>
            </div>
            <input
              required
              value={editForm.name}
              onChange={(event) => {
                updateEditForm("name", event.target.value)
                if (nameError) setNameError("")
              }}
              maxLength={60}
              className={`rounded-xl border bg-black/30 px-4 py-3 font-medium text-white outline-none transition focus:border-emerald-300/40 focus:bg-emerald-400/10 ${nameError ? "border-rose-500/50" : "border-white/10"
                }`}
            />
            {nameError && (
              <p className="text-xs font-medium text-rose-400">{nameError}</p>
            )}
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-200">
            Dosage
            <input
              required
              value={editForm.dosage}
              onChange={(event) =>
                updateEditForm("dosage", event.target.value)
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-medium text-white outline-none transition focus:border-emerald-300/40 focus:bg-emerald-400/10"
            />
          </label>

          <div className="space-y-3 rounded-2xl border border-white/5 bg-black/40 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-200">Medication Schedule</p>
              <p className="mt-1 text-[10px] font-medium text-slate-500">
                Select at least one slot and set the exact reminder time.
              </p>
            </div>

            {TIME_SLOT_OPTIONS.map((option) => {
              const scheduleSlots = normalizeScheduleSlots(editForm)
              const selectedSlot = scheduleSlots.find((entry) => entry.slot === option.value)
              const isSelected = Boolean(selectedSlot)

              return (
                <div key={option.value} className="grid grid-cols-1 gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 sm:grid-cols-[1fr_170px] sm:items-center">
                  <label className="flex items-center gap-3 text-sm font-bold text-slate-100">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleEditScheduleSlot(option.value)}
                      className="h-4 w-4 accent-emerald-500"
                    />
                    <span>{option.label}</span>
                  </label>
                  {isSelected && (
                    <input
                      required
                      type="time"
                      value={selectedSlot.time}
                      onChange={(event) => updateEditScheduleSlotTime(option.value, event.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-black/30 p-2 text-sm font-semibold text-white outline-none focus:border-emerald-300/40"
                    />
                  )}
                </div>
              )
            })}
          </div>

          <label className="grid gap-2 text-sm font-semibold text-slate-200">
            Instructions
            <textarea
              required
              value={editForm.instructions}
              onChange={(event) =>
                updateEditForm("instructions", event.target.value)
              }
              className="min-h-24 resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-medium text-white outline-none transition focus:border-emerald-300/40 focus:bg-emerald-400/10"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-200">
            Reminder frequency
            <select
              value={editForm.frequencyType}
              onChange={(event) =>
                updateEditForm("frequencyType", event.target.value)
              }
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-medium text-white outline-none transition focus:border-emerald-300/40 focus:bg-emerald-400/10"
            >
              {frequencyOptions.map((frequency) => (
                <option
                  key={frequency}
                  value={frequency}
                  className="bg-[#071412]"
                >
                  {frequency}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={closeEditModal}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-emerald-300/30 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/35 transition hover:-translate-y-0.5 hover:from-emerald-400 hover:to-teal-400"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  )
}

{
  medicineToDelete && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 py-8 backdrop-blur-xl">
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#071412]/95 p-6 shadow-2xl shadow-slate-950/60"
        style={{ animation: "modalIn 220ms ease-out both" }}
      >
        <p className="text-sm font-semibold text-emerald-200">
          Delete medicine
        </p>
        <div className="mt-2 text-2xl font-black flex flex-wrap gap-x-2">
          <span>Remove</span>
          <MedicineName name={medicineToDelete.name} />?
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          This will remove the medication schedule from MediTrack.
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
            className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/30 transition hover:-translate-y-0.5 hover:bg-emerald-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

{
  medicineToRefill && (
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
              <MedicineName name={medicineToRefill.name} className="mt-2 text-2xl font-black text-white" />
            </div>

            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between rounded-2xl bg-black/30 p-4">
                <span className="text-sm font-medium text-slate-400">Current Stock</span>
                <span className="text-lg font-bold text-white">{medicineToRefill.stock || 0} units</span>
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
                    {(medicineToRefill.stock || 0) + refillAmount} units
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
  )
}
    </div >
  )
}

export default Medicines
