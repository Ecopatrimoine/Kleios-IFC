// supabase/functions/scrape-contact/index.ts
// Extrait les emails publiquement affichés sur le site web d'une entreprise.
// Stratégie : tente la page d'accueil, puis /contact, /nous-contacter, /a-propos.
// Retourne le premier email trouvé qui n'est pas une adresse générique de noreply.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Pages candidates à scraper, dans l'ordre de priorité
const CONTACT_PATHS = ["/contact", "/nous-contacter", "/contactez-nous", "/a-propos", "/about", "/"];

// Regex : capture les emails visibles dans le HTML (attributs href="mailto:..." et texte brut)
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Emails à ignorer : adresses techniques / noreply / exemples
const EMAIL_BLACKLIST = [
  "noreply", "no-reply", "donotreply", "do-not-reply",
  "example.com", "test.com", "domain.com", "votremail",
  "sentry", "support@sentry", "mailer-daemon",
];

function isValidEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return !EMAIL_BLACKLIST.some(blocked => lower.includes(blocked));
}

function normalizeUrl(url: string): string {
  if (!url.startsWith("http")) url = `https://${url}`;
  return url.replace(/\/$/, "");
}

async function fetchPageEmails(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Kleios-IFC/1.0; +https://kleios-ifc.ploutos-cgp.fr)",
        "Accept":     "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });

    if (!res.ok) return [];

    const html = await res.text();

    // Priorité 1 : liens mailto explicites
    const mailtoMatches = [...html.matchAll(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g)]
      .map(m => m[1]);

    // Priorité 2 : emails dans le texte brut (après avoir retiré les balises HTML)
    const textContent = html.replace(/<[^>]+>/g, " ");
    const textMatches = [...(textContent.match(EMAIL_REGEX) ?? [])];

    // Fusion + déduplication + filtre
    const all = [...new Set([...mailtoMatches, ...textMatches])]
      .filter(isValidEmail)
      .map(e => e.toLowerCase());

    return all;
  } catch {
    return [];
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { website } = await req.json() as { website: string };

    if (!website) {
      return new Response(
        JSON.stringify({ email: null, error: "URL manquante" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const base = normalizeUrl(website);

    // Essayer chaque page dans l'ordre jusqu'à trouver un email
    for (const path of CONTACT_PATHS) {
      const url = path === "/" ? base : `${base}${path}`;
      const emails = await fetchPageEmails(url);
      if (emails.length > 0) {
        return new Response(
          JSON.stringify({ email: emails[0], allEmails: emails.slice(0, 5), source: url }),
          { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }
    }

    // Aucun email trouvé sur aucune page
    return new Response(
      JSON.stringify({ email: null, allEmails: [], source: null }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ email: null, error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
