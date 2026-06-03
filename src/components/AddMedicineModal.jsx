import React from "react"

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const frequencyOptions = ["Daily", "Weekly", "Custom Days"]
const dosageFrequencyOptions = ["Once Daily", "Twice Daily", "Three Times Daily", "Four Times Daily"]
const typeOptions = ["Tablet", "Capsule", "Syrup", "Injection"]
const mealOptions = ["Before Food", "After Food", "With Food", "Empty Stomach"]

// Time selector constants
const hours = Array.from({ length: 12 }, (_, i) => i + 1)
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))

function AddMedicineModal({ form, onChange, onClose, onSubmit }) {
  const isEdit = !!form.id
  const doseCount = Number(form.dosesPerDay) || 1

  const stockVal = Number(form.stock) || 0;
  const isValidCalc = stockVal > 0 && doseCount > 0;
  const estimatedDays = isValidCalc ? Math.floor(stockVal / doseCount) : 0;

  // Initialize reminderTimes if not present
  const currentTimes = form.scheduleTimes || ["08:00"]; // Ensure currentTimes is always an array

  /**
   * Toggles a weekday in the customDays array
   */
  const toggleDay = (day) => {
    const currentDays = form.customDays || []
    const nextDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day]
    onChange("customDays", nextDays)
  }

  const handleTimeChangeAt = (index, type, value) => {
    const times = [...currentTimes]
    const [h, m] = (times[index] || "08:00").split(":")
    let hVal = parseInt(h, 10) % 12 || 12
    let mVal = m
    let pVal = parseInt(h, 10) >= 12 ? "PM" : "AM"

    if (type === "hour") hVal = parseInt(value, 10)
    if (type === "minute") mVal = value
    if (type === "period") pVal = value

    const h24 = pVal === "PM" ? (hVal % 12) + 12 : hVal % 12
    times[index] = `${String(h24).padStart(2, "0")}:${mVal}`
    onChange("scheduleTimes", times)
  }

  const handleDoseFrequencyChange = (val) => {
    const count = val === "Four Times Daily" ? 4 : val === "Three Times Daily" ? 3 : val === "Twice Daily" ? 2 : 1
    onChange("dosesPerDay", count)
    const newTimes = [...currentTimes]
    while(newTimes.length < count) newTimes.push("08:00")
    onChange("scheduleTimes", newTimes.slice(0, count))
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/70 px-5 py-12 backdrop-blur-xl overflow-y-auto items-start md:items-center">
      <div
        className="w-full max-w-2xl rounded-[2.5rem] border border-emerald-200/20 bg-[#071412]/95 px-8 py-8 shadow-2xl shadow-slate-950/60 my-auto"
        style={{ animation: "modalIn 220ms ease-out both" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-semibold text-emerald-200">{isEdit ? 'Update Details' : 'New Medication'}</p>
            <h2 className="mt-1 text-3xl font-black text-white">{isEdit ? 'Edit Medicine' : 'Add Medicine'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Added min-w-0 and overflow-hidden to form to lock the grid width */}
        <form onSubmit={onSubmit} className="grid gap-6 min-w-0 overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-200 min-w-0">
              <div className="flex justify-between items-center min-w-0">
                <span>Medicine name</span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {(form.name || "").length} / 60
                </span>
              </div>
              <input
                required
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
                placeholder="e.g. Metformin"
                maxLength={60}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-medium text-white outline-none transition focus:border-emerald-300/40 focus:bg-emerald-400/10 placeholder:text-slate-600 truncate"
              />
            </label>

            {/* min-w-0 added to prevent this cell from expanding Row 1 */}
            <label className="grid gap-1.5 text-sm font-semibold text-slate-200 min-w-0">
              Dosage
              <input
                required
                value={form.dosage}
                onChange={(e) => onChange("dosage", e.target.value)}
                placeholder="e.g. 500mg"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-medium text-white outline-none transition focus:border-emerald-300/40 focus:bg-emerald-400/10 placeholder:text-slate-600"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-0">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-200 min-w-0">
              Medicine type
              <select
                value={form.medicineType || "Tablet"}
                onChange={(e) => onChange("medicineType", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-medium text-white outline-none transition focus:border-emerald-300/40 focus:bg-emerald-400/10"
              >
                {typeOptions.map((opt) => (
                  <option key={opt} value={opt} className="bg-[#071412]">{opt}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-slate-200 min-w-0">
              Meal timing
              <select
                value={form.mealTiming || "With Food"}
                onChange={(e) => onChange("mealTiming", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-medium text-white outline-none transition focus:border-emerald-300/40 focus:bg-emerald-400/10"
              >
                {mealOptions.map((opt) => (
                  <option key={opt} value={opt} className="bg-[#071412]">{opt}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-slate-200 min-w-0">
              Initial stock (Qty)
              <input
                type="number"
                min="1"
                required
                value={form.stock || ""}
                onChange={(e) => onChange("stock", parseInt(e.target.value))}
                placeholder="e.g. 30"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-medium text-white outline-none transition focus:border-emerald-300/40 focus:bg-emerald-400/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="flex flex-col gap-0 min-w-0">
                <p className="text-[10px] font-medium text-slate-500 tracking-tight truncate">Low stock warning &lt; 5</p>
                <p className="text-[10px] font-bold text-emerald-400/80 tracking-tight truncate">
                  {isValidCalc ? `~${estimatedDays} days supply` : "Stock not set"}
                </p>
              </div>
            </label>
          </div>

          <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
            Doses Per Day
            <select
              value={doseCount === 4 ? "Four Times Daily" : doseCount === 3 ? "Three Times Daily" : doseCount === 2 ? "Twice Daily" : "Once Daily"}
              onChange={(e) => handleDoseFrequencyChange(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-medium text-white outline-none transition focus:border-emerald-300/40"
            >
              {dosageFrequencyOptions.map(opt => <option key={opt} value={opt} className="bg-[#071412]">{opt}</option>)}
            </select>
          </label>

          <div className="space-y-3 rounded-2xl border border-white/5 bg-black/40 p-4">
            {Array.from({ length: doseCount }).map((_, i) => {
              const [h, m] = (currentTimes[i] || "08:00").split(":")
              const dH = parseInt(h, 10) % 12 || 12
              const dP = parseInt(h, 10) >= 12 ? "PM" : "AM"
              return (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_260px] gap-4 items-center min-w-0 overflow-hidden">
                  {/* truncate ensures that long labels don't stretch the 1fr column */}
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-200/70 min-w-0 truncate">Dose {i + 1}</p>
                  {/* Locked width container for time selects */}
                  <div className="grid grid-cols-3 gap-2 min-w-0 shrink-0">
                    <select value={dH} onChange={(e) => handleTimeChangeAt(i, "hour", e.target.value)} className="w-full rounded-lg bg-black/30 p-2 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500/50">
                      {hours.map(h => <option key={h} value={h} className="bg-[#071412]">{h}</option>)}
                    </select>
                    <select value={m} onChange={(e) => handleTimeChangeAt(i, "minute", e.target.value)} className="w-full rounded-lg bg-black/30 p-2 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500/50">
                      {minutes.map(m => <option key={m} value={m} className="bg-[#071412]">{m}</option>)}
                    </select>
                    <select value={dP} onChange={(e) => handleTimeChangeAt(i, "period", e.target.value)} className="w-full rounded-lg bg-black/30 p-2 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500/50">
                      <option value="AM" className="bg-[#071412]">AM</option>
                      <option value="PM" className="bg-[#071412]">PM</option>
                    </select>
                  </div>
                </div>
              )
            })}
          </div>

          <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
            Frequency type
            <select
              value={form.frequencyType}
              onChange={(e) => onChange("frequencyType", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-medium text-white outline-none transition focus:border-emerald-300/40 focus:bg-emerald-400/10"
            >
            {frequencyOptions.map((opt) => (
              <option key={opt} value={opt} className="bg-[#071412]">
                {opt}
              </option>
            ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 min-w-0">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-200 min-w-0">
              Start date
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(e) => onChange("startDate", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-medium text-white outline-none transition focus:border-emerald-300/40 focus:bg-emerald-400/10"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-slate-200 min-w-0">
              End date (optional)
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => onChange("endDate", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-medium text-white outline-none transition focus:border-emerald-300/40 focus:bg-emerald-400/10"
              />
            </label>
          </div>

          {form.frequencyType === "Custom Days" && (
            <div className="grid gap-1.5">
              <p className="text-sm font-semibold text-slate-200">Select weekdays</p>
              <div className="flex flex-wrap gap-2">
                {weekdays.map((day) => {
                  const isSelected = form.customDays?.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                        isSelected
                          ? "border-emerald-300/35 bg-emerald-400/20 text-emerald-50 shadow-lg shadow-emerald-950/20"
                          : "border-white/10 bg-black/20 text-slate-400 hover:border-emerald-300/20 hover:bg-emerald-400/10"
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <label className="grid gap-1.5 text-sm font-semibold text-slate-200 min-w-0">
            Instructions
            <textarea
              value={form.instructions}
              onChange={(e) => onChange("instructions", e.target.value)}
              placeholder="e.g. Take after dinner with water"
              className="w-full min-h-20 resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-2 font-medium text-white outline-none transition focus:border-emerald-300/40 focus:bg-emerald-400/10 placeholder:text-slate-600"
            />
          </label>

          {/* Live Medication Preview Section - Added min-w-0 and overflow-hidden */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 transition-all duration-300 hover:bg-emerald-500/10 min-w-0 overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live Preview</p>
            <div className="mt-1 flex items-start justify-between gap-4 min-w-0">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-white">{form.name || "Medicine Name"}</h3>
                <p className="text-[11px] font-bold text-emerald-100/60 uppercase tracking-wide truncate">
                  {form.dosage || "---"} • {form.medicineType || "Tablet"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-black text-white">{doseCount} {doseCount === 1 ? 'dose' : 'doses'}/day</p>
                <p className="text-[10px] font-medium text-slate-400">Stock: {form.stock || 0}</p>
              </div>
            </div>
            <div className="mt-2 border-t border-emerald-500/10 pt-1.5">
              <p className="text-[10px] font-bold text-emerald-200/70">
                Estimated duration: <span className="text-emerald-400">{isValidCalc ? `${estimatedDays} days` : "Stock not set"}</span>
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-emerald-300/30 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-emerald-950/35 transition hover:-translate-y-0.5 hover:from-emerald-400 hover:to-teal-400"
            >
              {isEdit ? 'Save Changes' : 'Add Medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddMedicineModal