// src/hooks/useContacts.ts
// Hook central Kleios — CRUD contacts + sync offline-first Supabase
// Architecture identique à useClients.tsx de Ploutos :
//   1. localStorage en premier (affichage immédiat)
//   2. Supabase en arrière-plan (multi-appareils)
//   3. Merge par updated_at (le plus récent gagne)
//   4. Mode offline : pendingRef stocke les IDs modifiés
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { BRAND } from "../constants";
import { EMPTY_CONTACT_PAYLOAD } from "../constants";
import type { ContactRecord, ContactPayload } from "../types/crm";

// ── Types internes ────────────────────────────────────────────────────────────

export type SyncStatus = "synced" | "pending" | "offline" | "syncing";

interface UseContactsReturn {
  contacts: ContactRecord[];
  syncStatus: SyncStatus;
  loading: boolean;
  // CRUD
  createContact: (displayName: string, status?: string) => ContactRecord;
  saveContact: (record: ContactRecord) => void;
  deleteContact: (id: string) => void;
  duplicateContact: (id: string) => ContactRecord | null;
  // Sync manuel (clic sur l'indicateur)
  syncNow: () => Promise<void>;
}

// ── Helpers localStorage ──────────────────────────────────────────────────────

function getStorageKey(userId: string): string {
  return `${BRAND.storagePrefix}contacts_${userId}`;
}

function loadFromStorage(userId: string): ContactRecord[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    return JSON.parse(raw) as ContactRecord[];
  } catch { return []; }
}

function saveToStorage(userId: string, contacts: ContactRecord[]): void {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(contacts));
  } catch { /* ignore — quota dépassé */ }
}

// ── Merge intelligent ─────────────────────────────────────────────────────────
// Fusionne les contacts locaux et distants.
// Le contact avec l'updated_at le plus récent gagne.

