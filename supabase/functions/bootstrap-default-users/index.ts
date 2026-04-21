import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// One-time bootstrap to create:
//   1) An admin user (with 'admin' role in user_roles)
//   2) A technician user linked to an existing technicians.id (with 'technician' role)
// Idempotent: safe to call multiple times. Re-uses existing auth users if already created.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      adminEmail,
      adminPassword,
      technicianEmail,
      technicianPassword,
      technicianRecordId,
    } = await req.json();

    if (!adminEmail || !adminPassword || !technicianEmail || !technicianPassword || !technicianRecordId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const findOrCreateUser = async (email: string, password: string) => {
      // List users and find by email
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) throw new Error(`listUsers: ${listErr.message}`);
      const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (existing) {
        // Update password to the requested one to keep things in sync
        await supabaseAdmin.auth.admin.updateUserById(existing.id, { password });
        return { id: existing.id, created: false };
      }
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (error) throw new Error(`createUser(${email}): ${error.message}`);
      return { id: data.user.id, created: true };
    };

    // 1) Admin
    const admin = await findOrCreateUser(adminEmail, adminPassword);
    const { error: adminRoleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: admin.id, role: "admin" }, { onConflict: "user_id,role" });
    if (adminRoleErr) throw new Error(`admin role: ${adminRoleErr.message}`);

    // 2) Technician
    const tech = await findOrCreateUser(technicianEmail, technicianPassword);
    const { error: techRoleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: tech.id, role: "technician" }, { onConflict: "user_id,role" });
    if (techRoleErr) throw new Error(`tech role: ${techRoleErr.message}`);

    // Link auth user to technician record
    const { error: linkErr } = await supabaseAdmin
      .from("technicians")
      .update({ user_id: tech.id, email: technicianEmail })
      .eq("id", technicianRecordId);
    if (linkErr) throw new Error(`link tech: ${linkErr.message}`);

    return new Response(
      JSON.stringify({
        admin: { email: adminEmail, userId: admin.id, created: admin.created },
        technician: { email: technicianEmail, userId: tech.id, created: tech.created, technicianRecordId },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
