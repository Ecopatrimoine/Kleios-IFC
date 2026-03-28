// supabase/functions/create-user/index.ts
// Crée un compte utilisateur IFC depuis l'admin
// Utilise service_role — déployer avec --no-verify-jwt
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, first_name, last_name, school, licence_type } = await req.json();

    if (!email || !first_name || !last_name || !school) {
      return new Response(JSON.stringify({ error: "Champs manquants" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client service_role pour créer des comptes
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Créer le compte avec un mot de passe temporaire aléatoire
    const tempPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 16) + "Aa1!";
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        school,
        cabinet_name: `${first_name} ${last_name}`,
        active: true,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // 2. Créer la licence selon le type choisi
    const licenceData: any = {
      user_id: userId,
      type: licence_type || "trial",
      status: "active",
      trial_end: licence_type === "trial" ? new Date(Date.now() + 15 * 86400000).toISOString() : null,
    };

    await adminClient.from("kleios_licences").upsert(licenceData);

    // 3. Envoyer l'email de reset password (l'utilisateur définit son propre mot de passe)
    await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${Deno.env.get("APP_URL") || "https://kleios-ifc.ploutos-cgp.fr"}/reset-password`,
      },
    });

    // Envoyer l'email via resetPasswordForEmail (déclenche l'email Supabase)
    const publicClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    await publicClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${Deno.env.get("APP_URL") || "https://kleios-ifc.ploutos-cgp.fr"}`,
    });

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
