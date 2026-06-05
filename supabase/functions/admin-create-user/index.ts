import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is an admin using their JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: callerProfile } = await callerClient
      .from("users")
      .select("is_admin")
      .eq("id", caller.id)
      .maybeSingle();

    if (!callerProfile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json() as {
      email: string;
      password: string;
      company_id?: string | null;
      is_admin?: boolean;
      max_concurrent_sessions?: number;
      monthly_generation_limit?: number;
    };

    if (!body.email || !body.password) {
      return new Response(
        JSON.stringify({ error: "email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });

    if (authError || !newUser.user) {
      return new Response(
        JSON.stringify({ error: authError?.message ?? "Failed to create auth user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert into users table.
    // The on_auth_user_created trigger may have already inserted a minimal row;
    // upsert overwrites it with the admin-specified values.
    const { error: profileError } = await adminClient.from("users").upsert({
      id: newUser.user.id,
      email: body.email,
      company_id: body.company_id ?? null,
      is_admin: body.is_admin ?? false,
      max_concurrent_sessions: body.max_concurrent_sessions ?? 1,
      monthly_generation_limit: body.monthly_generation_limit ?? 100,
    });

    if (profileError) {
      // Rollback auth user
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ id: newUser.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
