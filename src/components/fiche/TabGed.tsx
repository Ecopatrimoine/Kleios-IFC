// src/components/fiche/TabGed.tsx
// GED — Gestion Électronique des Documents
// Stockage : Supabase Storage (bucket "documents")
// Structure : documents/{userId}/{contactId}/{timestamp}-{filename}
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import type { ContactRecord } from "../../types/crm";
import { supabase } from "../../lib/supabase";

interface TabGedProps {
  record: ContactRecord;
  onSave: (record: ContactRecord) => void;
  colorNavy: string;
  colorGold: string;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type DocCategory =
  | "lettre_mission" | "rapport_patrimonial" | "contrat"
  | "der" | "kyc" | "autre";

interface GedDocument {
  id: string;           // path Supabase Storage
  ref: string;          // référence unique ex: LM-PER-2026-03-001
  name: string;         // nom affiché
  fileName: string;     // nom fichier original
  category: DocCategory;
  status: "brouillon" | "envoye" | "signe" | "archive";
  size: number;         // bytes
  mimeType: string;
  uploadedAt: string;   // ISO
  expiresAt: string;    // ISO — alerte expiration (lettres mission, DER)
  visibleToClient: boolean;
  notes: string;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<DocCategory, string> = {
  lettre_mission:    "Lettre de mission",
  rapport_patrimonial: "Rapport patrimonial",
  contrat:           "Contrat",
  der:               "DER",
  kyc:               "KYC / Identité",
  autre:             "Autre",
};

const CATEGORY_ICONS: Record<DocCategory, string> = {
  lettre_mission:    "📄",
  rapport_patrimonial: "📊",
  contrat:           "📋",
  der:               "✅",
  kyc:               "🪪",
  autre:             "📁",
};

const CATEGORY_COLORS: Record<DocCategory, { bg: string; color: string }> = {
  lettre_mission:    { bg: "#EEF2FF", color: "#3730A3" },
  rapport_patrimonial: { bg: "#ECFDF5", color: "#065F46" },
  contrat:           { bg: "#FEF3C7", color: "#92400E" },
  der:               { bg: "#F0FDF4", color: "#14532D" },
  kyc:               { bg: "#FDF4FF", color: "#581C87" },
  autre:             { bg: "#F3F4F6", color: "#6B7280" },
};

const BUCKET = "documents";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CAT_CODE: Record<DocCategory, string> = {
  lettre_mission:      "LM",
  rapport_patrimonial: "RPP",
  contrat:             "CT",
  der:                 "DER",
  kyc:                 "KYC",
  autre:               "DOC",
};

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoye:    "Envoyé",
  signe:     "Signé",
  archive:   "Archivé",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  brouillon: { bg: "#F3F4F6", color: "#6B7280" },
  envoye:    { bg: "#EFF6FF", color: "#1D4ED8" },
  signe:     { bg: "#ECFDF5", color: "#065F46" },
  archive:   { bg: "#FEF3C7", color: "#92400E" },
};

// Génère la référence unique : LM-PER-2026-03-001
function generateRef(category: DocCategory, displayName: string, existingDocs: GedDocument[]): string {
  const code = CAT_CODE[category];
  const initials = displayName.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? "").join("").slice(0, 3).padEnd(3, "X");
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `${code}-${initials}-${yyyy}-${mm}-`;
  const existing = existingDocs.filter(d => d.ref?.startsWith(prefix));
  const seq = String(existing.length + 1).padStart(3, "0");
  return `${prefix}${seq}`;
}

