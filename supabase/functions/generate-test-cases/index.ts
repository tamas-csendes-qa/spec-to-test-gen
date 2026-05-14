import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  text: string;
  format: "gherkin" | "zephyr";
  lang: "hu" | "en";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { text, format, lang } = body;

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Missing text parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const languageName = lang === "hu" ? "Hungarian" : "English";
    const systemPrompt = `You are an expert software tester. Based on the provided specification, generate comprehensive test cases. If the output format is Gherkin, use standard Given/When/Then syntax. If the output format is Zephyr XLSX, structure the output as a JSON array of test case objects with fields: id, name, preconditions, steps, expectedResult, priority. Generate test cases in ${languageName}.`;

    const userMessage =
      format === "gherkin"
        ? `Specification:\n\n${text}\n\nGenerate Gherkin test cases (Feature and Scenarios) based on this specification.`
        : `Specification:\n\n${text}\n\nGenerate test cases as a JSON array. Each test case should have: id (e.g., "TC-001"), name, preconditions, steps, expectedResult, and priority (High/Medium/Low). Return ONLY valid JSON, no markdown or extra text.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return new Response(
        JSON.stringify({
          error: error.error?.message || "API request failed",
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const result = data.content[0].text;

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
