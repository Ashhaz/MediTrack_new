import React from "react"
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react"

const calendarStatusStyles = {
  Taken: "bg-emerald-400/15 text-emerald-100 border-emerald-500/20",
  "Due Now": "bg-amber-400/25 text-amber-100 border-amber-500/30 animate-pulse",
  Upcoming: "bg-white/5 text-slate-400 border-white/10",
  Missed: "bg-rose-400/15 text-rose-100 border-rose-500/20",
}

const CalendarModal = ({ schedule, onClose }) => {
  const getDayLabel = (date) => {
    const today = new Date().toDateString()
    const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toDateString()
    
    if (date.toDateString() === today) return "Today"
    if (date.toDateString() === tomorrow) return "Tomorrow"
    return date.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' })
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-5 py-8 backdrop-blur-xl transition-all"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-[2.5rem] border border-emerald-200/15 bg-[#071412]/95 shadow-2xl shadow-slate-950/60 flex flex-col"
        style={{ animation: "modalIn 250ms ease-out both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Effect */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />
        
        <header className="relative flex items-center justify-between border-b border-white/10 p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Weekly View</p>
            <h2 className="mt-1 text-3xl font-black text-white">Medication Schedule</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
          <div className="space-y-10">
            {schedule.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-slate-400">No upcoming medications scheduled for this week.</p>
              </div>
            ) : (
              schedule.map((day, idx) => (
                <div key={idx} className="space-y-4">
                  <h3 className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-emerald-200/50">
                    <span className="h-px flex-1 bg-white/5" />
                    {getDayLabel(day.date)}
                    <span className="h-px flex-1 bg-white/5" />
                    <div className="flex gap-2 ml-2">
                      {day.items.some(i => i.status === "Missed") && (
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                      )}
                      {day.items.some(i => i.stock <= 5) && (
                        <AlertTriangle size={10} className="text-amber-500" />
                      )}
                      {day.items.every(i => i.status === "Taken") && day.items.length > 0 && (
                        <CheckCircle2 size={10} className="text-emerald-500" />
                      )}
                    </div>
                  </h3>
                  <div className="grid gap-3">
                    {day.items.map((item, i) => (
                      <div 
                        key={i}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition hover:border-emerald-500/30 hover:bg-emerald-500/5"
                      >
                        <div className="flex items-center gap-4">
                          <p className="text-lg font-black text-white min-w-[90px]">{item.time}</p>
                          <div>
                            <p className="font-bold text-slate-200 group-hover:text-white transition">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.dosage}</p>
                          </div>
                        </div>
                        <span className={`w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm ${calendarStatusStyles[item.status] || calendarStatusStyles.Upcoming}`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarModal