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
  secondaryText?: string;
}

const SECONDARY_DOCUMENT_INSTRUCTION =
  "The PRIMARY DOCUMENT is the specification — generate test cases based on this document. " +
  "The SECONDARY DOCUMENT is additional context (e.g. user manual, technical documentation, field descriptions) — " +
  "use it to enrich the test cases with accurate field names, validation rules, and technical details. " +
  "Do not generate separate test cases from the secondary document alone.";

function getSystemPrompt(tab: string, lang: string, hasSecondary: boolean): string {
  const langNote = lang === "hu"
    ? "Generate the test cases in Hungarian."
    : "Generate the test cases in English.";

  let base: string;

  if (tab === "quick") {
    base = `You are an expert software tester. Based on the provided specification, generate brief, one-line test cases that give a quick overview of what needs to be tested. Each test case should have a short title and a single expected result. ${langNote}`;
  } else if (tab === "keyword") {
    base = `You are an expert software tester specializing in test automation. Based on the provided specification, generate detailed keyword-driven test cases. Return a JSON array where each object represents ONE SINGLE TEST STEP (not a test case). Each step must be atomic and automatable. Use exact UI element names (buttons, fields, menu items). The same test case ID and name repeat for every step belonging to that test case. ${langNote}`;
  } else if (tab === "userstory") {
    base = `You are an expert software tester. Based on the provided user story, generate functional test cases with medium detail level. Each test case should have: a clear title, 3-6 test steps with expected results per step, and preconditions if needed. Focus on the user goal described in the story. Do not over-engineer — the input is a short user story, not a full specification. ${langNote}`;
  } else {
    base = `You are an expert software tester. Generate comprehensive test cases based on the provided specification. ${langNote}`;
  }

  if (hasSecondary && (tab === "quick" || tab === "keyword")) {
    return `${base}\n\n${SECONDARY_DOCUMENT_INSTRUCTION}`;
  }

  return base;
}

function buildDocumentText(text: string, secondaryText?: string): string {
  if (!secondaryText) return text;
  return `PRIMARY DOCUMENT (Specification):\n${text}\n\nSECONDARY DOCUMENT (Additional context):\n${secondaryText}`;
}

function getUserMessage(format: string, text: string, tab: string, secondaryText?: string): string {
  const documentText = buildDocumentText(text, secondaryText);
  const hasSecondary = !!secondaryText;
  const specLabel = hasSecondary ? "documents" : "specification";

  if (format === "gherkin") {
    return `Specification:\n\n${documentText}\n\nGenerate Gherkin test cases (Feature and Scenarios) based on this ${specLabel}.`;
  }

  if (format === "zephyr") {
    if (tab === "keyword") {
      return `Specification:\n\n${documentText}\n\nGenerate keyword-driven test cases as a JSON array where EACH OBJECT IS ONE SINGLE TEST STEP. Structure:\n[\n  {\n    "id": "TC-001",\n    "name": "Test case title",\n    "preconditions": "Any preconditions for this test case",\n    "stepNumber": 1,\n    "stepAction": "Single atomic action, e.g. Click the Login button",\n    "expectedResult": "Expected result for this specific step",\n    "priority": "High"\n  },\n  {\n    "id": "TC-001",\n    "name": "Test case title",\n    "preconditions": "Any preconditions for this test case",\n    "stepNumber": 2,\n    "stepAction": "Next single atomic action",\n    "expectedResult": "Expected result for step 2",\n    "priority": "High"\n  }\n]\nSame id and name repeat for every step of the same test case. Each stepAction must be a single atomic action. Return ONLY valid JSON — no markdown, no code fences, no extra text.`;
    }
    return `Specification:\n\n${documentText}\n\nGenerate test cases as a JSON array. Each test case object must have exactly these fields: id (e.g., "TC-001"), name, preconditions, steps (a single string summarizing all steps), expectedResult, and priority ("High", "Medium", or "Low"). Return ONLY valid JSON — no markdown, no code fences, no extra text.`;
  }

  if (format === "azurecsv") {
    return `Specification:\n\n${documentText}\n\nGenerate test cases as a JSON array for Azure DevOps import. Each test case object must have exactly these fields:
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

  return `Specification:\n\n${documentText}\n\nGenerate test cases based on this ${specLabel}.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { text, format, lang, tab, secondaryText } = body;

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

    const systemPrompt = getSystemPrompt(tab, lang, !!secondaryText);
    const userMessage = getUserMessage(format, text, tab, secondaryText);

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
    const token_count = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    return new Response(
      JSON.stringify({ result, token_count }),
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
