// src/components/AgendaIFC.tsx — v3
// Direction : ops-pro. Grille dense mais aérée. Cards événements expressives.
// Fond #DADDE1 → grille blanche avec ombre forte → événements colorés très lisibles
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { ContactRecord } from "../types/crm";

export type AgendaEventType = "visite" | "relance" | "prospect" | "externe";

export interface AgendaEvent {
  id: string;
  type: AgendaEventType;
  titre: string;
  entrepriseId: string | null;
  entrepriseNom: string;
  adresse: string;
  telTuteur: string;
  mailTuteur: string;
  nomTuteur: string;
  eleves: string[];
  date: string;
  heureDebut: string;
  dureeMin: number;
  notes: string;
  done: boolean;
  reminderSent: boolean;
  createdAt: string;
}

interface AgendaIFCProps {
  contacts: ContactRecord[];
  userId: string;
  colorNavy: string;
  colorGold: string;
  userEmail?: string;
  onOpenContact?: (record: ContactRecord) => void;
  onOpenEchanges?: (record: ContactRecord) => void;
}

const H_START = 8;
const H_END   = 19;
const SLOT_PX = 64; // px par heure — plus grand = plus d'espace

const TYPE_CFG: Record<AgendaEventType, { label: string; color: string; light: string; dark: string; icon: string }> = {
  visite:   { label: "Visite tuteur",    color: "#E8722A", light: "#FEF0E6", dark: "#C85E1E", icon: "🏢" },
  relance:  { label: "Relance",          color: "#D97706", light: "#FFFBEB", dark: "#B45309", icon: "📞" },
  prospect: { label: "RDV prospect",     color: "#2563EB", light: "#EFF6FF", dark: "#1D4ED8", icon: "🔍" },
  externe:  { label: "Événement",        color: "#7C3AED", light: "#F5F3FF", dark: "#6D28D9", icon: "📅" },
};

const JOURS_COURT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DUREES = [15, 30, 45, 60, 90, 120];

