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

// Extract plain text from Confluence storage format (HTML-like XML)
function storageToPlainText(storage: string): string {
  return storage
    .replace(/<ac:[^>]*\/>/g, " ")
    .replace(/<ac:[^>]*>[\s\S]*?<\/ac:[^>]*>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Extract page ID from a Confluence page URL
function extractPageIdFromUrl(url: string): string | null {
  // Modern URL: /wiki/spaces/SPACE/pages/123456
  const modernMatch = url.match(/\/pages\/(\d+)/);
  if (modernMatch) return modernMatch[1];
  // Old URL: pageId=123456
  const paramMatch = url.match(/[?&]pageId=(\d+)/);
  if (paramMatch) return paramMatch[1];
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) return jsonError("Unauthorized", 401);

    // Verify confluence is enabled for this user
    const { data: userProfile } = await callerClient
      .from("users")
      .select("confluence_enabled")
      .eq("id", user.id)
      .maybeSingle();
    if (!userProfile?.confluence_enabled) {
      return jsonError("Confluence access is not enabled for this account", 403);
    }

    const body = await req.json() as {
      action: "save_connection" | "get_connection" | "list_children" | "get_page_content" | "get_pages_content";
      confluence_url?: string;
      email?: string;
      api_token?: string;
      page_url?: string;
      page_ids?: string[];
    };

    const { action } = body;

    // ── save_connection ────────────────────────────────────────────────────────
    if (action === "save_connection") {
      const { confluence_url, email, api_token } = body;
      if (!confluence_url || !email || !api_token) return jsonError("Missing fields");

      // Normalise URL: strip protocol and trailing slash
      const cleanUrl = (confluence_url as string).replace(/^https?:\/\//, "").replace(/\/$/, "");
      const authB64 = btoa(`${email}:${api_token}`);

      // Test credentials using the REST API v1 current-user endpoint (most reliable)
      const testUrl = `https://${cleanUrl}/wiki/rest/api/user/current`;
      console.log("[confluence-proxy] Testing credentials:", testUrl);
      const testRes = await fetch(testUrl, {
        headers: {
          Authorization: `Basic ${authB64}`,
          Accept: "application/json",
        },
      });
      const testBody = await testRes.text();
      console.log("[confluence-proxy] Test response status:", testRes.status, "body:", testBody.slice(0, 300));
      if (!testRes.ok) {
        return jsonError(`Confluence credentials invalid (${testRes.status}): ${testBody.slice(0, 200)}`, 400);
      }

      // Upsert (delete old, insert new)
      await callerClient.from("confluence_connections").delete().eq("user_id", user.id);
      const { error } = await callerClient.from("confluence_connections").insert({
        user_id: user.id,
        confluence_url: confluence_url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
        email,
        api_token,
      });
      if (error) return jsonError(error.message, 500);
      return jsonOk({ ok: true });
    }

    // ── get_connection ─────────────────────────────────────────────────────────
    if (action === "get_connection") {
      const { data } = await callerClient
        .from("confluence_connections")
        .select("confluence_url, email, created_at")
        .eq("user_id", user.id)
        .maybeSingle();
      return jsonOk({ connection: data });
    }

    // ── list_children ──────────────────────────────────────────────────────────
    if (action === "list_children") {
      const { page_url } = body;
      if (!page_url) return jsonError("Missing page_url");

      const { data: conn } = await callerClient
        .from("confluence_connections")
        .select("confluence_url, email, api_token")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!conn) return jsonError("No Confluence connection configured", 400);

      const pageId = extractPageIdFromUrl(page_url);
      if (!pageId) return jsonError("Could not extract page ID from URL");

      const authB64 = btoa(`${conn.email}:${conn.api_token}`);
      const baseUrl = `https://${conn.confluence_url}`;

      // Fetch the parent page info
      const parentRes = await fetch(`${baseUrl}/wiki/api/v2/pages/${pageId}`, {
        headers: { Authorization: `Basic ${authB64}`, Accept: "application/json" },
      });
      if (!parentRes.ok) return jsonError(`Failed to fetch page: ${parentRes.status}`, 400);
      const parentData = await parentRes.json() as { id: string; title: string };

      // Fetch children
      const childrenRes = await fetch(
        `${baseUrl}/wiki/api/v2/pages/${pageId}/children?limit=50`,
        { headers: { Authorization: `Basic ${authB64}`, Accept: "application/json" } }
      );
      if (!childrenRes.ok) return jsonError(`Failed to fetch children: ${childrenRes.status}`, 400);
      const childrenData = await childrenRes.json() as { results: Array<{ id: string; title: string }> };

      const pages = [
        { id: parentData.id, title: parentData.title, page_url: `${baseUrl}/wiki/spaces/_/pages/${parentData.id}` },
        ...childrenData.results.map((c) => ({
          id: c.id,
          title: c.title,
          page_url: `${baseUrl}/wiki/spaces/_/pages/${c.id}`,
        })),
      ];

      return jsonOk({ pages });
    }

    // ── get_page_content ───────────────────────────────────────────────────────
    if (action === "get_page_content") {
      const { page_url } = body;
      if (!page_url) return jsonError("Missing page_url");

      const { data: conn } = await callerClient
        .from("confluence_connections")
        .select("confluence_url, email, api_token")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!conn) return jsonError("No Confluence connection configured", 400);

      const pageId = extractPageIdFromUrl(page_url);
      if (!pageId) return jsonError("Could not extract page ID from URL");

      const authB64 = btoa(`${conn.email}:${conn.api_token}`);
      const baseUrl = `https://${conn.confluence_url}`;

      const res = await fetch(
        `${baseUrl}/wiki/api/v2/pages/${pageId}?body-format=storage`,
        { headers: { Authorization: `Basic ${authB64}`, Accept: "application/json" } }
      );
      if (!res.ok) return jsonError(`Failed to fetch page content: ${res.status}`, 400);
      const data = await res.json() as { id: string; title: string; body: { storage: { value: string } } };

      return jsonOk({
        id: data.id,
        title: data.title,
        content: storageToPlainText(data.body.storage.value),
      });
    }

    // ── get_pages_content ──────────────────────────────────────────────────────
    if (action === "get_pages_content") {
      const { page_ids } = body;
      if (!page_ids?.length) return jsonError("Missing page_ids");

      const { data: conn } = await callerClient
        .from("confluence_connections")
        .select("confluence_url, email, api_token")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!conn) return jsonError("No Confluence connection configured", 400);

      const authB64 = btoa(`${conn.email}:${conn.api_token}`);
      const baseUrl = `https://${conn.confluence_url}`;

      const results = await Promise.all(
        page_ids.map(async (pageId) => {
          const res = await fetch(
            `${baseUrl}/wiki/api/v2/pages/${pageId}?body-format=storage`,
            { headers: { Authorization: `Basic ${authB64}`, Accept: "application/json" } }
          );
          if (!res.ok) return { id: pageId, title: pageId, content: "" };
          const data = await res.json() as { id: string; title: string; body: { storage: { value: string } } };
          return {
            id: data.id,
            title: data.title,
            content: storageToPlainText(data.body.storage.value),
          };
        })
      );

      return jsonOk({ pages: results });
    }

    return jsonError("Unknown action");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
