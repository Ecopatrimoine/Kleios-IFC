// src/hooks/useCalSync.ts
// Synchronisation Cal.com → Kleios + cache des créneaux occupés
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { BRAND, CAL_CANCELLATION_FOLLOWUP_HOURS } from "../constants";
import type { ContactRecord, CommercialEvent, CalBookingUnlinked, CabinetSettings } from "../types/crm";

// ── Types exportés ────────────────────────────────────────────────────────────

interface CalBookingResponse {
  id: number;
  uid: string;
  title: string;
  startTime: string;
  endTime: string;
  status: "accepted" | "cancelled" | "pending" | "rejected";
  eventType: { slug: string; title: string; length: number } | null;
  attendees: Array<{ email: string; name: string }>;
  location?: string;
}

export interface BusySlot {
  start: string;
  end: string;
  source: "cal" | "kleios";
  title?: string;
}

export interface CalSlotsCache {
  weekKey: string;
  busySlots: BusySlot[];
  cachedAt: string;
  calOnline: boolean;
}

interface UseCalSyncReturn {
  orphanBookings: CalBookingUnlinked[];
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  calOnline: boolean;
  getBusySlotsForWeek: (weekKey: string) => CalSlotsCache | null;
  linkBooking: (calBookingId: string, contactId: string) => void;
  dismissBooking: (calBookingId: string) => void;
  syncNow: () => Promise<void>;
}

// ── Helpers date ──────────────────────────────────────────────────────────────

// ISO local sans conversion UTC — identique à TabSuivi
function toLocalISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Helpers localStorage ──────────────────────────────────────────────────────

const getOrphanKey = (uid: string) => `${BRAND.storagePrefix}cal_orphans_${uid}`;
const getCalConnectedKey = (uid: string) => `${BRAND.storagePrefix}cal_connected_${uid}`;
const getSyncedIdsKey = (uid: string) => `${BRAND.storagePrefix}cal_synced_ids_${uid}`;
const getSlotsCacheKey = (uid: string, wk: string) => `${BRAND.storagePrefix}cal_slots_${uid}_${wk}`;

function loadOrphans(uid: string): CalBookingUnlinked[] {
  try { return JSON.parse(localStorage.getItem(getOrphanKey(uid)) ?? "[]"); } catch { return []; }
}
function saveOrphans(uid: string, v: CalBookingUnlinked[]) {
  try { localStorage.setItem(getOrphanKey(uid), JSON.stringify(v)); } catch {}
}
function loadSyncedIds(uid: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(getSyncedIdsKey(uid)) ?? "[]")); } catch { return new Set(); }
}
function saveSyncedIds(uid: string, ids: Set<string>) {
  try { localStorage.setItem(getSyncedIdsKey(uid), JSON.stringify(Array.from(ids).slice(-500))); } catch {}
}
function saveSlotsCache(uid: string, cache: CalSlotsCache) {
  try { localStorage.setItem(getSlotsCacheKey(uid, cache.weekKey), JSON.stringify(cache)); } catch {}
}
function loadSlotsCache(uid: string, wk: string): CalSlotsCache | null {
  try { return JSON.parse(localStorage.getItem(getSlotsCacheKey(uid, wk)) ?? "null"); } catch { return null; }
}

// ── API Cal.com ───────────────────────────────────────────────────────────────

async function fetchCalBookings(apiKey: string): Promise<CalBookingResponse[]> {
  const afterDate = new Date(Date.now() - 30 * 86400000).toISOString();
  const res = await fetch(
    `https://api.cal.com/v2/bookings?afterStart=${encodeURIComponent(afterDate)}&take=100`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "cal-api-version": "2024-08-13",
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message ?? `Cal.com API error ${res.status}`);
  }
  const data = await res.json();
  return (data?.data ?? []) as CalBookingResponse[];
}

// ── Convertisseurs ────────────────────────────────────────────────────────────

