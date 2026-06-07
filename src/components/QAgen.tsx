import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Moon,
  Sun,
  FileText,
  Download,
  Loader as Loader2,
  Sparkles,
  CircleAlert as AlertCircle,
  Settings,
  LogOut,
  X,
  ChevronDown,
  Check,
} from "lucide-react";
import { logUsage, touchSessionByToken, getMonthlyUsageCount } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ConfluenceModal } from "@/components/ConfluenceModal";
import type { ConfluencePage } from "@/components/ConfluenceModal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import * as pdfjsLib from "pdfjs-dist";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type Format = "gherkin" | "zephyr" | "azurecsv";
type Lang = "hu" | "en";
type TabType = "quick" | "keyword" | "userstory";
type KeywordMode = "new" | "expand";

interface TestCase {
  id: string;
  name: string;
  preconditions: string;
  steps: string;
  expectedResult: string;
  priority: string;
}

interface KeywordStep {
  id: string;
  name: string;
  preconditions: string;
  stepNumber: number;
  stepAction: string;
  expectedResult: string;
  priority: string;
}

interface AzureTestCase {
  title: string;
  steps: { action: string; expected: string }[];
}

interface DocTopic {
  id: string;
  title: string;
  pages: string;
}

interface ResultState {
  gherkinResult: string | null;
  testCases: TestCase[] | null;
  keywordSteps: KeywordStep[] | null;
  azureCases: AzureTestCase[] | null;
}

interface ScrapedPage {
  url: string;
  success: boolean;
  title?: string;
  inputs?: Array<{ type: string; name: string | null; label: string | null }>;
  buttons?: string[];
  navItems?: string[];
  headings?: Array<{ level: string; text: string }>;
  error?: string;
}

const TYPE_DEFAULT_FORMAT: Record<TabType, Format> = {
  quick: "gherkin",
  keyword: "zephyr",
  userstory: "gherkin",
};

const STRINGS = {
  hu: {
    subtitle: "A specifikáció értelmezése a mi dolgunk.",
    step1Title: "Teszteset típusa",
    step2Title: "Generálási mód",
    step3Title: "Forrás kiválasztása",
    step4Title: "Formátum és generálás",
    quickTest: "Gyors teszt",
    quickTestDesc: "1-2 lépéses áttekintő tesztesetek",
    keyword: "Kulcsszavas",
    keywordDesc: "Részletes, automatizálásra kész tesztesetek",
    userStory: "Felhasználói igény",
    userStoryDesc: "Felhasználói igény alapú tesztesetek",
    modeNew: "Új tesztesetek generálása",
    modeExpand: "Meglévő tesztesetek kibővítése",
    typeLabel: "Típus",
    modeLabel: "Mód",
    change: "Módosítás",
    specLabel: "Specifikáció",
    dropHere: "Húzd ide a specifikációt",
    dropHint: "vagy kattints a tallózáshoz · PDF, DOCX, XLSX · max 50 MB",
    pickAnother: "kattints másik fájl kiválasztásához",
    secondaryLabel: "Kiegészítő dokumentum (opcionális)",
    secondaryDropHere: "Húzd ide a kiegészítő dokumentumot",
    secondaryDropHint: "vagy kattints a tallózáshoz · PDF, DOCX, XLSX",
    existingTcLabel: "Meglévő tesztesetek",
    existingTcRequired: "Meglévő tesztesetek (kötelező)",
    existingTcDropHere: "Húzd ide a meglévő teszteseteket",
    existingTcDropHint: "vagy kattints a tallózáshoz · XLSX, CSV, DOCX, PDF",
    formatLabel: "Kimeneti formátum",
    generate: "Tesztesetek generálása",
    generating: "Generálás folyamatban…",
    playwrightScraping: "Oldalak feltérképezése…",
    download: "Letöltés",
    downloadFile: "Fájl letöltése",
    footer: "QAgen v0.9.0",
    toggleLang: "Nyelv váltása",
    toggleDark: "Sötét mód váltása",
    error: "Hiba",
    fileProcessingError: "Nem sikerült feldolgozni a fájlt",
    fileTooLarge: "A fájl mérete meghaladja az 50 MB-os korlátot.",
    userStoryPlaceholder: "Írd be a felhasználói igényt…",
    areaPath: "Area Path (opcionális)",
    areaPathPlaceholder: "pl. MyProject\\Team",
    orSeparator: "vagy",
    textInputLabel: "Felhasználói igény szövege",
    fileLabel: "Fájl feltöltése",
    preconditions: "Előfeltételek",
    steps: "Lépések",
    expectedResult: "Elvárt eredmény",
    priority: "Prioritás",
    showPreview: "Előnézet megjelenítése",
    hidePreview: "Előnézet elrejtése",
    monthlyLimitReached: "Elérted a havi generálási limitedet. Kérjük lépj kapcsolatba az adminisztrátorral.",
    monthlyGenerations: "Havi generálási keret",
    unlimited: "korlátlan",
    confluencePages: "Confluence oldalak",
    analyse: "Elemzés",
    analysing: "Elemzés folyamatban…",
    docStructure: "Dokumentum struktúra",
    selectAll: "Mindent kijelöl",
    deselectAll: "Mindent töröl",
    generateFromSelected: "Generálás a kijelöltekből",
    chunkProgress: (current: number, total: number) => `Feldolgozás: ${current}/${total} rész – kérjük várjon…`,
    noTopicsFound: "Nem találhatók témakörök a dokumentumban.",
    page: "oldal",
    playwrightSectionTitle: "Alkalmazás URL-ek (opcionális)",
    playwrightSectionDesc: "Add meg azokat az oldalakat amelyeket feltérképezzünk",
    playwrightAdd: "Hozzáadás",
    playwrightPlaceholder: "https://myapp.example.com",
    playwrightNote: "A megadott oldalak tartalmát feltérképezzük és felhasználjuk a tesztesetek generálásához. Csak nyilvánosan elérhető oldalak támogatottak.",
    playwrightInvalidUrl: "Érvénytelen URL. Az URL-nek http:// vagy https://-szel kell kezdődnie.",
  },
  en: {
    subtitle: "Specification analysis is our business.",
    step1Title: "Test case type",
    step2Title: "Generation mode",
    step3Title: "Select source",
    step4Title: "Format and generate",
    quickTest: "Quick Test",
    quickTestDesc: "1-2 step overview test cases",
    keyword: "Keyword",
    keywordDesc: "Detailed, automation-ready test cases",
    userStory: "User Story",
    userStoryDesc: "User story based test cases",
    modeNew: "Generate new test cases",
    modeExpand: "Expand existing test cases",
    typeLabel: "Type",
    modeLabel: "Mode",
    change: "Change",
    specLabel: "Specification",
    dropHere: "Drop the specification here",
    dropHint: "or click to browse · PDF, DOCX, XLSX · max 50 MB",
    pickAnother: "click to pick another file",
    secondaryLabel: "Additional document (optional)",
    secondaryDropHere: "Drop the additional document here",
    secondaryDropHint: "or click to browse · PDF, DOCX, XLSX",
    existingTcLabel: "Existing test cases",
    existingTcRequired: "Existing test cases (required)",
    existingTcDropHere: "Drop the existing test cases here",
    existingTcDropHint: "or click to browse · XLSX, CSV, DOCX, PDF",
    formatLabel: "Output format",
    generate: "Generate test cases",
    generating: "Generating…",
    playwrightScraping: "Mapping pages…",
    download: "Download",
    downloadFile: "Download file",
    footer: "QAgen v0.9.0",
    toggleLang: "Switch language",
    toggleDark: "Toggle dark mode",
    error: "Error",
    fileProcessingError: "Failed to process file",
    fileTooLarge: "File size exceeds the 50 MB limit.",
    userStoryPlaceholder: "Enter your user story…",
    areaPath: "Area Path (optional)",
    areaPathPlaceholder: "e.g. MyProject\\Team",
    orSeparator: "or",
    textInputLabel: "User story text",
    fileLabel: "Upload file",
    preconditions: "Preconditions",
    steps: "Steps",
    expectedResult: "Expected Result",
    priority: "Priority",
    showPreview: "Show preview",
    hidePreview: "Hide preview",
    monthlyLimitReached: "You have reached your monthly generation limit. Please contact your administrator.",
    monthlyGenerations: "Monthly generation quota",
    unlimited: "unlimited",
    confluencePages: "Confluence pages",
    analyse: "Analyse",
    analysing: "Analysing…",
    docStructure: "Document structure",
    selectAll: "Select all",
    deselectAll: "Deselect all",
    generateFromSelected: "Generate from selected",
    chunkProgress: (current: number, total: number) => `Processing: ${current}/${total} parts – please wait…`,
    noTopicsFound: "No topics found in the document.",
    page: "page",
    playwrightSectionTitle: "Application URLs (optional)",
    playwrightSectionDesc: "Add the pages you want to map",
    playwrightAdd: "Add",
    playwrightPlaceholder: "https://myapp.example.com",
    playwrightNote: "The provided pages will be mapped and used for test case generation. Only publicly accessible pages are supported.",
    playwrightInvalidUrl: "Invalid URL. The URL must start with http:// or https://",
  },
} as const;

