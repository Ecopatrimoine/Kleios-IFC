// supabase/functions/send-email/index.ts — Kleios IFC
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = "Kleios IFC <noreply@ploutos-cgp.fr>";

const ORANGE = "#E8722A";
const NAVY   = "#1A2E44";
const YELLOW = "#FFD100";

const HEADER = `
  <div style="background:${NAVY};padding:24px 32px;text-align:center;border-bottom:4px solid ${ORANGE}">
    <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:2px">
      <span style="color:${ORANGE}">Kleios</span> <span style="color:${YELLOW}">IFC</span>
    </div>
    <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;letter-spacing:1px">
      GESTION COMMERCIALE · ALTERNANCE
    </div>
  </div>`;

const FOOTER = `
  <div style="padding:16px 32px;background:#f0f0f0;text-align:center">
    <p style="color:#9CA3AF;font-size:12px;margin:0">
      © Kleios IFC 2026 — Institut de Formation Continue ·
      <a href="https://kleios-ifc.ploutos-cgp.fr" style="color:${ORANGE}">kleios-ifc.ploutos-cgp.fr</a>
    </p>
  </div>`;

const ROLE_LABELS: Record<string, string> = {
  rre:             "Responsable Relations Entreprises",
  directeur:       "Directeur de campus",
  super_directeur: "Super Directeur",
};

const LICENCE_LABELS: Record<string, string> = {
  trial:    "Essai 15 jours",
  lifetime: "Accès complet",
  admin:    "Administrateur",
};

interface EmailPayload {
  to: string;
  type: "welcome_ifc" | "account_activated" | "password_reset_ifc";
  first_name?: string;
  last_name?: string;
  school?: string;
  role?: string;
  licence_type?: string;
}

function getEmailContent(payload: EmailPayload): { subject: string; html: string } {
  const firstName  = payload.first_name ?? "";
  const lastName   = payload.last_name  ?? "";
  const school     = payload.school     ?? "IFC";
  const roleLabel  = ROLE_LABELS[payload.role ?? "rre"] ?? payload.role ?? "Utilisateur";
  const licLabel   = LICENCE_LABELS[payload.licence_type ?? "lifetime"] ?? payload.licence_type ?? "Accès complet";
  const fullName   = [firstName, lastName].filter(Boolean).join(" ") || "Utilisateur";

  switch (payload.type) {

    case "welcome_ifc":
      return {
        subject: `Bienvenue sur Kleios IFC — votre compte a été créé`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:${NAVY}">
            ${HEADER}
            <div style="padding:32px;background:#fff">
              <h2 style="color:${NAVY};margin-top:0">Bienvenue sur Kleios IFC, ${firstName} !</h2>
              <p>Votre compte a été créé par l'équipe d'administration.</p>

              <div style="background:#FFF8F0;border-left:4px solid ${ORANGE};border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0">
                <div style="font-size:13px;color:${NAVY};line-height:1.8">
                  <div><strong>Nom :</strong> ${fullName}</div>
                  <div><strong>Campus :</strong> ${school}</div>
                  <div><strong>Rôle :</strong> ${roleLabel}</div>
                  <div><strong>Accès :</strong> ${licLabel}</div>
                </div>
              </div>

              <div style="background:#FEF9C3;border:1px solid ${YELLOW};border-radius:8px;padding:16px 20px;margin:20px 0">
                <p style="margin:0;font-size:13px;color:#78350F;font-weight:600">
                  📧 Étape suivante — Définissez votre mot de passe
                </p>
                <p style="margin:8px 0 0;font-size:13px;color:#92400E">
                  Vous allez recevoir un second email de Supabase (expéditeur <em>noreply@mail.app.supabase.io</em>)
                  avec un lien pour choisir votre mot de passe. Vérifiez vos spams si besoin.
                </p>
              </div>

              <p style="color:#6B7280;font-size:13px">
                Une fois votre mot de passe défini, connectez-vous sur :
              </p>
              <div style="text-align:center;margin:28px 0">
                <a href="https://kleios-ifc.ploutos-cgp.fr"
                   style="background:${ORANGE};color:#fff;padding:13px 32px;border-radius:8px;
                          text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
                  Accéder à Kleios IFC →
                </a>
              </div>

              <p style="color:#9CA3AF;font-size:12px">
                Un problème ? Contactez votre administrateur ou répondez à cet email.
              </p>
            </div>
            ${FOOTER}
          </div>`,
      };

    case "account_activated":
      return {
        subject: "Votre compte Kleios IFC est activé",
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:${NAVY}">
            ${HEADER}
            <div style="padding:32px;background:#fff">
              <h2 style="color:${NAVY};margin-top:0">Compte activé ✓</h2>
              <p>Bonjour ${firstName}, votre compte Kleios IFC est maintenant actif.</p>
              <div style="text-align:center;margin:28px 0">
                <a href="https://kleios-ifc.ploutos-cgp.fr"
                   style="background:${ORANGE};color:#fff;padding:13px 32px;border-radius:8px;
                          text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
                  Se connecter →
                </a>
              </div>
            </div>
            ${FOOTER}
          </div>`,
      };

    default:
      return {
        subject: "Notification Kleios IFC",
        html: `<div style="font-family:sans-serif;padding:32px">${HEADER}<p>Notification pour ${fullName}.</p>${FOOTER}</div>`,
      };
  }
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" },
    });
  }

  try {
    const payload: EmailPayload = await req.json();

    if (!payload.to || !payload.type) {
      return new Response(JSON.stringify({ error: "Missing to or type" }), { status: 400 });
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY manquant !");
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500 });
    }

    const { subject, html } = getEmailContent(payload);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: payload.to, subject, html }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: data }), { status: 500 });
    }

    console.log(`✅ Email ${payload.type} envoyé à ${payload.to} (id: ${data.id})`);
    return new Response(JSON.stringify({ success: true, id: data.id }), { status: 200 });

  } catch (err) {
    console.error("Erreur send-email:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
