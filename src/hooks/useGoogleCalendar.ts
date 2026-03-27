// src/hooks/useGoogleCalendar.ts
// Intégration Google Calendar — OAuth 2.0 + lecture des événements
// ─────────────────────────────────────────────────────────────────────────────
// Flux :
//   1. handleConnect() → redirige vers Google OAuth
//   2. handleCallback() → échange le code contre access_token + refresh_token
//   3. fetchEvents() → lit les événements Google Calendar
//   4. Refresh automatique du token quand il expire
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { BRAND } from "../constants";
import type { BusySlot } from "./useCalSync";
import { getWeekKey, getMondayOfWeek } from "./useCalSync";

// ── Config ────────────────────────────────────────────────────────────────────

const CLIENT_ID     = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const REDIRECT_URI  = import.meta.env.VITE_GOOGLE_REDIRECT_URI as string;
const SCOPES        = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;      // timestamp ms
}

export interface UseGoogleCalendarReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastSyncAt: string | null;
  handleConnect: () => void;
  handleDisconnect: () => void;
  fetchBusySlotsForWeek: (weekKey: string) => Promise<BusySlot[]>;
  syncNow: () => Promise<void>;
  createEvent: (title: string, start: string, end: string, description?: string, googleEventId?: string, location?: string, attendeeEmail?: string) => Promise<string | null>;
}

// ── Helpers localStorage ──────────────────────────────────────────────────────

function getTokenKey(uid: string) {
  return `${BRAND.storagePrefix}google_tokens_${uid}`;
}
function getGoogleSlotKey(uid: string, wk: string) {
  return `${BRAND.storagePrefix}google_slots_${uid}_${wk}`;
}

function loadTokens(uid: string): GoogleTokens | null {
  try {
    return JSON.parse(localStorage.getItem(getTokenKey(uid)) ?? "null");
  } catch { return null; }
}
function saveTokens(uid: string, tokens: GoogleTokens) {
  try {
    localStorage.setItem(getTokenKey(uid), JSON.stringify(tokens));
  } catch {}
}
function clearTokens(uid: string) {
  try { localStorage.removeItem(getTokenKey(uid)); } catch {}
}

// ── ISO local (sans UTC) ──────────────────────────────────────────────────────

function toLocalISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

// ── Rafraîchir le token via le client secret ──────────────────────────────────
// En dev : on appelle directement Google. En prod : passer par Edge Function.

