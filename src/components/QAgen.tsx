import { useEffect, useRef, useState } from "react";
import { Upload, Moon, Sun, FileText, Download, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Format = "gherkin" | "zephyr";
type Lang = "hu" | "en";

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
    footer: "QAgen v0.1.0 · mock előnézet — a backend még nincs bekötve",
    toggleLang: "Nyelv váltása",
    toggleDark: "Sötét mód váltása",
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
    footer: "QAgen v0.1.0 · mock preview — backend not yet connected",
    toggleLang: "Switch language",
    toggleDark: "Toggle dark mode",
  },
} as const;

const ACCEPT = ".pdf,.docx,.xlsx";

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
    await new Promise((r) => setTimeout(r, 1200));
    setResult(lang === "hu" ? MOCK_GHERKIN_HU : MOCK_GHERKIN_EN);
    setLoading(false);
  };

  const downloadXlsx = () => {
    const csv =
      "Key,Summary,Precondition,Step,Test Data,Expected Result\n" +
      "TC-1,Login success,User on login page,Enter valid creds and submit,valid@test.com / pass,Redirect to home\n" +
      "TC-2,Login fail,User on login page,Enter wrong password,valid@test.com / wrong,Error shown\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qagen-zephyr.csv";
    a.click();
    URL.revokeObjectURL(url);
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

        {/* Result */}
        {result && (
          <div className="mt-8 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t.result}
              </h2>
              {format === "zephyr" && (
                <Button variant="outline" size="sm" onClick={downloadXlsx}>
                  <Download className="h-4 w-4" />
                  {t.download}
                </Button>
              )}
            </div>
            {format === "zephyr" ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <FileText className="h-10 w-10 mx-auto text-primary mb-3" />
                <p className="font-medium">qagen-zephyr.xlsx</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.ready}
                </p>
                <Button onClick={downloadXlsx} className="mt-4">
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