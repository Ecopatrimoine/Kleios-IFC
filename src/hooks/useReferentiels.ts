// src/hooks/useReferentiels.ts
// Hook pour charger campus et formations depuis Supabase
// Avec cache localStorage pour fonctionnement offline
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export interface Campus {
  id: string;
  nom: string;
  ville: string;
  region: string;
  actif: boolean;
  ordre: number;
}

export interface Formation {
  id: string;
  code: string;
  label: string;
  niveau: string;
  duree: number;
  actif: boolean;
  ordre: number;
}

const CACHE_KEY_CAMPUS    = "kleios_ifc_campus_ref";
const CACHE_KEY_FORMATIONS = "kleios_ifc_formations_ref";

function fromCache<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); }
  catch { return []; }
}
function toCache<T>(key: string, data: T[]) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /**/ }
}

export function useReferentiels() {
  const [campus, setCampus]       = useState<Campus[]>(fromCache(CACHE_KEY_CAMPUS));
  const [formations, setFormations] = useState<Formation[]>(fromCache(CACHE_KEY_FORMATIONS));
  const [loading, setLoading]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: c }, { data: f }] = await Promise.all([
        supabase.from("ifc_campus").select("*").eq("actif", true).order("ordre"),
        supabase.from("ifc_formations").select("*").eq("actif", true).order("ordre"),
      ]);
      if (c) { setCampus(c); toCache(CACHE_KEY_CAMPUS, c); }
      if (f) { setFormations(f); toCache(CACHE_KEY_FORMATIONS, f); }
    } catch { /* hors-ligne — cache utilisé */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // CRUD Campus
  const saveCampus = useCallback(async (item: Partial<Campus>) => {
    if (item.id) {
      const { data } = await supabase.from("ifc_campus")
        .update({ ...item, updated_at: new Date().toISOString() })
        .eq("id", item.id).select().single();
      if (data) setCampus(prev => prev.map(c => c.id === data.id ? data : c));
    } else {
      const { data } = await supabase.from("ifc_campus")
        .insert({ ...item, actif: true }).select().single();
      if (data) setCampus(prev => [...prev, data].sort((a,b) => a.ordre - b.ordre));
    }
    toCache(CACHE_KEY_CAMPUS, campus);
  }, [campus]);

  const deleteCampus = useCallback(async (id: string) => {
    // Soft delete — on désactive
    await supabase.from("ifc_campus").update({ actif: false }).eq("id", id);
    setCampus(prev => prev.filter(c => c.id !== id));
  }, []);

  // CRUD Formations
  const saveFormation = useCallback(async (item: Partial<Formation>) => {
    if (item.id) {
      const { data } = await supabase.from("ifc_formations")
        .update({ ...item, updated_at: new Date().toISOString() })
        .eq("id", item.id).select().single();
      if (data) setFormations(prev => prev.map(f => f.id === data.id ? data : f));
    } else {
      const { data } = await supabase.from("ifc_formations")
        .insert({ ...item, actif: true }).select().single();
      if (data) setFormations(prev => [...prev, data].sort((a,b) => a.ordre - b.ordre));
    }
    toCache(CACHE_KEY_FORMATIONS, formations);
  }, [formations]);

  const deleteFormation = useCallback(async (id: string) => {
    await supabase.from("ifc_formations").update({ actif: false }).eq("id", id);
    setFormations(prev => prev.filter(f => f.id !== id));
  }, []);

  return {
    campus, formations, loading, reload: load,
    saveCampus, deleteCampus,
    saveFormation, deleteFormation,
  };
}
