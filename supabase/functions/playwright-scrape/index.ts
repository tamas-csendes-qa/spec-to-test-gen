import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonError(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonOk(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    const { data: userProfile } = await callerClient
      .from("users")
      .select("playwright_enabled")
      .eq("id", user.id)
      .maybeSingle();
    if (!userProfile?.playwright_enabled) {
      return jsonError("Playwright access is not enabled for this account", 403);
    }

    const body = await req.json() as { urls?: unknown };
    const { urls } = body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return jsonError("urls must be a non-empty array");
    }
    if (urls.length > 10) {
      return jsonError("Maximum 10 URLs per request");
    }
    if (!urls.every((u) => typeof u === "string" && /^https?:\/\//i.test(u as string))) {
      return jsonError("All URLs must be valid http:// or https:// addresses");
    }

    const playwrightServerUrl = Deno.env.get("PLAYWRIGHT_SERVER_URL");
    if (!playwrightServerUrl) {
      console.error("[playwright-scrape] PLAYWRIGHT_SERVER_URL not set");
      return jsonError("Playwright server not configured", 503);
    }

    console.log("[playwright-scrape] sending to Railway:", playwrightServerUrl, "urls:", JSON.stringify(urls));

    const playwrightApiKey = Deno.env.get("PLAYWRIGHT_SERVER_API_KEY") ?? "";
    const scrapeHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (playwrightApiKey) scrapeHeaders["Authorization"] = `Bearer ${playwrightApiKey}`;

    const upstream = await fetch(`${playwrightServerUrl}/scrape`, {
      method: "POST",
      headers: scrapeHeaders,
      body: JSON.stringify({ urls }),
    });

    console.log("[playwright-scrape] Railway response status:", upstream.status);

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("[playwright-scrape] upstream error:", upstream.status, errText);
      return jsonError(`Playwright server error: ${upstream.status}`, 502);
    }

    const data = await upstream.json() as { results?: unknown[] };
    const results = data.results ?? [];
    console.log("[playwright-scrape] results count:", results.length);
    console.log("[playwright-scrape] results:", JSON.stringify(results).slice(0, 2000));
    return jsonOk(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[playwright-scrape] error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
