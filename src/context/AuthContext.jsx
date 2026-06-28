import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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
    // This covers: page refresh, PWA reopen, browser restart.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // ── Step 2: Keep session state in sync with Supabase ──────────────────
    // This covers: sign-in, sign-out, token refresh, OAuth callbacks.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Once onAuthStateChange fires for the first time, loading is already
      // false (set above), so no need to touch it here.
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
