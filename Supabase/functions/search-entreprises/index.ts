// supabase/functions/search-entreprises/index.ts
// Proxy vers l'API Recherche Entreprises (api.gouv.fr)
// Gère les paramètres multiples (ex: tranche_effectif_salarie)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const API_BASE = "https://recherche-entreprises.api.gouv.fr/search";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Transmettre TOUS les params tels quels (y compris les doublons)
    const apiUrl = `${API_BASE}?${url.searchParams}`;
    console.log("[search-entreprises] →", apiUrl);

    const res = await fetch(apiUrl, {
      headers: { "Accept": "application/json" },
    });

    const text = await res.text();
    console.log("[search-entreprises] status:", res.status);

    return new Response(text, {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
