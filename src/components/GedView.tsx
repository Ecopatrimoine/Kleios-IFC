// src/components/GedView.tsx
// Vue globale GED — tous documents, tous clients
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";
import type { ContactRecord } from "../types/crm";
import type { DocCategory } from "./fiche/TabGed";
import { supabase } from "../lib/supabase";

interface GedViewProps {
  contacts: ContactRecord[];
  colorNavy: string;
  colorGold: string;
  onOpenContact: (record: ContactRecord) => void;
}

const CATEGORY_LABELS: Record<DocCategory, string> = {
  lettre_mission:      "Lettre de mission",
  rapport_patrimonial: "Rapport patrimonial",
  contrat:             "Contrat",
  der:                 "DER",
  kyc:                 "KYC / Identité",
  autre:               "Autre",
};

const CATEGORY_ICONS: Record<DocCategory, string> = {
  lettre_mission:      "📄",
  rapport_patrimonial: "📊",
  contrat:             "📋",
  der:                 "✅",
  kyc:                 "🪪",
  autre:               "📁",
};

const CATEGORY_COLORS: Record<DocCategory, { bg: string; color: string }> = {
  lettre_mission:      { bg: "#EEF2FF", color: "#3730A3" },
  rapport_patrimonial: { bg: "#ECFDF5", color: "#065F46" },
  contrat:             { bg: "#FEF3C7", color: "#92400E" },
  der:                 { bg: "#F0FDF4", color: "#14532D" },
  kyc:                 { bg: "#FDF4FF", color: "#581C87" },
  autre:               { bg: "#F3F4F6", color: "#6B7280" },
};

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

function KpiCard({ label, value, sub, icon, colorNavy }: {
  label: string; value: string; sub?: string; icon: string; colorNavy: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: colorNavy }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{ fontSize: 20, opacity: 0.5 }}>{icon}</div>
      </div>
    </div>
  );
}

