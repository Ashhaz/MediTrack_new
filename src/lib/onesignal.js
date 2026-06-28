import OneSignal from 'react-onesignal';

let isInitialized = false;

export const initOneSignal = async () => {
  if (isInitialized) return;

  try {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    
    if (!appId) {
      console.warn("[MediTrack Notifications] VITE_ONESIGNAL_APP_ID is not defined.");
      return;
    }

    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: {
        enable: false, // We use custom UI (Settings and Dashboard banner)
      },
      // Using our shared worker file
      serviceWorkerParam: { scope: import.meta.env.BASE_URL },
      serviceWorkerPath: "OneSignalSDKWorker.js"
    });
    
    isInitialized = true;
    console.log("[MediTrack Notifications] OneSignal initialized successfully.");
  } catch (error) {
    console.error("[MediTrack Notifications] OneSignal init error:", error);
  }
};
