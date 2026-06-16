import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useAuth } from "@/lib/auth";

type Lang = "hu" | "en";

type Block =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "note"; text: string };

interface GuideSection {
  id: string;
  title: string;
  blocks: Block[];
}

interface GuideContent {
  pageTitle: string;
  toc: string;
  sections: GuideSection[];
}

const GUIDE: Record<Lang, GuideContent> = {
  hu: {
    pageTitle: "Felhasználói útmutató",
    toc: "Tartalom",
    sections: [
      {
        id: "intro",
        title: "1. Bevezetés",
        blocks: [
          { type: "p", text: "A QAgen egy mesterséges intelligencia alapú teszteset-generátor, amelyet tesztelők építettek tesztelőknek. Tölts fel egy specifikációs dokumentumot, kapcsolódj a Confluence munkaterületedhez, vagy térképezd fel az élő alkalmazást – és kapj strukturált, automatizálásra kész teszteseteket másodpercek alatt." },
          { type: "h3", text: "Kinek szól a QAgen?" },
          { type: "ul", items: [
            "Manuális tesztelőknek akik gyorsabban szeretnének teszteseteket írni",
            "Tesztautomatizálóknak akiknek részletes, lépésről lépésre haladó tesztesetekre van szükségük",
            "QA vezetőknek akik egységes teszteset minőséget szeretnének a csapatban",
          ] },
        ],
      },
      {
        id: "getting-started",
        title: "2. Első lépések",
        blocks: [
          { type: "h3", text: "Bejelentkezés" },
          { type: "p", text: "A QAgen csak meghívással érhető el. Az adminisztrátor hozza létre a fiókodat és küldi el a bejelentkezési adatokat." },
          { type: "h3", text: "A felület" },
          { type: "p", text: "Bejelentkezés után a főoldalt látod, amely négy lépéses workflow-t tartalmaz:" },
          { type: "ol", items: [
            "Teszteset típus kiválasztása",
            "Generálási mód (csak Kulcsszavasnál)",
            "Forrás kiválasztása",
            "Formátum és generálás",
          ] },
          { type: "p", text: "A jobb oldali összefoglaló panel mutatja a kiválasztott beállításokat és a havi generálási keretedet." },
        ],
      },
      {
        id: "test-types",
        title: "3. Teszteset típusok",
        blocks: [
          { type: "h3", text: "Áttekintő teszt" },
          { type: "p", text: "1-2 lépéses teszteseteket generál, amelyek gyors áttekintést adnak arról mit kell tesztelni. Ideális smoke teszteléshez, kezdeti teszttervezéshez, vagy ha gyors magas szintű összefoglalóra van szükség." },
          { type: "h3", text: "Kulcsszavas" },
          { type: "p", text: "Részletes, többlépéses teszteseteket generál pontos UI elemnevekkel, előfeltételekkel és lépésenkénti elvárt eredményekkel. Tesztautomatizálók számára tervezve." },
          { type: "p", text: "Két mód:" },
          { type: "ul", items: [
            "**Új tesztesetek generálása** – specifikáció vagy Confluence oldalak alapján",
            "**Meglévő tesztesetek kibővítése** – meglévő 1-2 lépéses teszteseteket bővít ki részletes kulcsszavas formátumra",
          ] },
          { type: "h3", text: "Felhasználói igény" },
          { type: "p", text: "Felhasználói igények alapján generál funkcionális teszteseteket. A bemenet lehet rövid szöveges leírás, fájl vagy Confluence oldal." },
        ],
      },
      {
        id: "source-selection",
        title: "4. Forrás megadása",
        blocks: [
          { type: "h3", text: "Fájl feltöltés" },
          { type: "p", text: "Támogatott formátumok: PDF, DOCX, XLSX. Maximum fájlméret: 50 MB." },
          { type: "h3", text: "Confluence integráció" },
          { type: "p", text: "Kapcsolódj a Confluence munkaterületedhez az Atlassian fiók email címeddel és API tokeneddel." },
          { type: "ol", items: [
            "Kattints a Confluence oldalak gombra",
            "Add meg a Confluence URL-t, email címet és API tokent",
            "Illeszd be egy oldal URL-jét az aloldalak listázásához",
            "Válaszd ki a felvenni kívánt oldalakat",
            "Kattints a Mentés gombra",
          ] },
          { type: "note", text: "Megjegyzés: A Confluence integrációt az adminisztrátornak kell engedélyeznie." },
          { type: "h3", text: "Alkalmazás URL (Playwright feltérképezés)" },
          { type: "p", text: "Add meg a tesztelni kívánt alkalmazás URL-jeit. A QAgen feltérképezi ezeket az oldalakat és kinyeri a valódi UI elemneveket." },
          { type: "note", text: "Megjegyzés: Csak nyilvánosan elérhető oldalak támogatottak. Az adminisztrátornak kell engedélyeznie." },
          { type: "h3", text: "Kiegészítő dokumentum" },
          { type: "p", text: "Tölts fel kiegészítő dokumentumot például felhasználói kézikönyvet vagy műszaki specifikációt." },
          { type: "h3", text: "Meglévő tesztesetek (csak Kulcsszavas módban)" },
          { type: "p", text: "Töltsd fel a jelenlegi teszteseteidet XLSX, CSV, DOCX vagy PDF formátumban a kibővítéshez." },
        ],
      },
      {
        id: "doc-analysis",
        title: "5. Dokumentum struktúra elemzés",
        blocks: [
          { type: "p", text: "Fájl feltöltése vagy Confluence oldalak kiválasztása után megjelenik az Elemzés gomb. Kattints rá a dokumentum főbb témáinak kinyeréséhez és válaszd ki melyekhez generálj teszteseteket." },
          { type: "ul", items: [
            "**Részleges kijelölés** – csak a kijelölt témákhoz generál",
            "**Mindent kijelöl** – a teljes dokumentumot feldolgozza darabolással",
          ] },
        ],
      },
      {
        id: "generation-settings",
        title: "6. Generálási beállítások (opcionális)",
        blocks: [
          { type: "p", text: "Nyisd ki a Generálási beállítások panelt a kimenet testreszabásához:" },
          { type: "ul", items: [
            "**Teszteset típusok**: Pozitív, Negatív, Edge case-ek, Határérték tesztek",
            "**Fókuszterületek**: Funkcionális, UI/vizuális, Helyesírás ellenőrzés, Reszponzivitás",
            "**Prioritás szint**: Csak High / High és Medium / Minden prioritás",
            "**Tesztesetek száma**: Kevés (5-10) / Közepes (10-20) / Sok (20+)",
          ] },
        ],
      },
      {
        id: "export-formats",
        title: "7. Exportálási formátumok",
        blocks: [
          { type: "table", headers: ["Formátum", "Mire való"], rows: [
            ["Gherkin", "BDD csapatok, Cucumber/SpecFlow"],
            ["Zephyr XLSX", "Zephyr Scale Jira-ban"],
            ["Azure DevOps CSV", "Azure Test Plans"],
            ["TestRail CSV", "TestRail"],
            ["Xray CSV", "Xray Jira-ban"],
          ] },
        ],
      },
      {
        id: "tips",
        title: "8. Tippek és bevált gyakorlatok",
        blocks: [
          { type: "ul", items: [
            "Írj olyan specifikációt amely leírja mit kell csinálnia a rendszernek, nem azt hogyan néz ki",
            "Használj Playwright feltérképezést a pontos UI elemnevekért",
            "Használd az Elemzés gombot 30 oldalnál hosszabb dokumentumoknál",
            "Kombinálj több forrást a legjobb eredményért: specifikáció + kézikönyv + alkalmazás URL",
            "Használd a Kulcsszavas módot a Meglévő kibővítése opcióval az automatizálásra kész teszteset könyvtár gyors felépítéséhez",
          ] },
        ],
      },
    ],
  },
  en: {
    pageTitle: "User Guide",
    toc: "Contents",
    sections: [
      {
        id: "intro",
        title: "1. Introduction",
        blocks: [
          { type: "p", text: "QAgen is an AI-powered test case generator built by testers, for testers. Upload a specification document, connect your Confluence workspace, or map a live application — and get structured, automation-ready test cases in seconds." },
          { type: "h3", text: "Who is QAgen for?" },
          { type: "ul", items: [
            "Manual testers who need to write test cases faster",
            "Test automation engineers who need detailed, step-by-step test cases",
            "QA leads who want consistent test case quality across the team",
          ] },
        ],
      },
      {
        id: "getting-started",
        title: "2. Getting Started",
        blocks: [
          { type: "h3", text: "Login" },
          { type: "p", text: "QAgen uses invite-only access. Your administrator creates your account and sends you login credentials." },
          { type: "h3", text: "The interface" },
          { type: "p", text: "After login you will see the main workflow with four steps:" },
          { type: "ol", items: [
            "Test case type selection",
            "Generation mode (Keyword only)",
            "Source selection",
            "Format and generate",
          ] },
          { type: "p", text: "The right sidebar shows a summary of your selections and your monthly generation quota." },
        ],
      },
      {
        id: "test-types",
        title: "3. Test Case Types",
        blocks: [
          { type: "h3", text: "Overview Test" },
          { type: "p", text: "Generates 1-2 step test cases that give a quick overview of what needs to be tested. Best for smoke testing, initial test planning, or when you need a fast high-level summary." },
          { type: "h3", text: "Keyword-driven" },
          { type: "p", text: "Generates detailed, multi-step test cases with exact UI element names, preconditions, and expected results per step. Designed for test automation engineers." },
          { type: "p", text: "Two modes:" },
          { type: "ul", items: [
            "**Generate new test cases** – from a specification or Confluence pages",
            "**Expand existing test cases** – takes your existing 1-2 step test cases and expands them into detailed keyword-driven format",
          ] },
          { type: "h3", text: "User Story" },
          { type: "p", text: "Generates functional test cases from user stories. Input can be a short text description, a file, or a Confluence page." },
        ],
      },
      {
        id: "source-selection",
        title: "4. Source Selection",
        blocks: [
          { type: "h3", text: "File upload" },
          { type: "p", text: "Supported formats: PDF, DOCX, XLSX. Maximum file size: 50 MB." },
          { type: "h3", text: "Confluence integration" },
          { type: "p", text: "Connect your Confluence workspace using your Atlassian account email and API token." },
          { type: "ol", items: [
            "Click the Confluence pages button",
            "Enter your Confluence URL, email, and API token",
            "Paste a page URL to list child pages",
            "Select the pages you want to include",
            "Click Save",
          ] },
          { type: "note", text: "Note: Confluence integration must be enabled by your administrator." },
          { type: "h3", text: "Application URL (Playwright mapping)" },
          { type: "p", text: "Add one or more URLs of the application you are testing. QAgen will crawl these pages and extract real UI element names and include them in the generated test cases." },
          { type: "note", text: "Note: Only publicly accessible pages are supported. Must be enabled by your administrator." },
          { type: "h3", text: "Additional document" },
          { type: "p", text: "Upload a supplementary document such as a user manual or technical specification for additional context." },
          { type: "h3", text: "Existing test cases (Keyword mode only)" },
          { type: "p", text: "Upload your current test cases in XLSX, CSV, DOCX, or PDF format to expand them into detailed keyword-driven format." },
        ],
      },
      {
        id: "doc-analysis",
        title: "5. Document Structure Analysis",
        blocks: [
          { type: "p", text: "After uploading a file or selecting Confluence pages, an Analyse button appears. Click it to extract the main topics from your document and select which ones to generate test cases for." },
          { type: "ul", items: [
            "**Partial selection** – generates test cases only for selected topics",
            "**Select all** – processes the entire document using chunking",
          ] },
        ],
      },
      {
        id: "generation-settings",
        title: "6. Generation Settings (Optional)",
        blocks: [
          { type: "p", text: "Expand the Generation settings panel to customise the output:" },
          { type: "ul", items: [
            "**Test case types**: Positive, Negative, Edge cases, Boundary value",
            "**Focus areas**: Functional, UI/Visual, Language check, Responsiveness",
            "**Priority level**: High only / High and Medium / All priorities",
            "**Test case count**: Few (5-10) / Medium (10-20) / Many (20+)",
          ] },
        ],
      },
      {
        id: "export-formats",
        title: "7. Export Formats",
        blocks: [
          { type: "table", headers: ["Format", "Best for"], rows: [
            ["Gherkin", "BDD teams, Cucumber/SpecFlow"],
            ["Zephyr XLSX", "Zephyr Scale in Jira"],
            ["Azure DevOps CSV", "Azure Test Plans"],
            ["TestRail CSV", "TestRail"],
            ["Xray CSV", "Xray in Jira"],
          ] },
        ],
      },
      {
        id: "tips",
        title: "8. Tips and Best Practices",
        blocks: [
          { type: "ul", items: [
            "Write specifications that describe what the system should do, not how it looks",
            "Use Playwright mapping for accurate UI element names in test steps",
            "Use the Analyse button for documents longer than 30 pages",
            "Combine specification + user manual + application URL for best results",
            "Use Keyword mode with Expand existing to quickly build an automation-ready test case library",
          ] },
        ],
      },
    ],
  },
};

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  );
}

