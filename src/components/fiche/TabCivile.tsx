// src/components/fiche/TabCivile.tsx
// Onglet fiche civile — Personne 1, Personne 2, Foyer & famille liée
// ─────────────────────────────────────────────────────────────────────────────

import type { ContactRecord, Person } from "../../types/crm";
import { EMPTY_PERSON } from "../../constants";

interface TabCivileProps {
  record: ContactRecord;
  onSave: (record: ContactRecord) => void;
  colorNavy: string;
  colorGold: string;
}

// ── Composants UI locaux ──────────────────────────────────────────────────────

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #E2E5EC",
      borderRadius: 10,
      padding: 16,
      marginBottom: 16,
    }}>
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: "#0D1B2E",
        marginBottom: 14,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: "1px solid #E2E5EC",
          borderRadius: 6,
          padding: "7px 10px",
          fontSize: 13,
          color: "#0D1B2E",
          fontFamily: "inherit",
          outline: "none",
          background: "#fff",
        }}
        onFocus={e => (e.currentTarget.style.borderColor = "#C9A84C")}
        onBlur={e => (e.currentTarget.style.borderColor = "#E2E5EC")}
      />
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 0",
      borderBottom: "1px solid #F0F2F6",
    }}>
      <span style={{ fontSize: 13, color: "#0D1B2E" }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          border: "none",
          background: value ? "#0D1B2E" : "#D1D5DB",
          cursor: "pointer",
          position: "relative",
          transition: "background 0.2s",
        }}
      >
        <div style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          position: "absolute",
          top: 2,
          left: value ? 18 : 2,
          transition: "left 0.2s",
        }}/>
      </button>
    </div>
  );
}

// ── Formulaire personne ───────────────────────────────────────────────────────

function PersonForm({
  person,
  title,
  onChange,
}: {
  person: Person;
  title: string;
  onChange: (p: Person) => void;
}) {
  const upd = (key: keyof Person, val: string | boolean) =>
    onChange({ ...person, [key]: val });

  return (
    <InfoCard title={title}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 12,
        marginBottom: 12,
      }}>
        <Field label="Prénom"            value={person.firstName}       onChange={v => upd("firstName", v)} />
        <Field label="Nom de naissance"  value={person.lastName}        onChange={v => upd("lastName", v)} />
        <Field label="Nom d'usage"       value={person.usageName}       onChange={v => upd("usageName", v)} placeholder="Si différent" />
        <Field label="Date de naissance" value={person.birthDate}       onChange={v => upd("birthDate", v)} type="date" />
        <Field label="Lieu de naissance" value={person.birthPlace}      onChange={v => upd("birthPlace", v)} />
        <Field label="Département"       value={person.birthDepartment} onChange={v => upd("birthDepartment", v)} placeholder="ex: 69" />
        <Field label="Nationalité"       value={person.nationality}     onChange={v => upd("nationality", v)} />
        <Field label="CSP"               value={person.csp}             onChange={v => upd("csp", v)} placeholder="ex: Cadre supérieur" />
        <Field label="Employeur"         value={person.employer}        onChange={v => upd("employer", v)} />
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
        marginBottom: 12,
      }}>
        <Field label="Email"        value={person.email}     onChange={v => upd("email", v)} type="email" />
        <Field label="Téléphone"    value={person.phone}     onChange={v => upd("phone", v)} type="tel" />
        <Field label="Tél. pro"     value={person.phonePro}  onChange={v => upd("phonePro", v)} type="tel" />
        <Field label="Adresse"      value={person.address}   onChange={v => upd("address", v)} />
        <Field label="Code postal"  value={person.postalCode} onChange={v => upd("postalCode", v)} />
        <Field label="Ville"        value={person.city}      onChange={v => upd("city", v)} />
        <Field label="Pays résidence fiscale" value={person.taxCountry} onChange={v => upd("taxCountry", v)} />
      </div>
      <Toggle label="Personne Politiquement Exposée (PPE)" value={person.isPPE}        onChange={v => upd("isPPE", v)} />
      <Toggle label="FATCA (résidence fiscale US)"          value={person.isFATCA}      onChange={v => upd("isFATCA", v)} />
      <Toggle label="Situation de handicap"                 value={person.isHandicapped} onChange={v => upd("isHandicapped", v)} />
    </InfoCard>
  );
}

// ── Onglet principal ──────────────────────────────────────────────────────────

