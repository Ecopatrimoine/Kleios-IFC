// src/components/fiche/TabEspace.tsx
// Onglet espace client — portail, documents partagés, invitation
// ─────────────────────────────────────────────────────────────────────────────

import type { ContactRecord } from "../../types/crm";

interface TabEspaceProps {
  record: ContactRecord;
  onSave: (record: ContactRecord) => void;
  colorNavy: string;
  colorGold: string;
}

export function TabEspace({ record, onSave, colorNavy }: TabEspaceProps) {
  const portal = record.payload?.portal;
  const documents = record.payload?.documents ?? [];
  const sharedDocs = documents.filter(d => d.visibleToClient);

  const handleActivate = () => {
    const now = new Date().toISOString();
    const updated: ContactRecord = {
      ...record,
      payload: {
        ...record.payload,
        portal: {
          id: crypto.randomUUID(),
          contactId: record.id,
          userId: record.userId,
          isActive: true,
          email: record.payload.contact.person1.email,
          lastLoginAt: "",
          sharedDocumentIds: [],
          inviteToken: crypto.randomUUID(),
          inviteSentAt: now,
          createdAt: now,
          updatedAt: now,
        },
      },
    };
    onSave(updated);
  };

  const handleToggleDoc = (docId: string) => {
    const updated: ContactRecord = {
      ...record,
      payload: {
        ...record.payload,
        documents: documents.map(d =>
          d.id === docId
            ? { ...d, visibleToClient: !d.visibleToClient }
            : d
        ),
      },
    };
    onSave(updated);
  };

  return (
    <div>
      {/* Statut portail */}
      <div style={{
        background: "#fff",
        border: "1px solid #E2E5EC",
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
          Accès portail client
        </div>

        {!portal?.isActive ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 16 }}>
              L'espace client n'est pas encore activé pour ce dossier.
            </div>
            <button
              onClick={handleActivate}
              style={{
                padding: "8px 20px",
                border: "none",
                borderRadius: 6,
                background: colorNavy,
                color: "#fff",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Activer l'espace client
            </button>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}>
            {[
              { label: "Email d'accès",      value: portal.email || record.payload.contact.person1.email },
              { label: "Statut",             value: "Activé ✓", color: "#10B981" },
              { label: "Dernière connexion", value: portal.lastLoginAt
                  ? new Date(portal.lastLoginAt).toLocaleDateString("fr-FR")
                  : "Jamais connecté" },
              { label: "Documents partagés", value: `${sharedDocs.length} fichier${sharedDocs.length > 1 ? "s" : ""}` },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, color: color ?? "#0D1B2E", fontWeight: color ? 500 : 400 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents partagés */}
      {portal?.isActive && (
        <div style={{
          background: "#fff",
          border: "1px solid #E2E5EC",
          borderRadius: 10,
          overflow: "hidden",
        }}>
          <div style={{
            padding: "14px 18px",
            borderBottom: "1px solid #E2E5EC",
            fontSize: 13,
            fontWeight: 600,
          }}>
            Documents visibles par le client
          </div>

          {documents.length === 0 ? (
            <div style={{
              padding: "30px 20px",
              textAlign: "center",
              color: "#9CA3AF",
              fontSize: 13,
            }}>
              Uploadez des documents dans l'onglet GED pour les partager ici.
            </div>
          ) : (
            documents.map((doc, i) => (
              <div key={doc.id} style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 18px",
                borderBottom: i < documents.length - 1 ? "1px solid #F0F2F6" : "none",
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="1" width="9" height="14" rx="1.5"
                    fill={doc.visibleToClient ? "#ECFDF5" : "#F3F4F6"}/>
                  <path d="M8 1v4h3" stroke="#6B7280" fill="none" strokeWidth="1"/>
                </svg>
                <span style={{
                  flex: 1,
                  fontSize: 12.5,
                  color: "#0D1B2E",
                }}>
                  {doc.name}
                </span>
                <span style={{
                  fontSize: 11,
                  color: doc.visibleToClient ? "#10B981" : "#9CA3AF",
                  fontWeight: 500,
                  minWidth: 80,
                  textAlign: "right",
                }}>
                  {doc.visibleToClient ? "Visible" : "Masqué"}
                </span>
                <button
                  onClick={() => handleToggleDoc(doc.id)}
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    border: "none",
                    background: doc.visibleToClient ? colorNavy : "#D1D5DB",
                    cursor: "pointer",
                    position: "relative",
                    transition: "background 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 2,
                    left: doc.visibleToClient ? 18 : 2,
                    transition: "left 0.2s",
                  }}/>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
