import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

// CORRECTION 1 — majuscule K → minuscule k pour cohérence avec les autres clés
const LAST_VERIFIED_KEY = "kleios_last_verified";
const GRACE_PERIOD_MS = 72 * 60 * 60 * 1000; // 72 heures

export type AuthState =
  | "loading"
  | "unauthenticated"
  | "authenticated"
  | "grace"
  | "expired";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [error, setError] = useState<string>("");
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const initializedRef = useRef(false);

  const checkGracePeriod = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem(LAST_VERIFIED_KEY);
      if (!raw) return false;
      return Date.now() - parseInt(raw, 10) < GRACE_PERIOD_MS;
    } catch { return false; }
  }, []);

  const markVerified = useCallback(() => {
    localStorage.setItem(LAST_VERIFIED_KEY, Date.now().toString());
  }, []);

  const purgeSupabaseTokens = useCallback(() => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-") || k.includes("supabase"))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
  }, []);

  const verifySession = useCallback(async (currentSession: Session | null) => {
    if (!currentSession) {
      setUser(null);
      setAuthState("unauthenticated");
      return;
    }

    try {
      const { data: refreshData, error: refreshError } = await Promise.race([
        supabase.auth.refreshSession(),
        new Promise<{ data: { session: null; user: null }; error: { message: string } }>(
          (_, reject) => setTimeout(() => reject(new Error("timeout")), 6000)
        )
      ]).catch(() => ({ data: { session: null, user: null }, error: { message: "timeout" } })) as any;

      if (!refreshError && refreshData?.user) {
        const isActive = refreshData.user.user_metadata?.active !== false;
        if (!isActive) {
          setUser(null);
          setAuthState("expired");
          return;
        }
        markVerified();
        setSession(refreshData.session);
        setUser(refreshData.user);
        setAuthState("authenticated");
        return;
      }

      const isNetworkError = refreshError?.message === "timeout" ||
        refreshError?.message?.toLowerCase().includes("network") ||
        refreshError?.message?.toLowerCase().includes("fetch");

      if (isNetworkError) {
        setUser(null);
        setAuthState(checkGracePeriod() ? "grace" : "expired");
        return;
      }

      const isInvalidToken =
        refreshError?.message?.includes("Invalid Refresh Token") ||
        refreshError?.message?.includes("Refresh Token Not Found") ||
        (refreshError as any)?.status === 400 || (refreshError as any)?.status === 401;

      if (isInvalidToken) {
        purgeSupabaseTokens();
        await supabase.auth.signOut({ scope: "local" });
        localStorage.removeItem(LAST_VERIFIED_KEY);
        setUser(null);
        setSession(null);
        setAuthState("unauthenticated");
        return;
      }

      setUser(null);
      setAuthState(checkGracePeriod() ? "grace" : "expired");
    } catch {
      setAuthState(checkGracePeriod() ? "grace" : "expired");
    }
  }, [checkGracePeriod, markVerified, purgeSupabaseTokens]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      initializedRef.current = true;
      verifySession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
        return;
      }
      if (event === "TOKEN_REFRESHED" && session) {
        setSession(session);
        setUser(session.user);
        setAuthState("authenticated");
        return;
      }
      if (event === "SIGNED_OUT") {
        setUser(null);
        setSession(null);
        setAuthState("unauthenticated");
        return;
      }
      setSession(session);
      verifySession(session);
    });

    return () => subscription.unsubscribe();
  }, [verifySession]);

  const signUp = useCallback(async (email: string, password: string, cabinetName: string, extraMeta?: Record<string, string>) => {
    setError("");
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { cabinet_name: cabinetName, active: true, ...(extraMeta ?? {}) } },
    });
    if (error) { setError(error.message); return false; }
    return true;
  }, []);

  // CORRECTION 2 — from("licences") → from("kleios_licences")
  const grantLifetimeLicence = useCallback(async (targetUserId: string) => {
    const { error } = await supabase.from("kleios_licences").upsert({
      user_id: targetUserId,
      type: "lifetime",
      status: "active",
      trial_end: null,
    });
    return !error;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message === "Invalid login credentials"
        ? "Email ou mot de passe incorrect." : error.message);
      return false;
    }
    return true;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(LAST_VERIFIED_KEY);
    setUser(null);
    setSession(null);
    setAuthState("unauthenticated");
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) { setError(error.message); return false; }
    return true;
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    setError("");
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        setError("Session expirée. Recommencez la procédure de réinitialisation.");
        return false;
      }
      const updatePromise = supabase.auth.updateUser({ password: newPassword });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 10000)
      );
      const { error } = await Promise.race([updatePromise, timeoutPromise]) as any;
      if (error) { setError(error.message === "timeout" ? "Délai dépassé. Réessayez." : error.message); return false; }
      setIsPasswordRecovery(false);
      return true;
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
      return false;
    }
  }, []);

  const clearPasswordRecovery = useCallback(() => setIsPasswordRecovery(false), []);

  return { user, session, authState, error, signUp, signIn, signOut, resetPassword, updatePassword, grantLifetimeLicence, isPasswordRecovery, clearPasswordRecovery };
}
