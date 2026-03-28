// src/components/TabMarketing.tsx
// Module Marketing — campagnes email ciblées avec templates
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback } from "react";
import type { ContactRecord, CabinetSettings, CampaignRecord, CampaignTemplate } from "../types/crm";
import { supabase } from "../lib/supabase";

interface TabMarketingProps {
  contacts: ContactRecord[];
  cabinet: CabinetSettings;
  userId: string;
  colorNavy: string;
  colorGold: string;
}

// ── Types filtres ─────────────────────────────────────────────────────────────

interface SegmentFilter {
  status: string[];               // prospect, client, vip, inactif
  ageMin: string;
  ageMax: string;
  csp: string[];
  contractTypes: string[];        // av, per, prevoyance...
  hasNoContract: boolean;
  insurers: string[];
  encoursMin: string;
  lastRdvMoreThanMonths: string;  // pas de RDV depuis X mois
  missionExpiresInMonths: string; // lettre mission expire dans X mois
  mif2ExpiresInMonths: string;
}

const EMPTY_FILTER: SegmentFilter = {
  status: [], ageMin: "", ageMax: "", csp: [],
  contractTypes: [], hasNoContract: false, insurers: [],
  encoursMin: "", lastRdvMoreThanMonths: "", missionExpiresInMonths: "", mif2ExpiresInMonths: "",
};

// ── Templates ─────────────────────────────────────────────────────────────────

interface TemplateConfig {
  id: CampaignTemplate;
  label: string;
  icon: string;
  description: string;
  defaultSubject: string;
  defaultBody: string;  // HTML avec variables {{prenom}}, {{cabinet}}, etc.
}