export function TabCivile({ record, onSave, colorNavy, colorGold }: TabCivileProps) {
  const contact = record.payload.contact;

  // Mise à jour personne 1
  const handlePerson1Change = (p: Person) => {
    const updated: ContactRecord = {
      ...record,
      payload: {
        ...record.payload,
        contact: { ...contact, person1: p },
      },
    };
    onSave(updated);
  };

  // Mise à jour personne 2
  const handlePerson2Change = (p: Person) => {
    const updated: ContactRecord = {
      ...record,
      payload: {
        ...record.payload,
        contact: { ...contact, person2: p },
      },
    };
    onSave(updated);
  };

  // Ajouter personne 2
  const handleAddPerson2 = () => {
    const updated: ContactRecord = {
      ...record,
      payload: {
        ...record.payload,
        contact: { ...contact, person2: { ...EMPTY_PERSON } },
      },
    };
    onSave(updated);
  };

  // Supprimer personne 2
  const handleRemovePerson2 = () => {
    const updated: ContactRecord = {
      ...record,
      payload: {
        ...record.payload,
        contact: { ...contact, person2: null },
      },
    };
    onSave(updated);
  };

  // Infos foyer
  const handleFoyerChange = (key: string, val: string) => {
    const updated: ContactRecord = {
      ...record,
      payload: {
        ...record.payload,
        contact: { ...contact, [key]: val },
      },
    };
    onSave(updated);
  };

  return (
    <div>
      {/* Personne 1 */}
      <PersonForm
        person={(contact as any)?.person1}
        title={`Personne 1 — ${(contact as any)?.person1.firstName || "Prénom"} ${(contact as any)?.person1.lastName || "Nom"}`}
        onChange={handlePerson1Change}
      />

      {/* Situation familiale */}
      <InfoCard title="Situation familiale & foyer">
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
        }}>
          {/* Situation */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>
              Situation civile
            </label>
            <select
              value={(contact as any)?.civilStatus}
              onChange={e => handleFoyerChange("civilStatus", e.target.value)}
              style={{
                border: "1px solid #E2E5EC",
                borderRadius: 6,
                padding: "7px 10px",
                fontSize: 13,
                color: "#0D1B2E",
                fontFamily: "inherit",
                outline: "none",
                background: "#fff",
              }}
            >
              <option value="celibataire">Célibataire</option>
              <option value="marie">Marié(e)</option>
              <option value="pacse">Pacsé(e)</option>
              <option value="concubin">Concubin(e)</option>
              <option value="divorce">Divorcé(e)</option>
              <option value="veuf">Veuf/Veuve</option>
            </select>
          </div>

          {/* Régime matrimonial */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>
              Régime matrimonial
            </label>
            <select
              value={(contact as any)?.matrimonialRegime ?? ""}
              onChange={e => handleFoyerChange("matrimonialRegime", e.target.value)}
              style={{
                border: "1px solid #E2E5EC",
                borderRadius: 6,
                padding: "7px 10px",
                fontSize: 13,
                color: "#0D1B2E",
                fontFamily: "inherit",
                outline: "none",
                background: "#fff",
              }}
            >
              <option value="">—</option>
              <option value="communaute_legale">Communauté légale</option>
              <option value="separation_biens">Séparation de biens</option>
              <option value="communaute_universelle">Communauté universelle</option>
              <option value="participation_acquets">Participation aux acquêts</option>
            </select>
          </div>

          {/* Date mariage */}
          <Field
            label="Date mariage / PACS"
            value={(contact as any)?.weddingDate ?? ""}
            onChange={v => handleFoyerChange("weddingDate", v)}
            type="date"
          />
        </div>
      </InfoCard>

      {/* Personne 2 */}
      {(contact as any)?.person2 ? (
        <div>
          <PersonForm
            person={(contact as any)?.person2}
            title={`Personne 2 — ${(contact as any)?.person2.firstName || "Prénom"} ${(contact as any)?.person2.lastName || "Nom"}`}
            onChange={handlePerson2Change}
          />
          <button
            onClick={handleRemovePerson2}
            style={{
              display: "block",
              marginBottom: 16,
              padding: "6px 14px",
              border: "1px solid #FCA5A5",
              borderRadius: 6,
              background: "#fff",
              color: "#DC2626",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Supprimer la personne 2
          </button>
        </div>
      ) : (
        <button
          onClick={handleAddPerson2}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            border: `1px dashed ${colorGold}`,
            borderRadius: 10,
            background: `${colorGold}10`,
            color: colorNavy,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
            marginBottom: 16,
            width: "100%",
            justifyContent: "center",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Ajouter une personne 2 (conjoint / partenaire)
        </button>
      )}

      {/* Famille liée */}
      <InfoCard title="Famille liée">
        {(((contact as any)?.familyLinks ?? []) ?? []).length === 0 ? (
          <div style={{ fontSize: 13, color: "#9CA3AF", padding: "8px 0" }}>
            Aucun lien familial enregistré.
          </div>
        ) : (
          ((contact as any)?.familyLinks ?? []).map((link: any, i: number) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 0",
              borderBottom: i < ((contact as any)?.familyLinks ?? []).length - 1
                ? "1px solid #F0F2F6" : "none",
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#F0F2F6",
                border: "1px solid #E2E5EC",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 600,
                color: "#4B5563",
              }}>
                {link.displayName.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{link.displayName}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>{link.link}</div>
              </div>
            </div>
          ))
        )}
        <button style={{
          marginTop: 10,
          padding: "6px 14px",
          border: "1px solid #E2E5EC",
          borderRadius: 6,
          background: "#fff",
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "inherit",
          color: "#4B5563",
        }}>
          + Ajouter un lien familial
        </button>
      </InfoCard>

      {/* Notes */}
      <InfoCard title="Notes libres">
        <textarea
          value={contact.notes ?? ""}
          onChange={e => handleFoyerChange("notes", e.target.value)}
          placeholder="Notes, observations, informations complémentaires..."
          rows={4}
          style={{
            width: "100%",
            border: "1px solid #E2E5EC",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: 13,
            fontFamily: "inherit",
            color: "#0D1B2E",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = colorGold)}
          onBlur={e => (e.currentTarget.style.borderColor = "#E2E5EC")}
        />
      </InfoCard>
    </div>
  );
}