// Calcule la date d'expiration selon la catégorie (mois)
function getExpiryDate(category: DocCategory): string {
  const monthsMap: Partial<Record<DocCategory, number>> = {
    lettre_mission: 24,
    der:            36,
    kyc:            60,
  };
  const months = monthsMap[category];
  if (!months) return "";
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function getMimeIcon(mime: string): string {
  if (mime.includes("pdf")) return "📕";
  if (mime.includes("word") || mime.includes("document")) return "📘";
  if (mime.includes("image")) return "🖼️";
  if (mime.includes("excel") || mime.includes("spreadsheet")) return "📗";
  return "📄";
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function TabGed({ record, onSave, colorNavy, colorGold: _cg }: TabGedProps) {
  const [docs, setDocs] = useState<GedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filterCat, setFilterCat] = useState<DocCategory | "all">("all");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newDocCategory, setNewDocCategory] = useState<DocCategory>("autre");
  const [newDocName, setNewDocName] = useState("");
  const [newDocNotes, setNewDocNotes] = useState("");
  const [newDocStatus, setNewDocStatus] = useState<"brouillon" | "envoye" | "signe" | "archive">("brouillon");
  const [newDocVisible, setNewDocVisible] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const userId = record.userId;
  const contactId = record.id;
  const storagePrefix = `${userId}/${contactId}/`;

  // ── Chargement des documents depuis le payload ────────────────────────────
  useEffect(() => {
    const savedDocs: GedDocument[] = (record.payload as any)?.documents_ged ?? [];
    setDocs(savedDocs);
    setLoading(false);
  }, [record.id]);

  // ── Sauvegarde dans le payload ────────────────────────────────────────────
  const saveDocs = (newDocs: GedDocument[]) => {
    setDocs(newDocs);
    const updated: ContactRecord = {
      ...record,
      payload: { ...record.payload, documents_ged: newDocs } as any,
    };
    onSave(updated);
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    setUploadProgress(10);

    try {
      const timestamp = Date.now();
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${storagePrefix}${timestamp}-${safeName}`;

      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, selectedFile, { upsert: false });

      if (uploadError) throw uploadError;

      setUploadProgress(80);

      const ref = generateRef(newDocCategory, record.displayName, docs);
      const doc: GedDocument = {
        id: path,
        ref,
        name: newDocName.trim() || selectedFile.name,
        fileName: selectedFile.name,
        category: newDocCategory,
        status: newDocStatus,
        size: selectedFile.size,
        mimeType: selectedFile.type,
        uploadedAt: new Date().toISOString(),
        expiresAt: getExpiryDate(newDocCategory),
        visibleToClient: newDocVisible,
        notes: newDocNotes,
      };

      saveDocs([...docs, doc]);
      setUploadProgress(100);

      // Reset form
      setTimeout(() => {
        setShowUploadForm(false);
        setSelectedFile(null);
        setNewDocName("");
        setNewDocNotes("");
        setNewDocStatus("brouillon");
        setNewDocCategory("autre");
        setNewDocVisible(false);
        setUploading(false);
        setUploadProgress(0);
      }, 400);

    } catch (err: any) {
      setError(err.message ?? "Erreur lors de l'upload");
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ── Envoi email ──────────────────────────────────────────────────────────
  const handleSendEmail = async (doc: GedDocument) => {
    const clientEmail = record.payload?.contact?.person1?.email || record.payload?.contact?.person2?.email;
    if (!clientEmail) {
      alert("Aucun email trouvé pour ce client. Renseignez l'email dans la fiche civile.");
      return;
    }
    if (!confirm(`Envoyer "${doc.name}" à ${clientEmail} ?`)) return;
    setSendingEmail(doc.id);
    try {
      const { data: urlData, error: urlError } = await supabase.storage
        .from("documents").createSignedUrl(doc.id, 7 * 24 * 3600); // 7 jours
      if (urlError) throw urlError;
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          type: "document_shared",
          to: clientEmail,
          clientName: record.displayName,
          documentName: doc.name,
          documentRef: doc.ref,
          downloadUrl: urlData.signedUrl,
        },
      });
      if (error) throw error;
      // Mettre à jour le statut
      const updatedDocs = docs.map(d => d.id === doc.id ? { ...d, status: "envoye" as const } : d);
      saveDocs(updatedDocs);
      alert(`Document envoyé à ${clientEmail}`);
    } catch (err: any) {
      alert("Erreur d'envoi : " + err.message);
    } finally {
      setSendingEmail(null);
    }
  };

  // ── Changement de statut ──────────────────────────────────────────────────
  const handleStatusChange = (docId: string, status: GedDocument["status"]) => {
    saveDocs(docs.map(d => d.id === docId ? { ...d, status } : d));
  };

  // ── Téléchargement ────────────────────────────────────────────────────────
  const handleDownload = async (doc: GedDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.id, 60); // URL valide 60 secondes

      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      alert("Erreur de téléchargement : " + err.message);
    }
  };

  // ── Suppression ───────────────────────────────────────────────────────────
  const handleDelete = async (doc: GedDocument) => {
    if (!confirm(`Supprimer "${doc.name}" ?`)) return;
    try {
      await supabase.storage.from(BUCKET).remove([doc.id]);
      saveDocs(docs.filter(d => d.id !== doc.id));
    } catch (err: any) {
      alert("Erreur de suppression : " + err.message);
    }
  };

  const filtered = filterCat === "all" ? docs : docs.filter(d => d.category === filterCat);
  const categories = [...new Set(docs.map(d => d.category))];

  const inp: React.CSSProperties = {
    border: "1px solid #E2E5EC", borderRadius: 6, padding: "7px 10px",
    fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff",
    width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ padding: "0 20px 20px" }}>

      {/* En-tête */}
      <div style={{
        background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10,
        padding: "12px 14px", marginBottom: 12,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: colorNavy }}>
            {docs.length} document{docs.length > 1 ? "s" : ""}
          </span>
          {/* Filtres catégories */}
          {categories.length > 1 && (
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setFilterCat("all")} style={{
                padding: "2px 10px", borderRadius: 10, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                border: filterCat === "all" ? "none" : "1px solid #E2E5EC",
                background: filterCat === "all" ? colorNavy : "#fff",
                color: filterCat === "all" ? "#fff" : "#6B7280",
              }}>Tous</button>
              {categories.map(cat => {
                const s = CATEGORY_COLORS[cat];
                return (
                  <button key={cat} onClick={() => setFilterCat(cat)} style={{
                    padding: "2px 10px", borderRadius: 10, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                    border: filterCat === cat ? "none" : `1px solid ${s.color}30`,
                    background: filterCat === cat ? s.color : s.bg,
                    color: filterCat === cat ? "#fff" : s.color,
                  }}>{CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}</button>
                );
              })}
            </div>
          )}
        </div>
        <button onClick={() => setShowUploadForm(true)} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 14px", border: "none", borderRadius: 6,
          background: colorNavy, color: "#fff",
          fontSize: 12, cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
        }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Ajouter un document
        </button>
      </div>

      {/* Formulaire upload */}
      {showUploadForm && (
        <div style={{
          background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10,
          padding: 16, marginBottom: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
            Nouveau document
            <button onClick={() => { setShowUploadForm(false); setSelectedFile(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9CA3AF" }}>×</button>
          </div>

          {/* Zone drop fichier */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${selectedFile ? colorNavy : "#D1D5DB"}`,
              borderRadius: 8, padding: "20px", textAlign: "center", cursor: "pointer",
              background: selectedFile ? `${colorNavy}05` : "#F8F9FB",
              marginBottom: 14, transition: "all 0.15s",
            }}
          >
            {selectedFile ? (
              <div>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{getMimeIcon(selectedFile.type)}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: colorNavy }}>{selectedFile.name}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>{formatSize(selectedFile.size)}</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 24, marginBottom: 4 }}>📂</div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>Cliquez pour sélectionner un fichier</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>PDF, Word, images — max 50 Mo</div>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) {
                  setSelectedFile(f);
                  if (!newDocName) setNewDocName(f.name.replace(/\.[^.]+$/, ""));
                }
              }}
              style={{ display: "none" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {/* Catégorie */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Catégorie</label>
              <select value={newDocCategory} onChange={e => setNewDocCategory(e.target.value as DocCategory)} style={inp}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {/* Statut */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Statut</label>
              <select value={newDocStatus} onChange={e => setNewDocStatus(e.target.value as any)} style={inp}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {/* Nom */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Nom du document</label>
              <input value={newDocName} onChange={e => setNewDocName(e.target.value)}
                placeholder="ex: Lettre de mission 2026" style={inp} />
            </div>
            {/* Notes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "span 2" }}>
              <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Notes (optionnel)</label>
              <input value={newDocNotes} onChange={e => setNewDocNotes(e.target.value)}
                placeholder="Observations..." style={inp} />
            </div>
          </div>

          {/* Visible client */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 14 }}>
            <div onClick={() => setNewDocVisible(v => !v)} style={{
              width: 34, height: 18, borderRadius: 9, position: "relative",
              background: newDocVisible ? colorNavy : "#D1D5DB", transition: "background 0.2s", flexShrink: 0,
            }}>
              <div style={{
                position: "absolute", top: 2, left: newDocVisible ? 16 : 2,
                width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s",
              }} />
            </div>
            <span style={{ fontSize: 12, color: "#374151" }}>Visible dans l'espace client</span>
          </label>

          {error && (
            <div style={{ padding: "8px 12px", background: "#FEF2F2", color: "#991B1B", borderRadius: 6, fontSize: 12, marginBottom: 12 }}>
              ⚠ {error}
            </div>
          )}

          {/* Barre de progression */}
          {uploading && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ height: 4, borderRadius: 2, background: "#E2E5EC", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2, background: colorNavy,
                  width: `${uploadProgress}%`, transition: "width 0.3s",
                }} />
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, textAlign: "center" }}>Upload en cours...</div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => { setShowUploadForm(false); setSelectedFile(null); }} style={{
              padding: "7px 16px", border: "1px solid #E2E5EC", borderRadius: 6,
              background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}>Annuler</button>
            <button onClick={handleUpload}
              disabled={!selectedFile || uploading}
              style={{
                padding: "7px 16px", border: "none", borderRadius: 6, fontSize: 12,
                cursor: selectedFile && !uploading ? "pointer" : "not-allowed", fontFamily: "inherit",
                background: selectedFile && !uploading ? colorNavy : "#D1D5DB", color: "#fff",
              }}>
              {uploading ? "Upload..." : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      {/* Liste documents */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#9CA3AF", fontSize: 13 }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10,
          padding: "40px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13,
        }}>
          {docs.length === 0 ? "Aucun document pour ce client. Commencez par en ajouter un." : "Aucun document dans cette catégorie."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(doc => {
            const catStyle = CATEGORY_COLORS[doc.category];
            return (
              <div key={doc.id} style={{
                background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10,
                padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
              }}>
                {/* Icône fichier */}
                <div style={{
                  width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                  background: catStyle.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>
                  {getMimeIcon(doc.mimeType)}
                </div>

                {/* Infos */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0D1B2E" }}>{doc.name}</div>
                    {doc.ref && (
                      <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 6, background: "#F0F2F6", color: colorNavy }}>{doc.ref}</span>
                    )}
                    <span style={{ padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 500, background: catStyle.bg, color: catStyle.color }}>
                      {CATEGORY_ICONS[doc.category]} {CATEGORY_LABELS[doc.category]}
                    </span>
                    {doc.status && (
                      <span style={{ padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 500, background: STATUS_COLORS[doc.status]?.bg ?? "#F3F4F6", color: STATUS_COLORS[doc.status]?.color ?? "#6B7280" }}>
                        {STATUS_LABELS[doc.status]}
                      </span>
                    )}
                    {doc.visibleToClient && (
                      <span style={{ padding: "1px 7px", borderRadius: 8, fontSize: 9, background: "#EFF6FF", color: "#1D4ED8" }}>👤 Espace client</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                    {doc.fileName} · {formatSize(doc.size)} · {formatDate(doc.uploadedAt)}
                    {doc.expiresAt && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: new Date(doc.expiresAt) < new Date() ? "#EF4444" : (new Date(doc.expiresAt).getTime() - Date.now()) < 6*30*24*3600*1000 ? "#F59E0B" : "#9CA3AF" }}>
                        · exp. {formatDate(doc.expiresAt)}
                      </span>
                    )}
                    {doc.notes && <span> · {doc.notes}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <select value={doc.status ?? "brouillon"} onChange={e => handleStatusChange(doc.id, e.target.value as GedDocument["status"])} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #E2E5EC", background: "#fff", fontSize: 11, cursor: "pointer", fontFamily: "inherit", color: STATUS_COLORS[doc.status ?? "brouillon"]?.color ?? "#6B7280" }}>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button onClick={() => handleDownload(doc)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E2E5EC", background: "#fff", fontSize: 11, color: colorNavy, cursor: "pointer", fontFamily: "inherit" }} title="Télécharger">⬇</button>
                  <button onClick={() => handleSendEmail(doc)} disabled={sendingEmail === doc.id} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #E2E5EC", background: "#fff", fontSize: 11, color: "#6B7280", cursor: "pointer", fontFamily: "inherit" }} title="Envoyer par email">
                    {sendingEmail === doc.id ? "..." : "✉"}
                  </button>
                  <button onClick={() => handleDelete(doc)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #FECACA", background: "#fff", fontSize: 11, color: "#EF4444", cursor: "pointer", fontFamily: "inherit" }}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* KPIs par catégorie */}
      {docs.length > 0 && (
        <div style={{
          marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap",
        }}>
          {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
            const count = docs.filter(d => d.category === cat).length;
            if (!count) return null;
            const s = CATEGORY_COLORS[cat as DocCategory];
            return (
              <div key={cat} style={{
                padding: "4px 12px", borderRadius: 8, fontSize: 11,
                background: s.bg, color: s.color, fontWeight: 500,
              }}>
                {CATEGORY_ICONS[cat as DocCategory]} {label} · {count}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
