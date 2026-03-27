// src/components/ImportContrats.tsx
// Import de contrats depuis un fichier Excel/CSV assureur
// Logique : match par email ou nom+prénom, déduplication par N° contrat
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import type { ContactRecord, Contract, ContractType } from "../types/crm";
import { findAssureur, getLogoUrl } from "../constants/assureurs";

interface ImportContratsProps {
  contacts: ContactRecord[];
  onUpdateContact: (record: ContactRecord) => void;
  colorNavy: string;
  colorGold: string;
  onClose: () => void;
}

// ── Mapping assureurs ─────────────────────────────────────────────────────────

// Détecte l'assureur depuis les colonnes du fichier
function detectAssureur(cols: string[]): string {
  const colSet = cols.map(c => c.toLowerCase());
  if (colSet.includes("marché") || colSet.includes("marche")) return "april";
  if (colSet.includes("contrat") && colSet.includes("encours")) return "swisslife";
  return "generique";
}

// Mapping colonnes → champs Kleios selon l'assureur
const COLUMN_MAPS: Record<string, Record<string, string>> = {
  april: {
    "Numéro de contrat": "contractNumber",
    "Etat":              "status",
    "Marché":            "market",      // → type
    "Produit":           "productName",
    "Prime":             "annualPremium",
    "Date de souscription": "subscriptionDate",
    "Date de fin":       "echeanceDate",
    "Nom":               "_lastName",
    "Prénom":            "_firstName",
    "Email":             "_email",
  },
  generique: {
    "N° contrat":        "contractNumber",
    "Numéro contrat":    "contractNumber",
    "Statut":            "status",
    "Type":              "market",
    "Produit":           "productName",
    "Assureur":          "insurer",
    "Encours":           "currentValue",
    "Prime":             "annualPremium",
    "Date souscription": "subscriptionDate",
    "Date échéance":     "echeanceDate",
    "Nom":               "_lastName",
    "Prénom":            "_firstName",
    "Email":             "_email",
  },
};

// Mapping type marché → ContractType Kleios
function marketToType(market: string): ContractType {
  const m = (market ?? "").toLowerCase();
  if (m.includes("prêt") || m.includes("emprunteur")) return "emprunteur";
  if (m.includes("santé") || m.includes("sante") || m.includes("mutuelle")) return "sante";
  if (m.includes("prévoyance") || m.includes("prevoyance") || m.includes("décès")) return "prevoyance";
  if (m.includes("iard") || m.includes("habitation") || m.includes("auto")) return "iard";
  if (m.includes("vie") || m.includes("assurance-vie") || m.includes("assurance vie")) return "av";
  if (m.includes("per") || m.includes("retraite")) return "per";
  if (m.includes("capitalisation")) return "capitalisation";
  if (m.includes("scpi")) return "scpi";
  return "autre";
}

// Nettoyer une valeur monétaire "1 859,88 €" → "1859.88"
function cleanAmount(val: string): string {
  if (!val) return "";
  return val.toString().replace(/[€\s]/g, "").replace(",", ".").trim();
}

// Normaliser un statut
function normalizeStatus(val: string): Contract["status"] {
  const v = (val ?? "").toLowerCase();
  if (v === "actif" || v === "active") return "actif";
  if (v.includes("résili") || v.includes("resili")) return "resilie";
  if (v.includes("suspens") || v.includes("suspendu")) return "suspendu";
  if (v.includes("rachat")) return "rachat_total";
  return "actif";
}

// Normaliser une date
function normalizeDate(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const s = String(val);
  if (s === "NaN" || s === "Invalid Date") return "";
  // Format DD/MM/YYYY
  const ddmm = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmm) return `${ddmm[3]}-${ddmm[2]}-${ddmm[1]}`;
  // ISO
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.slice(0, 10);
  return "";
}

// ── Types internes ────────────────────────────────────────────────────────────

type ImportStatus = "new" | "update" | "skip" | "orphan" | "conflict";

