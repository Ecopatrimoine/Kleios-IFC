// supabase/functions/enrich-entreprise/index.ts
// Enrichissement fiche entreprise
//
// MODES :
//   "auto"    → OSM Overpass par bbox GPS — tél + web (gratuit)
//   "google"  → Google Places New API — tél + web + horaires + note (clé client)
//   "testKey" → Vérification clé Google (depuis Paramètres cabinet)
//
// SECRET SUPABASE (aucun requis côté serveur)
//   La clé Google vient du body client (googleApiKey)
//
// DÉPLOIEMENT :
//   Rename-Item .env .env.bak
//   npx supabase functions deploy enrich-entreprise --project-ref dvccnfrdtjwmoiiwouwm --no-verify-jwt
//   Rename-Item .env.bak .env
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Type retourné ─────────────────────────────────────────────────────────────

interface EnrichedData {
  tel: string | null;
  website: string | null;
  hours: string[] | null;
  address: string | null;
  rating: number | null;
  ratingCount: number | null;
  sourceContact: "osm" | "google" | "none";
}

const EMPTY: EnrichedData = {
  tel: null, website: null, hours: null, address: null,
  rating: null, ratingCount: null, sourceContact: "none",
};

// ── OSM Overpass — bbox GPS ───────────────────────────────────────────────────
// Recherche par rayon autour des coordonnées INSEE (beaucoup plus fiable que par ville)

async function fetchOSM(
  nomCommercial: string | null,
  nomLegal: string,
  lat: number | null,
  lng: number | null,
): Promise<{ tel: string | null; website: string | null } | null> {
  if (!lat || !lng) return null;

  const noms = [nomCommercial, nomLegal].filter(Boolean) as string[];
  const delta = 0.015; // ~1.5 km
  const bbox = `${lat - delta},${lng - delta},${lat + delta},${lng + delta}`;

  for (const nom of noms) {
    const nomSafe = nom.replace(/["\\]/g, "").slice(0, 60);
    const query = `[out:json][timeout:10];
(
  node["name"~"${nomSafe}",i](${bbox});
  way["name"~"${nomSafe}",i](${bbox});
);
out body 5;`;
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST", body: query,
        headers: { "Content-Type": "text/plain" },
        signal: AbortSignal.timeout(11000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const el of (data.elements ?? [])) {
        const tags = el.tags ?? {};
        const tel = tags["phone"] || tags["contact:phone"] || tags["mobile"] || null;
        const website = tags["website"] || tags["contact:website"] || tags["url"] || null;
        if (tel || website) {
          console.log(`[OSM] trouvé: ${nom}`);
          return { tel: tel?.trim() ?? null, website: website?.trim() ?? null };
        }
      }
    } catch { /* continuer */ }
  }
  return null;
}

// ── Google Places New API ─────────────────────────────────────────────────────

async function fetchGoogle(
  nomCommercial: string | null,
  nomLegal: string,
  codePostal: string,
  ville: string,
  apiKey: string,
): Promise<EnrichedData | null> {
  if (!apiKey) return null;

  const nomRecherche = nomCommercial || nomLegal;

  try {
    // Étape 1 : Text Search → place_id
    const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id",
      },
      body: JSON.stringify({
        textQuery: `${nomRecherche} ${codePostal} ${ville} France`,
        languageCode: "fr",
        maxResultCount: 1,
        locationBias: {
          rectangle: {
            low:  { latitude: 42.0, longitude: -5.0 },
            high: { latitude: 51.0, longitude: 8.5 },
          },
        },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!searchRes.ok) { console.error("[Google] search HTTP", searchRes.status); return null; }
    const searchData = await searchRes.json();
    const placeId = searchData.places?.[0]?.id;
    if (!placeId) return null;

    // Étape 2 : Place Details
    const detailsRes = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?languageCode=fr`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "nationalPhoneNumber,internationalPhoneNumber,websiteUri,regularOpeningHours,formattedAddress,rating,userRatingCount",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!detailsRes.ok) return null;
    const r = await detailsRes.json();

    const tel = (r.nationalPhoneNumber || r.internationalPhoneNumber)?.trim() ?? null;
    if (!tel && !r.websiteUri) return null;

    return {
      tel,
      website:      r.websiteUri?.trim() ?? null,
      hours:        r.regularOpeningHours?.weekdayDescriptions ?? null,
      address:      r.formattedAddress ?? null,
      rating:       r.rating ?? null,
      ratingCount:  r.userRatingCount ?? null,
      sourceContact: "google",
    };
  } catch (e) {
    console.error("[Google] exception:", e);
    return null;
  }
}

// ── Test clé Google (depuis Paramètres cabinet) ───────────────────────────────

async function testGoogleKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id",
      },
      body: JSON.stringify({ textQuery: "Paris France", maxResultCount: 1 }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 400) return { valid: false, error: "Clé invalide ou Places API non activée" };
    if (res.status === 403) return { valid: false, error: "Clé refusée — vérifiez les restrictions API" };
    if (!res.ok)            return { valid: false, error: `Erreur HTTP ${res.status}` };
    const data = await res.json();
    return data.places?.length > 0
      ? { valid: true }
      : { valid: false, error: "Places API non activée sur ce projet" };
  } catch (e) {
    return { valid: false, error: `Connexion impossible : ${String(e)}` };
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const respond = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json();

    // Mode test clé
    if (body.testKey === true) {
      const key = (body.googleApiKey ?? "").trim();
      if (!key) return respond({ valid: false, error: "Aucune clé fournie" });
      return respond(await testGoogleKey(key));
    }

    const { mode, nom, nomCommercial, codePostal = "", ville, googleApiKey, lat, lng } = body;
    if (!nom || !ville) return respond({ error: "nom et ville requis" }, 400);

    // Mode auto : OSM par bbox GPS
    if (mode === "auto") {
      const osm = await fetchOSM(nomCommercial ?? null, nom, lat ?? null, lng ?? null);
      return respond(osm
        ? { ...EMPTY, tel: osm.tel, website: osm.website, sourceContact: "osm" }
        : EMPTY
      );
    }

    // Mode google : Google Places (clé client)
    if (mode === "google") {
      const key = (googleApiKey ?? "").trim();
      if (!key) return respond({ ...EMPTY, error: "Clé Google non configurée" });
      const result = await fetchGoogle(nomCommercial ?? null, nom, codePostal, ville, key);
      return respond(result ?? EMPTY);
    }

    return respond({ error: "mode invalide" }, 400);

  } catch (err) {
    return respond({ error: String(err) }, 500);
  }
});
