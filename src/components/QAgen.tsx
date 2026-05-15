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
  result: string | null;
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
    ready: "Készen áll a letöltésre",
    downloadFile: "Fájl letöltése",
    footer: "QAgen v0.4.0",
    toggleLang: "Nyelv váltása",
    toggleDark: "Sötét mód váltása",
    error: "Hiba",
    fileProcessingError: "Nem sikerült feldolgozni a fájlt",
    apiError: "API hiba az AI válaszban",
    quickTest: "Gyors teszt",
    keyword: "Kulcsszavas",
    userStory: "Felhasználói igény",
    userStoryPlaceholder: "Írd be a felhasználói igényt…",
    areaPath: "Area Path (opcionális)",
    areaPathPlaceholder: "pl. MyProject\\Team",
    orSeparator: "vagy",
    textInputLabel: "Felhasználói igény szövege",
    fileLabel: "Fájl feltöltése",
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
    ready: "Ready to download",
    downloadFile: "Download file",
    footer: "QAgen v0.4.0",
    toggleLang: "Switch language",
    toggleDark: "Toggle dark mode",
    error: "Error",
    fileProcessingError: "Failed to process file",
    apiError: "Error from AI response",
    quickTest: "Quick Test",
    keyword: "Keyword",
    userStory: "User Story",
    userStoryPlaceholder: "Enter your user story…",
    areaPath: "Area Path (optional)",
    areaPathPlaceholder: "e.g. MyProject\\Team",
    orSeparator: "or",
    textInputLabel: "User story text",
    fileLabel: "Upload file",
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
      const csv = XLSX.utils.sheet_to_csv(ws);
      text += `Sheet: ${sheet}\n${csv}\n`;
    }
    return text;
  }

  if (filename.endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder();
    return decoder.decode(arrayBuffer);
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

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase configuration missing");
  }

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

async function generateExcelFile(testCases: TestCase[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Test Cases");

  worksheet.columns = [
    { header: "Test Case ID", key: "id", width: 15 },
    { header: "Test Case Name", key: "name", width: 25 },
    { header: "Preconditions", key: "preconditions", width: 30 },
    { header: "Test Steps", key: "steps", width: 40 },
    { header: "Expected Result", key: "expectedResult", width: 30 },
    { header: "Priority", key: "priority", width: 12 },
  ];

  testCases.forEach((tc) => worksheet.addRow(tc));

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE7E6E6" },
  };

  return workbook.xlsx.writeBuffer() as Promise<Blob>;
}

function generateAzureCsv(cases: AzureTestCase[], areaPath: string): string {
  const rows: string[] = [
    "ID,Work Item Type,Title,Test Step,Step Action,Step Expected,Area Path,Assigned To,State",
  ];

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;

  for (const tc of cases) {
    tc.steps.forEach((step, idx) => {
      rows.push(
        [
          "",
          "Test Case",
          escape(tc.title),
          String(idx + 1),
          escape(step.action),
          escape(step.expected),
          escape(areaPath),
          "",
          "Design",
        ].join(",")
      );
    });
  }

  return rows.join("\n");
}

function downloadTextFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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
    quick: { format: "gherkin", result: null, testCases: null, azureCases: null },
    keyword: { format: "gherkin", result: null, testCases: null, azureCases: null },
    userstory: { format: "gherkin", result: null, testCases: null, azureCases: null },
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

  const updateTabState = (tab: TabType, updates: Partial<TabState>) => {
    setTabStates((prev) => ({ ...prev, [tab]: { ...prev[tab], ...updates } }));
  };

  const onPick = (f: File | null) => {
    if (!f) return;
    if (!/\.(pdf|docx|xlsx)$/i.test(f.name)) return;
    setFile(f);
    setError(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    onPick(e.dataTransfer.files?.[0] ?? null);
  };

  const generate = async () => {
    const tab = activeTab;
    const state = tabStates[tab];

    // For userstory tab, text input takes priority over file
    let inputText: string | null = null;
    if (tab === "userstory" && userStoryText.trim()) {
      inputText = userStoryText.trim();
    } else if (file) {
      inputText = await extractTextFromFile(file).catch((err) => {
        setError(err instanceof Error ? err.message : t.fileProcessingError);
        return null;
      });
    }

    if (!inputText) return;

    setLoading(true);
    setError(null);

    try {
      const response = await callClaudeAPI(inputText, state.format, lang, tab);

      if (state.format === "gherkin") {
        updateTabState(tab, { result: response, testCases: null, azureCases: null });
      } else if (state.format === "zephyr") {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const cases: TestCase[] = JSON.parse(jsonMatch[0]);
            updateTabState(tab, { testCases: cases, result: "generated", azureCases: null });
          } catch {
            // JSON parse failed — show raw text
            updateTabState(tab, { result: response, testCases: null, azureCases: null });
          }
        } else {
          // No JSON array found — show raw text
          updateTabState(tab, { result: response, testCases: null, azureCases: null });
        }
      } else if (state.format === "azurecsv") {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const cases: AzureTestCase[] = JSON.parse(jsonMatch[0]);
            updateTabState(tab, { azureCases: cases, result: "generated", testCases: null });
          } catch {
            updateTabState(tab, { result: response, azureCases: null, testCases: null });
          }
        } else {
          updateTabState(tab, { result: response, azureCases: null, testCases: null });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const canGenerate = (tab: TabType) => {
    if (tab === "userstory" && userStoryText.trim()) return true;
    return !!file;
  };

  const handleDownloadXlsx = async (testCases: TestCase[]) => {
    try {
      const buffer = await generateExcelFile(testCases);
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qagen-test-cases.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate Excel");
    }
  };

  const handleDownloadAzureCsv = (cases: AzureTestCase[]) => {
    const csv = generateAzureCsv(cases, areaPath);
    downloadTextFile(csv, "qagen-azure-devops.csv", "text/csv;charset=utf-8;");
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
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="flex flex-col items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          <p className="font-mono text-sm">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {(file.size / 1024).toFixed(1)} KB · {t.pickAnother}
          </p>
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

  const TabPanel = ({ tab }: { tab: TabType }) => {
    const state = tabStates[tab];
    const isActive = activeTab === tab;

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
            onValueChange={(v) => updateTabState(tab, { format: v as Format })}
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

        {/* Area Path (only for Azure CSV) */}
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

        {/* Generate button */}
        <Button
          onClick={generate}
          disabled={!canGenerate(tab) || (loading && isActive)}
          className="w-full h-11 text-sm font-semibold"
        >
          {loading && isActive ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.generating}
            </>
          ) : (
            t.generate
          )}
        </Button>

        {/* Error */}
        {error && isActive && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-200 text-sm">{t.error}</p>
                <p className="text-xs text-red-800 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {state.result && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.result}
              </h2>
              {state.format === "zephyr" && state.testCases && (
                <Button variant="outline" size="sm" onClick={() => handleDownloadXlsx(state.testCases!)}>
                  <Download className="h-3 w-3" />
                  {t.download}
                </Button>
              )}
              {state.format === "azurecsv" && state.azureCases && (
                <Button variant="outline" size="sm" onClick={() => handleDownloadAzureCsv(state.azureCases!)}>
                  <Download className="h-3 w-3" />
                  {t.download}
                </Button>
              )}
            </div>

            {state.format === "zephyr" && state.testCases ? (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        {["ID", "Name", "Preconditions", "Steps", "Expected", "Priority"].map((h) => (
                          <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {state.testCases.map((tc, idx) => (
                        <tr key={idx} className="border-b border-border hover:bg-accent/30 transition-colors">
                          <td className="px-3 py-2 text-xs font-mono whitespace-nowrap">{tc.id}</td>
                          <td className="px-3 py-2 text-xs font-medium">{tc.name}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{tc.preconditions}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{tc.steps}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{tc.expectedResult}</td>
                          <td className="px-3 py-2">
                            <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                              {tc.priority}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 border-t border-border">
                  <Button onClick={() => handleDownloadXlsx(state.testCases!)} className="w-full" size="sm">
                    <Download className="h-4 w-4" />
                    {t.downloadFile}
                  </Button>
                </div>
              </div>
            ) : state.format === "azurecsv" && state.azureCases ? (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        {["Title", "Step", "Action", "Expected"].map((h) => (
                          <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {state.azureCases.flatMap((tc, tcIdx) =>
                        tc.steps.map((step, stepIdx) => (
                          <tr key={`${tcIdx}-${stepIdx}`} className="border-b border-border hover:bg-accent/30 transition-colors">
                            {stepIdx === 0 ? (
                              <td className="px-3 py-2 text-xs font-medium align-top" rowSpan={tc.steps.length}>
                                {tc.title}
                              </td>
                            ) : null}
                            <td className="px-3 py-2 text-xs font-mono text-center">{stepIdx + 1}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{step.action}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{step.expected}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 border-t border-border">
                  <Button onClick={() => handleDownloadAzureCsv(state.azureCases!)} className="w-full" size="sm">
                    <Download className="h-4 w-4" />
                    {t.downloadFile}
                  </Button>
                </div>
              </div>
            ) : (
              <pre className="max-h-[480px] overflow-auto rounded-lg border border-border bg-card p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {state.result}
              </pre>
            )}
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
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TabType); setError(null); }}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="quick">{t.quickTest}</TabsTrigger>
            <TabsTrigger value="keyword">{t.keyword}</TabsTrigger>
            <TabsTrigger value="userstory">{t.userStory}</TabsTrigger>
          </TabsList>

          <TabsContent value="quick">
            <TabPanel tab="quick" />
          </TabsContent>
          <TabsContent value="keyword">
            <TabPanel tab="keyword" />
          </TabsContent>
          <TabsContent value="userstory">
            <TabPanel tab="userstory" />
          </TabsContent>
        </Tabs>

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          {t.footer}
        </footer>
      </div>
    </div>
  );
}
