import { useEffect, useRef, useState } from "react";
import { Upload, Moon, Sun, FileText, Download, Loader as Loader2, Sparkles, CircleAlert as AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as pdfjsLib from "pdfjs-dist";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type Format = "gherkin" | "zephyr";
type Lang = "hu" | "en";

interface TestCase {
  id: string;
  name: string;
  preconditions: string;
  steps: string;
  expectedResult: string;
  priority: string;
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
    footer: "QAgen v0.1.0",
    toggleLang: "Nyelv váltása",
    toggleDark: "Sötét mód váltása",
    error: "Hiba",
    fileProcessingError: "Nem sikerült feldolgozni a fájlt",
    apiError: "API hiba az AI válaszban",
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
    footer: "QAgen v0.1.0",
    toggleLang: "Switch language",
    toggleDark: "Toggle dark mode",
    error: "Error",
    fileProcessingError: "Failed to process file",
    apiError: "Error from AI response",
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
    const text = decoder.decode(arrayBuffer);
    return text;
  }

  throw new Error("Unsupported file type");
}

async function callClaudeAPI(
  text: string,
  format: Format,
  lang: Lang
): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase configuration missing");
  }

  const apiUrl = `${supabaseUrl}/functions/v1/generate-test-cases`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      text,
      format,
      lang,
    }),
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

  testCases.forEach((tc) => {
    worksheet.addRow(tc);
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE7E6E6" },
  };

  return workbook.xlsx.writeBuffer() as Promise<Blob>;
}

const MOCK_GHERKIN_HU = `Feature: Bejelentkezés

  Scenario: Sikeres bejelentkezés érvényes adatokkal
    Given a felhasználó a bejelentkezési oldalon van
    When megadja az érvényes email címet és jelszót
    And rákattint a "Bejelentkezés" gombra
    Then átirányításra kerül a kezdőlapra
    And megjelenik az üdvözlő üzenet

  Scenario: Sikertelen bejelentkezés hibás jelszóval
    Given a felhasználó a bejelentkezési oldalon van
    When megadja az érvényes email címet
    And megad egy hibás jelszót
    Then hibaüzenet jelenik meg
    And a felhasználó a bejelentkezési oldalon marad
`;

const MOCK_GHERKIN_EN = `Feature: Login

  Scenario: Successful login with valid credentials
    Given the user is on the login page
    When they enter a valid email and password
    And click the "Login" button
    Then they are redirected to the home page
    And a welcome message is displayed

  Scenario: Failed login with wrong password
    Given the user is on the login page
    When they enter a valid email
    And enter an incorrect password
    Then an error message is displayed
    And the user remains on the login page
`;

export function QAgen() {
  const [dark, setDark] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<Format>("gherkin");
  const [lang, setLang] = useState<Lang>("hu");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<TestCase[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("qagen-lang") : null;
    if (saved === "hu" || saved === "en") setLang(saved);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("qagen-lang", lang);
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const t = STRINGS[lang];

  const onPick = (f: File | null) => {
    if (!f) return;
    const ok = /\.(pdf|docx|xlsx)$/i.test(f.name);
    if (!ok) return;
    setFile(f);
    setResult(null);
    setError(null);
    setTestCases(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    onPick(e.dataTransfer.files?.[0] ?? null);
  };

  const generate = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setTestCases(null);

    try {
      const text = await extractTextFromFile(file);
      const response = await callClaudeAPI(text, format, lang);

      if (format === "gherkin") {
        setResult(response);
      } else {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error("Invalid JSON response from API");
        }
        const cases: TestCase[] = JSON.parse(jsonMatch[0]);
        setTestCases(cases);
        setResult("generated");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadXlsx = async () => {
    if (!testCases) return;
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

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-3xl px-6 py-8 animate-fade-in">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 mb-12">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">QAgen</h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden sm:block text-sm text-muted-foreground">
              {t.subtitle}
            </p>
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

        {/* Upload zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`group cursor-pointer rounded-xl border-2 border-dashed bg-card/50 backdrop-blur-sm p-10 text-center transition-all ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
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
              <FileText className="h-10 w-10 text-primary" />
              <p className="font-mono text-sm">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB · {t.pickAnother}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">{t.dropHere}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.dropHint}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="mt-6">
          <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">
            {t.formatLabel}
          </label>
          <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gherkin">Gherkin</SelectItem>
              <SelectItem value="zephyr">Zephyr XLSX</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Generate */}
        <Button
          onClick={generate}
          disabled={!file || loading}
          className="w-full mt-6 h-12 text-base font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.generating}
            </>
          ) : (
            t.generate
          )}
        </Button>

        {/* Error */}
        {error && (
          <div className="mt-8 animate-fade-in rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-200">
                  {t.error}
                </p>
                <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-8 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t.result}
              </h2>
              {format === "zephyr" && testCases && (
                <Button variant="outline" size="sm" onClick={downloadXlsx}>
                  <Download className="h-4 w-4" />
                  {t.download}
                </Button>
              )}
            </div>
            {format === "zephyr" && testCases ? (
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                          ID
                        </th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                          Name
                        </th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                          Preconditions
                        </th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                          Steps
                        </th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                          Expected Result
                        </th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">
                          Priority
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {testCases.map((tc, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-border hover:bg-accent/50"
                        >
                          <td className="px-3 py-2">{tc.id}</td>
                          <td className="px-3 py-2">{tc.name}</td>
                          <td className="px-3 py-2 text-xs">{tc.preconditions}</td>
                          <td className="px-3 py-2 text-xs">{tc.steps}</td>
                          <td className="px-3 py-2 text-xs">
                            {tc.expectedResult}
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-block rounded px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                              {tc.priority}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button onClick={downloadXlsx} className="mt-4 w-full">
                  <Download className="h-4 w-4" />
                  {t.downloadFile}
                </Button>
              </div>
            ) : (
              <pre className="max-h-[480px] overflow-auto rounded-lg border border-border bg-card p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {result}
              </pre>
            )}
          </div>
        )}

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          {t.footer}
        </footer>
      </div>
    </div>
  );
}