// src/components/WeekCalendar.tsx
// Vue semaine pour la prise de RDV — lun→sam, 8h→19h, créneaux 30min
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback, useEffect } from "react";
import type { CalSlotsCache, BusySlot } from "../hooks/useCalSync";
import { getWeekKey, getMondayOfWeek } from "../hooks/useCalSync";

interface WeekCalendarProps {
  getBusySlotsForWeek: (weekKey: string) => CalSlotsCache | null;
  fetchGoogleSlotsForWeek?: (weekKey: string) => Promise<BusySlot[]>;
  colorNavy: string;
  colorGold: string;
  onSelectSlot: (start: Date, end: Date) => void;
  selectedStart?: Date | null;
  selectedDuration?: number;
}

const HOUR_START = 8;
const HOUR_END = 19;
const SLOT_MIN = 30;
const SLOT_HEIGHT = 30;
const HEADER_HEIGHT = 42;
const TIME_COL_WIDTH = 48;
const SLOTS_PER_HOUR = 60 / SLOT_MIN;
const TOTAL_SLOTS = (HOUR_END - HOUR_START) * SLOTS_PER_HOUR;

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_FR = ["jan","fév","mar","avr","mai","jun","jul","aoû","sep","oct","nov","déc"];

function slotToTime(slot: number): string {
  const totalMin = HOUR_START * 60 + slot * SLOT_MIN;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

function dateToSlot(date: Date): number {
  return (date.getHours() - HOUR_START) * SLOTS_PER_HOUR + Math.floor(date.getMinutes() / SLOT_MIN);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function WeekCalendar({
  getBusySlotsForWeek, fetchGoogleSlotsForWeek, colorNavy, colorGold,
  onSelectSlot, selectedStart, selectedDuration = 60,
}: WeekCalendarProps) {

  const [currentMonday, setCurrentMonday] = useState(() => getMondayOfWeek(new Date()));
  const [hoverSlot, setHoverSlot] = useState<{ day: number; slot: number } | null>(null);
  const [googleSlots, setGoogleSlots] = useState<BusySlot[]>([]);
  const [googleOnline, setGoogleOnline] = useState(false); // eslint-disable-line

  const weekKey = getWeekKey(currentMonday);
  const cache = getBusySlotsForWeek(weekKey);
  const calSlots: BusySlot[] = cache?.busySlots ?? [];
  const calOnline = cache?.calOnline ?? false;
  const cachedAt = cache?.cachedAt ?? null;

  // Charger les slots Google async quand la semaine change
  useEffect(() => {
    if (!fetchGoogleSlotsForWeek) { setGoogleSlots([]); setGoogleOnline(false); return; }
    let cancelled = false;
    fetchGoogleSlotsForWeek(weekKey).then(slots => {
      if (!cancelled) { setGoogleSlots(slots); setGoogleOnline(true); }
    }).catch(() => { if (!cancelled) { setGoogleSlots([]); setGoogleOnline(false); } });
    return () => { cancelled = true; };
  }, [weekKey, fetchGoogleSlotsForWeek]);

  // Fusionner Cal.com + Google
  const busySlots: BusySlot[] = [...calSlots, ...googleSlots];

  const weekDays = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => addDays(currentMonday, i)),
  [currentMonday]);

  const busyMap = useMemo(() => {
    const map = new Map<string, BusySlot[]>();
    busySlots.forEach(bs => {
      const start = new Date(bs.start);
      const end = new Date(bs.end);
      weekDays.forEach((d, dayIdx) => {
        if (!isSameDay(start, d)) return;
        const startSlot = Math.max(0, dateToSlot(start));
        const endSlot = Math.min(TOTAL_SLOTS, dateToSlot(end) + (end.getMinutes() % SLOT_MIN > 0 ? 1 : 0));
        for (let s = startSlot; s < endSlot; s++) {
          const key = `${dayIdx}-${s}`;
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(bs);
        }
      });
    });
    return map;
  }, [busySlots, weekDays]);

  const selectedSlots = useMemo(() => {
    const set = new Set<string>();
    if (!selectedStart) return set;
    const dayIdx = weekDays.findIndex(d => isSameDay(d, selectedStart));
    if (dayIdx < 0) return set;
    const startSlot = dateToSlot(selectedStart);
    const count = Math.ceil(selectedDuration / SLOT_MIN);
    for (let i = 0; i < count; i++) set.add(`${dayIdx}-${startSlot + i}`);
    return set;
  }, [selectedStart, selectedDuration, weekDays]);

  const handleSlotClick = useCallback((dayIdx: number, slotIdx: number) => {
    const day = weekDays[dayIdx];
    const totalMin = HOUR_START * 60 + slotIdx * SLOT_MIN;
    const start = new Date(day);
    start.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0);
    const end = new Date(start.getTime() + selectedDuration * 60000);
    onSelectSlot(start, end);
  }, [weekDays, selectedDuration, onSelectSlot]);

  const prevWeek = () => setCurrentMonday((d: Date) => addDays(d, -7));
  const nextWeek = () => setCurrentMonday((d: Date) => addDays(d, 7));
  const goToday  = () => setCurrentMonday(getMondayOfWeek(new Date()));

  const cacheAge = cachedAt
    ? Math.floor((Date.now() - new Date(cachedAt).getTime()) / 60000)
    : null;

  const totalHeight = TOTAL_SLOTS * SLOT_HEIGHT;
  const today = new Date();

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <button onClick={prevWeek} style={{ padding: "4px 10px", border: "1px solid #E2E5EC", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>‹</button>
        <button onClick={goToday} style={{ padding: "4px 10px", border: "1px solid #E2E5EC", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: colorNavy }}>Aujourd'hui</button>
        <button onClick={nextWeek} style={{ padding: "4px 10px", border: "1px solid #E2E5EC", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>›</button>
        <span style={{ fontSize: 13, fontWeight: 600, color: colorNavy, marginLeft: 4 }}>
          Semaine du {currentMonday.getDate()} {MONTHS_FR[currentMonday.getMonth()]} {currentMonday.getFullYear()}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#9CA3AF" }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: "#DBEAFE" }}/>Cal.com
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#9CA3AF" }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: "#D1FAE5" }}/>Kleios
          </div>
          {fetchGoogleSlotsForWeek && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#9CA3AF" }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "#EDE9FE" }}/>Google
              </div>
              <div style={{ padding: "3px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500, background: googleOnline ? "#EDE9FE" : "#F3F4F6", color: googleOnline ? "#5B21B6" : "#9CA3AF" }}>
                {googleOnline ? "Google ✓" : "Google..."}
              </div>
            </>
          )}
          {cache ? (
            <div style={{ padding: "3px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500, background: calOnline ? "#ECFDF5" : "#FEF3C7", color: calOnline ? "#065F46" : "#92400E" }}>
              {calOnline ? `Cal.com ✓${cacheAge !== null ? ` · il y a ${cacheAge}min` : ""}` : "⚠ Cal.com hors ligne"}
            </div>
          ) : (
            <div style={{ padding: "3px 8px", borderRadius: 10, fontSize: 10, background: "#F3F4F6", color: "#9CA3AF" }}>
              Configurez Cal.com dans les paramètres
            </div>
          )}
        </div>
      </div>

      {/* Grille */}
      <div style={{ border: "1px solid #E2E5EC", borderRadius: 10, overflow: "hidden", background: "#fff" }}>

        {/* En-têtes */}
        <div style={{ display: "grid", gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(6, 1fr)`, borderBottom: "2px solid #E2E5EC", background: "#F8F9FB", height: HEADER_HEIGHT }}>
          <div />
          {weekDays.map((d, i) => {
            const isToday = isSameDay(d, today);
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderLeft: "1px solid #E2E5EC", padding: "4px 0" }}>
                <div style={{ fontSize: 10, color: isToday ? colorNavy : "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {DAYS_FR[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                </div>
                <div style={{ fontSize: 14, fontWeight: isToday ? 700 : 400, color: isToday ? "#fff" : "#0D1B2E", background: isToday ? colorNavy : "transparent", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Corps scrollable */}
        <div style={{ overflowY: "auto", maxHeight: 440 }}>
          <div style={{ display: "grid", gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(6, 1fr)`, height: totalHeight, position: "relative" }}>

            {/* Colonne heures */}
            <div style={{ position: "relative", borderRight: "1px solid #E2E5EC" }}>
              {Array.from({ length: HOUR_END - HOUR_START + 1 }).map((_, i) => (
                <div key={i} style={{
                  position: "absolute",
                  top: i * SLOTS_PER_HOUR * SLOT_HEIGHT - 7,
                  right: 6,
                  fontSize: 10,
                  color: "#6B7280",
                  lineHeight: 1,
                  fontWeight: 500,
                  userSelect: "none",
                }}>
                  {String(HOUR_START + i).padStart(2, "0")}h
                </div>
              ))}
            </div>

            {/* Colonnes jours */}
            {weekDays.map((_, dayIdx) => (
              <div key={dayIdx} style={{ borderLeft: "1px solid #E2E5EC", position: "relative", height: totalHeight }}>

                {/* Lignes horaires */}
                {Array.from({ length: HOUR_END - HOUR_START + 1 }).map((_, i) => (
                  <div key={`h-${i}`} style={{
                    position: "absolute",
                    top: i * SLOTS_PER_HOUR * SLOT_HEIGHT,
                    left: 0, right: 0,
                    height: 1,
                    background: "#D1D5DB",
                    pointerEvents: "none",
                  }}/>
                ))}

                {/* Lignes demi-heures */}
                {Array.from({ length: HOUR_END - HOUR_START }).map((_, i) => (
                  <div key={`hh-${i}`} style={{
                    position: "absolute",
                    top: i * SLOTS_PER_HOUR * SLOT_HEIGHT + SLOT_HEIGHT,
                    left: 0, right: 0,
                    height: 1,
                    background: "#F0F0F0",
                    pointerEvents: "none",
                  }}/>
                ))}

                {/* Créneaux */}
                {Array.from({ length: TOTAL_SLOTS }).map((_, slotIdx) => {
                  const key = `${dayIdx}-${slotIdx}`;
                  const busyHere = busyMap.get(key) ?? [];
                  const isBusyCal = busyHere.some(b => b.source === "cal");
                  const isBusyKleios = busyHere.some(b => b.source === "kleios");
                  const isBusy = busyHere.length > 0;
                  const isSelected = selectedSlots.has(key);
                  const isHovered = hoverSlot?.day === dayIdx && hoverSlot?.slot === slotIdx;

                  const isBusyGoogle = busyHere.some(b => b.source === "cal" && googleSlots.some(g => g.start === b.start));
                  let bg = "transparent";
                  if (isSelected) bg = `${colorGold}55`;
                  else if (isBusyCal && isBusyKleios) bg = "#A7F3D0";
                  else if (isBusyGoogle) bg = "#EDE9FE";
                  else if (isBusyCal) bg = "#DBEAFE";
                  else if (isBusyKleios) bg = "#D1FAE5";
                  else if (isHovered) bg = `${colorGold}22`;

                  const busyTitle = busyHere.map(b => b.title).filter(Boolean).join(", ");
                  const slotLabel = slotToTime(slotIdx);
                  const endLabel = slotToTime(slotIdx + Math.ceil(selectedDuration / SLOT_MIN));

                  return (
                    <div
                      key={slotIdx}
                      title={isBusy
                        ? `Occupé${busyTitle ? ` : ${busyTitle}` : ""}`
                        : `${slotLabel} → ${endLabel}`
                      }
                      onClick={() => !isBusy && handleSlotClick(dayIdx, slotIdx)}
                      onMouseEnter={() => setHoverSlot({ day: dayIdx, slot: slotIdx })}
                      onMouseLeave={() => setHoverSlot(null)}
                      style={{
                        position: "absolute",
                        top: slotIdx * SLOT_HEIGHT,
                        left: 0, right: 0,
                        height: SLOT_HEIGHT,
                        background: bg,
                        cursor: isBusy ? "not-allowed" : "pointer",
                        transition: "background 0.08s",
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: 3,
                        boxSizing: "border-box",
                      }}
                    >
                      {/* Heure visible au survol */}
                      {isHovered && !isBusy && (
                        <span style={{ fontSize: 9, color: colorNavy, fontWeight: 600, opacity: 0.7, userSelect: "none" }}>
                          {slotLabel}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 6 }}>
        Survolez un créneau pour voir l'heure — cliquez pour sélectionner. Les créneaux colorés sont occupés.
      </div>
    </div>
  );
}
