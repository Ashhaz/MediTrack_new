import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { requestNotificationPermission } from '../utils/serviceWorkerNotifications';

function NotificationPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(
    () => localStorage.getItem('meditrack.notificationPromptDismissed') === 'true'
  );

  useEffect(() => {
    // Only show if the browser supports notifications, the permission is 'default' (not yet asked),
    // and the user hasn't explicitly dismissed the prompt.
    if ('Notification' in window && Notification.permission === 'default' && !isDismissed) {
      setIsVisible(true);
    }
  }, [isDismissed]);

  const handleEnable = async () => {
    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      setIsVisible(false);
      // Update local storage so we know they enabled it, and they will receive notifications 
      // if doseReminders is enabled in settings (which defaults to true).
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('meditrack.notificationPromptDismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="relative mb-6 overflow-hidden rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-6 shadow-lg shadow-emerald-950/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-[fadeUp_0.4s_ease-out]">
      <div className="flex items-center gap-4 text-center sm:text-left">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-300">
          <Bell size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Enable Notifications</h3>
          <p className="text-sm text-emerald-100/80 mt-1 max-w-md">
            Never miss a dose. Allow MediTrack to send you timely reminders for your scheduled medications.
          </p>
        </div>
      </div>
      
      <div className="flex shrink-0 items-center gap-3 w-full sm:w-auto">
        <button
          onClick={handleDismiss}
          className="flex-1 sm:flex-none rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
        >
          Not Now
        </button>
        <button
          onClick={handleEnable}
          className="flex-1 sm:flex-none rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-950/30 transition hover:from-emerald-400 hover:to-teal-400"
        >
          Enable
        </button>
      </div>
      
      <button 
        onClick={handleDismiss}
        className="absolute top-4 right-4 sm:hidden text-emerald-300/50 hover:text-emerald-300"
      >
        <X size={20} />
      </button>
    </div>
  );
}

export default NotificationPrompt;