const TEMPLATES: TemplateConfig[] = [
  {
    id: "bilan_annuel",
    icon: "📊",
    label: "Bilan patrimonial annuel",
    description: "Invitation à un rendez-vous de bilan de fin d'année",
    defaultSubject: "{{cabinet}} — Votre bilan patrimonial {{annee}}",
    defaultBody: `<p>Bonjour {{prenom}},</p>
<p>L'année {{annee}} touche à sa fin. C'est l'occasion idéale de faire le point sur votre situation patrimoniale et d'anticiper les changements à venir.</p>
<p>Je vous propose un rendez-vous bilan pour :</p>
<ul>
  <li>Revoir la performance de vos placements</li>
  <li>Optimiser votre fiscalité avant le 31 décembre</li>
  <li>Adapter votre stratégie patrimoniale</li>
</ul>
<p>{{cta_rdv}}</p>
<p>Cordialement,<br><strong>{{conseiller}}</strong></p>`,
  },
  {
    id: "renouvellement_mission",
    icon: "📄",
    label: "Renouvellement lettre de mission",
    description: "Relance pour les lettres de mission arrivant à expiration",
    defaultSubject: "{{cabinet}} — Renouvellement de votre lettre de mission",
    defaultBody: `<p>Bonjour {{prenom}},</p>
<p>Votre lettre de mission avec notre cabinet arrive à échéance. Conformément à la réglementation DDA, celle-ci doit être renouvelée tous les 2 ans.</p>
<p>Cette démarche simple nous permet de :</p>
<ul>
  <li>Mettre à jour votre situation personnelle et financière</li>
  <li>Vérifier que vos objectifs n'ont pas évolué</li>
  <li>Garantir la conformité de nos conseils</li>
</ul>
<p>Je vous contacte dans les prochains jours pour organiser ce rendez-vous.</p>
<p>Cordialement,<br><strong>{{conseiller}}</strong></p>`,
  },
  {
    id: "relance_prospect",
    icon: "🎯",
    label: "Relance prospect",
    description: "Prise de contact pour les prospects sans activité récente",
    defaultSubject: "{{cabinet}} — Prenons quelques minutes pour votre patrimoine",
    defaultBody: `<p>Bonjour {{prenom}},</p>
<p>Nous avons eu l'occasion de nous rencontrer et j'espère que vous allez bien.</p>
<p>Dans un contexte économique en constante évolution, il me semblerait utile de faire le point ensemble sur votre situation patrimoniale.</p>
<p>Un échange de 30 minutes suffit souvent pour identifier des opportunités d'optimisation.</p>
<p>{{cta_rdv}}</p>
<p>Cordialement,<br><strong>{{conseiller}}</strong></p>`,
  },
  {
    id: "invitation_rdv",
    icon: "📅",
    label: "Invitation rendez-vous bilan",
    description: "Proposer un rendez-vous de suivi à vos clients actifs",
    defaultSubject: "{{cabinet}} — Rendez-vous de suivi patrimonial",
    defaultBody: `<p>Bonjour {{prenom}},</p>
<p>Dans le cadre de notre suivi personnalisé, je souhaite vous proposer un rendez-vous de suivi patrimonial.</p>
<p>Ce rendez-vous nous permettra de :</p>
<ul>
  <li>Faire le point sur l'évolution de vos contrats</li>
  <li>Adapter votre stratégie aux nouvelles règles fiscales</li>
  <li>Répondre à toutes vos questions</li>
</ul>
<p>{{cta_rdv}}</p>
<p>Cordialement,<br><strong>{{conseiller}}</strong></p>`,
  },
  {
    id: "alerte_marche",
    icon: "📈",
    label: "Information marché / actualité",
    description: "Partager une actualité patrimoniale ou marché",
    defaultSubject: "{{cabinet}} — Information importante pour votre patrimoine",
    defaultBody: `<p>Bonjour {{prenom}},</p>
<p>Je souhaitais vous informer d'une actualité importante susceptible d'impacter votre stratégie patrimoniale :</p>
<p><strong>{{titre_actualite}}</strong></p>
<p>{{contenu_actualite}}</p>
<p>N'hésitez pas à me contacter si vous souhaitez en discuter.</p>
<p>Cordialement,<br><strong>{{conseiller}}</strong></p>`,
  },
  {
    id: "voeux",
    icon: "🎉",
    label: "Vœux nouvelle année",
    description: "Message de vœux de début d'année",
    defaultSubject: "{{cabinet}} — Meilleurs vœux {{annee}}",
    defaultBody: `<p>Bonjour {{prenom}},</p>
<p>En ce début d'année {{annee}}, toute l'équipe de <strong>{{cabinet}}</strong> vous adresse ses meilleurs vœux.</p>
<p>Que cette nouvelle année soit synonyme de santé, de réussite et de projets épanouis.</p>
<p>Nous serons toujours présents pour vous accompagner dans vos objectifs patrimoniaux.</p>
<p>Très cordialement,<br><strong>{{conseiller}}</strong></p>`,
  },
  {
    id: "prevoyance_tns",
    icon: "🛡️",
    label: "Campagne prévoyance TNS",
    description: "Cibler les clients sans couverture prévoyance",
    defaultSubject: "{{cabinet}} — Protégez-vous contre les aléas de la vie",
    defaultBody: `<p>Bonjour {{prenom}},</p>
<p>En tant que travailleur indépendant, votre protection sociale est primordiale mais souvent sous-estimée.</p>
<p>Un arrêt de travail ou un décès sans couverture adaptée peut mettre en péril votre activité et la sécurité financière de vos proches.</p>
<p>Je souhaite vous présenter les solutions de prévoyance adaptées à votre profil :</p>
<ul>
  <li>Garantie décès et invalidité</li>
  <li>Maintien de revenus en cas d'arrêt de travail</li>
  <li>Optimisation fiscale des cotisations</li>
</ul>
<p>{{cta_rdv}}</p>
<p>Cordialement,<br><strong>{{conseiller}}</strong></p>`,
  },
  {
    id: "campagne_per",
    icon: "🏦",
    label: "Campagne PER / Retraite",
    description: "Clients de plus de 45 ans pour optimisation retraite",
    defaultSubject: "{{cabinet}} — Préparez votre retraite avec le PER",
    defaultBody: `<p>Bonjour {{prenom}},</p>
<p>La préparation de la retraite est un enjeu majeur qui mérite d'être anticipé.</p>
<p>Le Plan d'Épargne Retraite (PER) offre des avantages fiscaux immédiats tout en construisant un capital pour l'avenir :</p>
<ul>
  <li>Déduction des versements de votre revenu imposable</li>
  <li>Capital ou rente disponible à la retraite</li>
  <li>Sortie anticipée possible pour l'achat de la résidence principale</li>
</ul>
<p>Je serais ravi de vous présenter une simulation personnalisée.</p>
<p>{{cta_rdv}}</p>
<p>Cordialement,<br><strong>{{conseiller}}</strong></p>`,
  },
  {
    id: "nouveau_produit",
    icon: "✨",
    label: "Présentation nouveau produit",
    description: "Informer vos clients d'un nouveau produit ou service",
    defaultSubject: "{{cabinet}} — Nouveau produit : {{nom_produit}}",
    defaultBody: `<p>Bonjour {{prenom}},</p>
<p>J'ai le plaisir de vous présenter une nouvelle solution que nous avons sélectionnée pour ses performances et sa pertinence dans le contexte actuel :</p>
<p><strong>{{nom_produit}}</strong></p>
<p>{{description_produit}}</p>
<p>Au vu de votre profil patrimonial, ce produit pourrait correspondre à vos objectifs.</p>
<p>Je reste à votre disposition pour en discuter.</p>
<p>Cordialement,<br><strong>{{conseiller}}</strong></p>`,
  },
  {
    id: "libre",
    icon: "✏️",
    label: "Email libre",
    description: "Rédigez un email entièrement personnalisé",
    defaultSubject: "",
    defaultBody: `<p>Bonjour {{prenom}},</p>
<p></p>
<p>Cordialement,<br><strong>{{conseiller}}</strong></p>`,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAge(birthDate: string): number {
  if (!birthDate) return 0;
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000));
}

