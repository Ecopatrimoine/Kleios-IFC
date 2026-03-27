// src/components/SeedDemo.tsx
// Composant de seeding — injecte 50 clients de démonstration
// Tous les clients démo ont _isDemoData: true pour suppression facile
// USAGE : voir App.tsx — retirer après démonstration
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import type { ContactRecord } from "../types/crm";
import { DEMO_CONTACTS } from "./demo_contacts";

interface SeedDemoProps {
  userId: string;
  onContactsCreated: (contacts: ContactRecord[]) => void;
  onDeleteDemo: () => void;
  contacts: ContactRecord[];
  colorNavy: string;
}

export function SeedDemo({ userId, onContactsCreated, onDeleteDemo, contacts, colorNavy }: SeedDemoProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const demoCount = contacts.filter(c => (c as any)._isDemoData).length;
  const hasDemoData = demoCount > 0;

  const handleSeed = () => {
    setLoading(true);
    const now = new Date().toISOString();

    const demoContacts: ContactRecord[] = (DEMO_CONTACTS as unknown as any[]).map(c => {
      const newId = crypto.randomUUID();
      return {
        ...c,
        id: newId,
        userId,
        payload: {
          ...c.payload,
          contact: {
            ...c.payload.contact,
            id: newId,
            userId,
          },
          contracts: (c.payload.contracts ?? []).map((ct: any) => ({
            ...ct,
            contactId: newId,
            userId,
          })),
          events: (c.payload.events ?? []).map((e: any) => ({
            ...e,
            contactId: newId,
            userId,
          })),
        },
        createdAt: now,
        updatedAt: now,
        _isDemoData: true,
      } as ContactRecord;
    });

    onContactsCreated(demoContacts);
    setLoading(false);
    setDone(true);
  };

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 999,
      background: "#fff", border: `2px solid ${colorNavy}30`,
      borderRadius: 12, padding: 16, width: 270,
      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>🎭</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: colorNavy }}>Mode Démonstration</span>
      </div>
      <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 12, lineHeight: 1.5 }}>
        {hasDemoData
          ? `${demoCount} clients fictifs chargés (Pyrénées-Orientales)`
          : "50 clients fictifs avec dossiers complets — Pyrénées-Orientales (66)"}
      </div>

      {!hasDemoData ? (
        <button onClick={handleSeed} disabled={loading} style={{
          width: "100%", padding: "9px", borderRadius: 6, border: "none",
          background: loading ? "#D1D5DB" : colorNavy,
          color: "#fff", fontSize: 12, cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "inherit", fontWeight: 600,
        }}>
          {loading ? "Chargement..." : "✨ Charger les clients démo"}
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {done && (
            <div style={{ fontSize: 11, color: "#10B981", textAlign: "center" }}>
              ✓ {demoCount} clients chargés avec succès
            </div>
          )}
          <button onClick={onDeleteDemo} style={{
            width: "100%", padding: "9px", borderRadius: 6,
            border: "1px solid #FECACA", background: "#fff",
            color: "#EF4444", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}>
            🗑 Supprimer toutes les données démo
          </button>
        </div>
      )}
    </div>
  );
}
