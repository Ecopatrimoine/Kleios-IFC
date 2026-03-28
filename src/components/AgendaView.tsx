// src/components/AgendaView.tsx
// Module Agenda & RDV — calendrier mensuel + liste événements
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import type { ContactRecord, EventType } from "../types/crm";

interface AgendaViewProps {
  contacts: ContactRecord[];
  colorNavy: string;
  colorGold: string;
  rdvUrl: string;          // lien Cal.com / Calendly depuis paramètres cabinet
  rdvProvider: string;     // "none" | "cal" | "calendly" | "custom"
  onOpenContact: (record: ContactRecord) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre"
];
const DAYS_FR = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

const EVENT_COLORS: Record<EventType, { bg: string; color: string; dot: string }> = {
  rdv:     { bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6" },
  note:    { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  rappel:  { bg: "#ECFDF5", color: "#065F46", dot: "#10B981" },
  email:   { bg: "#F5F3FF", color: "#5B21B6", dot: "#8B5CF6" },
  appel:   { bg: "#FFF7ED", color: "#9A3412", dot: "#F97316" },
  tache:   { bg: "#F8FAFC", color: "#334155", dot: "#64748B" },
};

function formatTime(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

// ── Composant principal ───────────────────────────────────────────────────────

export function AgendaView({
  contacts, colorNavy, colorGold, rdvUrl, rdvProvider, onOpenContact,
}: AgendaViewProps) {

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [filterType, setFilterType] = useState<"tous" | EventType>("tous");

  // Tous les événements de tous les contacts
  const allEvents = useMemo(() => {
    return contacts.flatMap(c =>
      (c.payload?.events ?? []).map(e => ({ ...e, contact: c }))
    );
  }, [contacts]);

  // Événements du mois courant
  const monthEvents = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    return allEvents.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });
  }, [allEvents, currentMonth]);

  // Événements du jour sélectionné
  const dayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return allEvents
      .filter(e => isSameDay(new Date(e.date), selectedDay))
      .filter(e => filterType === "tous" || e.type === filterType)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allEvents, selectedDay, filterType]);

  // Prochains événements (tous types, à venir)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return allEvents
      .filter(e => new Date(e.date) > now)
      .filter(e => filterType === "tous" || e.type === filterType)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 10);
  }, [allEvents, filterType]);

  // Grille du calendrier
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Jour de la semaine du 1er (0=dim → convertir en lun=0)
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const days: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    // Compléter jusqu'à 42 cases (6 semaines)
    while (days.length < 42) days.push(null);
    return days;
  }, [currentMonth]);

  // Nombre d'événements par jour (pour les dots)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, number>();
    monthEvents.forEach(e => {
      const key = new Date(e.date).toDateString();
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [monthEvents]);

  const today = new Date();

  const prevMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, maxWidth: 1100 }}>

      {/* ── Colonne gauche : Calendrier ── */}
      <div>
        {/* Calendrier */}
        <div style={{
          background: "#fff",
          border: "1px solid #E2E5EC",
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
        }}>
          {/* Navigation mois */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}>
            <button onClick={prevMonth} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#9CA3AF", fontSize: 16, padding: "2px 6px",
            }}>‹</button>
            <div style={{ fontSize: 14, fontWeight: 600, color: colorNavy }}>
              {MONTHS_FR[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button onClick={nextMonth} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#9CA3AF", fontSize: 16, padding: "2px 6px",
            }}>›</button>
          </div>

          {/* Jours de la semaine */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 2,
            marginBottom: 4,
          }}>
            {DAYS_FR.map(d => (
              <div key={d} style={{
                textAlign: "center",
                fontSize: 10,
                fontWeight: 600,
                color: "#9CA3AF",
                padding: "2px 0",
              }}>{d}</div>
            ))}
          </div>

          {/* Grille jours */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {calendarDays.map((day, i) => {
              if (!day) return <div key={i} />;
              const isToday = isSameDay(day, today);
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
              const evCount = eventsByDay.get(day.toDateString()) ?? 0;

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    textAlign: "center",
                    padding: "5px 0",
                    borderRadius: 8,
                    cursor: "pointer",
                    position: "relative",
                    background: isSelected ? colorNavy : isToday ? `${colorGold}20` : "transparent",
                    color: isSelected ? "#fff" : isToday ? colorNavy : "#0D1B2E",
                    fontWeight: isToday || isSelected ? 700 : 400,
                    fontSize: 12,
                  }}
                >
                  {day.getDate()}
                  {evCount > 0 && (
                    <div style={{
                      position: "absolute",
                      bottom: 2,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: isSelected ? "#fff" : colorGold,
                    }}/>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Lien RDV en ligne */}
        {rdvProvider !== "none" && rdvUrl && (
          <div style={{
            background: colorNavy,
            borderRadius: 10,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>
                Prise de RDV en ligne
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>
                {rdvProvider === "cal" ? "Cal.com" : rdvProvider === "calendly" ? "Calendly" : "Lien personnalisé"}
              </div>
            </div>
            <button
              onClick={() => window.open(rdvUrl, "_blank")}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: "none",
                background: colorGold,
                color: colorNavy,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Ouvrir →
            </button>
          </div>
        )}
      </div>

      {/* ── Colonne droite : Événements ── */}
      <div>
        {/* Filtres */}
        <div style={{
          display: "flex",
          gap: 6,
          marginBottom: 12,
          flexWrap: "wrap",
        }}>
          {(["tous", "rdv", "rappel", "note", "appel", "tache"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                border: "1px solid #E2E5EC",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
                background: filterType === f ? colorNavy : "#fff",
                color: filterType === f ? "#fff" : "#4B5563",
                fontWeight: filterType === f ? 500 : 400,
              }}
            >
              {f === "tous" ? "Tous" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Événements du jour sélectionné */}
        {selectedDay && (
          <div style={{
            background: "#fff",
            border: "1px solid #E2E5EC",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colorNavy, marginBottom: 12 }}>
              {formatDateLong(selectedDay.toISOString())}
            </div>
            {dayEvents.length === 0 ? (
              <div style={{ fontSize: 12, color: "#9CA3AF", padding: "10px 0" }}>
                Aucun événement ce jour.
              </div>
            ) : (
              dayEvents.map(e => {
                const style = EVENT_COLORS[e.type] ?? EVENT_COLORS.note;
                return (
                  <div
                    key={e.id}
                    onClick={() => onOpenContact(e.contact)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      marginBottom: 6,
                      background: style.bg,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{
                      width: 3,
                      height: "100%",
                      minHeight: 32,
                      borderRadius: 2,
                      background: style.dot,
                      flexShrink: 0,
                    }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#0D1B2E" }}>
                        {e.title || e.type}
                      </div>
                      <div style={{ fontSize: 11, color: "#6B7280" }}>
                        {e.contact.displayName} · {formatTime(e.date)}
                        {e.channel ? ` · ${e.channel}` : ""}
                      </div>
                      {e.body && (
                        <div style={{
                          fontSize: 11,
                          color: "#9CA3AF",
                          marginTop: 3,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {e.body}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: style.color, fontWeight: 500, flexShrink: 0 }}>
                      {formatTime(e.date)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Prochains événements */}
        <div style={{
          background: "#fff",
          border: "1px solid #E2E5EC",
          borderRadius: 12,
          padding: "14px 16px",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: colorNavy, marginBottom: 12 }}>
            Prochains événements
          </div>
          {upcomingEvents.length === 0 ? (
            <div style={{ fontSize: 12, color: "#9CA3AF", padding: "10px 0" }}>
              Aucun événement à venir. Créez des RDV depuis les fiches clients.
            </div>
          ) : (
            upcomingEvents.map(e => {
              const style = EVENT_COLORS[e.type] ?? EVENT_COLORS.note;
              const d = new Date(e.date);
              return (
                <div
                  key={e.id}
                  onClick={() => onOpenContact(e.contact)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: "1px solid #F0F2F6",
                    cursor: "pointer",
                  }}
                >
                  {/* Date */}
                  <div style={{
                    width: 40,
                    textAlign: "center",
                    flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: colorNavy, lineHeight: 1 }}>
                      {d.getDate()}
                    </div>
                    <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase" }}>
                      {MONTHS_FR[d.getMonth()].slice(0, 3)}
                    </div>
                  </div>

                  {/* Dot type */}
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: style.dot,
                    flexShrink: 0,
                  }}/>

                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#0D1B2E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {e.title || e.type}
                    </div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                      {e.contact.displayName}
                    </div>
                  </div>

                  {/* Heure */}
                  <div style={{ fontSize: 11, color: "#6B7280", flexShrink: 0 }}>
                    {formatTime(e.date)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
