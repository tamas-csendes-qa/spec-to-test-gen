import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Moon, Sun, Check, Zap, FileDown, BookOpen, Globe } from "lucide-react";

type Lang = "hu" | "en";

const STRINGS = {
  hu: {
    loginBtn: "Bejelentkezés",
    contact: "Kapcsolatfelvétel",
    featured: "Ajánlott",
    month: "/hó",
    whyTitle: "Miért más?",
    whyFeatures: [
      "Automatizálásra kész kulcsszavas tesztesetek",
      "Zephyr és Azure DevOps közvetlen import",
      "Confluence integráció – specifikáció közvetlenül a forrásból",
      "Magyar és angol felület",
    ],
    pricingTitle: "Válassz csomagot",
    pricingTagline: "Tesztelők által fejlesztve. Tesztelőknek tervezve.",
    footer: "QAgen v0.10.0",
    plans: [
      {
        name: "Starter",
        desc: "Kis csapatok számára",
        price: "45 000 HUF",
        featured: false,
        features: [
          "3 felhasználó",
          "100 generálás/hó",
          "Max 50 oldal/generálás",
          "Gherkin, Zephyr XLSX, Azure CSV",
          "Confluence integráció",
          "Dokumentum struktúra elemzés",
        ],
      },
      {
        name: "Team",
        desc: "Közepes csapatok számára",
        price: "120 000 HUF",
        featured: true,
        features: [
          "10 felhasználó",
          "300 generálás/hó",
          "Max 150 oldal/generálás",
          "Gherkin, Zephyr XLSX, Azure CSV",
          "Confluence integráció",
          "Dokumentum struktúra elemzés",
        ],
      },
      {
        name: "Pro",
        desc: "Nagy csapatok számára",
        price: "600 000 HUF",
        featured: false,
        features: [
          "25 felhasználó",
          "500 generálás/hó",
          "Max 500 oldal/generálás",
          "Gherkin, Zephyr XLSX, Azure CSV",
          "Confluence integráció",
          "Dokumentum struktúra elemzés",
        ],
      },
    ],
  },
  en: {
    loginBtn: "Login",
    contact: "Contact us",
    featured: "Recommended",
    month: "/month",
    whyTitle: "Why different?",
    whyFeatures: [
      "Keyword-driven test cases ready for automation",
      "Direct Zephyr and Azure DevOps import",
      "Confluence integration – specification directly from the source",
      "Hungarian and English UI",
    ],
    pricingTitle: "Choose a plan",
    pricingTagline: "Built by testers. Designed for testers.",
    footer: "QAgen v0.10.0",
    plans: [
      {
        name: "Starter",
        desc: "For small teams",
        price: "45,000 HUF",
        featured: false,
        features: [
          "3 users",
          "100 generations/month",
          "Max 50 pages/generation",
          "Gherkin, Zephyr XLSX, Azure CSV",
          "Confluence integration",
          "Document structure analysis",
        ],
      },
      {
        name: "Team",
        desc: "For growing teams",
        price: "120,000 HUF",
        featured: true,
        features: [
          "10 users",
          "300 generations/month",
          "Max 150 pages/generation",
          "Gherkin, Zephyr XLSX, Azure CSV",
          "Confluence integration",
          "Document structure analysis",
        ],
      },
      {
        name: "Pro",
        desc: "For large teams",
        price: "600,000 HUF",
        featured: false,
        features: [
          "25 users",
          "500 generations/month",
          "Max 500 pages/generation",
          "Gherkin, Zephyr XLSX, Azure CSV",
          "Confluence integration",
          "Document structure analysis",
        ],
      },
    ],
  },
} as const;

const WHY_ICONS = [Zap, FileDown, BookOpen, Globe];

function LandingPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>("hu");
  const [dark, setDark] = useState(() =>
    typeof window !== 'undefined' && window.localStorage.getItem('qagen-dark-mode') === 'true'
  );

  const accent = '#3b7ff5';
  const bg   = dark ? '#090c14' : '#f8f9ff';
  const surf = dark ? '#0f1626' : '#ffffff';
  const br   = dark ? '#1e2d4a' : '#d0d8f0';
  const tx   = dark ? '#c8d8f0' : '#1a1e2e';
  const mu   = dark ? '#8aa6cf' : '#39414f';
  const su   = dark ? '#9ec4ee' : '#222838';

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem('qagen-dark-mode', String(dark));
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
    const id = 'qagen-styles';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = `
      .qa-bg{background-image:linear-gradient(rgba(59,127,245,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,127,245,.04) 1px,transparent 1px);background-size:28px 28px}
      @keyframes dotPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.7}}
      .dot-pulse{animation:dotPulse 2s ease-in-out infinite}
    `;
    document.head.appendChild(el);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  const t = STRINGS[lang];

  return (
    <div
      className="qa-bg min-h-screen w-full"
      style={{ background: bg, color: tx, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-20"
        style={{ borderBottom: `1px solid ${br}`, background: dark ? 'rgba(9,12,20,0.92)' : 'rgba(248,249,255,0.92)', backdropFilter: 'blur(8px)' }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6" style={{ height: 56 }}>
          <div className="flex items-center gap-2.5">
            <div style={{ border: `1.5px solid ${accent}`, borderRadius: 7, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, position: 'relative', color: accent, letterSpacing: '-0.05em' }}>
              QA
              <div className="dot-pulse" style={{ position: 'absolute', bottom: 3, right: 3, width: 4, height: 4, borderRadius: '50%', background: accent }} />
            </div>
            <span style={{ color: tx, fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>QAgen</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ border: `1px solid ${br}`, borderRadius: 8, overflow: 'hidden', display: 'flex' }}>
              {(['hu', 'en'] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className="px-2.5 py-1 text-xs font-medium uppercase tracking-wider transition-colors"
                  style={lang === l ? { background: accent, color: '#fff' } : { color: mu, background: 'transparent', cursor: 'pointer' }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setDark((d) => !d)}
              aria-label="Toggle dark mode"
              style={{ border: `1px solid ${br}`, borderRadius: 8, padding: 6, color: su, background: 'transparent', cursor: 'pointer', display: 'flex' }}
            >
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => void navigate({ to: "/login" })}
              className="h-8 px-4 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80"
              style={{ background: accent, border: 'none', cursor: 'pointer' }}
            >
              {t.loginBtn}
            </button>
          </div>
        </div>
      </header>

      {/* Why different section */}
      <section style={{ borderBottom: `1px solid ${br}` }}>
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="mb-8 text-center">
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: mu }}>{t.whyTitle}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.whyFeatures.map((feature, i) => {
              const Icon = WHY_ICONS[i];
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl px-4 py-4 transition-opacity hover:opacity-90"
                  style={{ border: `1px solid ${br}`, background: surf }}
                >
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${accent}18`, color: accent }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-sm font-medium leading-snug" style={{ color: tx }}>{feature}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing section */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: tx }}>{t.pricingTitle}</h1>
          <p className="mt-3 text-sm" style={{ color: mu }}>{t.pricingTagline}</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {t.plans.map((plan) => (
            <div
              key={plan.name}
              className="relative flex flex-col rounded-xl p-7 transition-all"
              style={{
                border: `1px solid ${plan.featured ? accent : br}`,
                background: plan.featured ? (dark ? '#0d1a38' : '#eff3ff') : surf,
                boxShadow: plan.featured ? `0 4px 24px ${accent}28` : 'none',
              }}
            >
              {plan.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
                    style={{ background: accent }}
                  >
                    {t.featured}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h2 className="text-lg font-semibold" style={{ color: tx }}>{plan.name}</h2>
                <p className="mt-1 text-sm" style={{ color: mu }}>{plan.desc}</p>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-semibold" style={{ color: tx }}>{plan.price}</span>
                <span className="text-sm ml-1" style={{ color: mu }}>{t.month}</span>
              </div>

              <ul className="mb-8 flex-1 space-y-2.5">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: tx }}>
                    <span
                      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `${accent}22`, color: accent }}
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    <span className={plan.featured ? "font-medium" : ""}>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="mailto:info@qagen.hu"
                className="inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
                style={plan.featured
                  ? { background: accent, color: '#fff', border: 'none' }
                  : { border: `1px solid ${br}`, background: 'transparent', color: tx }}
              >
                {t.contact}
              </a>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-6 text-center text-xs" style={{ borderTop: `1px solid ${br}`, color: mu }}>
        {t.footer}
      </footer>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "QAgen – Tesztesetek generálása specifikációból" },
      {
        name: "description",
        content:
          "QAgen: tölts fel egy specifikációt és generálj Gherkin vagy Zephyr XLSX teszteseteket másodpercek alatt.",
      },
    ],
  }),
});
