import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  text: string;
  format: "gherkin" | "zephyr" | "azurecsv";
  lang: "hu" | "en";
  tab: "quick" | "keyword" | "userstory";
}

function getSystemPrompt(tab: string, lang: string): string {
  const langNote = lang === "hu"
    ? "Generate the test cases in Hungarian."
    : "Generate the test cases in English.";

  if (tab === "quick") {
    return `You are an expert software tester. Based on the provided specification, generate brief, one-line test cases that give a quick overview of what needs to be tested. Each test case should have a short title and a single expected result. ${langNote}`;
  }

  if (tab === "keyword") {
    return `You are an expert software tester specializing in test automation. Based on the provided specification, generate detailed keyword-driven test cases with multiple steps. Each test case must include: Test Case ID, Title, Preconditions, numbered Step Actions with exact UI element names (buttons, fields, menu items), and Expected Results for each step. The test cases must be detailed enough for a test automation engineer unfamiliar with the application to automate them. ${langNote}`;
  }

  if (tab === "userstory") {
    return `You are an expert software tester with BDD experience. Based on the provided specification, generate user story based test cases using Gherkin Given/When/Then syntax from a business perspective. Focus on user goals and business value, not technical implementation. ${langNote}`;
  }

  return `You are an expert software tester. Generate comprehensive test cases based on the provided specification. ${langNote}`;
}

function getUserMessage(format: string, text: string): string {
  if (format === "gherkin") {
    return `Specification:\n\n${text}\n\nGenerate Gherkin test cases (Feature and Scenarios) based on this specification.`;
  }

  if (format === "zephyr") {
    return `Specification:\n\n${text}\n\nGenerate test cases as a JSON array. Each test case object must have exactly these fields: id (e.g., "TC-001"), name, preconditions, steps (a single string summarizing all steps), expectedResult, and priority ("High", "Medium", or "Low"). Return ONLY valid JSON — no markdown, no code fences, no extra text.`;
  }

  if (format === "azurecsv") {
    return `Specification:\n\n${text}\n\nGenerate test cases as a JSON array for Azure DevOps import. Each test case object must have exactly these fields:
- "title": string (the test case title)
- "steps": array of objects, each with "action" (string) and "expected" (string)

Example format:
[
  {
    "title": "Login with valid credentials",
    "steps": [
      { "action": "Navigate to the login page", "expected": "Login page is displayed" },
      { "action": "Enter valid username and password", "expected": "Credentials are accepted" },
      { "action": "Click the Login button", "expected": "User is redirected to the dashboard" }
    ]
  }
]

Return ONLY valid JSON — no markdown, no code fences, no extra text.`;
  }

  return `Specification:\n\n${text}\n\nGenerate test cases based on this specification.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { text, format, lang, tab } = body;

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Missing text parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = getSystemPrompt(tab, lang);
    const userMessage = getUserMessage(format, text);

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
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return new Response(
        JSON.stringify({ error: error.error?.message || "API request failed" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const result = data.content[0].text;

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
