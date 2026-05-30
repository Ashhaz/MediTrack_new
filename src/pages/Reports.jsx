import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Clock, 
  ArrowUpRight,
  Activity,
  Trophy,
  AlertTriangle,
  BellRing
} from 'lucide-react';
import MedicineName from "../components/MedicineName"
import { getStockStatus } from "../utils/stockUtils.js";
import { getTodayKey, isMedicineScheduledOnDate } from "../utils/medicineUtils.js";

const STORAGE_KEY = 'meditrack.medicines';

const Reports = () => {
  const [medicineList, setMedicineList] = useState([]);

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      setMedicineList(JSON.parse(savedData));
    }

    // Listen for custom event to re-fetch data when localStorage changes
    const handleStorageChange = () => {
      const updatedData = localStorage.getItem(STORAGE_KEY);
      if (updatedData) {
        setMedicineList(JSON.parse(updatedData));
      }
    };

    window.addEventListener('meditrack-data-updated', handleStorageChange);

    return () => {
      window.removeEventListener('meditrack-data-updated', handleStorageChange);
    };
  }, []);

  // Dynamic Calculations
  const stats = useMemo(() => {
    // Adherence stats should only consider active medicines
    const today = new Date();
    const activeMedicines = medicineList.filter(m => isMedicineScheduledOnDate(m, today));
    
    const total = activeMedicines.length;
    const taken = activeMedicines.filter(m => m.status === 'Taken').length;
    const missed = activeMedicines.filter(m => m.status === 'Missed').length;
    const upcoming = activeMedicines.filter(m => m.status === 'Upcoming').length;
    const adherence = total > 0 ? Math.round((taken / total) * 100) : 0;

    // Advanced Insights Logic
    const mostMissed = [...medicineList].sort((a, b) => (b.missedCount || 0) - (a.missedCount || 0))[0];
    const mostConsistent = [...medicineList].sort((a, b) => {
      const aTaken = (a.adherenceHistory || []).filter(h => h.status === 'Taken').length;
      const bTaken = (b.adherenceHistory || []).filter(h => h.status === 'Taken').length;
      return bTaken - aTaken;
    })[0];

    // Best Adherence Day Calculation
    const dayCounts = {};
    medicineList.forEach(m => {
      (m.adherenceHistory || []).filter(h => h.status === 'Taken').forEach(h => {
        const day = new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' });
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
    });
    const bestDay = Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b, "N/A");

    return { total, taken, missed, upcoming, adherence, mostMissed, mostConsistent, bestDay };
  }, [medicineList]);

  // Collect all adherence history entries for recent activity
  const recentActivity = useMemo(() => {
    return medicineList
      .flatMap(med => (med.adherenceHistory || []).map(historyEntry => ({
        id: `${med.id}-${historyEntry.date}-${historyEntry.time}`, // Unique ID for activity item
        name: med.name,
        dosage: med.dosage,
        time: historyEntry.time,
        status: historyEntry.status,
        date: historyEntry.date,
        timestamp: new Date(`${historyEntry.date}T${historyEntry.time}`).getTime() // For sorting
      })))
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest activity first
  }, [medicineList]);

  // Dynamic Adherence Chart (Mocking previous days, showing real today)
  const weeklyAdherence = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const adherenceData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (6 - i));
      const dateKey = d.toISOString().slice(0, 10);

      let totalDosesForDay = 0;
      let takenDosesForDay = 0;

      medicineList.forEach(med => {
        if (isMedicineScheduledOnDate(med, d)) {
          totalDosesForDay += med.scheduleTimes.length;
          takenDosesForDay += (med.adherenceHistory || []).filter(h => h.date === dateKey && h.status === 'Taken').length;
        }
      });

      const percentage = totalDosesForDay > 0 ? Math.round((takenDosesForDay / totalDosesForDay) * 100) : 100; // 100% if no doses scheduled
      return { day: i === 6 ? 'Today' : days[d.getDay()], percentage };
    });
    return adherenceData;
  }, [stats.adherence]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:px-8 lg:py-10 lg:pl-4">
      {medicineList.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="p-4 bg-emerald-500/10 rounded-2xl mb-4">
            <Activity className="w-12 h-12 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Tracking Data Found</h2>
          <p className="text-zinc-500 max-w-sm mb-6">Add medicines and mark them as taken on your dashboard to see your health analytics here.</p>
          <a href="/dashboard" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-colors">
            Go to Dashboard
          </a>
        </div>
      ) : (
        <>
      {/* Hero / Header Section */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <TrendingUp className="w-6 shadow-sm h-6 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Health Reports</h1>
        </div>
        <p className="text-zinc-400 max-w-2xl">
          Detailed analysis of your medication adherence and health trends over the last 7 days.
        </p>
      </header>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Weekly Adherence" 
        value={`${stats.adherence}%`}
        icon={<CheckCircle2 className={stats.adherence >= 80 ? 'text-emerald-500' : stats.adherence >= 50 ? 'text-amber-400' : 'text-rose-500'} />} 
          trend="Overall progress"
        percent={stats.adherence}
        />
        <StatCard 
          title="Medicines Taken" 
          value={stats.taken.toString()} 
          icon={<Activity className="text-blue-500" />} 
          trend="On track"
        />
        <StatCard 
          title="Missed Doses" 
          value={stats.missed.toString()} 
          icon={<XCircle className="text-rose-500" />} 
          trend="Requires attention"
          isWarning
        />
        <StatCard 
          title="Total Scheduled" 
          value={stats.total.toString()} 
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
              <h3 className="font-semibold text-lg">Weekly Adherence Trend</h3>
              <select className="bg-zinc-800 border-none rounded-md text-sm px-3 py-1 text-zinc-300 outline-none focus:ring-1 focus:ring-emerald-500">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            
            <div className="flex items-end justify-between h-48 gap-2">
              {weeklyAdherence.map((item) => (
                <div key={item.day} className="flex-1 flex flex-col items-center gap-3 group">
                  <div className="relative w-full flex justify-center items-end h-full">
                    <div 
                      className="w-full max-w-[40px] bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-all rounded-t-md relative"
                      style={{ height: `${item.percentage}%` }}
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 rounded-full"></div>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500 font-medium">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

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
                    <div className={`mt-1.5 w-3 h-3 mx-auto rounded-full ring-4 ring-zinc-950 ${
                      log.status === 'Taken' ? 'bg-emerald-500' : 'bg-rose-500'
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
                          <Clock className="w-3 h-3" /> {log.time} ({log.dosage}) on {new Date(log.date).toLocaleDateString()}
                        </span>
                        <span className="hidden sm:inline text-zinc-700">•</span>
                        <span>{log.status === 'Taken' ? 'Taken' : log.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        log.status === 'Taken' 
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
          {/* Circular Progress Section */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <h3 className="font-semibold text-lg mb-6 self-start">Overall Goal</h3>
            <div className="relative flex items-center justify-center mb-6">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-zinc-800"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * 88) / 100}
                  strokeLinecap="round"
                  className="text-emerald-500 transition-all duration-1000"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-bold">{stats.adherence}%</span>
                <span className="text-xs text-zinc-500 uppercase tracking-widest">Monthly</span>
              </div>
            </div>
            <p className="text-sm text-zinc-400">
              You're doing great! You are <span className="text-emerald-400 font-medium">12%</span> away from your monthly target.
            </p>
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
                   <MedicineName name={stats.mostConsistent?.name || '---'} truncate={true} />
                </div>
                <p className="text-xs text-zinc-400 mt-1">{stats.mostConsistent ? 'Highest adherence streak' : 'Insufficient data'}</p>
              </div>

              {/* Most Missed Medicine */}
              <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/50 hover:border-rose-500/30 transition-all group cursor-default">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500 group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Most Missed</span>
                </div>
                <div className="text-rose-400 font-bold flex min-w-0">
                   <MedicineName name={stats.mostMissed?.missedCount > 0 ? stats.mostMissed.name : 'None'} truncate={true} />
                </div>
                <p className="text-xs text-zinc-400 mt-1">{stats.mostMissed?.missedCount > 0 ? `Missed ${stats.mostMissed.missedCount} times total` : 'Great job staying consistent!'}</p>
              </div>

              {/* Average Daily Adherence */}
              <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/50 hover:border-emerald-500/30 transition-all group cursor-default">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Avg. Adherence</span>
                </div>
                <p className="text-zinc-100 font-bold text-2xl">{stats.adherence}%</p>
              </div>

              {/* Reminder Performance */}
              <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/50 hover:border-emerald-500/10 transition-all group cursor-default">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-zinc-500/10 rounded-lg text-zinc-400 group-hover:scale-110 transition-transform">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Reminders</span>
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed">{stats.missed > 0 ? 'Reminders are helping, but some doses were' : 'All reminders were followed'} <span className={stats.missed > 0 ? 'text-rose-400' : 'text-emerald-400'}>{stats.missed > 0 ? 'missed' : 'successfully'}</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
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
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
          isWarning || (percent !== undefined && percent < 50) ? 'bg-rose-500/10 text-rose-500' : percent !== undefined && percent < 80 ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-500'
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