interface ImportLine {
  rowIndex: number;
  raw: Record<string, string>;
  mapped: Partial<Contract> & { _email?: string; _lastName?: string; _firstName?: string };
  status: ImportStatus;
  matchedContactId: string | null;
  matchedContactName: string | null;
  conflictField?: string;
  pendingChoice?: "confirm" | "skip";
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function ImportContrats({
  contacts, onUpdateContact, colorNavy, colorGold: _cg, onClose,
}: ImportContratsProps) {

  const [step, setStep] = useState<"upload" | "preview" | "confirm" | "done">("upload");
  const [lines, setLines] = useState<ImportLine[]>([]);
  const [assureur, setAssureur] = useState("april");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Parsing du fichier ──
  const processFile = useCallback((file: File) => {
    setProcessing(true);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { raw: false });

      if (rows.length === 0) { setProcessing(false); return; }

      const cols = Object.keys(rows[0]);
      const detected = detectAssureur(cols);
      setAssureur(detected);
      const colMap = COLUMN_MAPS[detected] ?? COLUMN_MAPS.generique;

      // Construire un index contacts
      const byEmail = new Map<string, ContactRecord>();
      const byName = new Map<string, ContactRecord>();
      contacts.forEach(c => {
        const e1 = c.payload?.contact?.person1?.email?.toLowerCase();
        const e2 = c.payload?.contact?.person2?.email?.toLowerCase();
        if (e1) byEmail.set(e1, c);
        if (e2) byEmail.set(e2, c);
        const name1 = `${c.payload?.contact?.person1?.lastName?.toLowerCase() ?? ""} ${c.payload?.contact?.person1?.firstName?.toLowerCase() ?? ""}`.trim();
        const name2 = `${c.payload?.contact?.person2?.lastName?.toLowerCase() ?? ""} ${c.payload?.contact?.person2?.firstName?.toLowerCase() ?? ""}`.trim();
        if (name1) byName.set(name1, c);
        if (name2) byName.set(name2, c);
        // displayName fallback
        byName.set(c.displayName.toLowerCase(), c);
      });

      const parsed: ImportLine[] = rows.map((row, idx) => {
        // Mapper les colonnes
        const mapped: ImportLine["mapped"] = {};
        Object.entries(colMap).forEach(([col, field]) => {
          const val = row[col];
          if (val === undefined || val === null) return;
          const s = String(val);
          if (field === "_email") mapped._email = s.toLowerCase();
          else if (field === "_lastName") mapped._lastName = s;
          else if (field === "_firstName") mapped._firstName = s;
          else if (field === "market") mapped.type = marketToType(s);
          else if (field === "status") (mapped as any).status = normalizeStatus(s);
          else if (field === "annualPremium") mapped.annualPremium = cleanAmount(s);
          else if (field === "currentValue") mapped.currentValue = cleanAmount(s);
          else if (field === "subscriptionDate" || field === "echeanceDate" || field === "effectDate") {
            (mapped as any)[field] = normalizeDate(val);
          }
          else (mapped as any)[field] = s;
        });
        if (!mapped.insurer) mapped.insurer = detected === "april" ? "April" : "";
        if (!mapped.status) mapped.status = "actif";

        // Match contact
        let matchedContact: ContactRecord | null = null;
        if (mapped._email) matchedContact = byEmail.get(mapped._email) ?? null;
        if (!matchedContact && mapped._lastName && mapped._firstName) {
          const key = `${mapped._lastName.toLowerCase()} ${mapped._firstName.toLowerCase()}`;
          matchedContact = byName.get(key) ?? null;
        }

        // Déterminer le statut de la ligne
        let status: ImportStatus = "orphan";
        let conflictField: string | undefined;

        if (matchedContact) {
          const existingContracts = matchedContact.payload?.contracts ?? [];
          const existing = existingContracts.find(c => c.contractNumber === mapped.contractNumber);

          if (existing) {
            // Même N° contrat — vérifier si données changées
            const hasChanges =
              (mapped.productName && existing.productName !== mapped.productName) ||
              (mapped.annualPremium && existing.annualPremium !== mapped.annualPremium) ||
              (mapped.currentValue && existing.currentValue !== mapped.currentValue);

            status = hasChanges ? "update" : "skip";
            if (hasChanges) {
              const diffs = [];
              if (mapped.productName && existing.productName !== mapped.productName) diffs.push("produit");
              if (mapped.annualPremium && existing.annualPremium !== mapped.annualPremium) diffs.push("prime");
              if (mapped.currentValue && existing.currentValue !== mapped.currentValue) diffs.push("encours");
              conflictField = diffs.join(", ");
            }
          } else {
            status = "new";
          }
        }

        return {
          rowIndex: idx,
          raw: Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v ?? "")])),
          mapped,
          status,
          matchedContactId: matchedContact?.id ?? null,
          matchedContactName: matchedContact?.displayName ?? null,
          conflictField,
        };
      });

      setLines(parsed);
      setStep("preview");
      setProcessing(false);
    };
    reader.readAsArrayBuffer(file);
  }, [contacts]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ── Appliquer l'import ──
  const handleImport = useCallback(() => {
    const toProcess = lines.filter(l => l.status === "new" || l.status === "update");
    const contactUpdates = new Map<string, ContactRecord>();

    toProcess.forEach(line => {
      if (!line.matchedContactId) return;
      const contact = contactUpdates.get(line.matchedContactId)
        ?? { ...contacts.find(c => c.id === line.matchedContactId)! };
      const contracts = [...(contact.payload?.contracts ?? [])];
      const existingIdx = contracts.findIndex(c => c.contractNumber === line.mapped.contractNumber);
      const now = new Date().toISOString();

      if (existingIdx >= 0 && line.status === "update") {
        contracts[existingIdx] = {
          ...contracts[existingIdx],
          ...line.mapped,
          updatedAt: now,
        };
      } else if (line.status === "new") {
        contracts.push({
          id: crypto.randomUUID(),
          contactId: line.matchedContactId,
          userId: contact.userId,
          type: line.mapped.type ?? "autre",
          status: line.mapped.status ?? "actif",
          contractNumber: line.mapped.contractNumber ?? "",
          productName: line.mapped.productName ?? "",
          insurer: line.mapped.insurer ?? "",
          platform: "",
          subscriptionDate: line.mapped.subscriptionDate ?? "",
          effectDate: "",
          echeanceDate: line.mapped.echeanceDate ?? "",
          currentValue: line.mapped.currentValue ?? "",
          totalPremiums: "",
          annualPremium: line.mapped.annualPremium ?? "",
          premiumsBefore70: "",
          premiumsAfter70: "",
          performance2024: "",
          ucRatio: "",
          remunerationType: "commission",
          commissionRate: "",
          honoraireAmount: "",
          lastCommission: "",
          lastCommissionDate: "",
          beneficiaries: [],
          documentIds: [],
          notes: `Importé depuis ${assureur} le ${new Date().toLocaleDateString("fr-FR")}`,
          createdAt: now,
          updatedAt: now,
        } as Contract);
      }

      contact.payload = { ...contact.payload, contracts };
      contact.updatedAt = now;
      contactUpdates.set(line.matchedContactId, contact);
    });

    contactUpdates.forEach(c => onUpdateContact(c));
    setStep("done");
  }, [lines, contacts, onUpdateContact, assureur]);

  const countByStatus = (s: ImportStatus) => lines.filter(l => l.status === s).length;

  // ── Render ────────────────────────────────────────────────────────────────────

  const inp: React.CSSProperties = {
    border: "1px solid #E2E5EC", borderRadius: 6, padding: "6px 10px",
    fontSize: 12, fontFamily: "inherit", outline: "none", background: "#fff",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, width: "min(860px, 95vw)",
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #E2E5EC",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: colorNavy,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>
              Import de contrats
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
              {step === "upload" && "Chargez un fichier Excel ou CSV de votre assureur"}
              {step === "preview" && `${fileName} · ${lines.length} ligne${lines.length > 1 ? "s" : ""} détectées`}
              {step === "done" && "Import terminé"}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 20 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>

          {/* ── Étape 1 : Upload ── */}
          {step === "upload" && (
            <div>
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? colorNavy : "#D1D5DB"}`,
                  borderRadius: 10, padding: "40px 20px",
                  textAlign: "center", cursor: "pointer",
                  background: isDragging ? `${colorNavy}08` : "#F8F9FB",
                  transition: "all 0.15s",
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: colorNavy }}>
                  Glissez votre fichier ici
                </div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                  ou cliquez pour parcourir — Excel (.xlsx) ou CSV (.csv)
                </div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} style={{ display: "none" }} />
              </div>

              <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "#0C4A6E" }}>
                <strong>Assureurs compatibles :</strong> April · Swiss Life · Generali · BNP Paribas Cardif · et tout format CSV standard<br/>
                Les colonnes sont détectées automatiquement. En cas de doute sur un client, vous serez invité à confirmer manuellement.
              </div>

              {processing && (
                <div style={{ textAlign: "center", marginTop: 20, color: "#9CA3AF", fontSize: 13 }}>
                  Analyse du fichier...
                </div>
              )}
            </div>
          )}

          {/* ── Étape 2 : Preview ── */}
          {step === "preview" && (
            <div>
              {/* Résumé */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                {[
                  { label: "Nouveaux contrats", count: countByStatus("new"), color: "#065F46", bg: "#ECFDF5" },
                  { label: "Mises à jour", count: countByStatus("update"), color: "#92400E", bg: "#FFFBEB" },
                  { label: "Ignorés (identiques)", count: countByStatus("skip"), color: "#6B7280", bg: "#F3F4F6" },
                  { label: "Sans client trouvé", count: countByStatus("orphan"), color: "#991B1B", bg: "#FEF2F2" },
                ].map(({ label, count, color, bg }) => (
                  <div key={label} style={{ background: bg, borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color }}>{count}</div>
                    <div style={{ fontSize: 10, color, opacity: 0.8, marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Table des lignes */}
              <div style={{ border: "1px solid #E2E5EC", borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#F8F9FB", borderBottom: "1px solid #E2E5EC" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#374151" }}>N° contrat</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Produit</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Client détecté</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Action</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#374151" }}>Détail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map(line => {
                      const STATUS_DISPLAY: Record<ImportStatus, { label: string; color: string; bg: string }> = {
                        new:     { label: "Créer",        color: "#065F46", bg: "#ECFDF5" },
                        update:  { label: "Mettre à jour", color: "#92400E", bg: "#FFFBEB" },
                        skip:    { label: "Ignorer",      color: "#6B7280", bg: "#F3F4F6" },
                        orphan:  { label: "⚠ Sans client", color: "#991B1B", bg: "#FEF2F2" },
                        conflict: { label: "Confirmer",   color: "#1D4ED8", bg: "#EFF6FF" },
                      };
                      const s = STATUS_DISPLAY[line.status];
                      return (
                        <tr key={line.rowIndex} style={{ borderBottom: "1px solid #F0F2F6" }}>
                          <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#374151" }}>
                            {line.mapped.contractNumber ?? "—"}
                          </td>
                          <td style={{ padding: "8px 12px", color: "#374151" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {(() => {
                                const a = findAssureur(line.mapped.insurer ?? "");
                                return a ? (
                                  <img src={getLogoUrl(a.domain, 32)} alt={a.label}
                                    style={{ width: 18, height: 18, objectFit: "contain", flexShrink: 0 }} />
                                ) : null;
                              })()}
                              <span>{line.mapped.productName ?? "—"}</span>
                            </div>
                            {line.mapped.type && (
                              <span style={{ fontSize: 10, color: "#9CA3AF" }}>{line.mapped.type}</span>
                            )}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {line.matchedContactName
                              ? <span style={{ color: "#0D1B2E", fontWeight: 500 }}>{line.matchedContactName}</span>
                              : (
                                <span style={{ color: "#9CA3AF" }}>
                                  {line.mapped._lastName} {line.mapped._firstName}
                                  <span style={{ fontSize: 10, display: "block" }}>{line.mapped._email}</span>
                                </span>
                              )
                            }
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{
                              padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500,
                              background: s.bg, color: s.color,
                            }}>
                              {s.label}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", fontSize: 11, color: "#6B7280" }}>
                            {line.status === "update" && line.conflictField && `Modifié : ${line.conflictField}`}
                            {line.status === "new" && `${line.mapped.annualPremium ? line.mapped.annualPremium + "€/an" : ""}`}
                            {line.status === "orphan" && (
                              <select
                                onChange={e => {
                                  const contactId = e.target.value;
                                  setLines(prev => prev.map(l =>
                                    l.rowIndex === line.rowIndex
                                      ? { ...l, matchedContactId: contactId || null, matchedContactName: contacts.find(c => c.id === contactId)?.displayName ?? null, status: contactId ? "new" : "orphan" }
                                      : l
                                  ));
                                }}
                                style={{ ...inp, width: 160 }}
                              >
                                <option value="">Associer à un client...</option>
                                {contacts.map(c => (
                                  <option key={c.id} value={c.id}>{c.displayName}</option>
                                ))}
                              </select>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Étape 3 : Done ── */}
          {step === "done" && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: colorNavy, marginBottom: 8 }}>
                Import terminé
              </div>
              <div style={{ fontSize: 13, color: "#6B7280" }}>
                {countByStatus("new")} contrat{countByStatus("new") > 1 ? "s" : ""} créé{countByStatus("new") > 1 ? "s" : ""},&nbsp;
                {countByStatus("update")} mis à jour,&nbsp;
                {countByStatus("skip")} ignoré{countByStatus("skip") > 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px", borderTop: "1px solid #E2E5EC",
          display: "flex", justifyContent: "flex-end", gap: 8, background: "#F8F9FB",
        }}>
          {step === "upload" && (
            <button onClick={onClose} style={{ padding: "7px 16px", border: "1px solid #E2E5EC", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              Annuler
            </button>
          )}
          {step === "preview" && (
            <>
              <button onClick={() => setStep("upload")} style={{ padding: "7px 16px", border: "1px solid #E2E5EC", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                ← Retour
              </button>
              <button
                onClick={handleImport}
                disabled={countByStatus("new") + countByStatus("update") === 0}
                style={{
                  padding: "7px 16px", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  background: countByStatus("new") + countByStatus("update") > 0 ? colorNavy : "#D1D5DB",
                  color: "#fff",
                }}>
                Importer {countByStatus("new") + countByStatus("update")} contrat{countByStatus("new") + countByStatus("update") > 1 ? "s" : ""}
              </button>
            </>
          )}
          {step === "done" && (
            <button onClick={onClose} style={{ padding: "7px 16px", border: "none", borderRadius: 6, background: colorNavy, color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
