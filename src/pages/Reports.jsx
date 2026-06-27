import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowUpRight,
  Activity,
  Trophy,
  AlertTriangle,
  Download,
  PieChart,
  BarChart3,
  FileText,
  FileSpreadsheet,
  ChevronDown
} from 'lucide-react';
import MedicineName from "../components/MedicineName"
import { getStockStatus } from "../utils/stockUtils.js";
import { calculateWeeklyAdherence } from "../utils/adherenceUtils.js";
import {
  getTodayKey,
  isDoseAfterMedicineCreation,
  isMedicineScheduledOnDate,
  getMinutesNow,
  parseReminderTime,
  formatTimeWithSlotLabel,
  normalizeScheduleSlots,
  normalizeTimeSlot,
  TIME_SLOT_OPTIONS,
} from "../utils/medicineUtils.js";
import { supabase } from "../lib/supabase.js";
import { mapFromDb } from "../utils/medicineMapper.js";
import { medicineCache } from "../store/medicineCache.js";

const CLEAR_KEY = 'meditrack.historyCleared';

const Reports = () => {
  const [medicineList, setMedicineList] = useState(() => medicineCache.get() ? medicineCache.get().map(mapFromDb) : []);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        // Deduplicate: skip if another page is already fetching
        if (medicineCache.isFetching()) return
        medicineCache.setFetching(true)

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const { data, error } = await supabase
          .from("medicines")
          .select("*")
          .eq("user_id", session.user.id);

        if (error) throw error;

        medicineCache.set(data);
        const medicines = data.map(mapFromDb);
        setMedicineList(medicines);
      } catch (error) {
        console.error("[REPORTS] Error fetching medicines:", error);
      } finally {
        medicineCache.setFetching(false)
      }
    };

    fetchMedicines();

    // Listen for custom event to re-fetch data
    const handleDataUpdate = () => {
      fetchMedicines();
    };

    window.addEventListener('meditrack-data-updated', handleDataUpdate);

    return () => {
      window.removeEventListener('meditrack-data-updated', handleDataUpdate);
    };
  }, []);

  // Handle clicking outside the export dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportDropdown && !event.target.closest('.export-container')) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown]);

  // Dynamic Calculations
  const stats = useMemo(() => {

    const activeMedicines = medicineList.filter(m => !m.archived);

    let totalDosesTaken = 0;
    let missedCount = 0;
    let lowestRunway = Infinity;

    const historyCleared = Number(localStorage.getItem(CLEAR_KEY) || 0);

    const medPerformance = [];
    for (const med of activeMedicines) {
      let medTaken = 0;
      let medScheduled = 0;

      // Sync with 7-day adherence window
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = getTodayKey(date);

        if (isMedicineScheduledOnDate(med, date)) {
          const schedule = med.scheduleTimes || [];
          for (const time of schedule) {
            const doseDateTime = new Date(`${dateKey}T${time}`).getTime();
            // Ignore doses scheduled before history reset
            if (doseDateTime < historyCleared) continue;
            if (!isDoseAfterMedicineCreation(med, dateKey, time)) continue;

            medScheduled++;

            const history = med.adherenceHistory || [];
            const isTaken = history.some(h => h.date === dateKey && h.time === time && h.status === "Taken");

            if (isTaken) medTaken++;
          }
        }
      }

      const medMissed = medScheduled - medTaken;
      const stockInfo = getStockStatus(med.stock, med.dosesPerDay || 1);
      if (stockInfo.daysLeft < lowestRunway) lowestRunway = stockInfo.daysLeft;

      totalDosesTaken += medTaken;
      missedCount += medMissed;

      medPerformance.push({
        id: med.id,
        name: med.name,
        percentage: medScheduled > 0 ? Math.round((medTaken / medScheduled) * 100) : null,
        entriesCount: medScheduled,
        missedCount: medMissed,
        stockInfo
      });
    }

    // Adherence over last 7 days (Unifying with Dashboard)
    const adherence = calculateWeeklyAdherence(medicineList);

    // Calculate insights based on percentage and data availability for the last 7 days
    const medsWithData = medPerformance.filter(m => m.entriesCount > 0);
    const hasActiveMeds = activeMedicines.length > 0;
    const hasWindowData = medsWithData.length > 0;

    let mostConsistent, needsAttention, insightMessage;

    if (!hasActiveMeds) {
      mostConsistent = { name: "No Data", sub: "" };
      needsAttention = { name: "No Data", sub: "" };
      insightMessage = "Add medications to generate insights.";
    } else if (!hasWindowData) {
      mostConsistent = { name: "No Data", sub: "" };
      needsAttention = { name: "No Data", sub: "" };
      insightMessage = "No doses scheduled in the last 7 days.";
    } else {
      // Most Consistent: Highest adherence percentage
      const sorted = [...medsWithData].sort((a, b) => b.percentage - a.percentage);
      const best = sorted[0];
      mostConsistent = { name: best.name, sub: `${best.percentage}% Adherence` };

      // Needs Attention: Lowest adherence if below 80%
      const underperforming = medsWithData
        .filter(m => m.percentage < 80)
        .sort((a, b) => a.percentage - b.percentage);

      if (underperforming.length > 0) {
        const worst = underperforming[0];
        needsAttention = { name: worst.name, sub: `${worst.percentage}% Adherence` };
        insightMessage = `${worst.name} requires extra attention.`;
      } else {
        needsAttention = { name: "None", sub: "All meds above 80%" };
        insightMessage = "All medications are showing consistent adherence.";
      }
    }

    // Streak Logic (reusing logic from Dashboard for consistency)
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const date = getTodayKey(new Date(new Date().setDate(new Date().getDate() - i)));
      const dayMeds = activeMedicines.filter(m => m.startDate <= date && (!m.endDate || m.endDate >= date));
      if (dayMeds.length === 0) continue;
      const perfect = dayMeds.every(m => {
        const doses = m.scheduleTimes?.length || 1;
        const taken = (m.adherenceHistory || []).filter(h => h.date === date && h.status === "Taken").length;
        return taken >= doses;
      });
      if (perfect) streak++; else if (i > 0) break;
    }

    return {
      adherence,
      streak,
      runway: lowestRunway === Infinity ? 0 : lowestRunway,
      mostConsistent,
      needsAttention,
      insightMessage,
      medPerformance,
      totalTaken: totalDosesTaken,
      totalMissed: missedCount,
      totalRecorded: totalDosesTaken + missedCount,
      activeCount: activeMedicines.length
    };
  }, [medicineList]);

  // Collect all adherence history entries for recent activity
  const recentActivity = useMemo(() => {
    const activities = [];
    const minutesNow = getMinutesNow();

    medicineList.filter(m => !m.archived).forEach(med => {
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = getTodayKey(date);

        if (isMedicineScheduledOnDate(med, date)) {
          const scheduleSlots = normalizeScheduleSlots(med);
          (med.scheduleTimes || []).forEach(time => {
            const matchingSlot = scheduleSlots.find(slot => slot.time === time);
            const reminderMinutes = parseReminderTime(time);
            const isPast = i > 0 || (i === 0 && minutesNow > (reminderMinutes || 0) + 120);
            const historyEntry = (med.adherenceHistory || []).find(h => h.date === dateKey && h.time === time);
            const isAfterCreation = isDoseAfterMedicineCreation(med, dateKey, time);
            const isInvalidPreCreationMissed =
              historyEntry?.status === "Missed" && !isAfterCreation;

            if (historyEntry && !isInvalidPreCreationMissed) {
              activities.push({
                id: `${med.id}-${dateKey}-${time}`,
                name: med.name,
                dosage: med.dosage,
                time: time,
                timeSlot: matchingSlot?.slot || normalizeTimeSlot(med.timeSlot),
                status: historyEntry.status,
                date: dateKey,
                timestamp: new Date(`${dateKey}T${time}`).getTime()
              });
            } else if (isPast && isAfterCreation) {
              activities.push({
                id: `${med.id}-${dateKey}-${time}`,
                name: med.name,
                dosage: med.dosage,
                time: time,
                timeSlot: matchingSlot?.slot || normalizeTimeSlot(med.timeSlot),
                status: "Missed",
                date: dateKey,
                timestamp: new Date(`${dateKey}T${time}`).getTime()
              });
            }
          });
        }
      }
    });

    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
  }, [medicineList]);

  const medicinesByTimeSlot = useMemo(() => {
    const activeMedicines = medicineList.filter((medicine) => !medicine.archived);

    return TIME_SLOT_OPTIONS.map((slot) => ({
      ...slot,
      medicines: activeMedicines
        .map((medicine) => ({
          ...medicine,
          slotSchedules: normalizeScheduleSlots(medicine).filter((entry) => entry.slot === slot.value),
        }))
        .filter((medicine) => medicine.slotSchedules.length > 0),
    })).filter((group) => group.medicines.length > 0);
  }, [medicineList]);

  // Dynamic Adherence Chart (Mocking previous days, showing real today)
  const weeklyAdherence = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const adherenceData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (6 - i));
      const dateKey = getTodayKey(d);

      let totalDosesForDay = 0;
      let takenDosesForDay = 0;

      medicineList.forEach(med => {
        if (isMedicineScheduledOnDate(med, d)) {
          const schedule = med.scheduleTimes || ["08:00"];
          schedule.forEach((time) => {
            if (!isDoseAfterMedicineCreation(med, dateKey, time)) return;

            totalDosesForDay++;
            const wasTaken = (med.adherenceHistory || []).some(
              h => h.date === dateKey && h.time === time && h.status === 'Taken',
            );
            if (wasTaken) takenDosesForDay++;
          });
        }
      });

      const percentage = totalDosesForDay > 0 ? Math.round((takenDosesForDay / totalDosesForDay) * 100) : null;
      return { day: i === 6 ? 'Today' : days[d.getDay()], percentage };
    });
    return adherenceData;
  }, [medicineList]);

  /**
   * Generates and downloads a CSV report of medication performance.
   */
  const exportToCSV = () => {
    try {
      const headers = ["Medicine", "Adherence", "Inventory Status", "Days Remaining", "Missed Count"];
      const rows = stats.medPerformance.map(med => [
        med.name,
        `${med.percentage}%`,
        med.stockInfo.badgeText,
        med.stockInfo.daysLeft,
        med.missedCount
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(field => `"${field}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);

      link.setAttribute('href', url);
      link.setAttribute('download', `MediTrack_Report_${dateStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("CSV exported successfully");
    } catch (error) {
      console.error("CSV Export Error:", error);
      alert("Failed to export CSV report. Please try again.");
    }
  };

  const exportToTXT = () => {
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const report = `========================================
         MEDITRACK HEALTH REPORT
========================================

Generated: ${dateStr}
Report Type: Medication Analytics


OVERVIEW
----------------------------------------
Overall Adherence: ${stats.adherence !== null ? `${stats.adherence}%` : "No Data"}
Current Streak: ${stats.streak} Days
Inventory Runway: ${stats.runway} Days
Doses Recorded: ${stats.totalRecorded}


TAKEN VS MISSED
----------------------------------------
Taken: ${stats.totalTaken}
Missed: ${stats.totalMissed}


MEDICATION PERFORMANCE
----------------------------------------

${stats.medPerformance.length > 0
          ? stats.medPerformance.map(med => `${med.name}
  Adherence: ${med.percentage}%
  Days Remaining: ${med.stockInfo.daysLeft}
  Inventory Status: ${med.stockInfo.badgeText}`).join('\n\n')
          : "No medications recorded."}


INSIGHTS
----------------------------------------
Most Consistent: ${stats.mostConsistent.name}
Needs Attention: ${stats.needsAttention.name}
Analysis: ${stats.insightMessage}


========================================
Generated by MediTrack
Medication Management Dashboard
========================================`;

      const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `MediTrack_Report_${dateStr}.txt`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("TXT report exported successfully");
    } catch (error) {
      console.error("TXT Export Error:", error);
      alert("Failed to export TXT report. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:px-8 lg:py-10 lg:pl-4">
      <style>
        {`
          @keyframes modalIn {
            from { opacity: 0; transform: translateY(10px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}
      </style>
      {medicineList.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="p-4 bg-emerald-500/10 rounded-2xl mb-4">
            <Activity className="w-12 h-12 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Tracking Data Found</h2>
          <p className="text-zinc-500 max-w-sm mb-6">Add medicines and mark them as taken on your dashboard to see your health analytics here.</p>
          <Link to="/dashboard" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-colors">
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="p-1">
          {/* Hero / Header Section */}
          <header className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="w-6 shadow-sm h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] leading-none mb-1">MediTrack Health System</p>
                  <h1 className="text-3xl font-bold tracking-tight">Health Reports</h1>
                </div>
              </div>
              <p className="text-zinc-400 max-w-2xl">
                Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 export-container relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 border border-emerald-500/30 rounded-xl text-sm font-bold hover:bg-emerald-500 transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showExportDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showExportDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl z-50 overflow-hidden animate-[modalIn_0.2s_ease-out]">
                  <button
                    onClick={() => {
                      exportToCSV();
                      setShowExportDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors border-b border-white/5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    Export CSV
                  </button>
                  <button
                    onClick={() => {
                      exportToTXT();
                      setShowExportDropdown(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-400" />
                    Export TXT Report
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Summary Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Overall Adherence"
              value={stats.adherence !== null ? `${stats.adherence}%` : "No Data"}
              icon={<CheckCircle2 className={stats.adherence >= 80 ? 'text-emerald-400' : 'text-amber-400'} />}
              trend="Lifetime performance"
              percent={stats.adherence ?? 0}
            />
            <StatCard
              title="Current Streak"
              value={`${stats.streak} Days`}
              icon={<Trophy className="text-orange-400" />}
              trend="Perfect days"
            />
            <StatCard
              title="Inventory Runway"
              value={`${stats.runway} Days`}
              icon={<AlertTriangle className={stats.runway < 5 ? 'text-rose-400' : 'text-blue-400'} />}
              trend="Until next refill"
            />
            <StatCard
              title="Doses Recorded"
              value={stats.totalRecorded.toString()}
              icon={<Calendar className="text-amber-500" />}
              trend="Active prescriptions"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content Column: Chart and Activity */}
            <div className="lg:col-span-3 flex flex-col gap-8">
              {/* Weekly Adherence Chart */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-semibold text-lg flex items-center gap-2"><BarChart3 size={18} className="text-emerald-500" /> Weekly Adherence Trend</h3>
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Last 7 Days</span>
                </div>

                <div className="flex gap-4">
                  {/* Y-Axis Labels */}
                  <div className="flex flex-col justify-between text-[10px] font-bold text-zinc-600 pb-8 pt-1 text-right w-8">
                    <span>100%</span>
                    <span>50%</span>
                    <span>0%</span>
                  </div>

                  <div className="flex-1 relative flex items-end justify-between h-48 gap-2">
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pt-1 pb-8">
                      <div className="border-t border-zinc-800/80 w-full"></div>
                      <div className="border-t border-zinc-800/40 w-full border-dashed"></div>
                      <div className="border-t border-zinc-800/80 w-full"></div>
                    </div>

                    {weeklyAdherence.map((item) => (
                      <div key={item.day} className="flex-1 flex flex-col items-center h-full group relative z-10">
                        <div className="relative w-full flex justify-center items-end h-[156px] mt-1">
                          {/* Percentage Tooltip */}
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] font-bold py-1.5 px-2.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 border border-zinc-700 pointer-events-none shadow-2xl">
                            {item.percentage === null ? "No Doses Scheduled" : `${item.percentage}% Adherence`}
                          </div>
                          {/* Bar Track */}
                          <div className="w-full max-w-[28px] bg-zinc-800/20 h-full rounded-t-lg absolute"></div>
                          {/* Active Bar */}
                          <div
                            className={`w-full max-w-[28px] transition-all duration-700 rounded-t-lg relative shadow-lg ${item.percentage === null
                                ? 'bg-zinc-800/50'
                                : item.percentage === 0
                                  ? 'bg-rose-500/40'
                                  : 'bg-gradient-to-t from-emerald-600/40 to-emerald-500 group-hover:to-emerald-400'
                              } ${item.percentage !== null && item.percentage > 0 ? 'shadow-[0_0_15px_rgba(16,185,129,0.1)]' : ''}`}
                            style={{ height: item.percentage === null ? '0%' : `${Math.max(item.percentage, item.percentage === 0 ? 4 : 0)}%` }}
                          >
                            {item.percentage !== null && item.percentage > 0 && (
                              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-300 rounded-full opacity-50"></div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                          <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">{item.day}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Per-Medicine Performance Table */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="font-semibold text-lg mb-6">Medication Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
                        <th className="pb-3 font-bold">Medication</th>
                        <th className="pb-3 font-bold">Adherence</th>
                        <th className="pb-3 font-bold text-right">Inventory</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {stats.medPerformance.map((med) => (
                        <tr key={med.id} className="group hover:bg-white/[0.02]">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${med.percentage >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              <MedicineName name={med.name} className="font-bold text-sm text-zinc-200" />
                            </div>
                          </td>
                          <td className="py-4 text-sm font-medium text-zinc-300">
                            {med.percentage !== null ? `${med.percentage}%` : "No Data"}
                          </td>
                          <td className="py-4 text-right">
                            <span className={`text-xs font-bold ${med.stockInfo.color === 'rose-400' ? 'text-rose-400' : 'text-zinc-500'}`}>
                              {med.stockInfo.daysLeft}d left
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Time Slot Groups */}
              {medicinesByTimeSlot.length > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                  <h3 className="font-semibold text-lg mb-6">Medicines by Time Slot</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {medicinesByTimeSlot.map((group) => (
                      <section key={group.value} className="rounded-xl border border-zinc-800/70 bg-zinc-950/30 p-4">
                        <h4 className="text-sm font-black text-white mb-3">
                          {group.label} Medicines
                        </h4>
                        <div className="space-y-3">
                          {group.medicines.map((medicine) => (
                            <div key={medicine.id} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-800/30 px-3 py-2">
                              <div className="min-w-0">
                                <MedicineName name={medicine.name} truncate={true} className="text-sm font-bold text-zinc-100" />
                                <p className="text-xs text-zinc-500">{medicine.dosage || "No dosage set"}</p>
                              </div>
                              <span className="shrink-0 text-xs font-bold text-emerald-400">
                                {medicine.slotSchedules.map((entry) => formatTimeWithSlotLabel(entry.time, entry.slot)).join(" • ")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity Timeline */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6 px-1">
                  <h3 className="font-semibold text-lg">Recent Activity</h3>
                  <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Live Logs</span>
                </div>

                <div className="space-y-6 px-1">
                  {recentActivity.length > 0 ? recentActivity.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 group">
                      <div className="relative flex-shrink-0 w-6">
                        <div className={`mt-1.5 w-3 h-3 mx-auto rounded-full ring-4 ring-zinc-950 ${log.status === 'Taken' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`} />
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-px h-10 bg-zinc-800 group-last:hidden" />
                      </div>
                      <div className="flex-1 bg-zinc-800/30 rounded-xl p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-700">
                        <div className="flex flex-col gap-1">
                          <div className="font-medium flex min-w-0">
                            <MedicineName name={log.name} truncate={true} />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {formatTimeWithSlotLabel(log.time, log.timeSlot)} ({log.dosage}) on {new Date(log.date).toLocaleDateString()}
                            </span>
                            <span className="hidden sm:inline text-zinc-700">•</span>
                            <span>{log.status === 'Taken' ? 'Taken' : log.status}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${log.status === 'Taken'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : log.status === 'Completed Course'
                                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-500'
                            }`}>
                            {log.status}
                          </span>
                          <button className="text-zinc-600 hover:text-zinc-400">
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="py-10 text-center text-zinc-500 text-sm italic">
                      No recent activities. Actions taken today will appear here.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar Column: Goal and Insights */}
            <div className="lg:col-span-1 flex flex-col gap-8">
              {/* Taken vs Missed Breakdown */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="font-semibold text-lg mb-6 flex items-center gap-2"><PieChart size={18} className="text-emerald-500" /> Taken vs Missed</h3>
                <div className="flex flex-col items-center">
                  <div className="relative h-32 w-32 mb-6">
                    <svg className="h-full w-full -rotate-90">
                      <circle cx="64" cy="64" r="52" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-rose-500/10" />
                      <circle cx="64" cy="64" r="52" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray={326.7} strokeDashoffset={0} strokeLinecap="round" className="text-rose-500" />
                      <circle
                        cx="64" cy="64" r="52" stroke="currentColor" strokeWidth="10" fill="transparent"
                        strokeDasharray={326.7}
                        strokeDashoffset={326.7 - (326.7 * (stats.totalTaken / (stats.totalRecorded || 1)))}
                        strokeLinecap="round" className="text-emerald-500 transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-white">
                        {stats.totalRecorded > 0 ? Math.round((stats.totalTaken / stats.totalRecorded) * 100) : 0}%
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Adherence</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full border-t border-zinc-800/50 pt-4">
                    <div className="text-center">
                      <p className="text-xl font-black text-emerald-500">{stats.totalTaken}</p>
                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Taken</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-black text-rose-500">{stats.totalMissed}</p>
                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Missed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Report Summary Card */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                  <FileText size={18} className="text-emerald-500" /> Report Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Current Streak</span>
                    <span className="text-sm font-black text-white">{stats.streak} Days</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Overall Adherence</span>
                    <span className="text-sm font-black text-white">{stats.adherence !== null ? `${stats.adherence}%` : "0%"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Doses</span>
                    <span className="text-sm font-black text-white">{stats.totalRecorded}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active Meds</span>
                    <span className="text-sm font-black text-white">{stats.activeCount}</span>
                  </div>
                </div>
              </div>

              {/* Medication Insights Section */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="font-semibold text-lg mb-6">Medication Insights</h3>
                <div className="space-y-4">
                  {/* Most Consistent Medicine */}
                  <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/50 hover:border-emerald-500/30 transition-all group cursor-default">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Most Consistent</span>
                    </div>
                    <div className="text-emerald-400 font-bold flex min-w-0">
                      <MedicineName name={stats.mostConsistent.name} truncate={true} />
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{stats.mostConsistent.sub}</p>
                  </div>

                  {/* Needs Attention Medicine */}
                  <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/50 hover:border-rose-500/30 transition-all group cursor-default">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500 group-hover:scale-110 transition-transform">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Needs Attention</span>
                    </div>
                    <div className="text-rose-400 font-bold flex min-w-0">
                      <MedicineName name={stats.needsAttention.name} truncate={true} />
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{stats.needsAttention.sub}</p>
                  </div>

                  {/* Adherence Context */}
                  <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/50 hover:border-blue-500/10 transition-all group cursor-default">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                        <Activity className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Analysis</span>
                    </div>
                    <p className="text-zinc-300 text-sm leading-relaxed">{stats.insightMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Sub-component for individual statistics cards
 */

const StatCard = ({ title, value, icon, trend, isWarning, percent }) => {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:border-emerald-500/30 hover:shadow-emerald-500/5 group backdrop-blur-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isWarning || (percent !== undefined && percent < 50) ? 'bg-rose-500/10 text-rose-500' : percent !== undefined && percent < 80 ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-500'
          }`}>
          Active
        </span>
      </div>
      <div>
        <p className="text-zinc-500 text-sm font-medium mb-1">{title}</p>
        <h4 className="text-2xl font-bold mb-2">{value}</h4>
        <p className="text-xs text-zinc-400 flex items-center gap-1">
          {trend}
        </p>
      </div>
    </div>
  );
};

export default Reports;
