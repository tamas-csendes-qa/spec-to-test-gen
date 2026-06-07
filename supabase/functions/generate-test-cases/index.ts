import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GenerateBody {
  action?: "generate";
  text: string;
  format: "gherkin" | "zephyr" | "azurecsv";
  lang: "hu" | "en";
  tab: "quick" | "keyword" | "userstory";
  secondaryText?: string;
  existingTcText?: string;
  confluenceText?: string;
}

interface AnalyseBody {
  action: "analyse";
  text: string;
  lang: "hu" | "en";
}

interface ExtractBody {
  action: "extract";
  text: string;
  topics: string[];
}

type RequestBody = GenerateBody | AnalyseBody | ExtractBody;

const SECONDARY_DOCUMENT_INSTRUCTION =
  "The PRIMARY DOCUMENT is the specification — generate test cases based on this document. " +
  "The SECONDARY DOCUMENT is additional context — it may be a user manual, technical documentation, or APPLICATION PAGE DATA " +
  "extracted from the live application by Playwright (containing page titles, headings, input field labels, button texts, and navigation items). " +
  "Use it to enrich the test cases with accurate UI element names, validation rules, and technical details. " +
  "When APPLICATION PAGE DATA is present, always use the exact UI element names from it — never invent or translate them. " +
  "Do not generate separate test cases from the secondary document alone.";

const PLAYWRIGHT_UI_ELEMENT_RULE =
  "CRITICAL RULE - DO NOT TRANSLATE UI ELEMENTS: When Playwright scraped data is provided, you MUST use the EXACT original UI element names as they appear in the application. This is mandatory and cannot be overridden.\n" +
  "- If the field is called 'firstname' → write 'firstname' (NOT 'keresztnév')\n" +
  "- If the button is called 'Reserve Now' → write 'Reserve Now' (NOT 'foglalás elküldése')\n" +
  "- If the menu says 'Check-in' → write 'Check-in' (NOT 'érkezés')\n" +
  "The surrounding test description should be in Hungarian, but ALL UI element names stay in their original language.";

const EXISTING_TC_INSTRUCTION =
  "The EXISTING TEST CASES contain one-line or minimal test cases that need to be expanded. " +
  "Your primary goal is to take each existing test case and expand it into a detailed keyword-driven test case with multiple steps, exact UI element names, preconditions, and expected results per step. " +
  "Use the specification and additional context documents to enrich the steps with accurate field names, validation rules, and technical details. " +
  "Keep the original test case topics and titles — only expand the steps and details. " +
  "If no specification is provided but existing test cases are uploaded, still generate the expanded keyword test cases based on the existing test cases alone.";

function getSystemPrompt(tab: string, lang: string, hasSecondary: boolean, hasExistingTc: boolean): string {
  const langNote = lang === "hu"
    ? (tab === "keyword"
      ? "Generate the test cases in Hungarian. When writing step actions (stepAction), always use imperative form (felszólító mód). Examples: use \"Kattints a Küldés gombra\" instead of \"Kattintás a Küldés gombra\", \"Add meg az email mezőt\" instead of \"Megadás az email mezőben\", \"Navigálj a főoldalra\" instead of \"Navigálás a főoldalra\", \"Ellenőrizd az eredményt\" instead of \"Ellenőrzés az eredményen\". Use imperative form for all step actions throughout the test cases."
      : "Generate the test cases in Hungarian.")
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

  const additions: string[] = [];
  if (lang === "hu") {
    additions.push(PLAYWRIGHT_UI_ELEMENT_RULE);
  }
  if (hasSecondary && (tab === "quick" || tab === "keyword")) {
    additions.push(SECONDARY_DOCUMENT_INSTRUCTION);
  }
  if (hasExistingTc && tab === "keyword") {
    additions.push(EXISTING_TC_INSTRUCTION);
  }

  return additions.length > 0 ? `${base}\n\n${additions.join("\n\n")}` : base;
}

