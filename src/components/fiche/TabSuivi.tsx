// src/components/fiche/TabSuivi.tsx
// Onglet suivi commercial — v2 avec Cal.com, canal/lieu, modification événement
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { WeekCalendar } from "../WeekCalendar";
import type { CalSlotsCache } from "../../hooks/useCalSync";
import type {
  ContactRecord, CommercialEvent, EventType,
  RdvChannel, RdvLocation, CabinetSettings,
} from "../../types/crm";
function toLocalISOString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

import {
  EVENT_TYPE_LABELS, EVENT_STATUS_LABELS,
  RDV_CHANNEL_LABELS, RDV_LOCATION_LABELS, CAL_DEFAULT_DURATIONS,
} from "../../constants";

interface TabSuiviProps {
  record: ContactRecord;
  onSave: (record: ContactRecord) => void;
  colorNavy: string;
  colorGold: string;
  cabinet?: CabinetSettings;
  getBusySlotsForWeek?: (weekKey: string) => CalSlotsCache | null;
  fetchGoogleSlotsForWeek?: (weekKey: string) => Promise<import("../../hooks/useCalSync").BusySlot[]>;
  onCreateGoogleEvent?: (title: string, start: string, end: string, description?: string, googleEventId?: string, location?: string, attendeeEmail?: string) => Promise<string | null>;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const EVENT_STYLES: Record<EventType, { bg: string; border: string; color: string; icon: string }> = {
  rdv:     { bg: "#EFF6FF", border: "#3B82F6", color: "#3B82F6", icon: "📅" },
  note:    { bg: "#FFFBEB", border: "#F59E0B", color: "#F59E0B", icon: "✎" },
  rappel:  { bg: "#ECFDF5", border: "#10B981", color: "#10B981", icon: "⏰" },
  email:   { bg: "#F5F3FF", border: "#8B5CF6", color: "#8B5CF6", icon: "✉" },
  appel:   { bg: "#FFF7ED", border: "#F97316", color: "#F97316", icon: "☎" },
  tache:   { bg: "#F8FAFC", border: "#64748B", color: "#64748B", icon: "✓" },
};

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  planifie:  { bg: "#EFF6FF", color: "#1D4ED8" },
  realise:   { bg: "#ECFDF5", color: "#065F46" },
  annule:    { bg: "#FEF2F2", color: "#991B1B" },
  reporte:   { bg: "#FFFBEB", color: "#92400E" },
  no_show:   { bg: "#F3F4F6", color: "#6B7280" },
};

