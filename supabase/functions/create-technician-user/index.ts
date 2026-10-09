import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  try {
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ---- Authorize: the caller must be a signed-in admin. -------------------
    // This function mints auth users with a caller-supplied password and links
    // them to technician records, so it must never be callable by an ordinary
    // authenticated user (a technician included).
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json(401, { error: "Missing bearer token" });
    }

    const { data: caller, error: callerErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace(/^Bearer\s+/i, ""),
    );
    if (callerErr || !caller?.user) {
      return json(401, { error: "Invalid or expired token" });
    }

    const { data: isAdmin, error: roleCheckErr } = await supabaseAdmin.rpc("has_role", {
      _user_id: caller.user.id,
      _role: "admin",
    });
    if (roleCheckErr) return json(500, { error: `Role check failed: ${roleCheckErr.message}` });
    if (!isAdmin) return json(403, { error: "Admin role required" });

    // ---- Validate input ----------------------------------------------------
    const { email, password, technicianId } = await req.json();

    if (!email || !password || !technicianId) {
      return json(400, { error: "Missing email, password, or technicianId" });
    }
    if (String(password).length < 6) {
      return json(400, { error: "Password must be at least 6 characters" });
    }

    const { data: technician, error: techLookupErr } = await supabaseAdmin
      .from("technicians")
      .select("id, user_id")
      .eq("id", technicianId)
      .maybeSingle();
    if (techLookupErr) return json(500, { error: `Technician lookup failed: ${techLookupErr.message}` });
    if (!technician) return json(404, { error: `No technician with id ${technicianId}` });
    if (technician.user_id) {
      return json(409, { error: `Technician ${technicianId} already has a login` });
    }

    // ---- Create the auth user ---------------------------------------------
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (userError) return json(400, { error: userError.message });

    const newUserId = userData.user.id;
    // If any step below fails the account would be half-provisioned and the
    // technician would be able to log in to an empty portal, so unwind it.
    const rollback = async (message: string) => {
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
      return json(400, { error: message });
    };

    // ---- Grant the technician role ----------------------------------------
    // Every RLS policy for technicians is gated on
    // has_role(auth.uid(), 'technician'). Without this row the account can see
    // no tickets, no PM schedules, no customers and no equipment.
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: newUserId, role: "technician" }, { onConflict: "user_id,role" });
    if (roleErr) return await rollback(`Failed to grant technician role: ${roleErr.message}`);

    // ---- Link the auth user to the technician record ----------------------
    const { error: linkErr } = await supabaseAdmin
      .from("technicians")
      .update({ user_id: newUserId, email })
      .eq("id", technicianId);
    if (linkErr) return await rollback(`Failed to link technician record: ${linkErr.message}`);

    return json(200, { userId: newUserId, technicianId, role: "technician" });
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : String(err) });
  }
});
