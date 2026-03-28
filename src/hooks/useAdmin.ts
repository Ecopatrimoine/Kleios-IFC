// src/hooks/useAdmin.ts
// Hook admin Kleios — gestion licences + comptes
// Architecture extensible : chaque action est une fonction isolée
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useAdmin(userEmail: string | null | undefined) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) { setLoading(false); return; }
    supabase.from("admins").select("email").eq("email", userEmail).single()
      .then(({ data }) => { setIsAdmin(!!data); setLoading(false); });
  }, [userEmail]);

  return { isAdmin, loading };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  school: string;
  created_at: string;
  licence: {
    type: "trial" | "paid" | "lifetime" | null;
    status: "active" | "expired" | "cancelled" | "cancelling" | "none";
    trial_end: string | null;
    stripe_sub: string | null;
    cancel_at: string | null;
  } | null;
  // Détails Stripe chargés en arrière-plan
  subDetails?: {
    interval: "month" | "year";
    current_period_end: string;
    cancel_at_period_end: boolean;
  };
}

// ── Dashboard hook ────────────────────────────────────────────────────────────

export function useAdminDashboard(isAdmin: boolean) {
  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    try {
      // 1. Licences Kleios
      const { data: licences, error: lErr } = await supabase
        .from("kleios_licences")
        .select("user_id, type, status, trial_end, stripe_sub, cancel_at");
      if (lErr) throw lErr;

      const licenceMap = new Map(licences?.map(l => [l.user_id, l]) ?? []);

      // 2. Infos cabinets via vue partagée users_info
      const { data: usersInfo } = await supabase
        .from("users_info")
        .select("user_id, email, first_name, last_name, school, created_at");

      const userMap = new Map<string, {
        name: string; email: string; first_name: string; last_name: string; school: string; created_at: string;
      }>();
      usersInfo?.forEach(u => {
        userMap.set(u.user_id, {
          name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || u.user_id.slice(0, 12) + "...",
          email: u.email || "",
          first_name: u.first_name || "",
          last_name: u.last_name || "",
          school: u.school || "",
          created_at: u.created_at || "",
        });
      });

      // 3. Construire la liste
      const result: AdminUser[] = [];
      licenceMap.forEach((lic, userId) => {
        const info = userMap.get(userId);
        result.push({
          id: userId,
          email: info?.email || "",
          first_name: info?.first_name || "",
          last_name: info?.last_name || "",
          school: info?.school || "",
          created_at: info?.created_at || "",
          licence: { ...lic, cancel_at: lic.cancel_at ?? null },
        });
      });

      // Trier par date de création décroissante
      result.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setUsers(result);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    }
    setLoading(false);
  }, [isAdmin]);

  // ── Actions licence ───────────────────────────────────────────────────────

  const setLifetime = useCallback(async (userId: string) => {
    const { error } = await supabase.from("kleios_licences").upsert({
      user_id: userId, type: "lifetime", status: "active", trial_end: null,
    });
    if (!error) await fetchUsers();
    return !error;
  }, [fetchUsers]);

  const revokeLicence = useCallback(async (userId: string) => {
    const { error } = await supabase.from("kleios_licences")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (!error) await fetchUsers();
    return !error;
  }, [fetchUsers]);

  const extendTrial = useCallback(async (userId: string, days: number) => {
    const newEnd = new Date(Date.now() + days * 86400000).toISOString();
    const { error } = await supabase.from("kleios_licences")
      .update({ type: "trial", status: "active", trial_end: newEnd })
      .eq("user_id", userId);
    if (!error) await fetchUsers();
    return !error;
  }, [fetchUsers]);

  // ── Actions compte ────────────────────────────────────────────────────────


  // ── Créer un compte utilisateur (via Edge Function service_role) ──────────
  const createUser = useCallback(async (params: {
    email: string;
    first_name: string;
    last_name: string;
    school: string;
    licence_type: "trial" | "lifetime" | "admin";
  }) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        }
      );
      const data = await res.json();
      if (data.error) return { success: false, message: data.error };
      await fetchUsers();
      return { success: true, message: "Compte créé — email d'invitation envoyé" };
    } catch (e: any) {
      return { success: false, message: e.message || "Erreur" };
    }
  }, [fetchUsers]);

  const resetUserPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return !error;
  }, []);

  // Suppression complète d'un compte Kleios
  // Supprime : kleios_licences + crm_contacts + crm_documents
  // Note : auth.users ne peut être supprimé que via service_role (admin API)
  // → on révoque la licence et archive les données, la vraie suppression
  //   auth doit se faire depuis le dashboard Supabase manuellement
  const deleteAccount = useCallback(async (userId: string) => {
    try {
      // 1. Supprimer les documents GED
      await supabase.from("crm_documents")
        .delete().eq("user_id", userId);

      // 2. Supprimer les contacts CRM
      await supabase.from("crm_contacts")
        .delete().eq("user_id", userId);

      // 3. Supprimer la licence Kleios
      await supabase.from("kleios_licences")
        .delete().eq("user_id", userId);

      // 4. Supprimer les paramètres cabinet (si ligne Kleios séparée)
      // Note : cabinet_settings est partagé avec Ploutos — on ne supprime pas

      await fetchUsers();
      return { success: true, message: "Données Kleios supprimées. Supprimez le compte auth depuis Supabase Dashboard si nécessaire." };
    } catch (e: any) {
      return { success: false, message: e.message || "Erreur lors de la suppression" };
    }
  }, [fetchUsers]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return {
    users, loading, error,
    fetchUsers,
    setLifetime, revokeLicence, extendTrial,
    resetUserPassword, deleteAccount, createUser,
  };
}
