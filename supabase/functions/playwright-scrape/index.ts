import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// TODO: add the production frontend origin here once QAgen has a public domain (see CLAUDE.md v1.0.0 roadmap).
const ALLOWED_ORIGINS = ["http://localhost:5173"];

function getCorsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };
}

function jsonError(corsHeaders: Record<string, string>, msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonOk(corsHeaders: Record<string, string>, data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Blocks loopback, link-local/cloud-metadata, and private RFC 1918 ranges to prevent SSRF
// against the Playwright server's internal network.
function isPrivateOrInternalUrl(urlStr: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(urlStr).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  } catch {
    return true;
  }

  if (hostname === "localhost" || hostname === "0.0.0.0" || hostname === "::1") return true;
  if (/^127\./.test(hostname)) return true;
  if (/^169\.254\./.test(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;

  return false;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

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
    if (!user) return jsonError(corsHeaders, "Unauthorized", 401);

    const { data: userProfile } = await callerClient
      .from("users")
      .select("playwright_enabled")
      .eq("id", user.id)
      .maybeSingle();
    if (!userProfile?.playwright_enabled) {
      return jsonError(corsHeaders, "Playwright access is not enabled for this account", 403);
    }

    const body = await req.json() as { urls?: unknown };
    const { urls } = body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return jsonError(corsHeaders, "urls must be a non-empty array");
    }
    if (urls.length > 10) {
      return jsonError(corsHeaders, "Maximum 10 URLs per request");
    }
    if (!urls.every((u) => typeof u === "string" && /^https?:\/\//i.test(u as string))) {
      return jsonError(corsHeaders, "All URLs must be valid http:// or https:// addresses");
    }
    if (urls.some((u) => isPrivateOrInternalUrl(u as string))) {
      return jsonError(corsHeaders, "Private or internal URLs are not allowed.");
    }

    const playwrightServerUrl = Deno.env.get("PLAYWRIGHT_SERVER_URL");
    if (!playwrightServerUrl) {
      console.error("[playwright-scrape] PLAYWRIGHT_SERVER_URL not set");
      return jsonError(corsHeaders, "Playwright server not configured", 503);
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
      return jsonError(corsHeaders, `Playwright server error: ${upstream.status}`, 502);
    }

    const data = await upstream.json() as { results?: unknown[] };
    const results = data.results ?? [];
    console.log("[playwright-scrape] results count:", results.length);
    console.log("[playwright-scrape] results:", JSON.stringify(results).slice(0, 2000));
    return jsonOk(corsHeaders, data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[playwright-scrape] error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
