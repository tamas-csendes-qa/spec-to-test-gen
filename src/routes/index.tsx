import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, Moon, Sun, Check } from "lucide-react";

type Lang = "hu" | "en";

const STRINGS = {
  hu: {
    tagline: "A specifikáció értelmezése a mi dolgunk.",
    title: "Válassz csomagot",
    loginBtn: "Bejelentkezés",
    contact: "Kapcsolatfelvétel",
    featured: "Ajánlott",
    month: "/hó",
    starter: {
      name: "Starter",
      desc: "Kis csapatok számára",
      features: [
        "3 felhasználó",
        "100 generálás/hó",
        "Max 50 oldal/generálás",
        "Gherkin, Zephyr XLSX, Azure CSV",
        "Confluence integráció",
      ],
      price: "45 000 HUF",
    },
    team: {
      name: "Team",
      desc: "Közepes csapatok számára",
      features: [
        "10 felhasználó",
        "300 generálás/hó",
        "Max 150 oldal/generálás",
        "Gherkin, Zephyr XLSX, Azure CSV",
        "Confluence integráció",
      ],
      price: "120 000 HUF",
    },
    pro: {
      name: "Pro",
      desc: "Nagy csapatok számára",
      features: [
        "25 felhasználó",
        "500 generálás/hó",
        "Max 500 oldal/generálás",
        "Gherkin, Zephyr XLSX, Azure CSV",
        "Confluence integráció",
        "Dokumentum struktúra elemzés",
      ],
      price: "600 000 HUF",
    },
  },
  en: {
    tagline: "Specification analysis is our business.",
    title: "Choose a plan",
    loginBtn: "Login",
    contact: "Contact us",
    featured: "Recommended",
    month: "/month",
    starter: {
      name: "Starter",
      desc: "For small teams",
      features: [
        "3 users",
        "100 generations/month",
        "Max 50 pages/generation",
        "Gherkin, Zephyr XLSX, Azure CSV",
        "Confluence integration",
      ],
      price: "45,000 HUF",
    },
    team: {
      name: "Team",
      desc: "For growing teams",
      features: [
        "10 users",
        "300 generations/month",
        "Max 150 pages/generation",
        "Gherkin, Zephyr XLSX, Azure CSV",
        "Confluence integration",
      ],
      price: "120,000 HUF",
    },
    pro: {
      name: "Pro",
      desc: "For large teams",
      features: [
        "25 users",
        "500 generations/month",
        "Max 500 pages/generation",
        "Gherkin, Zephyr XLSX, Azure CSV",
        "Confluence integration",
        "Document structure analysis",
      ],
      price: "600,000 HUF",
    },
  },
} as const;

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

  const plans = [
    { key: "starter", data: t.starter, featured: false },
    { key: "team", data: t.team, featured: true },
    { key: "pro", data: t.pro, featured: false },
  ] as const;

  return (
    <div className="min-h-screen w-full bg-background">
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

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-12 text-center">
        <p className="text-sm font-medium text-muted-foreground mb-3 tracking-wide uppercase">
          {t.tagline}
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {t.title}
        </h1>
      </section>

      {/* Pricing cards */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map(({ key, data, featured }) => (
            <div
              key={key}
              className={`relative flex flex-col rounded-2xl border p-7 transition-all ${
                featured
                  ? "border-primary bg-primary/5 shadow-lg ring-1 ring-primary/20 dark:bg-primary/10"
                  : "border-border bg-card hover:border-primary/40 hover:shadow-md"
              }`}
            >
              {featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                    {t.featured}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h2 className="text-xl font-bold text-foreground">{data.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{data.desc}</p>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold text-foreground">{data.price}</span>
                <span className="text-sm text-muted-foreground">{t.month}</span>
              </div>

              <ul className="mb-8 flex-1 space-y-2.5">
                {data.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${featured ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    <span className={featured ? "font-medium" : ""}>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="mailto:info@qagen.hu"
                className={`inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition-all ${
                  featured
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
        QAgen v0.8.0
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
        content: "QAgen: tölts fel egy specifikációt és generálj Gherkin vagy Zephyr XLSX teszteseteket másodpercek alatt.",
      },
    ],
  }),
});
