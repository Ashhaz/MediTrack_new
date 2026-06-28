import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Edit2, 
  Bell, 
  Volume2, 
  Database, 
  Download, 
  RefreshCcw, 
  Info, 
  ShieldCheck,
  BellRing,
  X,
  AlertTriangle,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Clock,
  LogOut
} from 'lucide-react';
import { readJsonFromStorage, safeParseJson } from "../utils/storageUtils.js";
import { requestNotificationPermission } from "../utils/serviceWorkerNotifications.js";
import { supabase } from '../lib/supabase.js';

// Standardized Storage Keys
const STORAGE_KEYS = {
  MEDICINES: 'meditrack.medicines',
  PROFILE: 'meditrack.profile',
  NOTIFICATIONS: 'meditrack.notifications',
  NOTIFICATION_SETTINGS: 'meditrack.notificationSettings',
  REPORTS: 'meditrack.reports',
  HISTORY_CLEARED: 'meditrack.historyCleared'
};

const defaultNotificationSettings = {
  doseReminders: true,
  refillAlerts: true,
  soundNotifications: true,
  reminderLeadTime: "30 Minutes Before",
  reminderFrequency: "Once",
};

const defaultProfile = {
  name: "Mohammed Ashhaz Ahmed",
  email: "ashhaz.ahmed@example.com",
};

const readMedicines = () => {
  const medicines = readJsonFromStorage(STORAGE_KEYS.MEDICINES, []);
  return Array.isArray(medicines) ? medicines : [];
};