function getEncours(record: ContactRecord): number {
  return (record.payload?.contracts ?? [])
    .filter(c => c.status === "actif")
    .reduce((s, c) => s + parseFloat((c.currentValue ?? "0").replace(/[^0-9.,]/g, "").replace(",", ".") || "0"), 0);
}

function getLastRdvMonths(record: ContactRecord): number {
  const events = record.payload?.events ?? [];
  if (!events.length) return 999;
  const last = events.filter(e => e.type === "rdv" && e.status === "realise")
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!last) return 999;
  return (Date.now() - new Date(last.date).getTime()) / (30 * 24 * 3600 * 1000);
}

function getMissionExpiresInMonths(record: ContactRecord): number {
  const signed = record.payload?.conformite?.lettreMission?.signedDate;
  if (!signed) return -1;
  const expiry = new Date(new Date(signed).getTime() + 2 * 365.25 * 24 * 3600 * 1000);
  return (expiry.getTime() - Date.now()) / (30 * 24 * 3600 * 1000);
}

function applyTemplate(html: string, record: ContactRecord, cabinet: CabinetSettings): string {
  const p1 = (record.payload?.contact as any);
  const prenom = p1?.firstName || record.displayName.split(" ")[0] || record.displayName;
  const annee = new Date().getFullYear().toString();
  const rdvUrl = cabinet.rdvUrl;
  const ctaRdv = rdvUrl
    ? `<a href="${rdvUrl}" style="display:inline-block;background:#101B3B;color:#E3AF64;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Prendre rendez-vous →</a>`
    : `<em>Contactez-moi pour prendre rendez-vous.</em>`;
  return html
    .replace(/{{prenom}}/g, prenom)
    .replace(/{{cabinet}}/g, cabinet.cabinetName || "Notre cabinet")
    .replace(/{{conseiller}}/g, cabinet.senderName || cabinet.cabinetName || "Votre conseiller")
    .replace(/{{annee}}/g, annee)
    .replace(/{{cta_rdv}}/g, ctaRdv);
}