function buildDocumentText(text: string, secondaryText?: string, existingTcText?: string, confluenceText?: string): string {
  const parts: string[] = [];
  if (confluenceText) parts.push(`CONFLUENCE PAGES CONTENT:\n${confluenceText}`);
  if (text) parts.push(confluenceText ? `UPLOADED FILES:\n${text}` : `PRIMARY DOCUMENT (Specification):\n${text}`);
  if (secondaryText) parts.push(`SECONDARY DOCUMENT (Additional context):\n${secondaryText}`);
  if (existingTcText) parts.push(`EXISTING TEST CASES:\n${existingTcText}`);
  if (parts.length === 0) return text;
  if (parts.length === 1 && !secondaryText && !existingTcText && !confluenceText) return text;
  return parts.join("\n\n");
}

function getUserMessage(format: string, text: string, tab: string, secondaryText?: string, existingTcText?: string, confluenceText?: string): string {
  const documentText = buildDocumentText(text, secondaryText, existingTcText, confluenceText);
  const hasSecondary = !!secondaryText || !!existingTcText || !!confluenceText;
  const specLabel = hasSecondary ? "documents" : (text ? "specification" : "existing test cases");

  const docLabel = confluenceText ? "documents and Confluence pages" : "specification";

  if (format === "gherkin") {
    return `Specification:\n\n${documentText}\n\nGenerate Gherkin test cases (Feature and Scenarios) based on this ${specLabel || docLabel}.`;
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

  return `Specification:\n\n${documentText}\n\nGenerate test cases based on this ${specLabel || docLabel}.`;
}

async function callClaude(apiKey: string, systemPrompt: string, userMessage: string, maxTokens = 16000): Promise<{ text: string; token_count: number }> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Claude API request failed");
  }

  const data = await response.json();
  const text = data.content[0].text;
  const token_count = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);
  return { text, token_count };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- ANALYSE action ---
    if (body.action === "analyse") {
      const { text, lang } = body as AnalyseBody;

      if (!text) {
        return new Response(
          JSON.stringify({ error: "Missing text parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const systemPrompt = lang === "hu"
        ? "Te egy dokumentumelemző. Azonosítsd a dokumentum főbb témaköreit, fejezeteit vagy funkcionális területeit, és adj vissza CSAK egy JSON tömböt."
        : "You are a document analyst. Identify the main topics, chapters, or functional areas of the document and return ONLY a JSON array.";

      const userMessage = `Document:\n\n${text}\n\nAnalyse this document and list the main topics, chapters, or functional areas as a numbered list. Return ONLY a JSON array of objects like this:\n[\n  {"id": "1", "title": "Topic title", "pages": "1-15"},\n  {"id": "2", "title": "Topic title", "pages": "16-32"}\n]\nReturn only the JSON, no other text.`;

      const { text: result, token_count } = await callClaude(apiKey, systemPrompt, userMessage, 2048);

      return new Response(
        JSON.stringify({ result, token_count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- EXTRACT action ---
    if (body.action === "extract") {
      const { text, topics } = body as ExtractBody;

      if (!text || !topics?.length) {
        return new Response(
          JSON.stringify({ error: "Missing text or topics parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const topicList = topics.map((t, i) => `${i + 1}. ${t}`).join("\n");
      const systemPrompt = "You are a document extraction assistant. Your only job is to copy relevant sections verbatim from the provided document. Do not summarise, paraphrase, or add any commentary.";
      const userMessage = `From the document below, extract and return ONLY the sections that belong to the following topics. Copy the text verbatim. Do not include any sections unrelated to the listed topics. Do not add headers, comments, or explanations — output only the extracted document text.\n\nTopics to extract:\n${topicList}\n\nDocument:\n\n${text}`;

      const { text: result, token_count } = await callClaude(apiKey, systemPrompt, userMessage, 16000);

      return new Response(
        JSON.stringify({ result, token_count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- GENERATE action (default) ---
    const { text, format, lang, tab, secondaryText, existingTcText, confluenceText } = body as GenerateBody;

    if (!text && !existingTcText && !confluenceText) {
      return new Response(
        JSON.stringify({ error: "Missing text parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = getSystemPrompt(tab, lang, !!secondaryText || !!confluenceText, !!existingTcText);
    const userMessage = getUserMessage(format, text, tab, secondaryText, existingTcText, confluenceText);

    const { text: result, token_count } = await callClaude(apiKey, systemPrompt, userMessage);

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
