// supabase/functions/create-user/index.ts — Kleios IFC
// Crée un compte auth, une licence, un rôle, et envoie l'email d'invitation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL          = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SEND_EMAIL_URL        = `${SUPABASE_URL}/functions/v1/send-email`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, first_name, last_name, school, role, licence_type } = await req.json();

    if (!email || !first_name || !last_name || !school) {
      return new Response(
        JSON.stringify({ error: "Champs obligatoires manquants (email, prénom, nom, campus)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Client admin (service_role) pour créer des comptes
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Créer le compte via inviteUserByEmail
    //    → Supabase envoie automatiquement un email "définir votre mot de passe"
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: { first_name, last_name, school },
        redirectTo: `${Deno.env.get("SITE_URL") ?? "https://kleios-ifc.ploutos-cgp.fr"}/`,
      }
    );

    if (inviteError) {
      // Si l'utilisateur existe déjà → on continue pour créer/mettre à jour licence/rôle
      if (!inviteError.message?.includes("already been registered")) {
        console.error("Erreur invitation:", inviteError.message);
        return new Response(
          JSON.stringify({ error: inviteError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Utilisateur déjà existant — mise à jour licence/rôle uniquement");
    }

    const userId = inviteData?.user?.id;

    // Si nouveau compte : créer licence + rôle
    if (userId) {
      // 2. Créer la licence Kleios
      const licencePayload: Record<string, unknown> = {
        user_id:    userId,
        type:       licence_type === "admin" ? "lifetime" : (licence_type ?? "lifetime"),
        status:     "active",
        trial_end:  licence_type === "trial"
          ? new Date(Date.now() + 15 * 86400000).toISOString()
          : null,
      };

      const { error: licErr } = await adminClient
        .from("kleios_licences")
        .upsert(licencePayload);

      if (licErr) console.error("Erreur création licence:", licErr.message);

      // 3. Créer le rôle utilisateur
      const { error: roleErr } = await adminClient
        .from("user_roles")
        .upsert({
          user_id:    userId,
          role:       role ?? "rre",
          updated_at: new Date().toISOString(),
        });

      if (roleErr) console.error("Erreur création rôle:", roleErr.message);
    }

    // 4. Envoyer un email de bienvenue IFC (fire-and-forget)
    fetch(SEND_EMAIL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to:         email,
        type:       "welcome_ifc",
        first_name,
        last_name,
        school,
        role:       role ?? "rre",
        licence_type: licence_type ?? "lifetime",
      }),
    }).catch(err => console.error("Erreur send-email (non bloquant):", err));

    console.log(`✅ Compte créé : ${email} | rôle: ${role} | licence: ${licence_type}`);

    return new Response(
      JSON.stringify({ success: true, userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Erreur create-user:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
