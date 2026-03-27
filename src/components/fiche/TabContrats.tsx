// src/components/fiche/TabContrats.tsx
// Onglet contrats — liste, ajout, édition, détail
// Types : AV, Capitalisation, PER, Prévoyance, Santé, IARD
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import type { ContactRecord, Contract, ContractType, ContractStatus } from "../../types/crm";
import { findAssureur, getLogoUrl } from "../../constants/assureurs";
import { CONTRACT_TYPE_LABELS } from "../../constants";

interface TabContratsProps {
  record: ContactRecord;
  onSave: (record: ContactRecord) => void;
  colorNavy: string;
  colorGold: string;
}

// ── Styles par type ───────────────────────────────────────────────────────────

const TYPE_STYLES: Record<string, { bg: string; color: string; short: string }> = {
  av:                  { bg: "#EEF2FF", color: "#3730A3", short: "AV" },
  per:                 { bg: "#ECFDF5", color: "#065F46", short: "PER" },
  scpi:                { bg: "#FEF3C7", color: "#92400E", short: "SCPI" },
  prevoyance:          { bg: "#FDF2F8", color: "#9D174D", short: "PRÉ" },
  capitalisation:      { bg: "#F0F9FF", color: "#0C4A6E", short: "CAP" },
  pea:                 { bg: "#F0FDF4", color: "#14532D", short: "PEA" },
  cto:                 { bg: "#FFF7ED", color: "#7C2D12", short: "CTO" },
  sante:               { bg: "#FDF4FF", color: "#581C87", short: "SAN" },
  iard:                { bg: "#F8FAFC", color: "#334155", short: "IAR" },
  emprunteur:          { bg: "#FFF1F2", color: "#881337", short: "EMP" },
  retraite_collective: { bg: "#F0FDF4", color: "#14532D", short: "RET" },
  autre:               { bg: "#F3F4F6", color: "#6B7280", short: "AUT" },
};

const STATUS_LABELS: Record<ContractStatus, string> = {
  actif:          "Actif",
  rachat_partiel: "Rachat partiel",
  rachat_total:   "Rachat total",
  en_cours:       "En cours",
  resilie:        "Résilié",
  suspendu:       "Suspendu",
};