async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens | null> {
  const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET as string;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();

  return {
    accessToken:  data.access_token,
    refreshToken: refreshToken,   // Google ne renvoie pas toujours un nouveau refresh_token
    expiresAt:    Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

// ── Obtenir un token valide (auto-refresh si expiré) ─────────────────────────

async function getValidToken(uid: string): Promise<string | null> {
  const tokens = loadTokens(uid);
  if (!tokens) return null;

  // Token encore valide (avec 5min de marge)
  if (tokens.expiresAt - Date.now() > 5 * 60 * 1000) {
    return tokens.accessToken;
  }

  // Token expiré → refresh
  const refreshed = await refreshAccessToken(tokens.refreshToken);
  if (!refreshed) {
    clearTokens(uid);
    return null;
  }

  saveTokens(uid, refreshed);
  return refreshed.accessToken;
}

// ── Lire les événements Google Calendar ──────────────────────────────────────

async function fetchGoogleEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<BusySlot[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) throw new Error(`Google Calendar API error ${res.status}`);

  const data = await res.json();
  const slots: BusySlot[] = [];

  for (const event of data.items ?? []) {
    // Ignorer les événements transparents (ne bloquent pas le calendrier)
    if (event.transparency === "transparent") continue;
    // Ignorer les événements annulés
    if (event.status === "cancelled") continue;

    const start = event.start?.dateTime ?? event.start?.date;
    const end   = event.end?.dateTime   ?? event.end?.date;
    if (!start || !end) continue;

    // Convertir en heure locale
    const startDate = new Date(start);
    const endDate   = new Date(end);

    slots.push({
      start: toLocalISO(startDate),
      end:   toLocalISO(endDate),
      source: "cal",   // On réutilise "cal" pour le grisage — même couleur
      title: event.summary ?? "Événement",
    });
  }

  return slots;
}

// ── Hook principal ────────────────────────────────────────────────────────────

export function useGoogleCalendar(userId: string | null): UseGoogleCalendarReturn {
  const [isConnected, setIsConnected]   = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt]     = useState<string | null>(null);

  // Vérifier si tokens présents au montage
  useEffect(() => {
    if (!userId) return;
    const tokens = loadTokens(userId);
    setIsConnected(!!tokens);
  }, [userId]);

  // ── Étape 1 : lancer le flux OAuth ──
  const handleConnect = useCallback(() => {
    const state = crypto.randomUUID();
    sessionStorage.setItem("google_oauth_state", state);

    const params = new URLSearchParams({
      client_id:     CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      response_type: "code",
      scope:         SCOPES,
      access_type:   "offline",
      prompt:        "consent",   // force le refresh_token
      state,
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }, []);

  // ── Étape 2 : traiter le callback OAuth (appelé depuis App.tsx) ──
  const handleCallback = useCallback(async (code: string) => {
    if (!userId) return;
    setIsConnecting(true);
    setError(null);

    try {
      const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET as string;

      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id:     CLIENT_ID,
          client_secret: clientSecret,
          redirect_uri:  REDIRECT_URI,
          code,
          grant_type:    "authorization_code",
        }),
      });

      if (!res.ok) throw new Error("Erreur lors de l'échange du code OAuth");

      const data = await res.json();

      const tokens: GoogleTokens = {
        accessToken:  data.access_token,
        refreshToken: data.refresh_token,
        expiresAt:    Date.now() + (data.expires_in ?? 3600) * 1000,
      };

      saveTokens(userId, tokens);
      setIsConnected(true);

    } catch (e: any) {
      setError(e.message ?? "Erreur connexion Google");
    }

    setIsConnecting(false);
  }, [userId]);

  // ── Déconnexion ──
  const handleDisconnect = useCallback(() => {
    if (!userId) return;
    clearTokens(userId);
    setIsConnected(false);
    setLastSyncAt(null);
  }, [userId]);

  // ── Lire les slots pour une semaine (avec cache localStorage) ──
  const fetchBusySlotsForWeek = useCallback(async (weekKey: string): Promise<BusySlot[]> => {
    if (!userId) return [];

    // Vérifier le cache (valide 10 minutes)
    try {
      const cached = JSON.parse(localStorage.getItem(getGoogleSlotKey(userId, weekKey)) ?? "null");
      if (cached && Date.now() - new Date(cached.cachedAt).getTime() < 10 * 60 * 1000) {
        return cached.slots;
      }
    } catch {}

    const token = await getValidToken(userId);
    if (!token) return [];

    // Calculer les bornes de la semaine
    const [yearStr, weekStr] = weekKey.split("-W");
    const year = parseInt(yearStr);
    const week = parseInt(weekStr);
    const monday = getMondayOfWeek(new Date(year, 0, 1 + (week - 1) * 7));
    const sunday = new Date(monday.getTime() + 6 * 86400000);
    sunday.setHours(23, 59, 59, 0);

    try {
      const slots = await fetchGoogleEvents(
        token,
        monday.toISOString(),
        sunday.toISOString()
      );

      // Sauvegarder en cache
      localStorage.setItem(getGoogleSlotKey(userId, weekKey), JSON.stringify({
        slots,
        cachedAt: new Date().toISOString(),
      }));

      return slots;
    } catch (e: any) {
      setError(e.message);
      return [];
    }
  }, [userId]);

  // ── Sync globale (3 mois) ──
  const syncNow = useCallback(async () => {
    if (!userId) return;
    const token = await getValidToken(userId);
    if (!token) return;

    const now    = new Date();
    const future = new Date(now.getTime() + 90 * 86400000); // 3 mois

    try {
      const slots = await fetchGoogleEvents(
        token,
        now.toISOString(),
        future.toISOString()
      );

      // Organiser par semaine et mettre en cache
      const byWeek = new Map<string, BusySlot[]>();
      slots.forEach(s => {
        const wk = getWeekKey(new Date(s.start));
        if (!byWeek.has(wk)) byWeek.set(wk, []);
        byWeek.get(wk)!.push(s);
      });

      byWeek.forEach((weekSlots, wk) => {
        localStorage.setItem(getGoogleSlotKey(userId, wk), JSON.stringify({
          slots: weekSlots,
          cachedAt: new Date().toISOString(),
        }));
      });

      setLastSyncAt(new Date().toISOString());
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [userId]);

  // ── Gérer le retour OAuth dans l'URL ──
  // À appeler depuis App.tsx quand l'URL contient ?code=...&state=...
  useEffect(() => {
    if (!userId) return;
    const params = new URLSearchParams(window.location.search);
    const code  = params.get("code");
    const state = params.get("state");
    const storedState = sessionStorage.getItem("google_oauth_state");

    if (code && state && state === storedState) {
      sessionStorage.removeItem("google_oauth_state");
      // Nettoyer l'URL
      window.history.replaceState({}, "", window.location.pathname);
      handleCallback(code);
    }
  }, [userId, handleCallback]);

  // ── Créer un événement dans Google Calendar ──
  const createEvent = useCallback(async (
    title: string,
    start: string,
    end: string,
    description = "",
    googleEventId?: string,
    location?: string,
    attendeeEmail?: string
  ): Promise<string | null> => {
    if (!userId) return null;
    const token = await getValidToken(userId);
    if (!token) return null;

    const url = googleEventId
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`
      : "https://www.googleapis.com/calendar/v3/calendars/primary/events";

    const method = googleEventId ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: title,
          description,
          ...(location ? { location } : {}),
          ...(attendeeEmail ? { attendees: [{ email: attendeeEmail }] } : {}),
          start: { dateTime: new Date(start).toISOString(), timeZone: "Europe/Paris" },
          end:   { dateTime: new Date(end).toISOString(),   timeZone: "Europe/Paris" },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError((err as any).error?.message ?? `Erreur Google ${res.status}`);
        return null;
      }

      const data = await res.json();
      // Invalider le cache
      const wk = getWeekKey(new Date(start));
      try { localStorage.removeItem(getGoogleSlotKey(userId, wk)); } catch {}

      return data.id ?? null;   // retourner l'ID Google de l'événement
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [userId]);

  return {
    isConnected, isConnecting, error, lastSyncAt,
    handleConnect, handleDisconnect,
    fetchBusySlotsForWeek, syncNow, createEvent,
  };
}
