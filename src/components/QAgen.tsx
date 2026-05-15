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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import * as pdfjsLib from "pdfjs-dist";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type Format = "gherkin" | "zephyr" | "azurecsv";
type Lang = "hu" | "en";
type TabType = "quick" | "keyword" | "userstory";

interface TestCase {
  id: string;
  name: string;
  preconditions: string;
  steps: string;
  expectedResult: string;
  priority: string;
}

interface AzureTestCase {
  title: string;
  steps: { action: string; expected: string }[];
}

interface TabState {
  format: Format;
  gherkinResult: string | null;
  testCases: TestCase[] | null;
  azureCases: AzureTestCase[] | null;
}

const STRINGS = {
  hu: {
    subtitle: "Specifikációból tesztesetek – másodpercek alatt",
    dropHere: "Húzd ide a specifikációt",
    dropHint: "vagy kattints a tallózáshoz · PDF, DOCX, XLSX · max 30 oldal",
    pickAnother: "kattints másik fájl kiválasztásához",
    formatLabel: "Kimeneti formátum",
    generate: "Tesztesetek generálása",
    generating: "Generálás folyamatban…",
    result: "Eredmény",
    download: "Letöltés",
    downloadFile: "Fájl letöltése",
    footer: "QAgen v0.4.0",
    toggleLang: "Nyelv váltása",
    toggleDark: "Sötét mód váltása",
    error: "Hiba",
    fileProcessingError: "Nem sikerült feldolgozni a fájlt",
    quickTest: "Gyors teszt",
    keyword: "Kulcsszavas",
    userStory: "Felhasználói igény",
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
    noResult: "Nincs eredmény még",
  },
  en: {
    subtitle: "From specification to test cases – in seconds",
    dropHere: "Drop the specification here",
    dropHint: "or click to browse · PDF, DOCX, XLSX · max 30 pages",
    pickAnother: "click to pick another file",
    formatLabel: "Output format",
    generate: "Generate test cases",
    generating: "Generating…",
    result: "Result",
    download: "Download",
    downloadFile: "Download file",
    footer: "QAgen v0.4.0",
    toggleLang: "Switch language",
    toggleDark: "Toggle dark mode",
    error: "Error",
    fileProcessingError: "Failed to process file",
    quickTest: "Quick Test",
    keyword: "Keyword",
    userStory: "User Story",
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
    noResult: "No result yet",
  },
} as const;

const ACCEPT = ".pdf,.docx,.xlsx";

async function extractTextFromFile(file: File): Promise<string> {
  const filename = file.name.toLowerCase();

  if (filename.endsWith(".pdf")) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
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

  throw new Error("Unsupported file type");
}

async function callClaudeAPI(
  text: string,
  format: Format,
  lang: Lang,
  tab: TabType
): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) throw new Error("Supabase configuration missing");

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-test-cases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ text, format, lang, tab }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "API request failed");
  }

  const data = await response.json();
  return data.result;
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

  return workbook.xlsx.writeBuffer() as Promise<Blob>;
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

function parseTabResult(
  raw: string,
  format: Format
): Pick<TabState, "gherkinResult" | "testCases" | "azureCases"> {
  if (format === "gherkin") {
    return { gherkinResult: raw, testCases: null, azureCases: null };
  }

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return { gherkinResult: raw, testCases: null, azureCases: null };
  }

  try {
    if (format === "zephyr") {
      const cases: TestCase[] = JSON.parse(jsonMatch[0]);
      return { gherkinResult: null, testCases: cases, azureCases: null };
    }
    if (format === "azurecsv") {
      const cases: AzureTestCase[] = JSON.parse(jsonMatch[0]);
      return { gherkinResult: null, testCases: null, azureCases: cases };
    }
  } catch {
    return { gherkinResult: raw, testCases: null, azureCases: null };
  }

  return { gherkinResult: raw, testCases: null, azureCases: null };
}