export function GedView({ contacts, colorNavy, colorGold: _cg, onOpenContact }: GedViewProps) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<DocCategory | "all">("all");
  const [sortBy, setSortBy] = useState<"date" | "client" | "size">("date");

  // Aplatir tous les documents avec leur contact
  const allDocs = useMemo(() => {
    const list: { doc: any; contact: ContactRecord }[] = [];
    contacts.forEach(c => {
      const docs = (c.payload as any)?.documents_ged ?? [];
      docs.forEach((d: any) => list.push({ doc: d, contact: c }));
    });
    return list;
  }, [contacts]);

  // KPIs
  const totalSize = allDocs.reduce((s, { doc }) => s + (doc.size ?? 0), 0);
  const clientsWithDocs = new Set(allDocs.map(({ contact }) => contact.id)).size;
  const catCounts = Object.keys(CATEGORY_LABELS).reduce((acc, cat) => {
    acc[cat] = allDocs.filter(({ doc }) => doc.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  // Filtre + tri
  const filtered = useMemo(() => {
    let list = allDocs;
    if (filterCat !== "all") list = list.filter(({ doc }) => doc.category === filterCat);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(({ doc, contact }) =>
        doc.name?.toLowerCase().includes(q) ||
        doc.fileName?.toLowerCase().includes(q) ||
        contact.displayName.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === "date") return (b.doc.uploadedAt ?? "").localeCompare(a.doc.uploadedAt ?? "");
      if (sortBy === "client") return a.contact.displayName.localeCompare(b.contact.displayName);
      if (sortBy === "size") return (b.doc.size ?? 0) - (a.doc.size ?? 0);
      return 0;
    });
  }, [allDocs, filterCat, search, sortBy]);

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.id, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  const inp: React.CSSProperties = {
    border: "1px solid #E2E5EC", borderRadius: 6, padding: "6px 10px",
    fontSize: 12, fontFamily: "inherit", outline: "none", background: "#fff",
  };

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* Titre */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: colorNavy, margin: 0 }}>Gestion documentaire</h2>
        <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3, marginBottom: 0 }}>
          {allDocs.length} document{allDocs.length > 1 ? "s" : ""} · {clientsWithDocs} client{clientsWithDocs > 1 ? "s" : ""}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Total documents" value={String(allDocs.length)} sub={`${clientsWithDocs} clients`} icon="📁" colorNavy={colorNavy} />
        <KpiCard label="Stockage utilisé" value={formatSize(totalSize)} sub="Supabase Storage" icon="☁️" colorNavy={colorNavy} />
        <KpiCard label="Lettres de mission" value={String(catCounts.lettre_mission ?? 0)} icon="📄" colorNavy={colorNavy} />
        <KpiCard label="Rapports patrimoniaux" value={String(catCounts.rapport_patrimonial ?? 0)} icon="📊" colorNavy={colorNavy} />
      </div>

      {/* Filtres */}
      <div style={{
        background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10,
        padding: "12px 14px", marginBottom: 12,
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un document, client..." style={{ ...inp, width: 220 }} />

        {/* Filtres catégories */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button onClick={() => setFilterCat("all")} style={{
            padding: "3px 10px", borderRadius: 10, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
            border: filterCat === "all" ? "none" : "1px solid #E2E5EC",
            background: filterCat === "all" ? colorNavy : "#fff",
            color: filterCat === "all" ? "#fff" : "#6B7280",
          }}>Tous</button>
          {(Object.keys(CATEGORY_LABELS) as DocCategory[]).filter(cat => (catCounts[cat] ?? 0) > 0).map(cat => {
            const s = CATEGORY_COLORS[cat];
            return (
              <button key={cat} onClick={() => setFilterCat(cat)} style={{
                padding: "3px 10px", borderRadius: 10, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                border: filterCat === cat ? "none" : `1px solid ${s.color}30`,
                background: filterCat === cat ? s.color : s.bg,
                color: filterCat === cat ? "#fff" : s.color,
              }}>
                {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]} · {catCounts[cat]}
              </button>
            );
          })}
        </div>

        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{ ...inp, marginLeft: "auto" }}>
          <option value="date">Tri : Date récente</option>
          <option value="client">Tri : Client A→Z</option>
          <option value="size">Tri : Taille ↓</option>
        </select>

        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div style={{
          background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10,
          padding: "50px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13,
        }}>
          {allDocs.length === 0
            ? "Aucun document. Ajoutez des documents depuis les fiches clients."
            : "Aucun document ne correspond aux filtres."}
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#F8F9FB", borderBottom: "2px solid #E2E5EC" }}>
                <th style={{ width: 44 }} />
                <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>Document</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>Client</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>Catégorie</th>
                <th style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>Taille</th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#374151", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>Date</th>
                <th style={{ width: 120 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ doc, contact }) => {
                const catStyle = CATEGORY_COLORS[doc.category as DocCategory] ?? CATEGORY_COLORS.autre;
                return (
                  <tr key={doc.id} style={{ borderBottom: "1px solid #F0F2F6" }}>
                    {/* Icône */}
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 7,
                        background: catStyle.bg, display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 16,
                      }}>
                        {getMimeIcon(doc.mimeType ?? "")}
                      </div>
                    </td>
                    {/* Nom */}
                    <td style={{ padding: "10px 8px" }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#0D1B2E" }}>{doc.name}</div>
                      <div style={{ fontSize: 10, color: "#9CA3AF" }}>{doc.fileName}</div>
                    </td>
                    {/* Client */}
                    <td style={{ padding: "10px 8px" }}>
                      <button onClick={() => onOpenContact(contact)} style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 12, color: colorNavy, fontWeight: 500, fontFamily: "inherit",
                        padding: 0, textAlign: "left",
                      }}>
                        {contact.displayName}
                      </button>
                    </td>
                    {/* Catégorie */}
                    <td style={{ padding: "10px 8px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 500,
                        background: catStyle.bg, color: catStyle.color,
                      }}>
                        {CATEGORY_ICONS[doc.category as DocCategory]} {CATEGORY_LABELS[doc.category as DocCategory] ?? doc.category}
                      </span>
                    </td>
                    {/* Taille */}
                    <td style={{ padding: "10px 8px", textAlign: "right", fontSize: 11, color: "#6B7280" }}>
                      {formatSize(doc.size ?? 0)}
                    </td>
                    {/* Date */}
                    <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, color: "#9CA3AF" }}>
                      {formatDate(doc.uploadedAt)}
                    </td>
                    {/* Actions */}
                    <td style={{ padding: "10px 12px" }}>
                      <button onClick={() => handleDownload(doc)} style={{
                        padding: "4px 10px", borderRadius: 6, border: `1px solid ${colorNavy}30`,
                        background: "#fff", fontSize: 11, color: colorNavy, cursor: "pointer", fontFamily: "inherit",
                      }}>
                        ⬇ Télécharger
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
