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
              Specifikációból tesztesetek – másodpercek alatt
            </p>
            <button
              onClick={() => setDark((d) => !d)}
              aria-label="Toggle dark mode"
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
                {(file.size / 1024).toFixed(1)} KB · kattints másik fájl kiválasztásához
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Húzd ide a specifikációt</p>
                <p className="text-sm text-muted-foreground mt-1">
                  vagy kattints a tallózáshoz · PDF, DOCX, XLSX · max 30 oldal
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">
              Kimeneti formátum
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
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">
              Nyelv
            </label>
            <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hu">Magyar</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
              Generálás folyamatban…
            </>
          ) : (
            "Tesztesetek generálása"
          )}
        </Button>

        {/* Result */}
        {result && (
          <div className="mt-8 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Eredmény
              </h2>
              {format === "zephyr" && (
                <Button variant="outline" size="sm" onClick={downloadXlsx}>
                  <Download className="h-4 w-4" />
                  Letöltés
                </Button>
              )}
            </div>
            {format === "zephyr" ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center">
                <FileText className="h-10 w-10 mx-auto text-primary mb-3" />
                <p className="font-medium">qagen-zephyr.xlsx</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Készen áll a letöltésre
                </p>
                <Button onClick={downloadXlsx} className="mt-4">
                  <Download className="h-4 w-4" />
                  Fájl letöltése
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
          QAgen v0.1.0 · mock előnézet — a backend még nincs bekötve
        </footer>
      </div>
    </div>
  );
}