function calBookingToEvent(
  booking: CalBookingResponse,
  contactId: string,
  userId: string,
  initiatedBy: "conseiller" | "client"
): CommercialEvent {
  const now = new Date().toISOString();
  const duration = Math.round(
    (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000
  );
  return {
    id: crypto.randomUUID(),
    contactId, userId,
    type: "rdv",
    status: booking.status === "cancelled" ? "annule" : "planifie",
    title: booking.title || booking.eventType?.title || "RDV Cal.com",
    date: booking.startTime,
    duration: duration > 0 ? duration : (booking.eventType?.length ?? 60),
    channel: null, location: null,
    locationAddress: booking.location ?? "",
    source: initiatedBy === "client" ? "cal_client" : "cal_conseiller",
    initiatedBy,
    calBookingId: booking.uid,
    calEventTypeSlug: booking.eventType?.slug ?? "",
    calLinked: true,
    body: "", needsFollowUp: false, followUpDate: "", followUpNote: "",
    contractIds: [], rdvLink: "",
    createdAt: now, updatedAt: now,
  };
}

function createFollowUpTask(
  cancelled: CommercialEvent,
  contactId: string,
  userId: string
): CommercialEvent {
  const now = new Date().toISOString();
  const followUpDate = new Date(Date.now() + CAL_CANCELLATION_FOLLOWUP_HOURS * 3600000).toISOString();
  return {
    id: crypto.randomUUID(),
    contactId, userId,
    type: "tache", status: "planifie",
    title: "Reprendre contact suite annulation RDV",
    date: followUpDate, duration: 0,
    channel: null, location: null, locationAddress: "",
    source: "manuel", initiatedBy: "conseiller",
    calBookingId: "", calEventTypeSlug: "", calLinked: false,
    body: `RDV "${cancelled.title}" du ${new Date(cancelled.date).toLocaleDateString("fr-FR")} annulé — relancer pour replanifier.`,
    needsFollowUp: false, followUpDate: "", followUpNote: "",
    contractIds: [], rdvLink: "",
    createdAt: now, updatedAt: now,
  };
}

// ── Hook principal ────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useCalSync(
  userId: string | null,
  cabinet: CabinetSettings,
  contacts: ContactRecord[],
  onUpdateContact: (record: ContactRecord) => void
): UseCalSyncReturn {

  const [orphanBookings, setOrphanBookings] = useState<CalBookingUnlinked[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [calOnline, setCalOnline] = useState(true);

  const contactsRef = useRef(contacts);
  contactsRef.current = contacts;

  useEffect(() => {
    if (!userId) return;
    setOrphanBookings(loadOrphans(userId));
  }, [userId]);

  // ── Cache Kleios sans Cal.com ──
  useEffect(() => {
    if (!userId) return;
    const currentContacts = contactsRef.current;
    const kleiosSlotsByWeek = new Map<string, BusySlot[]>();
    currentContacts.forEach(c => {
      (c.payload?.events ?? []).forEach(e => {
        if (e.type !== "rdv" || e.status === "annule" || !e.date) return;
        const wk = getWeekKey(new Date(e.date));
        if (!kleiosSlotsByWeek.has(wk)) kleiosSlotsByWeek.set(wk, []);
        const durationMs = (e.duration || 60) * 60000;
        kleiosSlotsByWeek.get(wk)!.push({
          start: e.date,
          end: toLocalISO(new Date(new Date(e.date).getTime() + durationMs)),
          source: "kleios",
          title: e.title || "RDV",
        });
      });
    });
    kleiosSlotsByWeek.forEach((slots, wk) => {
      const existing = loadSlotsCache(userId, wk);
      if (!existing || !existing.calOnline) {
        saveSlotsCache(userId, {
          weekKey: wk,
          busySlots: slots,
          cachedAt: new Date().toISOString(),
          calOnline: false,
        });
      }
    });
  }, [userId, contacts]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync principale ──
  const sync = useCallback(async () => {
    if (!userId || !cabinet.calApiKey || cabinet.rdvProvider !== "cal") return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const bookings = await fetchCalBookings(cabinet.calApiKey);
      setCalOnline(true);

      const syncedIds = loadSyncedIds(userId);
      const currentContacts = contactsRef.current;

      const contactsByEmail = new Map<string, ContactRecord>();
      currentContacts.forEach(c => {
        const e1 = c.payload?.contact?.person1?.email?.toLowerCase();
        const e2 = c.payload?.contact?.person2?.email?.toLowerCase();
        if (e1) contactsByEmail.set(e1, c);
        if (e2) contactsByEmail.set(e2, c);
      });

      const newOrphans: CalBookingUnlinked[] = [...loadOrphans(userId)];
      const contactsToUpdate = new Map<string, ContactRecord>();
      const slotsByWeek = new Map<string, BusySlot[]>();

      for (const booking of bookings) {
        if (booking.status !== "cancelled") {
          const wk = getWeekKey(new Date(booking.startTime));
          if (!slotsByWeek.has(wk)) slotsByWeek.set(wk, []);
          slotsByWeek.get(wk)!.push({
            start: booking.startTime,
            end: booking.endTime,
            source: "cal",
            title: booking.title || booking.eventType?.title,
          });
        }

        const alreadySynced = syncedIds.has(booking.uid);
        if (alreadySynced && booking.status !== "cancelled") continue;

        const attendeeEmail = booking.attendees[0]?.email?.toLowerCase() ?? "";
        const attendeeName = booking.attendees[0]?.name ?? "";
        const matchedContact = attendeeEmail ? contactsByEmail.get(attendeeEmail) : null;

        if (matchedContact) {
          const contact = contactsToUpdate.get(matchedContact.id) ?? { ...matchedContact };
          const events = [...(contact.payload?.events ?? [])];
          const existingIdx = events.findIndex(e => e.calBookingId === booking.uid);

          if (booking.status === "cancelled" && existingIdx >= 0) {
            events[existingIdx] = { ...events[existingIdx], status: "annule" };
            const now = new Date();
            const in30Days = new Date(Date.now() + 30 * 86400000);
            const hasUpcoming = events.some(e =>
              e.type === "rdv" && e.status === "planifie" &&
              e.calBookingId !== booking.uid &&
              new Date(e.date) > now && new Date(e.date) < in30Days
            );
            if (!hasUpcoming) {
              events.push(createFollowUpTask(events[existingIdx], contact.id, userId));
            }
          } else if (existingIdx < 0 && booking.status !== "cancelled") {
            const initiatedBy = attendeeEmail === cabinet.email?.toLowerCase() ? "conseiller" : "client";
            events.push(calBookingToEvent(booking, contact.id, userId, initiatedBy));
          }

          contact.payload = { ...contact.payload, events };
          contact.updatedAt = new Date().toISOString();
          contactsToUpdate.set(contact.id, contact);

          const orphanIdx = newOrphans.findIndex(o => o.calBookingId === booking.uid);
          if (orphanIdx >= 0) newOrphans.splice(orphanIdx, 1);

        } else if (!alreadySynced && booking.status !== "cancelled") {
          const alreadyOrphan = newOrphans.some(o => o.calBookingId === booking.uid);
          if (!alreadyOrphan) {
            newOrphans.push({
              calBookingId: booking.uid,
              calEventTypeSlug: booking.eventType?.slug ?? "",
              calEventTypeLabel: booking.eventType?.title ?? booking.title,
              attendeeEmail, attendeeName,
              date: booking.startTime,
              duration: booking.eventType?.length ?? 60,
              status: booking.status as "accepted" | "cancelled" | "rescheduled",
              importedAt: new Date().toISOString(),
              matchedContactId: null,
              autoMatched: false,
            });
          }
        }

        syncedIds.add(booking.uid);
      }

      // Fusionner Cal.com + Kleios dans le cache
      const now = new Date();
      const kleiosSlotsByWeek = new Map<string, BusySlot[]>();
      currentContacts.forEach(c => {
        (c.payload?.events ?? []).forEach(e => {
          if (e.type !== "rdv" || e.status === "annule" || !e.date) return;
          const wk = getWeekKey(new Date(e.date));
          if (!kleiosSlotsByWeek.has(wk)) kleiosSlotsByWeek.set(wk, []);
          const durationMs = (e.duration || 60) * 60000;
          kleiosSlotsByWeek.get(wk)!.push({
            start: e.date,
            end: toLocalISO(new Date(new Date(e.date).getTime() + durationMs)),
            source: "kleios",
            title: e.title || "RDV",
          });
        });
      });

      const allWeeks = new Set([...slotsByWeek.keys(), ...kleiosSlotsByWeek.keys()]);
      allWeeks.forEach(wk => {
        saveSlotsCache(userId, {
          weekKey: wk,
          busySlots: [...(slotsByWeek.get(wk) ?? []), ...(kleiosSlotsByWeek.get(wk) ?? [])],
          cachedAt: now.toISOString(),
          calOnline: true,
        });
      });

      contactsToUpdate.forEach(c => onUpdateContact(c));
      saveOrphans(userId, newOrphans);
      saveSyncedIds(userId, syncedIds);
      setOrphanBookings(newOrphans);
      setLastSyncAt(now.toISOString());
      try {
        localStorage.setItem(getCalConnectedKey(userId), JSON.stringify({ connectedAt: now.toISOString() }));
      } catch {}

    } catch (e: unknown) {
      setCalOnline(false);
      setSyncError((e as Error).message ?? "Erreur Cal.com");
    }

    setIsSyncing(false);
  }, [userId, cabinet, onUpdateContact]);

  useEffect(() => {
    if (!userId || !cabinet.calApiKey || cabinet.rdvProvider !== "cal") return;
    sync();
    const interval = setInterval(sync, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId, cabinet.calApiKey, cabinet.rdvProvider, sync]);

  const getBusySlotsForWeek = useCallback((weekKey: string): CalSlotsCache | null => {
    if (!userId) return null;
    const cached = loadSlotsCache(userId, weekKey);
    if (cached) return cached;
    // Semaine sans booking — si Cal.com connecté, retourner cache vide avec calOnline=true
    try {
      const raw = localStorage.getItem(getCalConnectedKey(userId));
      if (raw) {
        const { connectedAt } = JSON.parse(raw);
        return { weekKey, busySlots: [], cachedAt: connectedAt, calOnline: true };
      }
    } catch {}
    return null;
  }, [userId]);

  const linkBooking = useCallback((calBookingId: string, contactId: string) => {
    if (!userId) return;
    const orphans = loadOrphans(userId);
    const orphan = orphans.find(o => o.calBookingId === calBookingId);
    if (!orphan) return;
    const contact = contactsRef.current.find(c => c.id === contactId);
    if (!contact) return;

    const fakeBooking: CalBookingResponse = {
      id: 0, uid: orphan.calBookingId,
      title: orphan.calEventTypeLabel,
      startTime: orphan.date,
      endTime: new Date(new Date(orphan.date).getTime() + orphan.duration * 60000).toISOString(),
      status: "accepted",
      eventType: { slug: orphan.calEventTypeSlug, title: orphan.calEventTypeLabel, length: orphan.duration },
      attendees: [{ email: orphan.attendeeEmail, name: orphan.attendeeName }],
    };

    const newEvent = calBookingToEvent(fakeBooking, contactId, userId, "client");
    onUpdateContact({
      ...contact,
      payload: { ...contact.payload, events: [...(contact.payload?.events ?? []), newEvent] },
      updatedAt: new Date().toISOString(),
    });

    const newOrphans = orphans.filter(o => o.calBookingId !== calBookingId);
    saveOrphans(userId, newOrphans);
    setOrphanBookings(newOrphans);
  }, [userId, onUpdateContact]);

  const dismissBooking = useCallback((calBookingId: string) => {
    if (!userId) return;
    const newOrphans = loadOrphans(userId).filter(o => o.calBookingId !== calBookingId);
    saveOrphans(userId, newOrphans);
    setOrphanBookings(newOrphans);
    const syncedIds = loadSyncedIds(userId);
    syncedIds.add(calBookingId);
    saveSyncedIds(userId, syncedIds);
  }, [userId]);

  return {
    orphanBookings, isSyncing, lastSyncAt, syncError, calOnline,
    getBusySlotsForWeek, linkBooking, dismissBooking, syncNow: sync,
  };
}