const PRIORITY_COLORS: Record<string, string> = {
  High: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Low: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  Magas: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  Közepes: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Alacsony: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

export function QAgen() {
  const [dark, setDark] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState<Lang>("hu");
  const [activeTab, setActiveTab] = useState<TabType>("quick");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userStoryText, setUserStoryText] = useState("");
  const [areaPath, setAreaPath] = useState("");
  const [tabStates, setTabStates] = useState<Record<TabType, TabState>>({
    quick: { format: "gherkin", gherkinResult: null, testCases: null, azureCases: null },
    keyword: { format: "gherkin", gherkinResult: null, testCases: null, azureCases: null },
    userstory: { format: "gherkin", gherkinResult: null, testCases: null, azureCases: null },
  });
  const inputRef = useRef<HTMLInputElement>(null);

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

  const t = STRINGS[lang];

  const updateTabState = (tab: TabType, updates: Partial<TabState>) =>
    setTabStates((prev) => ({ ...prev, [tab]: { ...prev[tab], ...updates } }));

  const onPick = (f: File | null) => {
    if (!f || !/\.(pdf|docx|xlsx)$/i.test(f.name)) return;
    setFile(f);
    setError(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    onPick(e.dataTransfer.files?.[0] ?? null);
  };

  const canGenerate = (tab: TabType) =>
    tab === "userstory" ? !!userStoryText.trim() || !!file : !!file;

  const hasResult = (state: TabState) =>
    !!(state.gherkinResult || state.testCases || state.azureCases);

  const generate = async () => {
    const tab = activeTab;
    const state = tabStates[tab];

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
    }

    if (!inputText) return;

    setLoading(true);
    setError(null);

    try {
      const raw = await callClaudeAPI(inputText, state.format, lang, tab);
      updateTabState(tab, parseTabResult(raw, state.format));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const downloadResult = async (tab: TabType) => {
    const state = tabStates[tab];
    const date = todayStr();

    if (state.testCases) {
      const blob = await buildExcelBlob(state.testCases);
      triggerDownloadBlob(blob, `qagen-zephyr-${date}.xlsx`);
    } else if (state.azureCases) {
      triggerDownloadText(buildAzureCsv(state.azureCases, areaPath), `qagen-azure-${date}.csv`, "text/csv;charset=utf-8");
    } else if (state.gherkinResult) {
      triggerDownloadText(state.gherkinResult, `qagen-gherkin-${date}.txt`, "text/plain;charset=utf-8");
    }
  };

  const UploadZone = () => (
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

  const ZephyrPreview = ({ cases, onDownload }: { cases: TestCase[]; onDownload: () => void }) => (
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
      <Button onClick={onDownload} className="w-full mt-1" size="sm">
        <Download className="h-4 w-4" />
        {t.downloadFile}
      </Button>
    </div>
  );

  const AzurePreview = ({ cases, onDownload }: { cases: AzureTestCase[]; onDownload: () => void }) => (
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
      <Button onClick={onDownload} className="w-full mt-1" size="sm">
        <Download className="h-4 w-4" />
        {t.downloadFile}
      </Button>
    </div>
  );

  const renderTabPanel = (tab: TabType) => {
    const state = tabStates[tab];
    const isActive = activeTab === tab;
    const isGenerating = loading && isActive;
    const resultReady = hasResult(state);

    return (
      <div className="space-y-5">
        {/* Input section */}
        {tab === "userstory" ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">
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
              <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">
                {t.fileLabel}
              </label>
              <UploadZone />
            </div>
          </div>
        ) : (
          <UploadZone />
        )}

        {/* Format selector */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">
            {t.formatLabel}
          </label>
          <Select
            value={state.format}
            onValueChange={(v) => updateTabState(tab, { format: v as Format, gherkinResult: null, testCases: null, azureCases: null })}
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

        {/* Area Path (Azure CSV only) */}
        {state.format === "azurecsv" && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">
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
        <div className="flex gap-2">
          <Button
            onClick={generate}
            disabled={!canGenerate(tab) || isGenerating}
            className="flex-1 h-11 text-sm font-semibold"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.generating}
              </>
            ) : (
              t.generate
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => { void downloadResult(tab); }}
            disabled={!resultReady}
            className="h-11 px-4 text-sm font-medium"
            title={t.download}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">{t.download}</span>
          </Button>
        </div>

        {/* Error */}
        {error && isActive && (
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

        {/* Result */}
        {resultReady && (
          <div className="animate-fade-in">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {t.result}
            </h2>
            {state.testCases ? (
              <ZephyrPreview cases={state.testCases} onDownload={() => { void downloadResult(tab); }} />
            ) : state.azureCases ? (
              <AzurePreview cases={state.azureCases} onDownload={() => { void downloadResult(tab); }} />
            ) : state.gherkinResult ? (
              <GherkinPreview text={state.gherkinResult} />
            ) : null}
          </div>
        )}
      </div>
    );
  };

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
          </div>
        </header>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => { setActiveTab(v as TabType); setError(null); }}
        >
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="quick">{t.quickTest}</TabsTrigger>
            <TabsTrigger value="keyword">{t.keyword}</TabsTrigger>
            <TabsTrigger value="userstory">{t.userStory}</TabsTrigger>
          </TabsList>

          <TabsContent value="quick">{renderTabPanel("quick")}</TabsContent>
          <TabsContent value="keyword">{renderTabPanel("keyword")}</TabsContent>
          <TabsContent value="userstory">{renderTabPanel("userstory")}</TabsContent>
        </Tabs>

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          {t.footer}
        </footer>
      </div>
    </div>
  );
}