const ACCEPT = ".pdf,.docx,.xlsx";
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

async function extractTextFromFile(file: File): Promise<string> {
  const filename = file.name.toLowerCase();

  if (filename.endsWith(".pdf")) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      text += textContent.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return text;
  }

  if (filename.endsWith(".xlsx")) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    let text = "";
    for (const sheet of workbook.SheetNames) {
      const ws = workbook.Sheets[sheet];
      text += `Sheet: ${sheet}\n${XLSX.utils.sheet_to_csv(ws)}\n`;
    }
    return text;
  }

  if (filename.endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    return new TextDecoder().decode(arrayBuffer);
  }

  if (filename.endsWith(".csv")) {
    return await file.text();
  }

  throw new Error("Unsupported file type");
}

async function callClaudeAPI(
  text: string,
  format: Format,
  lang: Lang,
  tab: TabType,
  secondaryText?: string,
  existingTcText?: string,
  confluenceText?: string
): Promise<{ result: string; token_count: number }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) throw new Error("Supabase configuration missing");

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-test-cases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ text, format, lang, tab, secondaryText, existingTcText, confluenceText }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "API request failed");
  }

  const data = await response.json();
  return { result: data.result, token_count: data.token_count ?? 0 };
}

async function callAnalyseAPI(text: string, lang: Lang): Promise<DocTopic[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) throw new Error("Supabase configuration missing");

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-test-cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({ action: "analyse", text, lang }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Analysis request failed");
  }

  const data = await response.json();
  const raw: string = data.result ?? "";
  const match = raw.match(/\[[\s\S]*/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? (parsed as DocTopic[]) : [];
  } catch {
    const lastBrace = match[0].lastIndexOf("}");
    if (lastBrace === -1) return [];
    try {
      return JSON.parse(match[0].slice(0, lastBrace + 1) + "]") as DocTopic[];
    } catch {
      return [];
    }
  }
}