const Settings = () => {
  const navigate = useNavigate();
  // Load notification preferences separately from the notification center entries.
  const [notifications, setNotifications] = useState(() => {
    const saved =
      localStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS) ||
      localStorage.getItem('meditrack.notifications');
    const parsed = safeParseJson(saved, null, STORAGE_KEYS.NOTIFICATION_SETTINGS);

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? { ...defaultNotificationSettings, ...parsed }
      : defaultNotificationSettings;
  });

  const [profile, setProfile] = useState(defaultProfile);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setProfile({
          name: session.user.user_metadata?.full_name || defaultProfile.name,
          email: session.user.email || defaultProfile.email,
        });
      }
    };
    fetchUser();
  }, []);

  const [toast, setToast] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [emailError, setEmailError] = useState("");

  // Automatically clear toast after a delay
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportDropdown && !event.target.closest('.export-container')) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown]);

  const openEditModal = () => {
    setProfileForm({ name: profile.name, email: profile.email });
    setEmailError("");
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileForm.email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        email: profileForm.email,
        data: { full_name: profileForm.name }
      });
      
      if (error) throw error;

      setProfile(profileForm);
      setIsEditModalOpen(false);
      setToast("Profile updated successfully");
    } catch (err) {
      console.error("Error updating profile:", err);
      setToast("Failed to update profile: " + err.message);
    }
  };

  const exportToCSV = () => {
    try {
      const medicines = readMedicines();
      const headers = ["Medicine", "Dosage", "Type", "Stock", "Frequency", "Instructions"];
      const rows = medicines.map(med => [
        med.name,
        med.dosage,
        med.medicineType,
        med.stock,
        med.frequencyType,
        med.instructions?.replace(/,/g, ';') // Prevent CSV breakage
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(field => `"${field}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', `MediTrack_Data_${dateStr}.csv`);
      link.click();
      
      setToast("CSV Report exported");
      setShowExportDropdown(false);
    } catch (error) {
      console.error("[MediTrack Storage] CSV export failed", error);
      setToast("Export failed");
    }
  };

  const exportToTXT = () => {
    try {
      const medicines = readMedicines();
      const dateStr = new Date().toLocaleString();
      const report = `========================================
      MEDITRACK MEDICAL DATA REPORT
========================================
Generated: ${dateStr}
Total Medications: ${medicines.length}

MEDICATION LIST:
----------------------------------------
${medicines.length > 0 ? medicines.map(med => `
Name: ${med.name}
Dosage: ${med.dosage}
Type: ${med.medicineType}
Current Stock: ${med.stock} units
Frequency: ${med.frequencyType}
Instructions: ${med.instructions || 'None'}
----------------------------------------`).join('\n') : "No medications recorded."}

========================================
Generated by MediTrack Settings
========================================`;

      const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', `MediTrack_Report_${new Date().toISOString().slice(0, 10)}.txt`);
      link.click();

      setToast("TXT Report exported");
      setShowExportDropdown(false);
    } catch (error) {
      console.error("[MediTrack Storage] TXT export failed", error);
      setToast("Export failed");
    }
  };

  const handleResetApplication = () => {
    // 1. Clear standardized keys
    localStorage.removeItem(STORAGE_KEYS.MEDICINES);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.REPORTS);
    localStorage.removeItem(STORAGE_KEYS.HISTORY_CLEARED);

    // 2. Clear known legacy keys
    localStorage.removeItem('meditrack_medicines');
    localStorage.removeItem('meditrack.settings.doseReminders');
    localStorage.removeItem('meditrack.settings.refillAlerts');
    localStorage.removeItem('meditrack.settings.soundNotifications');
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);

    setToast("Application reset successfully");
    setIsResetModalOpen(false);
    
    // 3. Force redirect to dashboard to refresh application state
    setTimeout(() => { navigate('/dashboard'); }, 1500);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Error logging out:", error);
      setToast("Failed to logout");
    }
  };

  const toggleNotification = async (key) => {
    const newValue = !notifications[key];
    
    if (key === 'doseReminders' && newValue === true) {
      const permission = await requestNotificationPermission();
      if (permission !== 'granted') {
        setToast("Browser notification permission denied.");
        return; // Do not toggle if permission is not granted
      }
    }
    
    // Update state
    setNotifications(prev => ({ ...prev, [key]: newValue }));
    
    // Save to localStorage immediately
    const updated = { ...notifications, [key]: newValue };
    localStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(updated));
    
    // Show success feedback
    setToast("Settings saved successfully");
  };

  return (
    <div className="min-h-screen animate-[fadeUp_0.6s_ease-out]">
      <style>
        {`
          @keyframes toastIn {
            from { opacity: 0; transform: translate(-50%, 12px); }
            to { opacity: 1; transform: translate(-50%, 0); }
          }
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

      <header className="mb-8 rounded-3xl border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
        <p className="text-sm font-semibold text-emerald-200">System Preferences</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl text-white">
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 font-medium">
          Manage your profile, notification preferences, and application data.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* PROFILE SECTION */}
        <section className="rounded-[2.5rem] border border-white/10 bg-white/[0.055] p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl transition duration-300 hover:border-emerald-300/20">
          <div className="flex items-center gap-4 mb-8">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <User size={20} />
            </div>
            <h2 className="text-xl font-black text-white">Profile</h2>
          </div>

          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-8">
            <div className="relative group">
              <div className="grid h-24 w-24 place-items-center rounded-[2rem] bg-gradient-to-br from-emerald-500 to-teal-500 text-3xl font-black shadow-xl shadow-emerald-950/40">
                {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <button onClick={openEditModal} className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-zinc-900 border border-white/10 text-emerald-400 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit2 size={14} />
              </button>
            </div>

            <div className="flex-1 space-y-6 text-center sm:text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</label>
                <p className="text-lg font-bold text-white">{profile.name}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email Address</label>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-300 font-medium">
                  <Mail size={14} className="text-emerald-500/70" />
                  <span>{profile.email}</span>
                </div>
              </div>
              <div className="flex gap-4 justify-center sm:justify-start mt-2">
                <button onClick={openEditModal} className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-bold text-emerald-100 transition hover:bg-emerald-400/10 hover:border-emerald-500/30">
                  Edit Profile
                </button>
                <button onClick={handleLogout} className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-6 py-2.5 text-xs font-bold text-rose-400 transition hover:bg-rose-500/20 hover:border-rose-500/30">
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* NOTIFICATIONS SECTION */}
        <section className="rounded-[2.5rem] border border-white/10 bg-white/[0.055] p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl transition duration-300 hover:border-emerald-300/20">
          <div className="flex items-center gap-4 mb-8">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
              <BellRing size={20} />
            </div>
            <h2 className="text-xl font-black text-white">Notifications</h2>
          </div>

          <div className="space-y-4">
            <ToggleItem 
              icon={<Bell size={18} />}
              label="Dose Reminders" 
              description="Get notified when it's time to take your meds"
              enabled={notifications.doseReminders}
              onClick={() => toggleNotification('doseReminders')}
            />
            <ToggleItem 
              icon={<ShieldCheck size={18} />}
              label="Refill Alerts" 
              description="Warning when medicine stock is low (below 5)"
              enabled={notifications.refillAlerts}
              onClick={() => toggleNotification('refillAlerts')}
            />
            <ToggleItem 
              icon={<Volume2 size={18} />}
              label="Sound Notifications" 
              description="Play a chime for important reminders"
              enabled={notifications.soundNotifications}
              onClick={() => toggleNotification('soundNotifications')}
            />
          </div>
        </section>

        {/* REMINDER PREFERENCES SECTION */}
        <section className="rounded-[2.5rem] border border-white/10 bg-white/[0.055] p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl transition duration-300 hover:border-emerald-300/20">
          <div className="flex items-center gap-4 mb-8">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/10 text-purple-400">
              <Clock size={20} />
            </div>
            <h2 className="text-xl font-black text-white">Reminder Preferences</h2>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reminder Lead Time</label>
              <select 
                value={notifications.reminderLeadTime}
                onChange={(e) => {
                  const updated = { ...notifications, reminderLeadTime: e.target.value };
                  setNotifications(updated);
                  localStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(updated));
                  setToast("Settings saved successfully");
                }}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-5 py-3 text-sm font-bold text-white outline-none focus:border-emerald-500/50 transition-colors cursor-pointer"
              >
                <option value="15 Minutes Before" className="bg-[#071412]">15 Minutes Before</option>
                <option value="30 Minutes Before" className="bg-[#071412]">30 Minutes Before</option>
                <option value="1 Hour Before" className="bg-[#071412]">1 Hour Before</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reminder Frequency</label>
              <select 
                value={notifications.reminderFrequency}
                onChange={(e) => {
                  const updated = { ...notifications, reminderFrequency: e.target.value };
                  setNotifications(updated);
                  localStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(updated));
                  setToast("Settings saved successfully");
                }}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-5 py-3 text-sm font-bold text-white outline-none focus:border-emerald-500/50 transition-colors cursor-pointer"
              >
                <option value="Once" className="bg-[#071412]">Once</option>
                <option value="Repeat Twice" className="bg-[#071412]">Repeat Twice</option>
                <option value="Repeat Until Marked" className="bg-[#071412]">Repeat Until Marked</option>
              </select>
            </div>
          </div>
        </section>

        {/* DATA MANAGEMENT SECTION */}
        <section className="rounded-[2.5rem] border border-white/10 bg-white/[0.055] p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl transition duration-300 hover:border-emerald-300/20">
          <div className="flex items-center gap-4 mb-8">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-400">
              <Database size={20} />
            </div>
            <h2 className="text-xl font-black text-white">Data Management</h2>
          </div>

          <div className="grid gap-4">
            <div className="relative export-container">
              <button 
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="flex items-center justify-between w-full p-4 rounded-2xl bg-black/25 border border-white/5 transition text-left group hover:bg-white/5 hover:border-white/20 text-slate-300"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors text-emerald-400">
                    <Download size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-white transition-colors">Export Medical Data</p>
                    <p className="text-[11px] text-slate-500 font-medium">Download reports in CSV or TXT format</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showExportDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showExportDropdown && (
                <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl border border-white/10 bg-[#071412] shadow-2xl overflow-hidden animate-[modalIn_0.2s_ease-out]">
                  <button 
                    onClick={exportToTXT}
                    className="w-full flex items-center gap-3 px-5 py-4 text-sm font-bold text-slate-300 hover:bg-emerald-500/10 hover:text-white transition-colors border-b border-white/5 text-left"
                  >
                    <FileText className="w-4 h-4 text-blue-400" />
                    Export TXT Report
                  </button>
                  <button 
                    onClick={exportToCSV}
                    className="w-full flex items-center gap-3 px-5 py-4 text-sm font-bold text-slate-300 hover:bg-emerald-500/10 hover:text-white transition-colors text-left"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    Export CSV Report
                  </button>
                </div>
              )}
            </div>

            <ActionButton 
              icon={<RefreshCcw size={18} />} 
              label="Reset Application" 
              description="Wipe all medicines and start from scratch"
              variant="danger"
              onClick={() => setIsResetModalOpen(true)}
            />
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section className="rounded-[2.5rem] border border-white/10 bg-white/[0.055] p-8 shadow-2xl shadow-slate-950/20 backdrop-blur-xl transition duration-300 hover:border-emerald-300/20">
          <div className="flex items-center gap-4 mb-8">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-500/10 text-slate-400">
              <Info size={20} />
            </div>
            <h2 className="text-xl font-black text-white">About MediTrack</h2>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-black/30 p-5 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black text-white">Version 1.0.0</span>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-md">Stable</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                MediTrack is a smart medication management system designed to improve patient adherence through intuitive tracking and intelligent scheduling.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Developer</label>
              <div className="flex items-center justify-between">
                <p className="font-bold text-white">Ashhaz Ahmed</p>
                <div className="flex gap-4">
                  <span className="text-xs font-bold text-emerald-500 cursor-pointer hover:underline">Documentation</span>
                  <span className="text-xs font-bold text-emerald-500 cursor-pointer hover:underline">Support</span>
                </div>
              </div>
            </div>

            <p className="pt-4 text-center text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">
              Made with ❤️ for better health
            </p>
          </div>
        </section>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-xl">
          <div className="w-full max-w-md rounded-[2.5rem] border border-white/10 bg-[#071412]/95 p-8 shadow-2xl animate-[modalIn_0.3s_ease-out]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-white">Edit Profile</h2>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</label>
                <input 
                  required
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-5 py-3 text-white outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="Enter your name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email Address</label>
                <input 
                  required
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => {
                    setProfileForm({ ...profileForm, email: e.target.value });
                    if (emailError) setEmailError("");
                  }}
                  className={`w-full rounded-2xl border ${emailError ? 'border-rose-500/50' : 'border-white/10'} bg-black/25 px-5 py-3 text-white outline-none focus:border-emerald-500/50 transition-colors`}
                  placeholder="Enter your email"
                />
                {emailError && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">{emailError}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-bold text-slate-300 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-4 text-sm font-bold text-white shadow-xl shadow-emerald-950/40 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Application Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-xl">
          <div className="w-full max-w-md rounded-[2.5rem] border border-rose-500/20 bg-[#071412]/95 p-8 shadow-2xl animate-[modalIn_0.3s_ease-out]">
            <div className="flex items-center gap-4 mb-6">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/10 text-rose-500">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-2xl font-black text-white">Reset MediTrack?</h2>
            </div>

            <p className="text-sm font-bold text-rose-400/90 mb-6 uppercase tracking-wider">
              This action cannot be undone.
            </p>

            <div className="space-y-3 mb-8">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Items to delete:</p>
              <ul className="space-y-2">
                {['All medicines', 'Medication history', 'Reports & analytics', 'Profile information', 'Notification preferences'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-medium text-slate-300">
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setIsResetModalOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-bold text-slate-300 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleResetApplication}
                className="rounded-2xl bg-rose-500 py-4 text-sm font-bold text-white shadow-xl shadow-rose-950/40 hover:bg-rose-600 active:scale-95 transition-all"
              >
                Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Toast */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-[toastIn_0.3s_ease-out_forwards]">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-[#071412]/95 px-5 py-3 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <p className="text-xs font-bold text-emerald-50 tracking-wide">{toast}</p>
          </div>
        </div>
      )}
    </div>
  );
};

/* Helper Components */

const ToggleItem = ({ icon, label, description, enabled, onClick }) => (
  <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-black/25 border border-white/5 transition hover:bg-black/40">
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-lg ${enabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-white/5'}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-[11px] text-slate-500 font-medium">{description}</p>
      </div>
    </div>
    <button
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${enabled ? 'bg-emerald-500' : 'bg-white/10'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  </div>
);

const ActionButton = ({ icon, label, description, variant, onClick }) => {
  const styles = {
    default: "hover:bg-white/5 hover:border-white/20 text-slate-300",
    warning: "hover:bg-amber-500/5 hover:border-amber-500/20 text-amber-200/70",
    danger: "hover:bg-rose-500/5 hover:border-rose-500/20 text-rose-300/70"
  };

  return (
    <button onClick={onClick} className={`flex items-center justify-between w-full p-4 rounded-2xl bg-black/25 border border-white/5 transition text-left group ${styles[variant]}`}>
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold text-white group-hover:text-white transition-colors">{label}</p>
          <p className="text-[11px] text-slate-500 font-medium">{description}</p>
        </div>
      </div>
    </button>
  );
};

export default Settings;