const inp = {
  border: "1px solid #E2E5EC",
  borderRadius: 6,
  padding: "7px 10px",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  background: "#fff",
  width: "100%",
  boxSizing: "border-box" as const,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Composant EventItem ───────────────────────────────────────────────────────

function EventItem({
  event, colorNavy: _cn, colorGold: _cg, onEdit, onChangeStatus, onDelete,
}: {
  event: CommercialEvent;
  colorNavy: string;
  colorGold: string;
  onEdit: (e: CommercialEvent) => void;
  onChangeStatus: (id: string, status: CommercialEvent["status"]) => void;
  onDelete: (id: string) => void;
}) {
  const style = EVENT_STYLES[event.type] ?? EVENT_STYLES.note;
  const badge = STATUS_BADGE[event.status] ?? STATUS_BADGE.planifie;
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showStatusMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showStatusMenu]);

  // Lien Google Maps si adresse extérieure
  const mapsUrl = event.locationAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.locationAddress)}`
    : null;

  return (
    <div style={{ display: "flex", gap: 14, paddingBottom: 20, position: "relative" }}>
      {/* Ligne timeline */}
      <div style={{
        position: "absolute", left: 12, top: 26, bottom: 0,
        width: 1, background: "#E2E5EC",
      }}/>
      {/* Dot */}
      <div style={{
        width: 25, height: 25, borderRadius: "50%",
        border: `2px solid ${style.border}`, background: style.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, flexShrink: 0, zIndex: 1, color: style.color,
      }}>
        {style.icon}
      </div>

      {/* Contenu */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#0D1B2E" }}>
              {event.title || EVENT_TYPE_LABELS[event.type]}
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
              {formatDateTime(event.date)}
              {event.duration ? ` · ${event.duration} min` : ""}
              {event.channel ? ` · ${RDV_CHANNEL_LABELS[event.channel] ?? event.channel}` : ""}
              {event.location ? ` · ${RDV_LOCATION_LABELS[event.location] ?? event.location}` : ""}
              {event.source && event.source !== "manuel" && (
                <span style={{ marginLeft: 4, color: "#3B82F6" }}>
                  · Cal.com {event.initiatedBy === "client" ? "(client)" : ""}
                </span>
              )}
            </div>
            {/* Adresse avec lien maps */}
            {event.locationAddress && (
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                📍{" "}
                {mapsUrl ? (
                  <a href={mapsUrl} target="_blank" rel="noreferrer"
                    style={{ color: "#3B82F6", textDecoration: "underline" }}>
                    {event.locationAddress}
                  </a>
                ) : event.locationAddress}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
            {/* Badge statut cliquable */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowStatusMenu(v => !v)}
                style={{
                  padding: "2px 8px", borderRadius: 10, border: "none",
                  background: badge.bg, color: badge.color,
                  fontSize: 10, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {EVENT_STATUS_LABELS[event.status] ?? event.status}
              </button>
              {showStatusMenu && (
                <div ref={menuRef} style={{
                  position: "absolute", right: 0, top: "100%", zIndex: 50,
                  background: "#fff", border: "1px solid #E2E5EC",
                  borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  minWidth: 130, marginTop: 4,
                }}>
                  {(["planifie","realise","annule","reporte","no_show"] as const).map(s => (
                    <button key={s} onClick={() => { onChangeStatus(event.id, s); setShowStatusMenu(false); }}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "7px 12px", border: "none", background: "none",
                        fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                        color: STATUS_BADGE[s]?.color ?? "#0D1B2E",
                      }}>
                      {EVENT_STATUS_LABELS[s]}
                    </button>
                  ))}
                  <button onClick={() => setShowStatusMenu(false)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "7px 12px", border: "none",
                      borderTop: "1px solid #E2E5EC",
                      background: "none", fontSize: 12,
                      cursor: "pointer", fontFamily: "inherit", color: "#9CA3AF",
                    }}>
                    Annuler
                  </button>
                </div>
              )}
            </div>
            {/* Modifier */}
            <button onClick={() => onEdit(event)} style={{
              padding: "2px 8px", borderRadius: 6,
              border: "1px solid #E2E5EC", background: "#fff",
              fontSize: 11, color: "#6B7280", cursor: "pointer", fontFamily: "inherit",
            }}>
              ✏
            </button>
            {/* Supprimer */}
            <button onClick={() => onDelete(event.id)} style={{
              padding: "2px 8px", borderRadius: 6,
              border: "1px solid #FECACA", background: "#fff",
              fontSize: 11, color: "#EF4444", cursor: "pointer", fontFamily: "inherit",
            }} title="Supprimer">🗑</button>
          </div>
        </div>

        {event.body && (
          <div style={{
            fontSize: 12.5, color: "#4B5563", marginTop: 6,
            background: "#F8F9FB", padding: "8px 10px",
            borderRadius: 6, lineHeight: 1.5,
          }}>
            {event.body}
          </div>
        )}
        {event.followUpDate && (
          <div style={{ fontSize: 11, color: "#F59E0B", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            ⏰ Rappel : {formatDate(event.followUpDate)}
            {event.followUpNote ? ` — ${event.followUpNote}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Formulaire création / modification ────────────────────────────────────────

