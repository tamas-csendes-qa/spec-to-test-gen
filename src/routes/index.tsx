import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, Moon, Sun, Check, Zap, FileDown, BookOpen, Globe } from "lucide-react";

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
    footer: "QAgen v0.8.0",
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
        price: "200 000 HUF",
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
    footer: "QAgen v0.8.0",
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
  const [dark, setDark] = useState(false);

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

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">QAgen</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang((l) => (l === "hu" ? "en" : "hu"))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-base leading-none transition-colors hover:bg-accent"
              aria-label="Switch language"
            >
              <span aria-hidden>{lang === "hu" ? "🇭🇺" : "🇬🇧"}</span>
            </button>
            <button
              onClick={() => setDark((d) => !d)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-accent"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => void navigate({ to: "/login" })}
              className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t.loginBtn}
            </button>
          </div>
        </div>
      </header>

      {/* Why different section */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t.whyTitle}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.whyFeatures.map((feature, i) => {
              const Icon = WHY_ICONS[i];
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-primary/40"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-sm font-medium leading-snug text-foreground">{feature}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing section */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t.pricingTitle}
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            {t.pricingTagline}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {t.plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-7 transition-all ${
                plan.featured
                  ? "border-primary bg-primary/5 shadow-lg ring-1 ring-primary/20 dark:bg-primary/10"
                  : "border-border bg-card hover:border-primary/40 hover:shadow-md"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                    {t.featured}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{t.month}</span>
              </div>

              <ul className="mb-8 flex-1 space-y-2.5">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                        plan.featured
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    <span className={plan.featured ? "font-medium" : ""}>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="mailto:info@qagen.hu"
                className={`inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition-all ${
                  plan.featured
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    : "border border-border bg-background text-foreground hover:bg-accent hover:border-primary/50"
                }`}
              >
                {t.contact}
              </a>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
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