const STATUS_COLORS: Record<ContractStatus, { bg: string; color: string }> = {
  actif:          { bg: "#ECFDF5", color: "#065F46" },
  rachat_partiel: { bg: "#FFFBEB", color: "#92400E" },
  rachat_total:   { bg: "#FEF2F2", color: "#991B1B" },
  en_cours:       { bg: "#EFF6FF", color: "#1D4ED8" },
  resilie:        { bg: "#F3F4F6", color: "#6B7280" },
  suspendu:       { bg: "#FEF3C7", color: "#92400E" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatVal(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M€`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k€`;
  return `${n.toFixed(0)} €`;
}

function parseVal(s: string): number {
  const v = parseFloat(s?.replace(/[^0-9.,]/g, "").replace(",", ".") ?? "0");
  return isNaN(v) ? 0 : v;
}

const inp: React.CSSProperties = {
  border: "1px solid #E2E5EC", borderRadius: 6,
  padding: "7px 10px", fontSize: 13,
  fontFamily: "inherit", outline: "none", background: "#fff",
  width: "100%", boxSizing: "border-box",
};

function Field({ label, value, onChange, type = "text", placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={inp} />
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: Record<string, string>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={inp}>
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );
}

// ── Formulaire ────────────────────────────────────────────────────────────────

const EMPTY_CONTRACT: Partial<Contract> = {
  type: "av", status: "actif", productName: "", insurer: "",
  contractNumber: "", subscriptionDate: "", currentValue: "",
  annualPremium: "", totalPremiums: "", premiumsBefore70: "",
  premiumsAfter70: "", performance2024: "", ucRatio: "",
  remunerationType: "commission", commissionRate: "", honoraireAmount: "",
  notes: "",
};

function ContractForm({
  initial, onSave, onClose, colorNavy, colorGold: _cg1,
}: {
  initial: Partial<Contract>;
  onSave: (c: Contract) => void;
  onClose: () => void;
  colorNavy: string;
  colorGold: string;
}) {
  const [form, setForm] = useState<Partial<Contract>>(initial);
  const upd = (key: keyof Contract, val: string) => setForm(f => ({ ...f, [key]: val }));

  const isAV = form.type === "av" || form.type === "capitalisation" || form.type === "per";
  const isPrevoyance = form.type === "prevoyance" || form.type === "sante" || form.type === "iard" || form.type === "emprunteur";
  const isEpargne = form.type === "pea" || form.type === "cto" || form.type === "scpi";
  const isEdit = !!initial.id;

  const handleSave = () => {
    if (!form.productName?.trim()) return;
    const now = new Date().toISOString();
    const full: Contract = {
      id: initial.id ?? crypto.randomUUID(),
      contactId: initial.contactId ?? "",
      userId: initial.userId ?? "",
      type: (form.type as ContractType) ?? "av",
      status: (form.status as ContractStatus) ?? "actif",
      contractNumber: form.contractNumber ?? "",
      productName: form.productName ?? "",
      insurer: form.insurer ?? "",
      platform: form.platform ?? "",
      subscriptionDate: form.subscriptionDate ?? "",
      effectDate: form.effectDate ?? "",
      echeanceDate: form.echeanceDate ?? "",
      currentValue: form.currentValue ?? "",
      totalPremiums: form.totalPremiums ?? "",
      annualPremium: form.annualPremium ?? "",
      performance2024: form.performance2024 ?? "",
      ucRatio: form.ucRatio ?? "",
      remunerationType: (form.remunerationType as any) ?? "commission",
      commissionRate: form.commissionRate ?? "",
      honoraireAmount: form.honoraireAmount ?? "",
      lastCommission: form.lastCommission ?? "",
      lastCommissionDate: form.lastCommissionDate ?? "",
      premiumsBefore70: form.premiumsBefore70 ?? "",
      premiumsAfter70: form.premiumsAfter70 ?? "",
      beneficiaries: form.beneficiaries ?? [],
      documentIds: [],
      notes: form.notes ?? "",
      createdAt: initial.createdAt ?? now,
      updatedAt: now,
    };
    onSave(full);
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {isEdit ? "Modifier le contrat" : "Nouveau contrat"}
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9CA3AF" }}>×</button>
      </div>

      {/* Identification */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 10 }}>Identification</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Select label="Type *" value={form.type ?? "av"} onChange={v => upd("type", v)} options={CONTRACT_TYPE_LABELS} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Statut</label>
          <select value={form.status ?? "actif"} onChange={e => upd("status", e.target.value)} style={inp}>
            <option value="actif">Actif</option>
            <option value="en_cours">En cours</option>
            <option value="rachat_partiel">Rachat partiel</option>
            <option value="rachat_total">Rachat total</option>
            <option value="suspendu">Suspendu</option>
            <option value="resilie">Résilié</option>
          </select>
        </div>
        <Field label="Nom du produit *" value={form.productName ?? ""} onChange={v => upd("productName", v)} placeholder="ex: Apicil Croissance" />
        <Field label="Assureur / Émetteur" value={form.insurer ?? ""} onChange={v => upd("insurer", v)} placeholder="ex: Apicil, Swiss Life..." />
        <Field label="N° contrat" value={form.contractNumber ?? ""} onChange={v => upd("contractNumber", v)} />
        {!isPrevoyance && (
          <Field label="Plateforme" value={form.platform ?? ""} onChange={v => upd("platform", v)} placeholder="ex: Nortia, Primonial..." />
        )}
        <Field label="Date d'effet" value={form.effectDate ?? ""} onChange={v => upd("effectDate", v)} type="date" />
        <Field label="Date d'échéance" value={form.echeanceDate ?? ""} onChange={v => upd("echeanceDate", v)} type="date" />
        {!isPrevoyance && (
          <Field label="Date souscription" value={form.subscriptionDate ?? ""} onChange={v => upd("subscriptionDate", v)} type="date" />
        )}
      </div>

      {/* Données financières — adaptées par type */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 10 }}>Données financières</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>

        {/* Prévoyance / Santé / IARD / Emprunteur : prime annuelle seulement, pas d'encours */}
        {isPrevoyance && (
          <Field label="Prime annuelle (€)" value={form.annualPremium ?? ""} onChange={v => upd("annualPremium", v)} />
        )}

        {/* PEA / CTO / SCPI : encours + performance + assureur (minimal) */}
        {isEpargne && (
          <>
            <Field label="Encours actuel (€)" value={form.currentValue ?? ""} onChange={v => upd("currentValue", v)} placeholder="0" />
            <Field label="Performance 2024 (%)" value={form.performance2024 ?? ""} onChange={v => upd("performance2024", v)} placeholder="+4.5" />
          </>
        )}

        {/* AV / Capitalisation / PER : tous les champs */}
        {isAV && (
          <>
            <Field label="Encours actuel (€)" value={form.currentValue ?? ""} onChange={v => upd("currentValue", v)} placeholder="0" />
            <Field label="Prime annuelle (€)" value={form.annualPremium ?? ""} onChange={v => upd("annualPremium", v)} />
            <Field label="Total primes versées (€)" value={form.totalPremiums ?? ""} onChange={v => upd("totalPremiums", v)} />
            <Field label="Primes avant 70 ans (€)" value={form.premiumsBefore70 ?? ""} onChange={v => upd("premiumsBefore70", v)} />
            <Field label="Primes après 70 ans (€)" value={form.premiumsAfter70 ?? ""} onChange={v => upd("premiumsAfter70", v)} />
            <Field label="Part UC (%)" value={form.ucRatio ?? ""} onChange={v => upd("ucRatio", v)} placeholder="0" />
            <Field label="Performance 2024 (%)" value={form.performance2024 ?? ""} onChange={v => upd("performance2024", v)} placeholder="+4.5" />
          </>
        )}
      </div>

      {/* Rémunération */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 10 }}>Rémunération</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Select label="Type rémunération" value={form.remunerationType ?? "commission"}
          onChange={v => upd("remunerationType", v)}
          options={{ commission: "Commission", honoraire: "Honoraire", mixte: "Mixte" }} />
        <Field label="Taux commission (%)" value={form.commissionRate ?? ""} onChange={v => upd("commissionRate", v)} />
        {!isPrevoyance && (
          <Field label="Honoraire annuel (€)" value={form.honoraireAmount ?? ""} onChange={v => upd("honoraireAmount", v)} />
        )}
      </div>

      {/* Notes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>Notes</label>
        <textarea value={form.notes ?? ""} onChange={e => upd("notes", e.target.value)}
          rows={2} placeholder="Observations, clauses particulières..."
          style={{ ...inp, resize: "vertical" as const }} />
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "7px 16px", border: "1px solid #E2E5EC", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          Annuler
        </button>
        <button onClick={handleSave} disabled={!form.productName?.trim()} style={{
          padding: "7px 16px", border: "none", borderRadius: 6,
          background: form.productName?.trim() ? colorNavy : "#D1D5DB",
          color: "#fff", fontSize: 12, cursor: form.productName?.trim() ? "pointer" : "not-allowed",
          fontFamily: "inherit",
        }}>
          {isEdit ? "Enregistrer" : "Ajouter"}
        </button>
      </div>
    </div>
  );
}

// ── Carte contrat ─────────────────────────────────────────────────────────────

function ContractCard({ contract, onEdit, onDelete, colorGold: _cg2 }: {
  contract: Contract;
  onEdit: () => void;
  onDelete: () => void;
  colorGold: string;
}) {
  const style = TYPE_STYLES[contract.type] ?? TYPE_STYLES.autre;
  const statusStyle = STATUS_COLORS[contract.status] ?? STATUS_COLORS.actif;
  const value = parseVal(contract.currentValue);
  const perf = parseFloat(contract.performance2024 ?? "0");
  const isAV = contract.type === "av" || contract.type === "capitalisation";

  return (
    <div style={{
      border: "1px solid #E2E5EC", borderRadius: 10, background: "#fff",
      marginBottom: 10, overflow: "hidden",
    }}>
      {/* En-tête cliquable */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px", cursor: "pointer",
      }}
        onClick={onEdit}
        onMouseEnter={e => (e.currentTarget.style.background = "#F8F9FB")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        {/* Badge type */}
        <div style={{
          width: 42, height: 42, borderRadius: 8,
          background: style.bg, color: style.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, flexShrink: 0,
        }}>
          {(() => {
            const assureurInfo = findAssureur(contract.insurer);
            if (assureurInfo) {
              return (
                <img
                  src={getLogoUrl(assureurInfo.domain, 64)}
                  alt={assureurInfo.label}
                  style={{ width: 28, height: 28, objectFit: "contain" }}
                  onError={e => { e.currentTarget.style.display = "none"; }}
                />
              );
            }
            return <span>{style.short}</span>;
          })()}
        </div>

        {/* Infos */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0D1B2E" }}>
              {contract.productName || CONTRACT_TYPE_LABELS[contract.type]}
            </div>
            <span style={{
              padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500,
              background: statusStyle.bg, color: statusStyle.color,
            }}>
              {STATUS_LABELS[contract.status]}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
            {[contract.insurer, contract.contractNumber, contract.subscriptionDate
              ? new Date(contract.subscriptionDate).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
              : null
            ].filter(Boolean).join(" · ")}
          </div>
        </div>

        {/* Valeur + performance */}
        <div style={{ textAlign: "right", marginRight: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0D1B2E" }}>
            {value > 0 ? formatVal(value) : "—"}
          </div>
          {contract.performance2024 && (
            <div style={{ fontSize: 11, color: perf >= 0 ? "#10B981" : "#EF4444", marginTop: 1 }}>
              {perf >= 0 ? "▲" : "▼"} {Math.abs(perf).toFixed(1)}% · 2024
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} style={{
            padding: "4px 10px", borderRadius: 6, border: "1px solid #E2E5EC",
            background: "#fff", fontSize: 11, color: "#6B7280", cursor: "pointer", fontFamily: "inherit",
          }}>✏</button>
          <button onClick={onDelete} style={{
            padding: "4px 10px", borderRadius: 6, border: "1px solid #FECACA",
            background: "#fff", fontSize: 11, color: "#EF4444", cursor: "pointer", fontFamily: "inherit",
          }} title="Supprimer">🗑</button>
        </div>
      </div>

      {/* Détails AV */}
      {isAV && (contract.premiumsBefore70 || contract.premiumsAfter70 || contract.ucRatio) && (
        <div style={{
          display: "flex", gap: 16, padding: "8px 14px 10px 68px",
          borderTop: "1px solid #F0F2F6", background: "#F8F9FB",
        }}>
          {contract.premiumsBefore70 && (
            <div style={{ fontSize: 11, color: "#4B5563" }}>
              <span style={{ color: "#9CA3AF" }}>Primes &lt;70 :</span> {formatVal(parseVal(contract.premiumsBefore70))}
            </div>
          )}
          {contract.premiumsAfter70 && (
            <div style={{ fontSize: 11, color: "#4B5563" }}>
              <span style={{ color: "#9CA3AF" }}>Primes &gt;70 :</span> {formatVal(parseVal(contract.premiumsAfter70))}
            </div>
          )}
          {contract.ucRatio && (
            <div style={{ fontSize: 11, color: "#4B5563" }}>
              <span style={{ color: "#9CA3AF" }}>UC :</span> {contract.ucRatio}%
            </div>
          )}
          {contract.commissionRate && (
            <div style={{ fontSize: 11, color: "#4B5563" }}>
              <span style={{ color: "#9CA3AF" }}>Commission :</span> {contract.commissionRate}%
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {contract.notes && (
        <div style={{
          padding: "8px 14px 10px 68px", borderTop: "1px solid #F0F2F6",
          fontSize: 12, color: "#6B7280", background: "#FAFAFA",
        }}>
          {contract.notes}
        </div>
      )}
    </div>
  );
}

// ── KPIs ──────────────────────────────────────────────────────────────────────

function KpiBar({ contracts, colorNavy, colorGold: _cg3 }: {
  contracts: Contract[]; colorNavy: string; colorGold: string;
}) {
  const actifs = contracts.filter(c => c.status === "actif");
  const totalEncours = actifs.reduce((s, c) => s + parseVal(c.currentValue), 0);
  const totalPrimes = actifs.reduce((s, c) => s + parseVal(c.annualPremium), 0);
  const avCount = actifs.filter(c => c.type === "av" || c.type === "capitalisation").length;
  const prevCount = actifs.filter(c => ["prevoyance","sante","iard"].includes(c.type)).length;

  const kpis = [
    { label: "Encours total", value: totalEncours > 0 ? formatVal(totalEncours) : "—" },
    { label: "Primes annuelles", value: totalPrimes > 0 ? formatVal(totalPrimes) : "—" },
    { label: "Contrats actifs", value: String(actifs.length) },
    { label: "AV / CAP", value: String(avCount) },
    { label: "Prévoyance", value: String(prevCount) },
  ];

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16,
    }}>
      {kpis.map(({ label, value }) => (
        <div key={label} style={{
          background: "#fff", border: "1px solid #E2E5EC",
          borderRadius: 10, padding: "12px 14px",
        }}>
          <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4, fontWeight: 500, textTransform: "uppercase" }}>
            {label}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: colorNavy }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function TabContrats({ record, onSave, colorNavy, colorGold }: TabContratsProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState<Partial<Contract> | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const contracts = record.payload?.contracts ?? [];

  const handleSave = (contract: Contract) => {
    const existing = contracts.findIndex(c => c.id === contract.id);
    const newContracts = existing >= 0
      ? contracts.map(c => c.id === contract.id ? contract : c)
      : [...contracts, contract];
    onSave({ ...record, payload: { ...record.payload, contracts: newContracts } });
    setShowForm(false);
    setEditingContract(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer ce contrat ?")) return;
    onSave({ ...record, payload: { ...record.payload, contracts: contracts.filter(c => c.id !== id) } });
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract({ ...contract });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingContract({ ...EMPTY_CONTRACT, contactId: record.id, userId: record.userId });
    setShowForm(true);
  };

  // Types présents pour le filtre
  const presentTypes = [...new Set(contracts.map(c => c.type))];
  const filtered = filterType === "all" ? contracts : contracts.filter(c => c.type === filterType);

  return (
    <div style={{ padding: "0 20px 20px" }}>

      {/* KPIs */}
      {contracts.length > 0 && (
        <KpiBar contracts={contracts} colorNavy={colorNavy} colorGold={colorGold} />
      )}

      {/* Formulaire */}
      {showForm && editingContract && (
        <ContractForm
          initial={editingContract}
          onSave={c => { c.contactId = record.id; c.userId = record.userId; handleSave(c); }}
          onClose={() => { setShowForm(false); setEditingContract(null); }}
          colorNavy={colorNavy}
          colorGold={colorGold}
        />
      )}

      {/* En-tête liste */}
      <div style={{
        background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10,
        padding: "12px 14px", marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: colorNavy }}>
              {contracts.length} contrat{contracts.length !== 1 ? "s" : ""}
            </span>
            {/* Filtres */}
            {presentTypes.length > 1 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <button onClick={() => setFilterType("all")} style={{
                  padding: "2px 10px", borderRadius: 10, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                  border: filterType === "all" ? "none" : "1px solid #E2E5EC",
                  background: filterType === "all" ? colorNavy : "#fff",
                  color: filterType === "all" ? "#fff" : "#6B7280",
                }}>Tous</button>
                {presentTypes.map(t => {
                  const s = TYPE_STYLES[t] ?? TYPE_STYLES.autre;
                  return (
                    <button key={t} onClick={() => setFilterType(t)} style={{
                      padding: "2px 10px", borderRadius: 10, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                      border: filterType === t ? "none" : `1px solid ${s.color}30`,
                      background: filterType === t ? s.color : s.bg,
                      color: filterType === t ? "#fff" : s.color,
                    }}>{s.short}</button>
                  );
                })}
              </div>
            )}
          </div>
          <button onClick={handleNew} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px", border: "none", borderRadius: 6,
            background: colorNavy, color: "#fff",
            fontSize: 12, cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Ajouter un contrat
          </button>
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div style={{
          background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10,
          padding: "40px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13,
        }}>
          {contracts.length === 0
            ? "Aucun contrat enregistré pour ce client."
            : "Aucun contrat pour ce filtre."}
        </div>
      ) : (
        filtered.map(ct => (
          <ContractCard
            key={ct.id}
            contract={ct}
            onEdit={() => handleEdit(ct)}
            onDelete={() => handleDelete(ct.id)}
            colorGold={colorGold}
          />
        ))
      )}
    </div>
  );
}