async function callPlaywrightScrapeAPI(urls: string[]): Promise<ScrapedPage[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return [];
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? anonKey;
  console.log("[playwright] calling edge function with urls:", urls);
  const response = await fetch(`${supabaseUrl}/functions/v1/playwright-scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ urls }),
  });
  console.log("[playwright] edge function response status:", response.status);
  if (!response.ok) {
    const errText = await response.text();
    console.error("[playwright] edge function error:", response.status, errText);
    return [];
  }
  const data = await response.json();
  console.log("[playwright] raw response from edge function:", JSON.stringify(data));
  const results = (data.results as ScrapedPage[]) ?? [];
  console.log("[playwright] parsed results count:", results.length);
  return results;
}

function formatScrapedPages(pages: ScrapedPage[]): string {
  return pages
    .map((page) => {
      if (!page.success) return `[${page.url}]\nFailed to scrape: ${page.error ?? "unknown error"}`;
      const lines: string[] = [`[APPLICATION PAGE DATA: ${page.url}]`];
      if (page.title) lines.push(`Title: ${page.title}`);
      if (page.headings?.length) lines.push(`Headings: ${page.headings.map((h) => h.text).join(" | ")}`);
      if (page.inputs?.length) lines.push(`Input fields: ${page.inputs.map((i) => i.label ?? i.name).join(", ")}`);
      if (page.buttons?.length) lines.push(`Buttons: ${page.buttons.join(", ")}`);
      if (page.navItems?.length) lines.push(`Navigation: ${page.navItems.join(", ")}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

async function buildExcelBlob(testCases: TestCase[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Test Cases");

  ws.columns = [
    { header: "Test Case ID", key: "id", width: 15 },
    { header: "Test Case Name", key: "name", width: 25 },
    { header: "Preconditions", key: "preconditions", width: 30 },
    { header: "Test Steps", key: "steps", width: 40 },
    { header: "Expected Result", key: "expectedResult", width: 30 },
    { header: "Priority", key: "priority", width: 12 },
  ];

  testCases.forEach((tc) => ws.addRow(tc));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7E6E6" } };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

async function buildKeywordExcelBlob(steps: KeywordStep[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Test Cases");

  ws.columns = [
    { header: "Test Case ID", key: "id", width: 13 },
    { header: "Test Case Name", key: "name", width: 28 },
    { header: "Preconditions", key: "preconditions", width: 28 },
    { header: "Step Number", key: "stepNumber", width: 12 },
    { header: "Step Action", key: "stepAction", width: 45 },
    { header: "Expected Result", key: "expectedResult", width: 35 },
    { header: "Priority", key: "priority", width: 12 },
  ];

  steps.forEach((s) => ws.addRow(s));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7E6E6" } };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function buildAzureCsv(cases: AzureTestCase[], areaPath: string): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [
    "ID,Work Item Type,Title,Test Step,Step Action,Step Expected,Area Path,Assigned To,State",
  ];
  for (const tc of cases) {
    tc.steps.forEach((step, idx) => {
      rows.push(
        ["", "Test Case", esc(tc.title), String(idx + 1), esc(step.action), esc(step.expected), esc(areaPath), "", "Design"].join(",")
      );
    });
  }
  return rows.join("\n");
}

function triggerDownloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function triggerDownloadText(content: string, filename: string, mime: string) {
  triggerDownloadBlob(new Blob([content], { type: mime }), filename);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function tryParseJson<T>(candidate: string): T | null {
  try {
    return JSON.parse(candidate) as T;
  } catch {
    const lastBrace = candidate.lastIndexOf("}");
    if (lastBrace === -1) return null;
    try {
      return JSON.parse(candidate.slice(0, lastBrace + 1) + "]") as T;
    } catch {
      return null;
    }
  }
}

function parseTabResult(raw: string, format: Format): ResultState {
  if (format === "gherkin") {
    return { gherkinResult: raw, testCases: null, keywordSteps: null, azureCases: null };
  }

  const jsonMatch = raw.match(/\[[\s\S]*/);
  if (!jsonMatch) {
    return { gherkinResult: raw, testCases: null, keywordSteps: null, azureCases: null };
  }

  const candidate = jsonMatch[0];

  if (format === "zephyr") {
    const parsed = tryParseJson<KeywordStep[] | TestCase[]>(candidate);
    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
      return { gherkinResult: raw, testCases: null, keywordSteps: null, azureCases: null };
    }
    if ("stepAction" in parsed[0]) {
      return { gherkinResult: null, testCases: null, keywordSteps: parsed as KeywordStep[], azureCases: null };
    }
    return { gherkinResult: null, testCases: parsed as TestCase[], keywordSteps: null, azureCases: null };
  }

  if (format === "azurecsv") {
    const parsed = tryParseJson<AzureTestCase[]>(candidate);
    if (!parsed || !Array.isArray(parsed)) {
      return { gherkinResult: raw, testCases: null, keywordSteps: null, azureCases: null };
    }
    return { gherkinResult: null, testCases: null, keywordSteps: null, azureCases: parsed };
  }

  return { gherkinResult: raw, testCases: null, keywordSteps: null, azureCases: null };
}

const PRIORITY_COLORS: Record<string, string> = {
  High: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Low: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  Magas: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Közepes: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Alacsony: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

interface QAgenProps {
  userId?: string;
  companyId?: string | null;
  sessionToken?: string | null;
  isAdmin?: boolean;
  userEmail?: string;
  monthlyGenerationLimit?: number;
  playwrightEnabled?: boolean;
  confluenceEnabled?: boolean;
  onAdminClick?: () => void;
  onSignOut?: () => void;
}

export function QAgen({
  userId,
  companyId,
  sessionToken,
  isAdmin,
  userEmail,
  monthlyGenerationLimit = 100,
  playwrightEnabled = false,
  confluenceEnabled = false,
  onAdminClick,
  onSignOut,
}: QAgenProps = {}) {
  // Core UI
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<Lang>("hu");

  // Step 1 – type selection
  const [selectedType, setSelectedType] = useState<TabType | null>(null);
  const [step1Collapsed, setStep1Collapsed] = useState(false);

  // Step 2 – keyword mode (only for keyword type)
  const [keywordMode, setKeywordMode] = useState<KeywordMode | null>(null);
  const [step2Collapsed, setStep2Collapsed] = useState(false);

  // Step 3 – sources
  const [file, setFile] = useState<File | null>(null);
  const [secondaryFile, setSecondaryFile] = useState<File | null>(null);
  const [existingTcFile, setExistingTcFile] = useState<File | null>(null);
  const [userStoryText, setUserStoryText] = useState("");
  const [playwrightUrls, setPlaywrightUrls] = useState<string[]>([]);
  const [playwrightUrlInput, setPlaywrightUrlInput] = useState("");
  const [playwrightUrlError, setPlaywrightUrlError] = useState<string | null>(null);
  const [confluencePages, setConfluencePages] = useState<ConfluencePage[]>([]);
  const [showConfluenceModal, setShowConfluenceModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragOverSecondary, setDragOverSecondary] = useState(false);
  const [dragOverExistingTc, setDragOverExistingTc] = useState(false);

  // Analysis
  const [docTopics, setDocTopics] = useState<DocTopic[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [analysing, setAnalysing] = useState(false);
  const [structureOpen, setStructureOpen] = useState(false);

  // Step 4 – format & generate
  const [format, setFormat] = useState<Format>("gherkin");
  const [areaPath, setAreaPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [playwrightScraping, setPlaywrightScraping] = useState(false);
  const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [monthlyCount, setMonthlyCount] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const secondaryInputRef = useRef<HTMLInputElement>(null);
  const existingTcInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("qagen-lang") : null;
    if (saved === "hu" || saved === "en") setLang(saved as Lang);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("qagen-lang", lang);
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (!userId) return;
    void getMonthlyUsageCount(userId).then(setMonthlyCount);
    supabase
      .from("confluence_selected_pages")
      .select("*")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) setConfluencePages(data as ConfluencePage[]);
      });
  }, [userId]);

  const t = STRINGS[lang];

  // ── Navigation helpers ──────────────────────────────────────────────────────

  const resetSources = () => {
    setFile(null);
    setSecondaryFile(null);
    setExistingTcFile(null);
    setUserStoryText("");
    setPlaywrightUrls([]);
    setPlaywrightUrlInput("");
    setPlaywrightUrlError(null);
    setDocTopics([]);
    setSelectedTopicIds(new Set());
    setStructureOpen(false);
  };

  const handleSelectType = (type: TabType) => {
    const changed = type !== selectedType;
    setSelectedType(type);
    setStep1Collapsed(true);
    if (changed) {
      setKeywordMode(null);
      setStep2Collapsed(false);
      resetSources();
      setResult(null);
      setError(null);
      setFormat(TYPE_DEFAULT_FORMAT[type]);
    }
  };

  const handleSelectKeywordMode = (mode: KeywordMode) => {
    const changed = mode !== keywordMode;
    setKeywordMode(mode);
    setStep2Collapsed(true);
    if (changed) {
      resetSources();
      setResult(null);
      setError(null);
    }
  };

  // ── Derived state ───────────────────────────────────────────────────────────

  const step1Done = step1Collapsed && selectedType !== null;
  const step2Visible = step1Done && selectedType === "keyword";
  const step2Done = !step2Visible || (step2Collapsed && keywordMode !== null);
  const sourcesVisible = step1Done && step2Done;

  const stepNums = {
    sources: selectedType === "keyword" ? 3 : 2,
    format: selectedType === "keyword" ? 4 : 3,
  };

  const typeLabel = (type: TabType) =>
    type === "quick" ? t.quickTest : type === "keyword" ? t.keyword : t.userStory;

  const modeLabel = (mode: KeywordMode) =>
    mode === "new" ? t.modeNew : t.modeExpand;

  const hasResult = () =>
    !!(result?.gherkinResult || result?.testCases || result?.keywordSteps || result?.azureCases);

  const canGenerate = (): boolean => {
    if (!selectedType || !sourcesVisible) return false;
    const hasConfluence = confluencePages.length > 0;
    if (selectedType === "userstory") return !!userStoryText.trim() || !!file || hasConfluence;
    if (selectedType === "keyword" && keywordMode === "expand") return !!existingTcFile && (!!file || hasConfluence);
    return !!file || hasConfluence;
  };

  const canAnalyseDoc = () =>
    (selectedType === "quick" || selectedType === "keyword") && (!!file || confluencePages.length > 0);

  const addPlaywrightUrl = () => {
    const url = playwrightUrlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setPlaywrightUrlError(t.playwrightInvalidUrl);
      return;
    }
    setPlaywrightUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
    setPlaywrightUrlInput("");
    setPlaywrightUrlError(null);
  };

  // ── File handlers ───────────────────────────────────────────────────────────

  const onPick = (f: File | null) => {
    if (!f || !/\.(pdf|docx|xlsx)$/i.test(f.name)) return;
    if (f.size > MAX_FILE_SIZE_BYTES) { setError(t.fileTooLarge); return; }
    setFile(f);
    setDocTopics([]);
    setSelectedTopicIds(new Set());
    setStructureOpen(false);
    setError(null);
  };

  const onPickSecondary = (f: File | null) => {
    if (!f || !/\.(pdf|docx|xlsx)$/i.test(f.name)) return;
    setSecondaryFile(f);
    setError(null);
  };

  const onPickExistingTc = (f: File | null) => {
    if (!f || !/\.(pdf|docx|xlsx|csv)$/i.test(f.name)) return;
    setExistingTcFile(f);
    setError(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    onPick(e.dataTransfer.files?.[0] ?? null);
  };

  const onDropSecondary = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSecondary(false);
    onPickSecondary(e.dataTransfer.files?.[0] ?? null);
  };

  const onDropExistingTc = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverExistingTc(false);
    onPickExistingTc(e.dataTransfer.files?.[0] ?? null);
  };

  // ── Analysis ────────────────────────────────────────────────────────────────

  const analyseDocument = async () => {
    if (!canAnalyseDoc()) return;
    setAnalysing(true);
    setError(null);
    try {
      let textToAnalyse = "";
      if (file) {
        textToAnalyse = await extractTextFromFile(file);
      } else if (confluencePages.length > 0 && userId) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
        const { data: { session: cfSession } } = await supabase.auth.getSession();
        const cfToken = cfSession?.access_token ?? anonKey;
        const res = await fetch(`${supabaseUrl}/functions/v1/confluence-proxy`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfToken}` },
          body: JSON.stringify({ action: "get_pages_content", page_ids: confluencePages.map((p) => p.page_id) }),
        });
        if (res.ok) {
          const data = await res.json() as { pages: Array<{ title: string; content: string }> };
          textToAnalyse = data.pages?.map((p) => `[${p.title}]\n${p.content}`).join("\n\n") ?? "";
        }
      }
      if (!textToAnalyse) return;
      const topics = await callAnalyseAPI(textToAnalyse, lang);
      setDocTopics(topics);
      setSelectedTopicIds(new Set(topics.map((tp) => tp.id)));
      setStructureOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalysing(false);
    }
  };

  const extractSectionsViaClaude = async (fullText: string, topicTitles: string[]): Promise<string> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-test-cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({ action: "extract", text: fullText, topics: topicTitles }),
    });
    if (!response.ok) return fullText;
    const data = await response.json();
    const extracted: string = data.result ?? "";
    return extracted.trim() || fullText;
  };

  const splitIntoChunks = (text: string, chunkSize: number): string[] => {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      let end = start + chunkSize;
      if (end < text.length) {
        const breakAt = text.lastIndexOf("\n\n", end);
        if (breakAt > start) end = breakAt;
      }
      chunks.push(text.slice(start, end).trim());
      start = end;
    }
    return chunks.filter(Boolean);
  };

  const CHUNK_CHAR_SIZE = 200_000;

  const mergeResults = (results: ResultState[]): ResultState => {
    const allKeywordSteps = results.flatMap((r) => r.keywordSteps ?? []);
    if (allKeywordSteps.length > 0) return { gherkinResult: null, testCases: null, keywordSteps: allKeywordSteps, azureCases: null };
    const allTestCases = results.flatMap((r) => r.testCases ?? []);
    if (allTestCases.length > 0) return { gherkinResult: null, testCases: allTestCases, keywordSteps: null, azureCases: null };
    const allAzure = results.flatMap((r) => r.azureCases ?? []);
    if (allAzure.length > 0) return { gherkinResult: null, testCases: null, keywordSteps: null, azureCases: allAzure };
    const gherkin = results.map((r) => r.gherkinResult).filter(Boolean).join("\n\n");
    return { gherkinResult: gherkin || null, testCases: null, keywordSteps: null, azureCases: null };
  };

  // ── Generation ──────────────────────────────────────────────────────────────

  const generate = async (fromSelectedTopics = false) => {
    if (!selectedType) return;
    const tab = selectedType;

    let inputText: string | null = null;
    if (tab === "userstory" && userStoryText.trim()) {
      inputText = userStoryText.trim();
    } else if (file) {
      try {
        inputText = await extractTextFromFile(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.fileProcessingError);
        return;
      }
    } else if (tab === "keyword" && existingTcFile && !file) {
      inputText = "";
    } else if (confluencePages.length > 0) {
      inputText = "";
    }

    if (inputText === null) return;

    let secondaryText: string | undefined;
    if (secondaryFile && tab !== "userstory") {
      try {
        secondaryText = await extractTextFromFile(secondaryFile);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.fileProcessingError);
        return;
      }
    }
    if (playwrightUrls.length > 0 && tab !== "userstory") {
      setPlaywrightScraping(true);
      try {
        const scraped = await callPlaywrightScrapeAPI(playwrightUrls);
        console.log("[playwright] scraped pages:", JSON.stringify(scraped));
        const scraperText = formatScrapedPages(scraped);
        console.log("[playwright] formatted text for prompt:", scraperText);
        if (scraperText) {
          secondaryText = (secondaryText ?? "") + `\n\n${scraperText}`;
          console.log("[playwright] secondaryText sent to Claude (first 500 chars):", secondaryText.slice(0, 500));
        } else {
          console.warn("[playwright] formatScrapedPages returned empty string – no data added to prompt");
        }
      } finally {
        setPlaywrightScraping(false);
      }
    }

    let existingTcText: string | undefined;
    if (existingTcFile && tab === "keyword") {
      try {
        existingTcText = await extractTextFromFile(existingTcFile);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.fileProcessingError);
        return;
      }
    }

    let confluenceText: string | undefined;
    if (confluencePages.length > 0 && userId) {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
        const { data: { session: cfSession } } = await supabase.auth.getSession();
        const cfToken = cfSession?.access_token ?? anonKey;
        const res = await fetch(`${supabaseUrl}/functions/v1/confluence-proxy`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfToken}` },
          body: JSON.stringify({ action: "get_pages_content", page_ids: confluencePages.map((p) => p.page_id) }),
        });
        if (res.ok) {
          const data = await res.json() as { pages: Array<{ title: string; content: string }> };
          if (data.pages?.length) {
            confluenceText = data.pages.map((p) => `[${p.title}]\n${p.content}`).join("\n\n");
          }
        }
      } catch {
        // Non-fatal
      }
    }

    if (userId && monthlyGenerationLimit > 0) {
      const currentCount = await getMonthlyUsageCount(userId);
      if (currentCount >= monthlyGenerationLimit) {
        setError(t.monthlyLimitReached);
        return;
      }
    }

    setLoading(true);
    setError(null);
    setChunkProgress(null);

    try {
      const fullDocText = inputText || confluenceText || "";

      if (fromSelectedTopics && docTopics.length > 0) {
        const selected = docTopics.filter((topic) => selectedTopicIds.has(topic.id));
        if (selected.length === 0) {
          setError(lang === "hu" ? "Kérjük jelölj ki legalább egy témát" : "Please select at least one topic");
          setLoading(false);
          return;
        }
        const filteredText = await extractSectionsViaClaude(fullDocText, selected.map((tp) => tp.title));
        const effectiveInput = confluencePages.length > 0 ? "" : filteredText;
        const effectiveConfluence = confluencePages.length > 0 ? filteredText : confluenceText;
        const { result: raw, token_count } = await callClaudeAPI(effectiveInput, format, lang, tab, secondaryText, existingTcText, effectiveConfluence);
        setResult(parseTabResult(raw, format));
        setPreviewOpen(true);
        if (userId) {
          void logUsage({ userId, companyId: companyId ?? null, tabType: tab, outputFormat: format, tokenCount: token_count });
          if (sessionToken) void touchSessionByToken(userId, sessionToken);
          void getMonthlyUsageCount(userId).then(setMonthlyCount);
        }
      } else {
        const needsChunking = fullDocText.length > CHUNK_CHAR_SIZE;

        if (needsChunking && (tab === "quick" || tab === "keyword")) {
          const chunks = splitIntoChunks(fullDocText, CHUNK_CHAR_SIZE);
          const total = chunks.length;
          const chunkResults: ResultState[] = [];
          let totalTokens = 0;

          for (let i = 0; i < chunks.length; i++) {
            setChunkProgress({ current: i + 1, total });
            const chunkText = confluencePages.length > 0 ? "" : chunks[i];
            const chunkConfluence = confluencePages.length > 0 ? chunks[i] : confluenceText;
            const { result: raw, token_count } = await callClaudeAPI(chunkText, format, lang, tab, secondaryText, existingTcText, chunkConfluence);
            chunkResults.push(parseTabResult(raw, format));
            totalTokens += token_count;
          }

          setResult(mergeResults(chunkResults));
          setPreviewOpen(true);
          if (userId) {
            void logUsage({ userId, companyId: companyId ?? null, tabType: tab, outputFormat: format, tokenCount: totalTokens });
            if (sessionToken) void touchSessionByToken(userId, sessionToken);
            void getMonthlyUsageCount(userId).then(setMonthlyCount);
          }
        } else {
          const { result: raw, token_count } = await callClaudeAPI(inputText, format, lang, tab, secondaryText, existingTcText, confluenceText);
          setResult(parseTabResult(raw, format));
          setPreviewOpen(true);
          if (userId) {
            void logUsage({ userId, companyId: companyId ?? null, tabType: tab, outputFormat: format, tokenCount: token_count });
            if (sessionToken) void touchSessionByToken(userId, sessionToken);
            void getMonthlyUsageCount(userId).then(setMonthlyCount);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setChunkProgress(null);
    }
  };

  const downloadResult = async () => {
    if (!result) return;
    const date = todayStr();
    if (result.keywordSteps) {
      const blob = await buildKeywordExcelBlob(result.keywordSteps);
      triggerDownloadBlob(blob, `qagen-keyword-${date}.xlsx`);
    } else if (result.testCases) {
      const blob = await buildExcelBlob(result.testCases);
      triggerDownloadBlob(blob, `qagen-zephyr-${date}.xlsx`);
    } else if (result.azureCases) {
      triggerDownloadText(buildAzureCsv(result.azureCases, areaPath), `qagen-azure-${date}.csv`, "text/csv;charset=utf-8");
    } else if (result.gherkinResult) {
      triggerDownloadText(result.gherkinResult, `qagen-gherkin-${date}.txt`, "text/plain;charset=utf-8");
    }
  };

  // ── Upload zones ────────────────────────────────────────────────────────────

  const PrimaryUploadZone = () => (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`group cursor-pointer rounded-xl border-2 border-dashed bg-card/50 p-8 text-center transition-all ${
        dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      }`}
    >
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
      {file ? (
        <div className="flex flex-col items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          <p className="font-mono text-sm">{file.name}</p>
          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · {t.pickAnother}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-sm">{t.dropHere}</p>
            <p className="text-xs text-muted-foreground mt-1">{t.dropHint}</p>
          </div>
        </div>
      )}
    </div>
  );

  const SecondaryUploadZone = () => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t.secondaryLabel}
        </label>
        {secondaryFile && (
          <button type="button" onClick={() => setSecondaryFile(null)} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {secondaryFile ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-3">
          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-sm truncate">{secondaryFile.name}</p>
            <p className="text-xs text-muted-foreground">{(secondaryFile.size / 1024).toFixed(1)} KB</p>
          </div>
          <button type="button" onClick={() => setSecondaryFile(null)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors" aria-label="Remove">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOverSecondary(true); }}
          onDragLeave={() => setDragOverSecondary(false)}
          onDrop={onDropSecondary}
          onClick={() => secondaryInputRef.current?.click()}
          className={`group cursor-pointer rounded-lg border border-dashed bg-card/30 px-4 py-4 text-center transition-all ${
            dragOverSecondary ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
          }`}
        >
          <input ref={secondaryInputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => onPickSecondary(e.target.files?.[0] ?? null)} />
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Upload className="h-4 w-4 group-hover:text-primary transition-colors" />
            <span className="text-sm">{t.secondaryDropHere}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t.secondaryDropHint}</p>
        </div>
      )}
    </div>
  );

  const ExistingTcUploadZone = () => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t.existingTcRequired}
        </label>
        {existingTcFile && (
          <button type="button" onClick={() => setExistingTcFile(null)} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {existingTcFile ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-3">
          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-sm truncate">{existingTcFile.name}</p>
            <p className="text-xs text-muted-foreground">{(existingTcFile.size / 1024).toFixed(1)} KB</p>
          </div>
          <button type="button" onClick={() => setExistingTcFile(null)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors" aria-label="Remove">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOverExistingTc(true); }}
          onDragLeave={() => setDragOverExistingTc(false)}
          onDrop={onDropExistingTc}
          onClick={() => existingTcInputRef.current?.click()}
          className={`group cursor-pointer rounded-lg border border-dashed bg-card/30 px-4 py-4 text-center transition-all ${
            dragOverExistingTc ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
          }`}
        >
          <input ref={existingTcInputRef} type="file" accept=".pdf,.docx,.xlsx,.csv" className="hidden" onChange={(e) => onPickExistingTc(e.target.files?.[0] ?? null)} />
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Upload className="h-4 w-4 group-hover:text-primary transition-colors" />
            <span className="text-sm">{t.existingTcDropHere}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t.existingTcDropHint}</p>
        </div>
      )}
    </div>
  );

  // ── Preview components ──────────────────────────────────────────────────────

  const GherkinPreview = ({ text }: { text: string }) => {
    const lines = text.split("\n");
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="max-h-[480px] overflow-y-auto p-5">
          {lines.map((line, i) => {
            const trimmed = line.trim();
            const isKeyword = /^(Feature:|Scenario:|Scenario Outline:|Background:|Examples:|Funkció:|Forgatókönyv:)/i.test(trimmed);
            const isStep = /^(Given|When|Then|And|But|Adott|Ha|Akkor|És|De)\s/i.test(trimmed);
            const isComment = trimmed.startsWith("#");
            const isTag = trimmed.startsWith("@");
            return (
              <div key={i} className={`font-mono text-sm leading-relaxed ${
                isKeyword ? "text-primary font-semibold mt-3 first:mt-0" :
                isStep ? "text-foreground pl-6" :
                isComment ? "text-muted-foreground pl-6" :
                isTag ? "text-amber-600 dark:text-amber-400" :
                "text-muted-foreground"
              }`}>
                {line || <>&nbsp;</>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const KeywordPreview = ({ steps }: { steps: KeywordStep[] }) => {
    const groups: { id: string; name: string; priority: string; steps: KeywordStep[] }[] = [];
    for (const s of steps) {
      const existing = groups.find((g) => g.id === s.id);
      if (existing) existing.steps.push(s);
      else groups.push({ id: s.id, name: s.name, priority: s.priority, steps: [s] });
    }
    return (
      <div className="space-y-3">
        {groups.map((group, gIdx) => (
          <div key={gIdx} className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">{group.id}</span>
                <span className="font-semibold text-sm">{group.name}</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${PRIORITY_COLORS[group.priority] ?? "bg-muted text-muted-foreground"}`}>
                {group.priority}
              </span>
            </div>
            {group.steps[0]?.preconditions && (
              <div className="px-4 py-2 border-b border-border bg-muted/10 text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider">{t.preconditions}: </span>
                {group.steps[0].preconditions}
              </div>
            )}
            <div className="divide-y divide-border">
              {group.steps.map((step, sIdx) => (
                <div key={sIdx} className="flex gap-3 px-4 py-2.5 text-sm">
                  <span className="font-mono text-xs text-muted-foreground w-5 shrink-0 mt-0.5">{step.stepNumber}.</span>
                  <div className="flex-1 space-y-0.5">
                    <p>{step.stepAction}</p>
                    <p className="text-green-700 dark:text-green-400 text-xs">{step.expectedResult}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const ZephyrPreview = ({ cases }: { cases: TestCase[] }) => (
    <div className="space-y-3">
      {cases.map((tc, idx) => (
        <div key={idx} className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">{tc.id}</span>
              <span className="font-semibold text-sm">{tc.name}</span>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${PRIORITY_COLORS[tc.priority] ?? "bg-muted text-muted-foreground"}`}>
              {tc.priority}
            </span>
          </div>
          <div className="px-4 py-3 space-y-2 text-sm">
            {tc.preconditions && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.preconditions}: </span>
                <span className="text-muted-foreground">{tc.preconditions}</span>
              </div>
            )}
            {tc.steps && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.steps}: </span>
                <span>{tc.steps}</span>
              </div>
            )}
            {tc.expectedResult && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.expectedResult}: </span>
                <span className="text-green-700 dark:text-green-400">{tc.expectedResult}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const AzurePreview = ({ cases }: { cases: AzureTestCase[] }) => (
    <div className="space-y-3">
      {cases.map((tc, tcIdx) => (
        <div key={tcIdx} className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <span className="font-semibold text-sm">{tc.title}</span>
          </div>
          <div className="divide-y divide-border">
            {tc.steps.map((step, sIdx) => (
              <div key={sIdx} className="flex gap-3 px-4 py-2.5 text-sm">
                <span className="font-mono text-xs text-muted-foreground w-5 shrink-0 mt-0.5">{sIdx + 1}.</span>
                <div className="flex-1 space-y-0.5">
                  <p>{step.action}</p>
                  <p className="text-green-700 dark:text-green-400 text-xs">{step.expected}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // ── Step summary row ────────────────────────────────────────────────────────

  const StepSummary = ({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) => (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div className="flex items-center gap-3">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
          <Check className="h-3 w-3" />
        </span>
        <span className="text-sm text-muted-foreground">{label}:</span>
        <span className="text-sm font-semibold">{value}</span>
      </div>
      <button
        onClick={onEdit}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
      >
        {t.change}
      </button>
    </div>
  );

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-3xl px-6 py-8 animate-fade-in">

        {/* Header */}
        <header className="flex items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">QAgen</h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden sm:block text-sm text-muted-foreground">{t.subtitle}</p>
            {isAdmin && onAdminClick && (
              <button
                onClick={onAdminClick}
                title="Admin panel"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
            {userEmail && (
              <span className="hidden md:block text-xs text-muted-foreground max-w-[140px] truncate" title={userEmail}>
                {userEmail}
              </span>
            )}
            <button
              onClick={() => setLang((l) => (l === "hu" ? "en" : "hu"))}
              aria-label={t.toggleLang}
              title={t.toggleLang}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-base leading-none transition-colors hover:bg-accent"
            >
              <span aria-hidden>{lang === "hu" ? "🇭🇺" : "🇬🇧"}</span>
            </button>
            <button
              onClick={() => setDark((d) => !d)}
              aria-label={t.toggleDark}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {onSignOut && (
              <button
                onClick={() => { void onSignOut?.(); }}
                title="Kijelentkezés"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        {/* Monthly usage */}
        {userId && (
          <div className="flex justify-end mb-4">
            <span className="text-xs text-muted-foreground">
              {t.monthlyGenerations}:{" "}
              <span className={monthlyGenerationLimit > 0 && monthlyCount >= monthlyGenerationLimit ? "text-destructive font-semibold" : "font-medium text-foreground"}>
                {monthlyCount}
              </span>
              {" / "}
              <span className="font-medium text-foreground">
                {monthlyGenerationLimit === 0 ? t.unlimited : monthlyGenerationLimit}
              </span>
            </span>
          </div>
        )}

        <div className="space-y-3">

          {/* ── Step 1: Test type ─────────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {step1Done ? (
              <StepSummary
                label={t.typeLabel}
                value={typeLabel(selectedType!)}
                onEdit={() => setStep1Collapsed(false)}
              />
            ) : (
              <div className="p-5 space-y-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  1. {t.step1Title}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      { type: "quick" as TabType, title: t.quickTest, desc: t.quickTestDesc },
                      { type: "keyword" as TabType, title: t.keyword, desc: t.keywordDesc },
                      { type: "userstory" as TabType, title: t.userStory, desc: t.userStoryDesc },
                    ] as const
                  ).map(({ type, title, desc }) => (
                    <button
                      key={type}
                      onClick={() => handleSelectType(type)}
                      className={`relative flex flex-col gap-1.5 rounded-lg border-2 p-4 text-left transition-all ${
                        selectedType === type
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-accent/40"
                      }`}
                    >
                      {selectedType === type && (
                        <span className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                      <span className="font-semibold text-sm pr-5">{title}</span>
                      <span className="text-xs text-muted-foreground leading-relaxed">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Step 2: Keyword mode ──────────────────────────────────────────── */}
          {step2Visible && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {step2Done ? (
                <StepSummary
                  label={t.modeLabel}
                  value={modeLabel(keywordMode!)}
                  onEdit={() => setStep2Collapsed(false)}
                />
              ) : (
                <div className="p-5 space-y-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    2. {t.step2Title}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(
                      [
                        { mode: "new" as KeywordMode, title: t.modeNew },
                        { mode: "expand" as KeywordMode, title: t.modeExpand },
                      ] as const
                    ).map(({ mode, title }) => (
                      <button
                        key={mode}
                        onClick={() => handleSelectKeywordMode(mode)}
                        className={`relative flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                          keywordMode === mode
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40 hover:bg-accent/40"
                        }`}
                      >
                        {keywordMode === mode && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                        <span className="font-semibold text-sm">{title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Sources ───────────────────────────────────────────────── */}
          {sourcesVisible && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {stepNums.sources}. {t.step3Title}
              </h2>

              {selectedType === "userstory" ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                      {t.textInputLabel}
                    </label>
                    <Textarea
                      value={userStoryText}
                      onChange={(e) => setUserStoryText(e.target.value)}
                      placeholder={t.userStoryPlaceholder}
                      className="min-h-[100px] resize-y font-mono text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex-1 border-t border-border" />
                    <span>{t.orSeparator}</span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                      {t.fileLabel}
                    </label>
                    <PrimaryUploadZone />
                  </div>
                  {confluenceEnabled && (
                    <button
                      type="button"
                      onClick={() => setShowConfluenceModal(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="text-base leading-none">📄</span>
                      {confluencePages.length > 0 ? `Confluence (${confluencePages.length})` : t.confluencePages}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedType === "keyword" && keywordMode === "expand" && (
                    <ExistingTcUploadZone />
                  )}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                      {t.specLabel}
                    </label>
                    <PrimaryUploadZone />
                  </div>
                  {confluenceEnabled && (
                    <button
                      type="button"
                      onClick={() => setShowConfluenceModal(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="text-base leading-none">📄</span>
                      {confluencePages.length > 0 ? `Confluence (${confluencePages.length})` : t.confluencePages}
                    </button>
                  )}
                  <SecondaryUploadZone />
                  {playwrightEnabled && (
                    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t.playwrightSectionTitle}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.playwrightSectionDesc}</p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={playwrightUrlInput}
                          onChange={(e) => { setPlaywrightUrlInput(e.target.value); setPlaywrightUrlError(null); }}
                          onKeyDown={(e) => e.key === "Enter" && addPlaywrightUrl()}
                          placeholder={t.playwrightPlaceholder}
                          className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <button
                          type="button"
                          onClick={addPlaywrightUrl}
                          className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          {t.playwrightAdd}
                        </button>
                      </div>
                      {playwrightUrlError && (
                        <p className="text-xs text-destructive">{playwrightUrlError}</p>
                      )}
                      {playwrightUrls.length > 0 && (
                        <ul className="space-y-1.5">
                          {playwrightUrls.map((url) => (
                            <li key={url} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                              <span className="flex-1 truncate font-mono text-xs">{url}</span>
                              <button
                                type="button"
                                onClick={() => setPlaywrightUrls((prev) => prev.filter((u) => u !== url))}
                                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                                aria-label="Remove URL"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="text-xs text-muted-foreground leading-relaxed">{t.playwrightNote}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Analyse button */}
              {canAnalyseDoc() && (
                <div>
                  <Button
                    variant="outline"
                    onClick={() => { void analyseDocument(); }}
                    disabled={analysing || loading}
                    className="h-10 px-4 text-sm font-medium"
                  >
                    {analysing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t.analysing}
                      </>
                    ) : (
                      <>
                        <span className="mr-1.5 text-base leading-none">📋</span>
                        {t.analyse}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Topic checklist */}
              {docTopics.length > 0 && (
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setStructureOpen((o) => !o)}
                    className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base leading-none">📋</span>
                      {t.docStructure}
                      <span className="text-xs text-muted-foreground font-normal">
                        ({selectedTopicIds.size}/{docTopics.length})
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const allSelected = selectedTopicIds.size === docTopics.length;
                          setSelectedTopicIds(allSelected ? new Set() : new Set(docTopics.map((tp) => tp.id)));
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        {selectedTopicIds.size === docTopics.length ? t.deselectAll : t.selectAll}
                      </button>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${structureOpen ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {structureOpen && (
                    <div className="border-t border-border divide-y divide-border">
                      {docTopics.map((topic) => (
                        <label key={topic.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedTopicIds.has(topic.id)}
                            onChange={(e) => {
                              setSelectedTopicIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(topic.id); else next.delete(topic.id);
                                return next;
                              });
                            }}
                            className="h-4 w-4 rounded border-border accent-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium">{topic.id}. {topic.title}</span>
                            {topic.pages && (
                              <span className="ml-2 text-xs text-muted-foreground">({topic.pages}. {t.page})</span>
                            )}
                          </div>
                        </label>
                      ))}
                      <div className="px-4 py-3">
                        <Button
                          onClick={() => { void generate(true); }}
                          disabled={selectedTopicIds.size === 0 || loading || analysing}
                          className="w-full h-10 text-sm font-semibold"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {chunkProgress ? t.chunkProgress(chunkProgress.current, chunkProgress.total) : t.generating}
                            </>
                          ) : (
                            t.generateFromSelected
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Format & Generate ─────────────────────────────────────── */}
          {sourcesVisible && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {stepNums.format}. {t.step4Title}
              </h2>

              {/* Format selector */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                  {t.formatLabel}
                </label>
                <Select
                  value={format}
                  onValueChange={(v) => { setFormat(v as Format); setResult(null); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gherkin">Gherkin</SelectItem>
                    <SelectItem value="zephyr">Zephyr XLSX</SelectItem>
                    <SelectItem value="azurecsv">Azure DevOps CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Area Path (Azure only) */}
              {format === "azurecsv" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                    {t.areaPath}
                  </label>
                  <input
                    type="text"
                    value={areaPath}
                    onChange={(e) => setAreaPath(e.target.value)}
                    placeholder={t.areaPathPlaceholder}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => { void generate(); }}
                  disabled={!canGenerate() || loading || analysing || playwrightScraping}
                  className="flex-1 h-11 text-sm font-semibold"
                >
                  {playwrightScraping ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />{t.playwrightScraping}</>
                  ) : loading && chunkProgress ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />{t.chunkProgress(chunkProgress.current, chunkProgress.total)}</>
                  ) : loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />{t.generating}</>
                  ) : (
                    t.generate
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { void downloadResult(); }}
                  disabled={!hasResult()}
                  className="h-11 px-4 text-sm font-medium"
                  title={t.download}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">{t.download}</span>
                </Button>
              </div>

              {/* Chunk progress bar */}
              {loading && chunkProgress && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t.chunkProgress(chunkProgress.current, chunkProgress.total)}</span>
                    <span>{Math.round((chunkProgress.current / chunkProgress.total) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(chunkProgress.current / chunkProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900 dark:text-red-200 text-sm">{t.error}</p>
                      <p className="text-xs text-red-800 dark:text-red-300 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Collapsible result preview */}
              {hasResult() && (
                <div className="animate-fade-in">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen((o) => !o)}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <span>{previewOpen ? t.hidePreview : t.showPreview}</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${previewOpen ? "rotate-180" : ""}`} />
                  </button>

                  {previewOpen && (
                    <div className="mt-3 space-y-3">
                      {result!.keywordSteps ? (
                        <KeywordPreview steps={result!.keywordSteps} />
                      ) : result!.testCases ? (
                        <ZephyrPreview cases={result!.testCases} />
                      ) : result!.azureCases ? (
                        <AzurePreview cases={result!.azureCases} />
                      ) : result!.gherkinResult ? (
                        <GherkinPreview text={result!.gherkinResult} />
                      ) : null}
                      <Button onClick={() => { void downloadResult(); }} className="w-full mt-1" size="sm">
                        <Download className="h-4 w-4" />
                        {t.downloadFile}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          {t.footer}
        </footer>
      </div>

      {showConfluenceModal && userId && confluenceEnabled && (
        <ConfluenceModal
          userId={userId}
          lang={lang}
          selectedPages={confluencePages}
          onSave={setConfluencePages}
          onClose={() => setShowConfluenceModal(false)}
        />
      )}
    </div>
  );
}
