// src/hooks/useLicense.ts
// ──────────────────────────────────────────────────────────────────────────────
// Hook de vérification de licence Kleios
// Types : trial (15j) | paid (Stripe) | lifetime (gratuit)
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

export type LicenceType   = "trial" | "paid" | "lifetime";
export type LicenceStatus = "active" | "expired" | "cancelled" | "cancelling" | "none";

export interface LicenceInfo {
  type:       LicenceType | null;
  status:     LicenceStatus;
  trialEnd:   Date | null;
  trialDaysLeft: number;
  isValid:    boolean;
  loading:    boolean;
}

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Clé scopée au userId — chaque utilisateur a son propre cache
// Évite les conflits quand on teste avec plusieurs comptes dans le même navigateur
function cacheKey(userId: string) { return `kleios_licence_cache_${userId}`; }

function getCachedLicence(userId: string): LicenceInfo | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function setCachedLicence(userId: string, data: LicenceInfo) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify({ data, ts: Date.now() }));
  } catch { /* ignore */ }
}

function clearLicenceCache(userId: string) {
  try { localStorage.removeItem(cacheKey(userId)); } catch { /* ignore */ }
}

export function useLicense(userId: string | null) {
  const [licence, setLicence] = useState<LicenceInfo>({
    type: null, status: "none", trialEnd: null,
    trialDaysLeft: 0, isValid: false, loading: true,
  });

  const fetchLicence = useCallback(async (force = false) => {
    if (!userId) {
      setLicence(prev => ({ ...prev, loading: false, isValid: false }));
      return;
    }

    if (!force) {
      const cached = getCachedLicence(userId);
      if (cached) { setLicence(cached); return; }
    }

    try {
      const { data, error } = await supabase
        .from("kleios_licences")
        .select("type, status, trial_end")
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        await supabase.from("kleios_licences").upsert({
          user_id: userId,
          type: "trial",
          status: "active",
          trial_end: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
        });
        return fetchLicence(true);
      }

      const trialEnd   = data.trial_end ? new Date(data.trial_end) : null;
      const now        = new Date();
      const msLeft     = trialEnd ? trialEnd.getTime() - now.getTime() : 0;
      const daysLeft   = trialEnd ? Math.max(0, Math.ceil(msLeft / 86400000)) : 0;

      let effectiveStatus: LicenceStatus = data.status as LicenceStatus;
      if (data.type === "trial" && trialEnd && now > trialEnd) {
        effectiveStatus = "expired";
      }

      const info: LicenceInfo = {
        type:          data.type as LicenceType,
        status:        effectiveStatus,
        trialEnd,
        trialDaysLeft: data.type === "trial" ? daysLeft : 0,
        isValid:       effectiveStatus === "active",
        loading:       false,
      };

      setCachedLicence(userId, info);
      setLicence(info);

    } catch {
      const raw = localStorage.getItem(cacheKey(userId));
      if (raw) {
        try {
          const { data } = JSON.parse(raw);
          setLicence({ ...data, loading: false });
          return;
        } catch { /* ignore */ }
      }
      setLicence(prev => ({ ...prev, loading: false }));
    }
  }, [userId]);

  // Quand userId change (null → uuid au login), on remet loading:true
  // immédiatement pour éviter le flash LicenceGate pendant le fetch Supabase
  useEffect(() => {
    if (!userId) return;
    setLicence(prev => ({ ...prev, loading: true }));
    clearLicenceCache(userId);
    fetchLicence(true);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Premier mount si userId déjà disponible (reload page)
  useEffect(() => {
    if (userId) return; // géré par l'effect userId
    fetchLicence(true);
  }, [fetchLicence]);

  return { licence, refreshLicence: () => fetchLicence(true) };
}