function EventForm({
  initial, onSave, onClose, colorNavy, colorGold, cabinet, contactAddress, contactName, contactEmail, getBusySlotsForWeek, fetchGoogleSlotsForWeek, onCreateGoogleEvent,
}: {
  initial?: CommercialEvent | null;
  onSave: (e: CommercialEvent) => void;
  onClose: () => void;
  colorNavy: string;
  colorGold: string;
  cabinet?: CabinetSettings;
  contactAddress?: string;
  contactName?: string;
  contactEmail?: string;
  getBusySlotsForWeek?: (weekKey: string) => CalSlotsCache | null;
  fetchGoogleSlotsForWeek?: (weekKey: string) => Promise<import("../../hooks/useCalSync").BusySlot[]>;
  onCreateGoogleEvent?: (title: string, start: string, end: string, description?: string, googleEventId?: string, location?: string, attendeeEmail?: string) => Promise<string | null>;
}) {
  const isEdit = !!initial;
  const [type, setType]         = useState<EventType>(initial?.type ?? "rdv");
  const [title, setTitle]       = useState(initial?.title ?? "");
  const [date, setDate]         = useState(
    initial?.date ? initial.date.slice(0, 16) : toLocalISOString(new Date())
  );
  const [duration, setDuration] = useState(initial?.duration ?? 60);
  const [channel, setChannel]   = useState<RdvChannel | "">(initial?.channel ?? "");
  const [location, setLocation] = useState<RdvLocation | "">(initial?.location ?? "");
  const [locationAddress, setLocationAddress] = useState(initial?.locationAddress ?? "");
  const [rdvLink, setRdvLink]   = useState(initial?.rdvLink ?? "");
  const [body, setBody]         = useState(initial?.body ?? "");
  const [followUpDate, setFollowUpDate] = useState(initial?.followUpDate ?? "");
  const [followUpNote, setFollowUpNote] = useState(initial?.followUpNote ?? "");
  const [status, setStatus]     = useState<CommercialEvent["status"]>(initial?.status ?? "planifie");

  // Auto-remplir adresse si domicile client
  const handleLocationChange = (loc: RdvLocation | "") => {
    setLocation(loc);
    if (loc === "domicile_client" && contactAddress) {
      setLocationAddress(contactAddress);
    } else if (loc !== "exterieur") {
      setLocationAddress("");
    }
  };

  // Ouvrir Cal.com avec le bon type
  const handleCalOpen = (calType: { url: string; label: string; duration: number; defaultChannel: string }) => {
    setTitle(calType.label);
    setDuration(calType.duration);
    setChannel(calType.defaultChannel as RdvChannel);
    // Ouvrir Cal.com dans un nouvel onglet
    window.open(calType.url, "_blank");
  };

  const handleSave = async () => {
    const now = new Date().toISOString();
    const event: CommercialEvent = {
      id: initial?.id ?? crypto.randomUUID(),
      contactId: initial?.contactId ?? "",
      userId: initial?.userId ?? "",
      type,
      status,
      title,
      date,
      duration,
      channel: (channel as RdvChannel) || null,
      location: (location as RdvLocation) || null,
      locationAddress,
      rdvLink,
      source: initial?.source ?? "manuel",
      initiatedBy: initial?.initiatedBy ?? "conseiller",
      calBookingId: initial?.calBookingId ?? "",
      calEventTypeSlug: initial?.calEventTypeSlug ?? "",
      calLinked: initial?.calLinked ?? false,
      body,
      needsFollowUp: !!followUpDate,
      followUpDate,
      followUpNote,
      contractIds: initial?.contractIds ?? [],
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(event);

    // Créer/mettre à jour dans Google Calendar
    if (onCreateGoogleEvent && event.type === "rdv" && event.status !== "annule" && event.date) {
      const endDate = new Date(new Date(event.date).getTime() + (event.duration || 60) * 60000);
      const p = (n: number) => String(n).padStart(2, "0");
      const toLocalISO = (d: Date) => `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
      const CANAL_LABELS: Record<string, string> = { tel: "Telephone", visio: "Visioconference", physique: "Presentiel" };
      const LOC_LABELS: Record<string, string> = { cabinet: "Au cabinet", domicile_client: "Domicile client", exterieur: "Lieu exterieur" };
      const descParts: string[] = [];
      if (event.channel) descParts.push("Canal : " + (CANAL_LABELS[event.channel] ?? event.channel));
      if (event.location) descParts.push("Lieu : " + (LOC_LABELS[event.location] ?? event.location));
      if (event.locationAddress) descParts.push("Adresse : " + event.locationAddress);
      if (event.body) descParts.push("Compte rendu : " + event.body);
      const description = descParts.join(" | ");
      // Titre : NOM Prénom / titre du RDV
      const googleContactName = contactName ?? "";
      const googleTitle = googleContactName ? googleContactName + " / " + (event.title || "RDV") : (event.title || "RDV");

      // Lieu Google = adresse si extérieur, sinon label du lieu
      const LOC_GOOGLE: Record<string, string> = { cabinet: "Cabinet", domicile_client: event.locationAddress || "Domicile client", exterieur: event.locationAddress || "" };
      const googleLocation = event.location ? (LOC_GOOGLE[event.location] || event.locationAddress) : event.locationAddress;

      const existingGoogleId = initial?.rdvLink?.startsWith("google:") ? initial.rdvLink.slice(7) : undefined;
      const googleId = await onCreateGoogleEvent(googleTitle, event.date.slice(0, 16), toLocalISO(endDate), description, existingGoogleId, googleLocation || undefined, contactEmail || undefined);
      if (googleId && !existingGoogleId) {
        event.rdvLink = "google:" + googleId;
        onSave(event);
      }
    }
  };

  const calEventTypes = cabinet?.calEventTypes ?? [];

  return (
    <div style={{
      background: "#fff", border: "1px solid #E2E5EC",
      borderRadius: 10, padding: 16, marginBottom: 16,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
        {isEdit ? "Modifier l'événement" : "Nouvel événement"}
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9CA3AF" }}>×</button>
      </div>

      {/* Boutons Cal.com — si type = rdv et types configurés */}
      {type === "rdv" && calEventTypes.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6, fontWeight: 500 }}>
            Prendre RDV via Cal.com
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {calEventTypes.map(ct => (
              <button key={ct.id} onClick={() => handleCalOpen(ct)}
                style={{
                  padding: "5px 12px", borderRadius: 6,
                  border: `1px solid ${colorNavy}`,
                  background: colorNavy, color: "#fff",
                  fontSize: 11, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                📅 {ct.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>
            Cliquez pour ouvrir Cal.com — le RDV sera automatiquement importé dans Kleios.
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {/* Type */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Type</label>
          <select value={type} onChange={e => setType(e.target.value as EventType)} style={inp}>
            {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        {/* Statut */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Statut</label>
          <select value={status} onChange={e => setStatus(e.target.value as CommercialEvent["status"])} style={inp}>
            {Object.entries(EVENT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        {/* Date — vue semaine pour RDV, champ simple sinon */}
        {type === "rdv" && getBusySlotsForWeek ? (
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: 6 }}>
              Sélectionnez un créneau
              {date && (
                <span style={{ marginLeft: 8, color: colorNavy, fontWeight: 600 }}>
                  {new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  {" à "}
                  {new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </label>
            <WeekCalendar
              getBusySlotsForWeek={getBusySlotsForWeek}
              fetchGoogleSlotsForWeek={fetchGoogleSlotsForWeek}
              colorNavy={colorNavy}
              colorGold={colorGold}
              onSelectSlot={(start) => setDate(toLocalISOString(start))}
              selectedStart={date ? new Date(date) : null}
              selectedDuration={duration}
            />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Date & heure</label>
            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} style={inp} />
          </div>
        )}
        {/* Durée */}
        {type === "rdv" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Durée</label>
            <select value={duration} onChange={e => setDuration(Number(e.target.value))} style={inp}>
              {CAL_DEFAULT_DURATIONS.map(d => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Canal & lieu — uniquement pour les RDV */}
      {type === "rdv" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Canal</label>
            <select value={channel} onChange={e => setChannel(e.target.value as RdvChannel)} style={inp}>
              <option value="">Non précisé</option>
              {Object.entries(RDV_CHANNEL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          {channel === "physique" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Lieu</label>
              <select value={location} onChange={e => handleLocationChange(e.target.value as RdvLocation)} style={inp}>
                <option value="">Non précisé</option>
                {Object.entries(RDV_LOCATION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Adresse si extérieur */}
      {channel === "physique" && (location === "exterieur" || location === "domicile_client") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>
            Adresse{" "}
            {locationAddress && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}`}
                target="_blank" rel="noreferrer"
                style={{ fontSize: 10, color: "#3B82F6", textDecoration: "underline", marginLeft: 4 }}>
                Voir sur Maps →
              </a>
            )}
          </label>
          <input type="text" value={locationAddress} onChange={e => setLocationAddress(e.target.value)}
            placeholder="ex: 12 rue du Castellas, 13008 Marseille" style={inp} />
        </div>
      )}

      {/* Lien visio */}
      {channel === "visio" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Lien de connexion</label>
          <input type="url" value={rdvLink} onChange={e => setRdvLink(e.target.value)}
            placeholder="https://meet.google.com/..." style={inp} />
        </div>
      )}

      {/* Titre */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Titre</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="ex: Entretien annuel bilan patrimonial" style={inp} />
      </div>

      {/* Corps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>
          {type === "rdv" ? "Compte rendu" : "Note"}
        </label>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
          placeholder="Compte rendu, observations, décisions prises..."
          style={{ ...inp, resize: "vertical" }} />
      </div>

      {/* Rappel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Date rappel</label>
          <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} style={inp} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Note rappel</label>
          <input type="text" value={followUpNote} onChange={e => setFollowUpNote(e.target.value)}
            placeholder="ex: Révision allocation PER" style={inp} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{
          padding: "7px 16px", border: "1px solid #E2E5EC", borderRadius: 6,
          background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
        }}>Annuler</button>
        <button onClick={handleSave} style={{
          padding: "7px 16px", border: "none", borderRadius: 6,
          background: colorNavy, color: "#fff", fontSize: 12,
          cursor: "pointer", fontFamily: "inherit",
        }}>
          {isEdit ? "Enregistrer les modifications" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function TabSuivi({ record, onSave, colorNavy, colorGold, cabinet, getBusySlotsForWeek, fetchGoogleSlotsForWeek, onCreateGoogleEvent }: TabSuiviProps) {
  const [showForm, setShowForm]             = useState(false);
  const [editingEvent, setEditingEvent]     = useState<CommercialEvent | null>(null);
  const [showCancelled, setShowCancelled]   = useState(false);

  const allEvents = [...(record.payload?.events ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const cancelledCount = allEvents.filter(e => e.status === "annule").length;
  const events = showCancelled ? allEvents : allEvents.filter(e => e.status !== "annule");

  const nextRdv = events.find(
    e => e.type === "rdv" && e.status === "planifie" && new Date(e.date) > new Date()
  );

  // Adresse du contact pour pré-remplissage
  const contactAddress = (() => {
    const p1 = record.payload?.contact?.person1;
    if (!p1) return "";
    return [p1.address, p1.postalCode, p1.city].filter(Boolean).join(", ");
  })();

  const handleSaveEvent = async (event: CommercialEvent) => {
    const full = { ...event, contactId: record.id, userId: record.userId };
    const existingEvents = record.payload?.events ?? [];

    let newEvents: CommercialEvent[];
    if (editingEvent) {
      // Modification — remplacer l'événement existant
      newEvents = existingEvents.map(e => e.id === full.id ? full : e);
    } else {
      // Création — ajouter en tête
      newEvents = [full, ...existingEvents];
    }

    onSave({ ...record, payload: { ...record.payload, events: newEvents } });

    setShowForm(false);
    setEditingEvent(null);
  };

  const handleEdit = (event: CommercialEvent) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleChangeStatus = (eventId: string, newStatus: CommercialEvent["status"]) => {
    const newEvents = (record.payload?.events ?? []).map(e =>
      e.id === eventId ? { ...e, status: newStatus, updatedAt: new Date().toISOString() } : e
    );
    onSave({ ...record, payload: { ...record.payload, events: newEvents } });
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!confirm("Supprimer cet événement ?")) return;
    const newEvents = (record.payload?.events ?? []).filter(e => e.id !== eventId);
    onSave({ ...record, payload: { ...record.payload, events: newEvents } });
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEvent(null);
  };

  return (
    <div>
      {/* Prochain RDV */}
      {nextRdv && (
        <div style={{
          background: colorNavy, color: "#fff", borderRadius: 10,
          padding: "14px 16px", display: "flex", alignItems: "center",
          gap: 14, marginBottom: 16,
        }}>
          <span style={{ fontSize: 22 }}>📅</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Prochain rendez-vous
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>
              {nextRdv.title || "RDV"} —{" "}
              <span style={{ color: colorGold }}>{formatDate(nextRdv.date)}</span>
            </div>
            {nextRdv.channel && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                {RDV_CHANNEL_LABELS[nextRdv.channel]}
                {nextRdv.location ? ` · ${RDV_LOCATION_LABELS[nextRdv.location]}` : ""}
                {nextRdv.duration ? ` · ${nextRdv.duration} min` : ""}
              </div>
            )}
          </div>
          <button
            onClick={() => handleEdit(nextRdv)}
            style={{
              padding: "6px 14px", border: "none", borderRadius: 6,
              background: colorGold, color: colorNavy,
              fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
            }}>
            Modifier
          </button>
        </div>
      )}

      {/* Historique */}
      <div style={{ background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10, padding: 16 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: showForm ? 14 : (events.length > 0 ? 14 : 0),
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Historique & rappels</div>
            {cancelledCount > 0 && (
              <button onClick={() => setShowCancelled(v => !v)} style={{
                padding: "2px 8px", borderRadius: 10, border: "1px solid #E2E5EC",
                background: "#fff", fontSize: 10, color: "#6B7280", cursor: "pointer", fontFamily: "inherit",
              }}>
                {showCancelled ? `Masquer annulés (${cancelledCount})` : `Afficher annulés (${cancelledCount})`}
              </button>
            )}
          </div>
          <button onClick={() => { setEditingEvent(null); setShowForm(true); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", border: "none", borderRadius: 6,
              background: colorNavy, color: "#fff", fontSize: 12,
              cursor: "pointer", fontFamily: "inherit",
            }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Ajouter
          </button>
        </div>

        {showForm && (
          <EventForm
            initial={editingEvent}
            onSave={handleSaveEvent}
            onClose={handleCloseForm}
            colorNavy={colorNavy}
            colorGold={colorGold}
            cabinet={cabinet}
            contactAddress={contactAddress}
            contactName={record.displayName}
            contactEmail={record.payload?.contact?.person1?.email || record.payload?.contact?.person2?.email || undefined}
            getBusySlotsForWeek={getBusySlotsForWeek}
            fetchGoogleSlotsForWeek={fetchGoogleSlotsForWeek}
            onCreateGoogleEvent={onCreateGoogleEvent}
          />
        )}

        {events.length === 0 && !showForm ? (
          <div style={{ padding: "30px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
            Aucun événement enregistré. Ajoutez un compte rendu ou un rappel.
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            {events.map(event => (
              <EventItem
                key={event.id}
                event={event}
                colorNavy={colorNavy}
                colorGold={colorGold}
                onEdit={handleEdit}
                onChangeStatus={handleChangeStatus}
                onDelete={handleDeleteEvent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
