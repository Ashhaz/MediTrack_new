import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { initOneSignal } from "../lib/onesignal";
import OneSignal from 'react-onesignal';

const AuthContext = createContext(null);

/**
 * AuthProvider wraps the entire app and:
 * 1. Checks for an existing Supabase session on startup (handles page refresh,
 *    PWA reopen, and browser restart).
 * 2. Listens to onAuthStateChange so the session state stays in sync with
 *    Supabase (handles login, logout, and token refresh).
 * 3. Exposes { session, user, loading } to the rest of the app via useAuth().
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ── Step 1: Restore any existing session immediately on mount ──────────
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const syncOneSignalUser = async (user) => {
      if (!user) {
        try {
          await OneSignal.logout();
          console.log("[MediTrack] OneSignal logged out");
        } catch (err) {
          console.error("[MediTrack] OneSignal logout error:", err);
        }
        return;
      }

      try {
        // 1. Ensure OneSignal finishes initialization
        await initOneSignal();
        console.log("[MediTrack] OneSignal initialized");

        // 2. Check native notification permission
        const permission = Notification.permission;
        console.log("[MediTrack] Notification permission:", permission);

        // 3. If already granted but not opted in, opt in to create subscription
        if (permission === 'granted' && !OneSignal.User.PushSubscription.optedIn) {
          console.log("[MediTrack] Opting into push subscription...");
          await OneSignal.User.PushSubscription.optIn();
          console.log("[MediTrack] Push subscription created");
        }

        // 4. Check for subscription ID
        const pushId = OneSignal.User.PushSubscription.id;
        console.log("[MediTrack] Push subscription ID:", pushId);

        if (!pushId) {
          console.log("[MediTrack] No push subscription ID, skipping login()");
          return;
        }

        // 5. Login
        await OneSignal.login(user.id);
        console.log("[MediTrack] Login successful");
        console.log("[MediTrack] OneSignal User ID:", OneSignal.User.onesignalId);

      } catch (err) {
        console.error("[MediTrack] Error syncing OneSignal:", err);
      }
    };

    // ── Step 2: Keep session state in sync with Supabase ──────────────────
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      await syncOneSignalUser(session?.user);
    });

    // Cleanup subscription when the provider unmounts
    return () => subscription.unsubscribe();
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Convenience hook — use inside any component that needs auth state. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