function buildEmailHtml(subject: string, body: string, cabinet: CabinetSettings): string {
  const navy = cabinet.colorNavy || "#101B3B";
  const gold = cabinet.colorGold || "#E3AF64";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:20px;margin-bottom:20px">
    <div style="background:${navy};padding:24px 32px;text-align:center;border-bottom:3px solid ${gold}">
      <div style="color:${gold};font-size:22px;font-weight:bold;letter-spacing:1px">${cabinet.cabinetName || "Cabinet"}</div>
    </div>
    <div style="padding:32px;color:#101B3B;line-height:1.7">
      ${body}
    </div>
    <div style="padding:16px 32px;background:${navy}1A;text-align:center;border-top:1px solid ${navy}20">
      <p style="color:#888;font-size:12px;margin:0">© ${new Date().getFullYear()} ${cabinet.cabinetName || "Cabinet"}</p>
      ${cabinet.orias ? `<p style="color:#aaa;font-size:11px;margin:4px 0">ORIAS : ${cabinet.orias}</p>` : ""}
    </div>
  </div>
</body></html>`;
}

// ── Composant principal ───────────────────────────────────────────────────────

export function TabMarketing({ contacts, cabinet, userId, colorNavy, colorGold }: TabMarketingProps) {
  const [activeTab, setActiveTab] = useState<"nouvelle" | "historique" | "segments">("nouvelle");

  // Étapes campagne
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig | null>(null);
  const [filter, setFilter] = useState<SegmentFilter>({ ...EMPTY_FILTER });
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [previewContact, setPreviewContact] = useState<ContactRecord | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: number; fail: number } | null>(null);

  // Historique stocké localement
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`kleios_campaigns_${userId}`) ?? "[]");
    } catch { return []; }
  });

  const saveCampaigns = (c: CampaignRecord[]) => {
    setCampaigns(c);
    localStorage.setItem(`kleios_campaigns_${userId}`, JSON.stringify(c));
  };

  // ── Filtrage des destinataires ────────────────────────────────────────────
  const filteredContacts = useMemo(() => {
    return contacts.filter(record => {
      const p1 = (record.payload?.contact as any);
      const email = p1?.email || record.payload?.contact?.email;
      if (!email) return false; // pas d'email = exclu

      if (filter.status.length > 0 && !filter.status.includes(record.status)) return false;

      const age = getAge(p1?.birthDate ?? "");
      if (filter.ageMin && age < parseInt(filter.ageMin)) return false;
      if (filter.ageMax && age > parseInt(filter.ageMax)) return false;

      if (filter.csp.length > 0 && !filter.csp.includes(p1?.csp ?? "")) return false;

      const contracts = record.payload?.contracts ?? [];
      if (filter.hasNoContract && contracts.length > 0) return false;
      if (filter.contractTypes.length > 0) {
        const hasType = contracts.some(c => filter.contractTypes.includes(c.type));
        if (!hasType) return false;
      }
      if (filter.insurers.length > 0) {
        const hasInsurer = contracts.some(c => filter.insurers.includes(c.insurer));
        if (!hasInsurer) return false;
      }
      if (filter.encoursMin) {
        if (getEncours(record) < parseFloat(filter.encoursMin)) return false;
      }
      if (filter.lastRdvMoreThanMonths) {
        if (getLastRdvMonths(record) < parseFloat(filter.lastRdvMoreThanMonths)) return false;
      }
      if (filter.missionExpiresInMonths) {
        const months = getMissionExpiresInMonths(record);
        if (months < 0 || months > parseFloat(filter.missionExpiresInMonths)) return false;
      }
      return true;
    });
  }, [contacts, filter]);

  // ── Sélection template ────────────────────────────────────────────────────
  const handleSelectTemplate = (tpl: TemplateConfig) => {
    setSelectedTemplate(tpl);
    setSubject(tpl.defaultSubject.replace(/{{cabinet}}/g, cabinet.cabinetName || "Notre cabinet").replace(/{{annee}}/g, new Date().getFullYear().toString()));
    setBodyHtml(tpl.defaultBody);
    setCampaignName(tpl.label);
    setStep(2);
  };

  // ── Envoi ──────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!filteredContacts.length) return;
    setSending(true);
    let ok = 0, fail = 0;

    for (const record of filteredContacts) {
      const email = record.payload?.contact?.email || record.payload?.contact?.email;
      if (!email) { fail++; continue; }

      const personalizedBody = applyTemplate(bodyHtml, record, cabinet);
      const fullHtml = buildEmailHtml(subject, personalizedBody, cabinet);
      // Resend n'accepte que les domaines vérifiés — on force ploutos-cgp.fr
      const fromName = cabinet.senderName || cabinet.cabinetName || "Cabinet";
      const from = `${fromName} <contact@ploutos-cgp.fr>`;
      // ReplyTo = email du conseiller si renseigné
      const replyTo = cabinet.senderEmail || undefined;

      try {
        const { error } = await supabase.functions.invoke("send-marketing-email", {
          body: { to: email, from, replyTo, subject: applyTemplate(subject, record, cabinet), html: fullHtml },
        });
        if (error) throw error;
        ok++;
      } catch { fail++; }
    }

    // Sauvegarder dans l'historique
    const campaign: CampaignRecord & { recipientNames?: string[]; recipientEmails?: string[] } = {
      id: crypto.randomUUID(),
      userId,
      name: campaignName,
      template: selectedTemplate?.id ?? "libre",
      subject,
      bodyHtml,
      status: "envoye",
      recipientIds: filteredContacts.map(c => c.id),
      recipientNames: filteredContacts.map(c => c.displayName),
      recipientEmails: filteredContacts.map(c => c.payload?.contact?.email || c.payload?.contact?.email || ""),
      sentCount: ok,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveCampaigns([campaign, ...campaigns]);
    setSendResult({ ok, fail });
    setSending(false);
    setStep(3);
  }, [filteredContacts, bodyHtml, subject, cabinet, campaignName, selectedTemplate, campaigns, userId]);

  const handleDeleteCampaign = (id: string) => {
    if (!confirm("Supprimer cette campagne de l'historique ?")) return;
    saveCampaigns(campaigns.filter(c => c.id !== id));
  };

  const handleRelaunchCampaign = (c: CampaignRecord) => {
    const tpl = TEMPLATES.find(t => t.id === c.template) ?? TEMPLATES[TEMPLATES.length - 1];
    setSelectedTemplate(tpl);
    setSubject(c.subject);
    setBodyHtml(c.bodyHtml);
    setCampaignName(c.name + " (relance)");
    setActiveTab("nouvelle");
    setStep(2);
  };

  const inp: React.CSSProperties = {
    border: "1px solid #E2E5EC", borderRadius: 6, padding: "7px 10px",
    fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff",
    width: "100%", boxSizing: "border-box",
  };
  const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #E2E5EC", borderRadius: 10, padding: 16, marginBottom: 16,
  };

  // ── Navigation onglets ────────────────────────────────────────────────────
  const tabs = [
    { id: "nouvelle", label: "Nouvelle campagne", icon: "✉️" },
    { id: "historique", label: `Historique (${campaigns.length})`, icon: "📋" },
  ] as const;

  return (
    <div style={{ maxWidth: 1000 }}>

      {/* Titre */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: colorNavy, margin: 0 }}>Marketing & Campagnes</h2>
        <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3, marginBottom: 0 }}>
          {contacts.filter(c => c.payload?.contact?.email || c.payload?.contact?.email).length} clients avec email · {campaigns.length} campagne{campaigns.length > 1 ? "s" : ""} envoyée{campaigns.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "2px solid #E2E5EC" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setStep(1); }} style={{
            padding: "10px 18px", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            background: "none", border: "none",
            borderBottom: activeTab === t.id ? `2px solid ${colorGold}` : "2px solid transparent",
            color: activeTab === t.id ? colorNavy : "#6B7280",
            fontWeight: activeTab === t.id ? 600 : 400,
            marginBottom: -2,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ════ NOUVELLE CAMPAGNE ════ */}
      {activeTab === "nouvelle" && (
        <>
          {/* Barre de progression */}
          {step < 3 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
              {[
                { n: 1, label: "Choisir un template" },
                { n: 2, label: "Cibler & personnaliser" },
              ].map(({ n, label }) => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                    background: step >= n ? colorNavy : "#E2E5EC",
                    color: step >= n ? "#fff" : "#9CA3AF",
                  }}>{n}</div>
                  <span style={{ fontSize: 12, color: step >= n ? colorNavy : "#9CA3AF", fontWeight: step === n ? 600 : 400 }}>{label}</span>
                  {n < 2 && <div style={{ width: 40, height: 1, background: step > n ? colorNavy : "#E2E5EC" }} />}
                </div>
              ))}
            </div>
          )}

          {/* ── Étape 1 : Choisir template ── */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: colorNavy, marginBottom: 14 }}>
                Sélectionnez un template de campagne
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {TEMPLATES.map(tpl => (
                  <div key={tpl.id} onClick={() => handleSelectTemplate(tpl)} style={{
                    ...card, marginBottom: 0, cursor: "pointer", transition: "all 0.15s",
                    display: "flex", gap: 12, alignItems: "flex-start",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colorGold; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E5EC"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <div style={{ fontSize: 24, flexShrink: 0 }}>{tpl.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0D1B2E", marginBottom: 2 }}>{tpl.label}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>{tpl.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Étape 2 : Ciblage + personnalisation ── */}
          {step === 2 && selectedTemplate && (
            <div>
              {/* Nom campagne */}
              <div style={card}>
                <div style={{ fontSize: 12, fontWeight: 600, color: colorNavy, marginBottom: 10 }}>Nom de la campagne</div>
                <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="ex: Bilan annuel décembre 2026" style={inp} />
              </div>

              {/* Filtres destinataires */}
              <div style={card}>
                <div style={{ fontSize: 12, fontWeight: 600, color: colorNavy, marginBottom: 14 }}>
                  Ciblage des destinataires
                  <span style={{ marginLeft: 8, padding: "2px 10px", borderRadius: 10, fontSize: 10, background: "#ECFDF5", color: "#065F46", fontWeight: 500 }}>
                    {filteredContacts.length} destinataire{filteredContacts.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {/* Statut */}
                  <div>
                    <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: 6 }}>Statut client</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {["prospect", "client", "vip", "inactif"].map(s => (
                        <button key={s} onClick={() => setFilter(f => ({
                          ...f, status: f.status.includes(s) ? f.status.filter(x => x !== s) : [...f.status, s]
                        }))} style={{
                          padding: "3px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                          border: filter.status.includes(s) ? "none" : "1px solid #E2E5EC",
                          background: filter.status.includes(s) ? colorNavy : "#fff",
                          color: filter.status.includes(s) ? "#fff" : "#374151",
                        }}>{s}</button>
                      ))}
                    </div>
                  </div>
                  {/* Tranche d'âge */}
                  <div>
                    <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: 6 }}>Tranche d'âge</label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input value={filter.ageMin} onChange={e => setFilter(f => ({ ...f, ageMin: e.target.value }))} placeholder="Min" style={{ ...inp, width: "45%" }} type="number" />
                      <span style={{ color: "#9CA3AF", fontSize: 11 }}>–</span>
                      <input value={filter.ageMax} onChange={e => setFilter(f => ({ ...f, ageMax: e.target.value }))} placeholder="Max" style={{ ...inp, width: "45%" }} type="number" />
                    </div>
                  </div>
                  {/* Encours min */}
                  <div>
                    <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: 6 }}>Encours minimum (€)</label>
                    <input value={filter.encoursMin} onChange={e => setFilter(f => ({ ...f, encoursMin: e.target.value }))} placeholder="0" style={inp} type="number" />
                  </div>
                  {/* Types contrats */}
                  <div>
                    <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: 6 }}>Contrats détenus</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {["av", "per", "prevoyance", "sante", "scpi", "pea"].map(t => (
                        <button key={t} onClick={() => setFilter(f => ({
                          ...f, contractTypes: f.contractTypes.includes(t) ? f.contractTypes.filter(x => x !== t) : [...f.contractTypes, t]
                        }))} style={{
                          padding: "3px 8px", borderRadius: 8, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                          border: filter.contractTypes.includes(t) ? "none" : "1px solid #E2E5EC",
                          background: filter.contractTypes.includes(t) ? colorNavy : "#fff",
                          color: filter.contractTypes.includes(t) ? "#fff" : "#374151",
                        }}>{t.toUpperCase()}</button>
                      ))}
                    </div>
                  </div>
                  {/* Sans contrat */}
                  <div>
                    <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: 6 }}>Autres critères</label>
                    <label style={{ display: "flex", gap: 6, cursor: "pointer", fontSize: 12, alignItems: "center" }}>
                      <input type="checkbox" checked={filter.hasNoContract} onChange={e => setFilter(f => ({ ...f, hasNoContract: e.target.checked }))} style={{ accentColor: colorNavy }} />
                      Sans contrat
                    </label>
                  </div>
                  {/* Dernier RDV */}
                  <div>
                    <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: 6 }}>Sans RDV depuis (mois)</label>
                    <input value={filter.lastRdvMoreThanMonths} onChange={e => setFilter(f => ({ ...f, lastRdvMoreThanMonths: e.target.value }))} placeholder="ex: 6" style={inp} type="number" />
                  </div>
                  {/* Lettre mission expire */}
                  <div>
                    <label style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500, display: "block", marginBottom: 6 }}>Lettre mission expire dans (mois)</label>
                    <input value={filter.missionExpiresInMonths} onChange={e => setFilter(f => ({ ...f, missionExpiresInMonths: e.target.value }))} placeholder="ex: 3" style={inp} type="number" />
                  </div>
                </div>

                {/* Liste destinataires */}
                {filteredContacts.length > 0 && (
                  <div style={{ marginTop: 14, maxHeight: 160, overflowY: "auto", border: "1px solid #F0F2F6", borderRadius: 8, padding: "6px 0" }}>
                    {filteredContacts.map(c => {
                      const email = c.payload?.contact?.email || c.payload?.contact?.email;
                      return (
                        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 12px", fontSize: 12, color: "#374151" }}>
                          <span style={{ fontWeight: 500 }}>{c.displayName}</span>
                          <span style={{ color: "#9CA3AF" }}>{email}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {filteredContacts.length === 0 && (
                  <div style={{ marginTop: 10, padding: "10px", background: "#FEF2F2", borderRadius: 8, fontSize: 12, color: "#991B1B" }}>
                    Aucun destinataire ne correspond à ces critères.
                  </div>
                )}
              </div>

              {/* Objet email */}
              <div style={card}>
                <div style={{ fontSize: 12, fontWeight: 600, color: colorNavy, marginBottom: 10 }}>Objet de l'email</div>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Objet..." style={inp} />
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>
                  Variables disponibles : <code>{"{{prenom}}"}</code> <code>{"{{cabinet}}"}</code> <code>{"{{conseiller}}"}</code> <code>{"{{annee}}"}</code>
                </div>
              </div>

              {/* Corps email */}
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: colorNavy }}>Corps de l'email (HTML)</div>
                  {filteredContacts.length > 0 && (
                    <button onClick={() => setPreviewContact(previewContact ? null : filteredContacts[0])} style={{
                      padding: "4px 12px", borderRadius: 6, border: `1px solid ${colorNavy}`,
                      background: "#fff", fontSize: 11, color: colorNavy, cursor: "pointer", fontFamily: "inherit",
                    }}>
                      {previewContact ? "Masquer aperçu" : "Aperçu"}
                    </button>
                  )}
                </div>
                <textarea value={bodyHtml} onChange={e => setBodyHtml(e.target.value)} rows={12}
                  style={{ ...inp, fontFamily: "monospace", fontSize: 12, resize: "vertical" as const }} />
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>
                  <code>{"{{cta_rdv}}"}</code> insère automatiquement un bouton de prise de RDV
                </div>

                {/* Prévisualisation */}
                {previewContact && (
                  <div style={{ marginTop: 14, border: "1px solid #E2E5EC", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ padding: "8px 12px", background: "#F8F9FB", fontSize: 11, color: "#6B7280", borderBottom: "1px solid #E2E5EC" }}>
                      Aperçu pour : {previewContact.displayName}
                    </div>
                    <iframe
                      srcDoc={buildEmailHtml(
                        applyTemplate(subject, previewContact, cabinet),
                        applyTemplate(bodyHtml, previewContact, cabinet),
                        cabinet
                      )}
                      style={{ width: "100%", height: 400, border: "none" }}
                      title="Aperçu email"
                    />
                  </div>
                )}
              </div>

              {/* Expéditeur */}
              <div style={{ ...card, background: "#F8F9FB", fontSize: 12, color: "#6B7280" }}>
                📤 Envoyé depuis : <strong style={{ color: colorNavy }}>
                  {cabinet.senderName || cabinet.cabinetName || "Cabinet"} &lt;{cabinet.senderEmail || "contact@ploutos-cgp.fr"}&gt;
                </strong>
                {!cabinet.senderEmail && (
                  <span style={{ marginLeft: 8, color: "#F59E0B" }}>⚠ Configurez votre email expéditeur dans Paramètres</span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                <button onClick={() => setStep(1)} style={{ padding: "8px 16px", border: "1px solid #E2E5EC", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  ← Retour
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || filteredContacts.length === 0 || !subject}
                  style={{
                    padding: "10px 28px", border: "none", borderRadius: 6, fontSize: 13, cursor: sending || !filteredContacts.length || !subject ? "not-allowed" : "pointer", fontFamily: "inherit",
                    background: sending || !filteredContacts.length || !subject ? "#D1D5DB" : colorNavy,
                    color: "#fff", fontWeight: 600,
                  }}>
                  {sending ? "Envoi en cours..." : `Envoyer à ${filteredContacts.length} destinataire${filteredContacts.length > 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          )}

          {/* ── Étape 3 : Résultat ── */}
          {step === 3 && sendResult && (
            <div style={{ textAlign: "center", padding: "50px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                {sendResult.fail === 0 ? "✅" : "⚠️"}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: colorNavy, marginBottom: 8 }}>
                Campagne envoyée
              </div>
              <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
                <span style={{ color: "#065F46", fontWeight: 600 }}>{sendResult.ok} email{sendResult.ok > 1 ? "s" : ""} envoyé{sendResult.ok > 1 ? "s" : ""}</span>
                {sendResult.fail > 0 && <span style={{ color: "#EF4444", marginLeft: 8 }}>{sendResult.fail} échec{sendResult.fail > 1 ? "s" : ""}</span>}
              </div>
              <button onClick={() => { setStep(1); setFilter({ ...EMPTY_FILTER }); setSelectedTemplate(null); setSendResult(null); }} style={{
                padding: "10px 24px", border: "none", borderRadius: 6, background: colorNavy, color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}>
                Nouvelle campagne
              </button>
            </div>
          )}
        </>
      )}

      {/* ════ HISTORIQUE ════ */}
      {activeTab === "historique" && (
        <div>
          {campaigns.length === 0 ? (
            <div style={{ ...card, textAlign: "center", padding: "50px", color: "#9CA3AF" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 14 }}>Aucune campagne envoyée pour l'instant.</div>
            </div>
          ) : (
            <div>
              {campaigns.map(c => (
                <div key={c.id} style={{ ...card, gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ fontSize: 24, flexShrink: 0 }}>
                      {TEMPLATES.find(t => t.id === c.template)?.icon ?? "✉️"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0D1B2E" }}>{c.name}</div>
                        <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500, background: "#ECFDF5", color: "#065F46" }}>Envoyée</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                        {c.sentAt ? new Date(c.sentAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        {" · "}<strong>{c.sentCount} destinataire{c.sentCount > 1 ? "s" : ""}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Objet : {c.subject}</div>
                      {/* Cible */}
                      {(c as any).recipientNames?.length > 0 && (
                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {((c as any).recipientNames as string[]).slice(0, 5).map((name: string, i: number) => (
                            <span key={i} style={{ padding: "1px 8px", borderRadius: 8, fontSize: 10, background: "#F0F2F6", color: "#374151" }}>{name}</span>
                          ))}
                          {((c as any).recipientNames as string[]).length > 5 && (
                            <span style={{ padding: "1px 8px", borderRadius: 8, fontSize: 10, background: "#F0F2F6", color: "#9CA3AF" }}>+{((c as any).recipientNames as string[]).length - 5} autres</span>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => handleRelaunchCampaign(c)} style={{
                        padding: "5px 12px", borderRadius: 6, border: `1px solid ${colorNavy}`,
                        background: "#fff", fontSize: 11, color: colorNavy, cursor: "pointer", fontFamily: "inherit",
                      }} title="Relancer cette campagne">
                        🔁 Relancer
                      </button>
                      <button onClick={() => handleDeleteCampaign(c.id)} style={{
                        padding: "5px 10px", borderRadius: 6, border: "1px solid #FECACA",
                        background: "#fff", fontSize: 11, color: "#EF4444", cursor: "pointer", fontFamily: "inherit",
                      }} title="Supprimer">🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