function mergeContacts(
  local: ContactRecord[],
  remote: ContactRecord[]
): ContactRecord[] {
  const map = new Map<string, ContactRecord>();

  // On commence par les locaux
  local.forEach(c => map.set(c.id, c));

  // Les distants écrasent si plus récents
  remote.forEach(r => {
    const existing = map.get(r.id);
    if (!existing) {
      map.set(r.id, r);
    } else {
      const localDate = new Date(existing.updatedAt).getTime();
      const remoteDate = new Date(r.updatedAt).getTime();
      if (remoteDate > localDate) map.set(r.id, r);
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

// ── Hook principal ────────────────────────────────────────────────────────────

export function useContacts(userId: string | null): UseContactsReturn {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("offline");
  const [loading, setLoading] = useState(true);

  // IDs des contacts modifiés hors-ligne — à pousser au retour en ligne
  const pendingRef = useRef<Set<string>>(new Set());
  // IDs des contacts supprimés hors-ligne
  const deletedRef = useRef<Set<string>>(new Set());

  // ── Chargement initial ──
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setSyncStatus("offline");
      return;
    }

    // 1. Charger localStorage immédiatement
    const local = loadFromStorage(userId);
    setContacts(local);
    setLoading(false);

    // 2. Fetch Supabase en arrière-plan
    fetchFromSupabase(userId, local);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Fetch depuis Supabase ──
  const fetchFromSupabase = useCallback(async (
    uid: string,
    currentLocal: ContactRecord[]
  ) => {
    if (!uid) return;
    setSyncStatus("syncing");

    try {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("id, user_id, display_name, status, ploutos_client_id, payload, created_at, updated_at, synced_at")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Convertir les données Supabase en ContactRecord
      const remote: ContactRecord[] = (data ?? []).map(row => ({
        id: row.id,
        userId: row.user_id,
        displayName: row.display_name,
        status: row.status,
        ploutosClientId: row.ploutos_client_id,
        payload: row.payload as ContactPayload,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        syncedAt: row.synced_at,
      }));

      // Merger local + remote
      setContacts(prev => {
        const merged = mergeContacts(prev, remote);
        saveToStorage(uid, merged);
        return merged;
      });

      // Pousser les pending hors-ligne
      if (pendingRef.current.size > 0 || deletedRef.current.size > 0) {
        await flushPending(uid);
      }

      setSyncStatus("synced");
    } catch {
      // Hors-ligne — on garde le localStorage
      setSyncStatus(currentLocal.length > 0 ? "offline" : "offline");
    }
  }, []);

  // ── Pousser les modifications pending vers Supabase ──
  const flushPending = useCallback(async (uid: string) => {
    if (!uid) return;

    // Récupérer l'état actuel depuis le localStorage (source de vérité locale)
    const current = loadFromStorage(uid);

    // Upsert les contacts modifiés
    const toUpsert = current.filter(c => pendingRef.current.has(c.id));
    if (toUpsert.length > 0) {
      const rows = toUpsert.map(c => ({
        id: c.id,
        user_id: uid,
        display_name: c.displayName,
        status: c.status,
        ploutos_client_id: c.ploutosClientId,
        payload: c.payload,
        updated_at: c.updatedAt,
        synced_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("crm_contacts")
        .upsert(rows, { onConflict: "id" });

      if (!error) pendingRef.current.clear();
    }

    // Supprimer les contacts effacés
    const toDelete = Array.from(deletedRef.current);
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from("crm_contacts")
        .delete()
        .in("id", toDelete)
        .eq("user_id", uid);

      if (!error) deletedRef.current.clear();
    }
  }, []);

  // ── Sync manuel (clic indicateur) ──
  const syncNow = useCallback(async () => {
    if (!userId) return;
    const local = loadFromStorage(userId);
    await fetchFromSupabase(userId, local);
  }, [userId, fetchFromSupabase]);

  // ── Sync vers Supabase (un seul contact) ──
  const syncOne = useCallback(async (record: ContactRecord) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("crm_contacts")
        .upsert({
          id: record.id,
          user_id: userId,
          display_name: record.displayName,
          status: record.status,
          ploutos_client_id: record.ploutosClientId,
          payload: record.payload,
          updated_at: record.updatedAt,
          synced_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (error) {
        // Échec → marquer comme pending
        pendingRef.current.add(record.id);
        setSyncStatus("pending");
      } else {
        pendingRef.current.delete(record.id);
        setSyncStatus("synced");
      }
    } catch {
      pendingRef.current.add(record.id);
      setSyncStatus("pending");
    }
  }, [userId]);

  // ── UUID simple ──
  const genId = () => crypto.randomUUID();

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  // Créer un nouveau contact
  const createContact = useCallback((
    displayName: string,
    status = "prospect"
  ): ContactRecord => {
    const now = new Date().toISOString();
    const id = genId();

    const newRecord: ContactRecord = {
      id,
      userId: userId ?? "",
      displayName,
      status: status as ContactRecord["status"],
      ploutosClientId: null,
      payload: {
        ...EMPTY_CONTACT_PAYLOAD,
contact: ({
          id,
          userId: userId ?? "",
          formeJuridique: "",
          nom: displayName,
          enseigne: "",
          siret: "",
          codeApe: "",
          codeIdcc: "",
          numeroTva: "",
          address1: "",
          address2: "",
          postalCode: "",
          city: "",
          email: "",
          telFixe: "",
          telMobile: "",
          website: "",
          nbSalaries: "",
          activite: "",
          conventionCollective: "",
          opco: "",
          caisseRetraite: "",
          organismePrevoyanc: "",
          nonAssujeti: false,
          status: status as any,
          campus: "",
          notes: "",
          scoreRelation: 0,
          prochainerelance: "",
          createdAt: now,
          updatedAt: now,
          syncedAt: null,
        } as any) as any,
        contacts: [],
        alternants: [],
        postes: [],
        echanges: [],
      },
      createdAt: now,
      updatedAt: now,
      syncedAt: null,
    };

    setContacts(prev => {
      const updated = [newRecord, ...prev];
      saveToStorage(userId ?? "", updated);
      return updated;
    });

    setSyncStatus("pending");
    syncOne(newRecord);

    return newRecord;
  }, [userId, syncOne]);

  // Sauvegarder un contact modifié
  const saveContact = useCallback((record: ContactRecord) => {
    const now = new Date().toISOString();
    const updated = { ...record, updatedAt: now };

    setContacts(prev => {
      const exists = prev.some(c => c.id === record.id);
      const next = exists
        ? prev.map(c => c.id === record.id ? updated : c)
        : [updated, ...prev];  // upsert — ajouter si nouveau
      saveToStorage(userId ?? "", next);
      return next;
    });

    setSyncStatus("pending");
    syncOne(updated);
  }, [userId, syncOne]);

  // Supprimer un contact
  const deleteContact = useCallback((id: string) => {
    setContacts(prev => {
      const next = prev.filter(c => c.id !== id);
      saveToStorage(userId ?? "", next);
      return next;
    });

    // Marquer pour suppression Supabase
    deletedRef.current.add(id);
    pendingRef.current.delete(id);
    setSyncStatus("pending");

    // Tenter la suppression immédiate
    if (userId) {
      supabase
        .from("crm_contacts")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
        .then(({ error }) => {
          if (!error) {
            deletedRef.current.delete(id);
            if (pendingRef.current.size === 0 && deletedRef.current.size === 0) {
              setSyncStatus("synced");
            }
          }
        });
    }
  }, [userId]);

  // Dupliquer un contact
  const duplicateContact = useCallback((id: string): ContactRecord | null => {
    const original = contacts.find(c => c.id === id);
    if (!original) return null;

    const now = new Date().toISOString();
    const newId = genId();

    const duplicate: ContactRecord = {
      ...original,
      id: newId,
      displayName: `${original.displayName} (copie)`,
      payload: {
        ...original.payload,
        contact: {
          ...original.payload.contact,
          id: newId,
          createdAt: now,
          updatedAt: now,
        },
      },
      createdAt: now,
      updatedAt: now,
      syncedAt: null,
    };

    setContacts(prev => {
      const updated = [duplicate, ...prev];
      saveToStorage(userId ?? "", updated);
      return updated;
    });

    setSyncStatus("pending");
    syncOne(duplicate);

    return duplicate;
  }, [contacts, userId, syncOne]);

  return {
    contacts,
    syncStatus,
    loading,
    createContact,
    saveContact,
    deleteContact,
    duplicateContact,
    syncNow,
  };
}