function getMonday(d: Date): Date {
  const r = new Date(d); const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day));
  r.setHours(0,0,0,0); return r;
}
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function toISO(d: Date): string { return d.toISOString().slice(0,10); }
function formatWeek(s: Date): string {
  const e = addDays(s, 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${s.toLocaleDateString("fr-FR", opts)} – ${e.toLocaleDateString("fr-FR", opts)}`;
}
function timeToMin(hhmm: string): number { const [h,m]=hhmm.split(":").map(Number); return h*60+m; }
function minToTime(min: number): string {
  return `${String(Math.floor(min/60)).padStart(2,"0")}:${String(min%60).padStart(2,"0")}`;
}

function buildMailto(ev: AgendaEvent, userEmail: string): string {
  const dateStr = new Date(ev.date).toLocaleDateString("fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  let subject = "", body = "";
  if (ev.type === "visite") {
    subject = `Visite tuteur — ${ev.entrepriseNom} — ${dateStr}`;
    body = `Bonjour ${ev.nomTuteur || ""},\n\nJe vous contacte pour confirmer notre visite tuteur prévue le ${dateStr} à ${ev.heureDebut}${ev.adresse ? ` (${ev.adresse})` : ""}.\n\n${(ev.eleves?.length ?? 0) > 0 ? `Élève(s) : ${(ev.eleves??[]).join(", ")}\n\n` : ""}${ev.notes ? `Notes : ${ev.notes}\n\n` : ""}Cordialement`;
  } else {
    subject = `RDV — ${ev.entrepriseNom} — ${dateStr}`;
    body = `Bonjour ${ev.nomTuteur || ""},\n\nJe vous contacte pour confirmer notre rendez-vous le ${dateStr} à ${ev.heureDebut}${ev.adresse ? ` (${ev.adresse})` : ""}.\n\n${ev.notes ? `Objet : ${ev.notes}\n\n` : ""}Cordialement`;
  }
  const p = new URLSearchParams();
  if (userEmail) p.set("from", userEmail);
  p.set("subject", subject); p.set("body", body);
  return `mailto:${ev.mailTuteur}?${p.toString().replace(/\+/g,"%20")}`;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function EventModal({ event, contacts, colorNavy: _cn, userEmail, onSave, onDelete, onClose }: {
  event: Partial<AgendaEvent> & { date: string; heureDebut: string };
  contacts: ContactRecord[];
  colorNavy: string; userEmail: string;
  onSave: (e: AgendaEvent) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const isEdit = !!event.id;
  const [type,         setType]         = useState<AgendaEventType>(event.type ?? "visite");
  const [titre,        setTitre]        = useState(event.titre ?? "");
  const [entrepriseId, setEntrepriseId] = useState(event.entrepriseId ?? "");
  const [date,         setDate]         = useState(event.date);
  const [heure,        setHeure]        = useState(event.heureDebut);
  const [duree,        setDuree]        = useState(event.dureeMin ?? 60);
  const [notes,        setNotes]        = useState(event.notes ?? "");
  const [adresse,      setAdresse]      = useState(event.adresse ?? "");
  const [telTuteur,    setTelTuteur]    = useState(event.telTuteur ?? "");
  const [mailTuteur,   setMailTuteur]   = useState(event.mailTuteur ?? "");
  const [nomTuteur,    setNomTuteur]    = useState(event.nomTuteur ?? "");
  const [eleves,       setEleves]       = useState<string[]>(event.eleves ?? []);
  const [eleveInput,   setEleveInput]   = useState("");

  const selectedContact = contacts.find(c => c.id === entrepriseId);
  const cfg = TYPE_CFG[type];

  useEffect(() => {
    if (!selectedContact) return;
    const e = selectedContact.payload?.contact as any;
    if (!titre) setTitre(`${TYPE_CFG[type].icon} ${selectedContact.displayName}`);
    if (!adresse && e?.address1) setAdresse([e.address1, e.postalCode, e.city].filter(Boolean).join(", "));
    if (!telTuteur && e?.telFixe) setTelTuteur(e.telFixe);
    if (!mailTuteur && e?.email) setMailTuteur(e.email);
  }, [entrepriseId]);

  const addEleve = () => {
    if (eleveInput.trim() && !eleves.includes(eleveInput.trim())) {
      setEleves(p => [...p, eleveInput.trim()]); setEleveInput("");
    }
  };

  const handleSave = () => {
    if (!titre.trim()) return;
    onSave({
      id: event.id ?? crypto.randomUUID(), type, titre,
      entrepriseId: entrepriseId || null,
      entrepriseNom: selectedContact?.displayName ?? "",
      adresse, telTuteur, mailTuteur, nomTuteur, eleves,
      date, heureDebut: heure, dureeMin: duree,
      notes, done: event.done ?? false,
      reminderSent: event.reminderSent ?? false,
      createdAt: event.createdAt ?? new Date().toISOString(),
    });
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1.5px solid #E8ECF0", fontSize: 13, fontFamily: "inherit",
    outline: "none", color: "#0D1B2E", background: "#F8FAFC",
    boxSizing: "border-box", transition: "border-color 0.15s",
  };

  const lbl = (text: string) => (
    <label style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: 0.6, textTransform: "uppercase", display: "block", marginBottom: 5 }}>{text}</label>
  );

  return (
    <div style={{ position:"fixed",inset:0,zIndex:300,background:"rgba(13,27,46,0.5)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"#fff",borderRadius:20,width:540,maxWidth:"95vw",maxHeight:"90vh",
        boxShadow:"0 32px 80px rgba(13,27,46,0.25), 0 0 0 1px rgba(13,27,46,0.06)",
        overflow:"hidden",display:"flex",flexDirection:"column",
      }}>
        {/* Header coloré selon le type */}
        <div style={{ background: cfg.color, padding:"18px 22px", flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <span style={{ fontSize:22 }}>{cfg.icon}</span>
              <div>
                <div style={{ fontSize:15,fontWeight:700,color:"#fff" }}>{isEdit ? "Modifier" : "Nouvel événement"}</div>
                <div style={{ fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:1 }}>{cfg.label}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
          </div>
          {/* Sélecteur type inline */}
          <div style={{ display:"flex",gap:6,marginTop:14 }}>
            {(Object.entries(TYPE_CFG) as [AgendaEventType, typeof TYPE_CFG.visite][]).map(([t,c])=>(
              <button key={t} onClick={()=>setType(t)} style={{
                flex:1,padding:"6px 4px",borderRadius:8,fontSize:11,fontWeight:700,
                background:type===t?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.08)",
                border:type===t?"1.5px solid rgba(255,255,255,0.5)":"1.5px solid transparent",
                color:"#fff",cursor:"pointer",fontFamily:"inherit",
                transition:"all 0.15s",
              }}>{c.icon} {c.label.split(" ")[0]}</button>
            ))}
          </div>
        </div>

        {/* Corps */}
        <div style={{ padding:"20px 22px",display:"flex",flexDirection:"column",gap:14,overflowY:"auto" }}>
          {/* Titre */}
          <div>{lbl("Titre")}<input value={titre} onChange={e=>setTitre(e.target.value)} placeholder="Titre de l'événement…" style={inp}/></div>

          {/* Entreprise */}
          <div>{lbl("Entreprise / Organisme")}
            <select value={entrepriseId} onChange={e=>setEntrepriseId(e.target.value)} style={{...inp,appearance:"none"}}>
              <option value="">— Aucune —</option>
              {contacts.map(c=><option key={c.id} value={c.id}>{c.displayName}{c.city?` · ${c.city}`:""}</option>)}
            </select>
          </div>

          {/* Date + Heure + Durée */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10 }}>
            <div>{lbl("Date")}<input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></div>
            <div>{lbl("Heure")}<input type="time" value={heure} onChange={e=>setHeure(e.target.value)} style={inp}/></div>
            <div>{lbl("Durée")}
              <select value={duree} onChange={e=>setDuree(Number(e.target.value))} style={{...inp,appearance:"none"}}>
                {DUREES.map(d=><option key={d} value={d}>{d < 60 ? `${d} min` : `${d/60}h`}</option>)}
              </select>
            </div>
          </div>

          {/* Coordonnées */}
          <div style={{ background:"#F8FAFC",borderRadius:12,padding:"14px 16px",border:"1px solid #E8ECF0" }}>
            <div style={{ fontSize:10,fontWeight:700,color:"#94A3B8",letterSpacing:0.6,textTransform:"uppercase",marginBottom:10 }}>Coordonnées tuteur / contact</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
              <div>{lbl("Nom")}<input value={nomTuteur} onChange={e=>setNomTuteur(e.target.value)} placeholder="Mme Dupont" style={inp}/></div>
              <div>{lbl("Téléphone")}<input value={telTuteur} onChange={e=>setTelTuteur(e.target.value)} placeholder="06 …" style={inp} type="tel"/></div>
            </div>
            <div style={{ marginBottom:10 }}>{lbl("Email")}<input value={mailTuteur} onChange={e=>setMailTuteur(e.target.value)} placeholder="contact@…" style={inp} type="email"/></div>
            <div>{lbl("Adresse")}<input value={adresse} onChange={e=>setAdresse(e.target.value)} placeholder="12 rue…" style={inp}/></div>
          </div>

          {/* Élèves */}
          {type === "visite" && (
            <div>
              <div style={{ fontSize:10,fontWeight:700,color:"#94A3B8",letterSpacing:0.6,textTransform:"uppercase",marginBottom:8 }}>Élève(s) concerné(s)</div>
              <div style={{ display:"flex",gap:8,marginBottom:8 }}>
                <input value={eleveInput} onChange={e=>setEleveInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addEleve()} placeholder="Prénom Nom…" style={{...inp,flex:1}}/>
                <button onClick={addEleve} style={{ padding:"9px 14px",borderRadius:8,border:`1.5px solid ${cfg.color}30`,background:`${cfg.color}10`,color:cfg.color,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" }}>+ Ajouter</button>
              </div>
              {eleves.length > 0 && (
                <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                  {eleves.map((el,i)=>(
                    <span key={i} style={{ background:`${cfg.color}12`,color:cfg.dark,border:`1px solid ${cfg.color}25`,borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6 }}>
                      👤 {el}
                      <button onClick={()=>setEleves(p=>p.filter((_,j)=>j!==i))} style={{ background:"none",border:"none",color:cfg.color,cursor:"pointer",padding:0,fontSize:14,lineHeight:1 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>{lbl("Notes")}<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Objectifs, infos utiles…" style={{...inp,resize:"vertical",lineHeight:1.6}}/></div>

          {/* Actions */}
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={handleSave} disabled={!titre.trim()} style={{
              flex:1,padding:"11px",borderRadius:10,border:"none",
              background:titre.trim()?cfg.color:"#E2E8F0",
              color:"#fff",fontSize:13,fontWeight:700,
              cursor:titre.trim()?"pointer":"not-allowed",fontFamily:"inherit",
              transition:"all 0.15s",
            }}>{isEdit?"Enregistrer les modifications":"✓ Créer l'événement"}</button>

            {isEdit && (type==="visite"||type==="prospect") && mailTuteur && (
              <a href={buildMailto({
                id:"",type,titre,entrepriseId:entrepriseId||null,
                entrepriseNom:selectedContact?.displayName??"",
                adresse,telTuteur,mailTuteur,nomTuteur,eleves,
                date,heureDebut:heure,dureeMin:duree,
                notes,done:false,reminderSent:false,createdAt:"",
              }, userEmail)} style={{
                padding:"11px 16px",borderRadius:10,
                border:`1.5px solid ${cfg.color}30`,background:`${cfg.color}08`,
                color:cfg.color,fontSize:12,fontWeight:700,
                textDecoration:"none",display:"flex",alignItems:"center",gap:6,
              }}>✉ Email</a>
            )}

            {isEdit && onDelete && (
              <button onClick={()=>{onDelete(event.id!);onClose();}} style={{
                padding:"11px 16px",borderRadius:10,
                border:"1.5px solid #FEE2E2",background:"#FFF5F5",
                color:"#EF4444",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
              }}>🗑</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Toast rappels ─────────────────────────────────────────────────────────────

function ReminderToast({ events, onClose, onOpenEvent, colorNavy }: {
  events: AgendaEvent[]; onClose: () => void;
  onOpenEvent: (ev: AgendaEvent) => void; colorNavy: string;
}) {
  if (!events.length) return null;
  return (
    <div style={{
      position:"fixed",bottom:28,right:28,zIndex:400,
      background:"#fff",borderRadius:16,
      boxShadow:"0 16px 48px rgba(13,27,46,0.20), 0 0 0 1px rgba(13,27,46,0.08)",
      overflow:"hidden",maxWidth:360,
      animation:"toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      <style>{`@keyframes toastIn{from{transform:translateY(20px) scale(0.96);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}`}</style>
      <div style={{ background:colorNavy,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontSize:13,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ background:"#EF4444",color:"#fff",borderRadius:20,padding:"1px 7px",fontSize:11,fontWeight:800 }}>{events.length}</span>
          Rappels dans 48h
        </div>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",width:28,height:28,borderRadius:7,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
      </div>
      <div style={{ padding:"12px 14px",display:"flex",flexDirection:"column",gap:8 }}>
        {events.map(ev=>{
          const cfg = TYPE_CFG[ev.type];
          return (
            <div key={ev.id} onClick={()=>onOpenEvent(ev)} style={{
              display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
              borderRadius:10,background:cfg.light,border:`1px solid ${cfg.color}20`,cursor:"pointer",
            }}>
              <div style={{ width:36,height:36,borderRadius:9,background:cfg.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>{cfg.icon}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:12,fontWeight:700,color:cfg.dark,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis" }}>{ev.titre}</div>
                <div style={{ fontSize:11,color:"#64748B",marginTop:1 }}>{ev.date} · {ev.heureDebut}{ev.entrepriseNom?` · ${ev.entrepriseNom}`:""}</div>
              </div>
              <div style={{ fontSize:10,fontWeight:700,color:cfg.color }}>›</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function AgendaIFC({ contacts, userId, colorNavy, colorGold: _cg, userEmail="", onOpenContact, onOpenEchanges }: AgendaIFCProps) {
  const storageKey = `kleios_ifc_agenda_${userId}`;
  const [events,       setEvents]       = useState<AgendaEvent[]>([]);
  const [weekStart,    setWeekStart]    = useState<Date>(()=>getMonday(new Date()));
  const [modal,        setModal]        = useState<(Partial<AgendaEvent>&{date:string;heureDebut:string})|null>(null);
  const [activeFilter, setActiveFilter] = useState<AgendaEventType|"all">("all");
  const [reminders,    setReminders]    = useState<AgendaEvent[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored: AgendaEvent[] = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      setEvents(stored);
      const now = new Date(), in48h = new Date(now.getTime()+48*3600000);
      const remind = stored.filter(ev => {
        if (ev.done||ev.reminderSent||ev.type==="relance"||ev.type==="externe") return false;
        const d = new Date(`${ev.date}T${ev.heureDebut}`);
        return d > now && d <= in48h;
      });
      if (remind.length) setReminders(remind);
    } catch {}
  }, [storageKey]);

  const saveEvents = useCallback((evts: AgendaEvent[]) => {
    setEvents(evts);
    try { localStorage.setItem(storageKey, JSON.stringify(evts)); } catch {}
  }, [storageKey]);

  const dismissReminders = useCallback(() => {
    saveEvents(events.map(ev => reminders.some(r=>r.id===ev.id) ? {...ev,reminderSent:true} : ev));
    setReminders([]);
  }, [events, reminders, saveEvents]);

  const days = useMemo(()=>Array.from({length:7},(_,i)=>addDays(weekStart,i)),[weekStart]);

  const weekEvents = useMemo(()=>{
    const s=toISO(weekStart), e=toISO(addDays(weekStart,6));
    return events.filter(ev=>ev.date>=s&&ev.date<=e&&(activeFilter==="all"||ev.type===activeFilter));
  },[events,weekStart,activeFilter]);

  const handleSave = useCallback((ev: AgendaEvent) => {
    saveEvents(events.some(e=>e.id===ev.id)?events.map(e=>e.id===ev.id?ev:e):[...events,ev]);
    setModal(null);
  },[events,saveEvents]);

  const handleDelete    = useCallback((id:string)=>saveEvents(events.filter(e=>e.id!==id)),[events,saveEvents]);
  const handleDone      = useCallback((id:string)=>saveEvents(events.map(e=>e.id===id?{...e,done:!e.done}:e)),[events,saveEvents]);
  const handleGridClick = useCallback((date:string, y:number)=>{
    const min = H_START*60+Math.floor(y/SLOT_PX*60);
    setModal({date,heureDebut:minToTime(Math.round(min/15)*15)});
  },[]);

  const today  = toISO(new Date());
  const heures = Array.from({length:H_END-H_START},(_,i)=>H_START+i);

  const counts = useMemo(()=>{
    const s=toISO(weekStart),e=toISO(addDays(weekStart,6));
    const w=events.filter(ev=>ev.date>=s&&ev.date<=e);
    return {all:w.length,visite:w.filter(ev=>ev.type==="visite").length,relance:w.filter(ev=>ev.type==="relance").length,prospect:w.filter(ev=>ev.type==="prospect").length,externe:w.filter(ev=>ev.type==="externe").length};
  },[events,weekStart]);

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"calc(100vh - 72px)",gap:0,fontFamily:"inherit" }}>
      <style>{`
        .ag-slot:hover{background:rgba(37,99,235,0.03)!important;cursor:pointer}
        .ag-ev{transition:filter 0.12s,transform 0.12s;cursor:pointer}
        .ag-ev:hover{filter:brightness(0.93);transform:translateX(1px)}
        .ag-ev:active{transform:scale(0.98)}
        .ag-day-col{transition:background 0.15s}
        @keyframes evIn{from{opacity:0;transform:scaleY(0.8)}to{opacity:1;transform:scaleY(1)}}
      `}</style>

      {/* ── BARRE NAV ── */}
      <div style={{
        background:"#fff",
        borderRadius:14,
        border:"1.5px solid #C8D0DB",
        boxShadow:"0 2px 10px rgba(13,27,46,0.08)",
        padding:"12px 16px",marginBottom:12,
        display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,
      }}>
        {/* Navigation semaine */}
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <button onClick={()=>setWeekStart(d=>addDays(d,-7))} style={{
            width:34,height:34,borderRadius:9,border:"1.5px solid #E2E8F0",background:"#F8FAFC",
            cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",color:"#475569",
          }}>‹</button>
          <div style={{ fontWeight:700,fontSize:14,color:"#0D1B2E",minWidth:210,textAlign:"center",letterSpacing:"-0.2px" }}>
            {formatWeek(weekStart)}
          </div>
          <button onClick={()=>setWeekStart(d=>addDays(d,7))} style={{
            width:34,height:34,borderRadius:9,border:"1.5px solid #E2E8F0",background:"#F8FAFC",
            cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",color:"#475569",
          }}>›</button>
          <button onClick={()=>setWeekStart(getMonday(new Date()))} style={{
            padding:"6px 14px",borderRadius:9,border:`1.5px solid ${colorNavy}25`,background:`${colorNavy}06`,
            color:colorNavy,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
          }}>Aujourd'hui</button>
        </div>

        {/* Filtres */}
        <div style={{ display:"flex",gap:6,alignItems:"center" }}>
          {([["all","Tous","#475569"]] as [string,string,string][]).concat(
            (Object.entries(TYPE_CFG) as [AgendaEventType, typeof TYPE_CFG.visite][]).map(([t,c])=>[t,c.icon+" "+c.label.split(" ")[0],c.color] as [string,string,string])
          ).map(([t,label,color])=>(
            <button key={t} onClick={()=>setActiveFilter(t as AgendaEventType|"all")} style={{
              padding:"5px 11px",borderRadius:20,fontSize:11,fontWeight:700,
              border:`1.5px solid ${activeFilter===t?color:"#E2E8F0"}`,
              background:activeFilter===t?`${color}12`:"transparent",
              color:activeFilter===t?color:"#94A3B8",
              cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,
              transition:"all 0.12s",
            }}>
              {label}
              {counts[t as keyof typeof counts]>0&&(
                <span style={{ background:activeFilter===t?color:"#CBD5E1",color:activeFilter===t?"#fff":"#475569",borderRadius:10,padding:"0 5px",fontSize:9,fontWeight:800 }}>
                  {counts[t as keyof typeof counts]}
                </span>
              )}
            </button>
          ))}
          <button onClick={()=>setModal({date:today,heureDebut:"09:00"})} style={{
            padding:"8px 16px",borderRadius:9,border:"none",
            background:colorNavy,color:"#fff",fontSize:12,fontWeight:700,
            cursor:"pointer",fontFamily:"inherit",marginLeft:4,
            boxShadow:`0 2px 8px ${colorNavy}40`,
          }}>+ Événement</button>
        </div>
      </div>

      {/* ── GRILLE ── */}
      <div style={{
        flex:1,overflow:"hidden",display:"flex",flexDirection:"column",
        background:"#fff",borderRadius:14,
        border:"2px solid #C8D0DB",
        boxShadow:"0 4px 20px rgba(13,27,46,0.12)",
      }}>
        {/* En-têtes jours */}
        <div style={{ display:"grid",gridTemplateColumns:"52px repeat(7,1fr)",borderBottom:"2px solid #C8D0DB",flexShrink:0,background:"#F4F6F9" }}>
          <div/>
          {days.map((day,i)=>{
            const iso=toISO(day), isToday=iso===today;
            const hasEvents=weekEvents.some(e=>e.date===iso);
            return (
              <div key={i} style={{ padding:"10px 6px",textAlign:"center",borderLeft:"1.5px solid #D1D9E0" }}>
                <div style={{ fontSize:9,fontWeight:800,color:isToday?colorNavy:"#94A3B8",letterSpacing:1,textTransform:"uppercase",marginBottom:4 }}>
                  {JOURS_COURT[i]}
                </div>
                <div style={{
                  fontSize:18,fontWeight:800,width:36,height:36,borderRadius:"50%",margin:"0 auto",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  background:isToday?colorNavy:"transparent",
                  color:isToday?"#fff":hasEvents?"#0D1B2E":"#CBD5E1",
                  position:"relative",
                }}>
                  {day.getDate()}
                  {hasEvents&&!isToday&&<div style={{ position:"absolute",bottom:3,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:"50%",background:colorNavy }}/>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grille scrollable */}
        <div ref={gridRef} style={{ flex:1,overflowY:"auto" }}>
          <div style={{ display:"grid",gridTemplateColumns:"52px repeat(7,1fr)",minHeight:(H_END-H_START)*SLOT_PX+32 }}>
            {/* Heures */}
            <div style={{ borderRight:"2px solid #C8D0DB",borderBottom:"2px solid #C8D0DB",background:"#F0F3F7" }}>
              {heures.map(h=>(
                <div key={h} style={{ height:SLOT_PX,display:"flex",alignItems:"flex-start",justifyContent:"flex-end",paddingRight:10,paddingTop:6 }}>
                  <span style={{ fontSize:11,fontWeight:700,color:"#7A8FA6",whiteSpace:"nowrap" }}>{h}:00</span>
                </div>
              ))}
            </div>

            {/* Colonnes jours */}
            {days.map((day,di)=>{
              const iso=toISO(day), isToday=iso===today;
              const dayEvts=weekEvents.filter(e=>e.date===iso).sort((a,b)=>a.heureDebut.localeCompare(b.heureDebut));
              return (
                <div key={di} className="ag-day-col" style={{
                  borderLeft:"1.5px solid #D1D9E0",borderBottom:"2px solid #C8D0DB",position:"relative",
                  background:isToday?"rgba(37,99,235,0.015)":"transparent",
                }}>
                  {/* Slots */}
                  {heures.map(h=>(
                    <div key={h} className="ag-slot" onClick={()=>handleGridClick(iso,(h-H_START)*SLOT_PX)} style={{
                      height:SLOT_PX,
                      borderTop:h===H_START?"none":`${h%2===0?"2px solid #D1D9E0":"1px solid #E8ECF1"}`,
                    }}/>
                  ))}

                  {/* Ligne heure courante */}
                  {isToday&&(()=>{
                    const n=new Date(),min=(n.getHours()-H_START)*60+n.getMinutes();
                    if(min<0||min>(H_END-H_START)*60)return null;
                    const top=(min/60)*SLOT_PX;
                    return (
                      <>
                        <div style={{ position:"absolute",left:-6,top:top-5,width:10,height:10,borderRadius:"50%",background:"#2563EB",zIndex:10 }}/>
                        <div style={{ position:"absolute",left:4,right:0,top,height:2,background:"#2563EB",zIndex:9,opacity:0.8 }}/>
                      </>
                    );
                  })()}

                  {/* Événements */}
                  {dayEvts.map(ev=>{
                    const cfg=TYPE_CFG[ev.type];
                    const startMin=timeToMin(ev.heureDebut)-H_START*60;
                    const top=(startMin/60)*SLOT_PX;
                    const height=Math.max((ev.dureeMin/60)*SLOT_PX-3,24);
                    const isRemind=reminders.some(r=>r.id===ev.id);
                    const contact=contacts.find(c=>c.id===ev.entrepriseId);

                    return (
                      <div key={ev.id} className="ag-ev" onClick={e=>{e.stopPropagation();setModal(ev);}} style={{
                        position:"absolute",left:4,right:4,top,height,
                        background:ev.done?"#F1F5F9":cfg.color,
                        borderRadius:8,padding:"5px 8px",
                        zIndex:4,overflow:"hidden",
                        opacity:ev.done?0.55:1,
                        animation:"evIn 0.2s ease",
                        boxShadow:ev.done?"none":isRemind?`0 0 0 2px #fff, 0 0 0 4px ${cfg.color}`:`0 2px 6px ${cfg.color}40`,
                      }}>
                        {/* Ligne de titre */}
                        <div style={{ fontSize:11,fontWeight:700,color:ev.done?"#94A3B8":"#fff",lineHeight:1.2,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis" }}>
                          {isRemind&&"🔔 "}{ev.heureDebut} {ev.titre}
                        </div>
                        {height>36&&ev.entrepriseNom&&(
                          <div style={{ fontSize:10,color:"rgba(255,255,255,0.75)",marginTop:2,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis" }}>
                            {ev.entrepriseNom}{ev.nomTuteur&&` · ${ev.nomTuteur}`}
                          </div>
                        )}
                        {height>50&&(ev.eleves?.length??0)>0&&(
                          <div style={{ fontSize:9,color:"rgba(255,255,255,0.85)",marginTop:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",fontWeight:600 }}>
                            👤 {(ev.eleves??[]).join(", ")}
                          </div>
                        )}
                        {height>66&&(ev.telTuteur||ev.adresse)&&(
                          <div style={{ fontSize:9,color:"rgba(255,255,255,0.65)",marginTop:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis" }}>
                            {ev.telTuteur&&`📞 ${ev.telTuteur}`}{ev.telTuteur&&ev.adresse&&" · "}{ev.adresse&&`📍 ${ev.adresse}`}
                          </div>
                        )}
                        {height>82&&(
                          <div style={{ display:"flex",gap:3,marginTop:4,flexWrap:"wrap" }}>
                            {contact&&onOpenContact&&(
                              <button onClick={e=>{e.stopPropagation();onOpenContact(contact);}} style={{ fontSize:9,padding:"2px 6px",borderRadius:5,border:"1px solid rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.2)",color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:600 }}>Fiche</button>
                            )}
                            {contact&&onOpenEchanges&&(
                              <button onClick={e=>{e.stopPropagation();onOpenEchanges(contact);}} style={{ fontSize:9,padding:"2px 6px",borderRadius:5,border:"1px solid rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.2)",color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:600 }}>Échanges</button>
                            )}
                            {(ev.type==="visite"||ev.type==="prospect")&&ev.mailTuteur&&(
                              <a href={buildMailto(ev,userEmail)} onClick={e=>e.stopPropagation()} style={{ fontSize:9,padding:"2px 6px",borderRadius:5,border:"1px solid rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.2)",color:"#fff",cursor:"pointer",fontFamily:"inherit",textDecoration:"none",fontWeight:600 }}>✉</a>
                            )}
                            <button onClick={e=>{e.stopPropagation();handleDone(ev.id);}} style={{ fontSize:9,padding:"2px 6px",borderRadius:5,border:"1px solid rgba(255,255,255,0.3)",background:ev.done?"rgba(255,255,255,0.35)":"rgba(255,255,255,0.2)",color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:600 }}>
                              {ev.done?"↩":"✓"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {modal&&<EventModal event={modal} contacts={contacts} colorNavy={colorNavy} userEmail={userEmail} onSave={handleSave} onDelete={modal.id?handleDelete:undefined} onClose={()=>setModal(null)}/>}
      {reminders.length>0&&<ReminderToast events={reminders} onClose={dismissReminders} onOpenEvent={ev=>setModal(ev)} colorNavy={colorNavy}/>}
    </div>
  );
}