interface Theme {
  accent: string;
  br: string;
  mu: string;
  tx: string;
}

function renderBlock(block: Block, idx: number, theme: Theme) {
  const { accent, br, mu, tx } = theme;

  if (block.type === "p") {
    return <p key={idx} className="text-sm leading-relaxed" style={{ color: tx }}>{renderInline(block.text)}</p>;
  }
  if (block.type === "h3") {
    return <h3 key={idx} className="text-base font-semibold pt-1" style={{ color: tx }}>{block.text}</h3>;
  }
  if (block.type === "ul") {
    return (
      <ul key={idx} className="space-y-1.5">
        {block.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: tx }}>
            <span className="mt-[7px] h-1 w-1 rounded-full shrink-0" style={{ background: accent }} />
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === "ol") {
    return (
      <ol key={idx} className="space-y-1.5">
        {block.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: tx }}>
            <span className="font-mono text-xs shrink-0 mt-0.5" style={{ color: accent }}>{i + 1}.</span>
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ol>
    );
  }
  if (block.type === "table") {
    return (
      <div key={idx} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${br}` }}>
        <table className="w-full text-sm">
          <thead style={{ background: `${accent}10` }}>
            <tr>
              {block.headers.map((h, i) => (
                <th key={i} className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider" style={{ color: mu }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri} style={{ borderTop: `1px solid ${br}` }}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2" style={{ color: tx }}>{renderInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  // note
  return (
    <div key={idx} className="rounded-lg px-4 py-3 text-sm" style={{ background: `${accent}10`, border: `1px solid ${accent}30`, color: mu }}>
      {renderInline(block.text)}
    </div>
  );
}

export function GuidePage() {
  const { user, profile } = useAuth();
  const logoTarget: "/app" | "/" = user && profile ? "/app" : "/";
  const [lang, setLang] = useState<Lang>("hu");
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" && window.localStorage.getItem("qagen-dark-mode") === "true"
  );
  const [activeId, setActiveId] = useState<string>("intro");

  const accent = "#3b7ff5";
  const bg = dark ? "#090c14" : "#f8f9ff";
  const br = dark ? "#1e2d4a" : "#d0d8f0";
  const tx = dark ? "#c8d8f0" : "#1a1e2e";
  const mu = dark ? "#8aa6cf" : "#39414f";
  const su = dark ? "#9ec4ee" : "#222838";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("qagen-dark-mode", String(dark));
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
    const id = "qagen-guide-styles";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `
      .qa-bg{background-image:linear-gradient(rgba(59,127,245,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,127,245,.04) 1px,transparent 1px);background-size:28px 28px}
      @keyframes dotPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.7}}
      .dot-pulse{animation:dotPulse 2s ease-in-out infinite}
      html{scroll-behavior:smooth}
    `;
    document.head.appendChild(el);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  const data = GUIDE[lang];

  useEffect(() => {
    let frame = 0;
    const handleScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const threshold = 130;
        let current = data.sections[0]?.id ?? "";
        for (const s of data.sections) {
          const el = document.getElementById(s.id);
          if (!el) continue;
          if (el.getBoundingClientRect().top - threshold <= 0) current = s.id;
        }
        setActiveId(current);
      });
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [data]);

  return (
    <div
      className="qa-bg min-h-screen w-full"
      style={{ background: bg, color: tx, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-6"
        style={{ height: 56, borderBottom: `1px solid ${br}`, background: dark ? "rgba(9,12,20,0.92)" : "rgba(248,249,255,0.92)", backdropFilter: "blur(8px)" }}
      >
        <Link to={logoTarget} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div style={{ border: `1.5px solid ${accent}`, borderRadius: 7, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, position: "relative", color: accent, letterSpacing: "-0.05em" }}>
            QA
            <div className="dot-pulse" style={{ position: "absolute", bottom: 3, right: 3, width: 4, height: 4, borderRadius: "50%", background: accent }} />
          </div>
          <span style={{ color: tx, fontWeight: 600, fontSize: 15, letterSpacing: "-0.02em" }}>QAgen</span>
        </Link>
        <div className="flex items-center gap-2">
          <div style={{ border: `1px solid ${br}`, borderRadius: 8, overflow: "hidden", display: "flex" }}>
            {(["hu", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="px-2.5 py-1 text-xs font-medium uppercase tracking-wider transition-colors"
                style={lang === l ? { background: accent, color: "#fff" } : { color: mu, background: "transparent", cursor: "pointer" }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => setDark((d) => !d)}
            aria-label="Toggle dark mode"
            style={{ border: `1px solid ${br}`, borderRadius: 8, padding: 6, color: su, background: "transparent", cursor: "pointer", display: "flex" }}
          >
            {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>

      <div className="mx-auto px-6 py-10 flex gap-10 items-start" style={{ maxWidth: 1120 }}>
        <nav className="hidden lg:block shrink-0" style={{ width: 220, position: "sticky", top: 80 }}>
          <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: mu }}>{data.toc}</p>
          <ul className="space-y-1">
            {data.sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block rounded-md px-3 py-1.5 text-sm transition-colors"
                  style={activeId === s.id ? { background: `${accent}18`, color: accent, fontWeight: 600 } : { color: mu }}
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight mb-10" style={{ color: tx }}>{data.pageTitle}</h1>
          <div className="space-y-14">
            {data.sections.map((s) => (
              <section key={s.id} id={s.id} className="space-y-4" style={{ scrollMarginTop: 80 }}>
                <h2 className="text-xl font-semibold" style={{ color: tx, borderBottom: `1px solid ${br}`, paddingBottom: 10 }}>{s.title}</h2>
                {s.blocks.map((b, i) => renderBlock(b, i, { accent, br, mu, tx }))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
