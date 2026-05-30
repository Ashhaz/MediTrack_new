import { useState, useMemo } from "react"
import { getStockStatus } from "../utils/stockUtils.js"

const parseReminderTime = (time) => {
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

const accents = [
  "from-emerald-300 to-teal-500",
  "from-teal-300 to-cyan-500",
  "from-emerald-400 to-green-600",
]

const statusStyles = {
  Upcoming: "bg-teal-400/15 text-teal-100 shadow-lg shadow-teal-950/20",
  Missed: "bg-amber-400/15 text-amber-100 shadow-lg shadow-amber-950/20",
  Taken: "bg-emerald-400/15 text-emerald-100 shadow-lg shadow-emerald-950/20",
  "Completed Course": "bg-slate-500/20 text-slate-300 border border-white/10 shadow-none",
}
const lowStockStyle = "bg-rose-500/20 text-rose-300 border-rose-500/30"

function MedicineCard({
  id,
  name,
  dosage,
  time,
  instructions,
  status,
  medicineType,
  mealTiming,
  stock,
  startDate,
  endDate,
  reminderTimes = [],
  accentIndex = 0,
  onMarkTaken,
  onEdit,
  onRefill,
  onRestart,
  onArchive,
  onDelete,
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const accent = accents[accentIndex % accents.length]
  const isTaken = status === "Taken"
  const isMissed = status === "Missed" && status !== "Completed Course"
  const statusClass = statusStyles[status] || "bg-teal-400/15 text-teal-100"

  const reminderMinutes = Number(parseReminderTime(time)) || 0
  const minutesNow = new Date().getHours() * 60 + new Date().getMinutes()
  const isDueSoon = status === 'Upcoming' && (reminderMinutes - minutesNow <= 30) && (reminderMinutes - minutesNow >= 0)

  // Safe derived values using props
  const dosesCount = (reminderTimes?.length) || 1
  const stockVal = Number(stock) || 0
  const isValidCalc = stockVal > 0
  const estimatedDays = isValidCalc ? Math.floor(stockVal / dosesCount) : 0

  const handleButtonClick = () => {
    if (isTaken) {
      onMarkTaken(id)
      return
    }

    setShowConfirm(true)
  }

  const confirmTaken = () => {
    onMarkTaken(id)
    setShowConfirm(false)
  }

  const cancelTaken = () => {
    setShowConfirm(false)
  }

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-slate-950/20 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:border-white/15 hover:bg-white/[0.085] hover:shadow-emerald-500/10 ${
        isTaken ? "scale-[1.01]" : ""
      } ${isDueSoon ? 'animate-[pulse-glow_2s_infinite]' : ''}`}
    >
      <div
        className={`mb-4 h-1.5 rounded-full bg-gradient-to-r transition-all duration-500 ${
          isTaken
            ? "from-emerald-300 via-emerald-400 to-green-500 shadow-[0_0_14px_rgba(16,185,129,0.22)]"
            : isMissed
              ? "from-amber-200 to-amber-400"
              : accent
        }`}
      />

      <div className="flex items-start justify-between gap-4 relative">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white truncate pr-2">{name}</h3>
          {dosage && (
            <p className="mt-0.5 text-sm font-semibold text-emerald-100">
              {dosage} {/* Assuming dosage is a string, not an object */}
            </p>
          )}
          <p className="mt-1 text-sm text-slate-400 line-clamp-1">{instructions || "No instructions provided"}</p>
          <div className="mt-2 flex items-center gap-2">
            {(() => {
              const stockInfo = getStockStatus(stock, dosesCount);
              return (
                <div className="flex flex-col gap-1">
                  <span className={`w-fit rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${stockInfo.bg} text-${stockInfo.color} ${stockInfo.border}`}>
                    {stockInfo.status === "Healthy" ? "✓ " : "⚠ "}{stockInfo.badgeText}
                  </span>
                  {stockInfo.status !== "Healthy" && stockInfo.status !== "Out of Stock" && (
                    <p className={`text-[10px] font-bold text-${stockInfo.color}/80 italic whitespace-nowrap`}>
                      Only {stockInfo.daysLeft} days remaining
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${name}`}
            className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-black/25 text-slate-400 opacity-0 shadow-lg transition-all duration-200 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400 focus:opacity-100 group-hover:opacity-100"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-none stroke-current stroke-2"
            >
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" />
            </svg>
          </button>
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider transition duration-300 ${statusClass}`}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tight">
          <span className={stock <= 5 ? "text-rose-400" : "text-slate-400"}>Stock: {stock} {medicineType === 'Syrup' ? 'ml' : 'qty'}</span>
          <span className="text-emerald-400/80 whitespace-nowrap">
            {isValidCalc ? `${estimatedDays} days left` : "Stock not set"}
          </span>
        </div>
      </div>

      <p className="mt-3 pb-1 text-2xl font-black text-white">{time}</p>

      <div className="mb-3.5 flex items-center gap-2 border-t border-white/5 pt-3.5">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="flex-1 rounded-full border border-white/10 bg-white/5 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 transition hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-white"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRefill(); }}
          className={`flex-1 rounded-full border py-1.5 text-[9px] font-black uppercase tracking-widest transition ${stock <= 5 ? "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "border-white/10 bg-white/5 text-slate-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-white"}`}
        >
          Refill
        </button>
      </div>

      <button
        disabled={stock === 0 && !isTaken}
        onClick={handleButtonClick}
        className={`mt-auto w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all duration-300 active:scale-[0.98] ${stock === 0 && !isTaken ? 'opacity-50 cursor-not-allowed grayscale' : ''} ${
          isTaken
            ? "bg-emerald-500/90 shadow-emerald-700/25 ring-1 ring-emerald-200/20 hover:bg-emerald-400"
            : "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-950/30 hover:-translate-y-0.5 hover:from-emerald-500 hover:to-teal-500 hover:shadow-emerald-700/20"
        }`}
      >
        {isTaken ? "Completed ✓" : stock === 0 ? "Out of Stock" : "Mark taken"}
      </button>

      {showConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl border border-emerald-200/20 bg-black/70 p-4 backdrop-blur-xl">
          <div className="w-full rounded-2xl border border-white/10 bg-[#071412]/95 p-5 text-center shadow-2xl shadow-slate-950/50">
            <p className="text-sm font-semibold text-emerald-200">
              Confirm medicine
            </p>
            <h4 className="mt-2 text-xl font-black text-white">{name}</h4>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Did you take this medicine at {time}?
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={cancelTaken}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-emerald-300/30 hover:bg-white/10"
              >
                No
              </button>
              <button
                onClick={confirmTaken}
                className="rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/30 transition hover:-translate-y-0.5 hover:from-emerald-300 hover:to-green-400"
              >
                Yes, taken
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

export default MedicineCard
