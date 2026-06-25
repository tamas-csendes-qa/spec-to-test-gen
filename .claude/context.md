# QAgen – Projekt kontextus

**"A specifikáció értelmezése a mi dolgunk."**

AI-alapú teszteset generátor szoftvertesztelőknek. A felhasználó feltölt egy specifikációs
dokumentumot, és strukturált teszteseteket kap vissza – magyarul vagy angolul.

**Célcsoport:** QA mérnökök közép- és nagyvállalatoknál (banki, fintech, enterprise szektor)

**Jelenlegi verzió: v0.13.0 – MVP funkciók mind készen, v1.0.0 (production) előtt állunk**

---

## Tech Stack

| Réteg | Technológia |
|-------|-------------|
| Frontend | React 19, TypeScript, Tailwind CSS v4 |
| UI komponensek | Radix UI, shadcn/ui, Lucide React |
| Routing | TanStack Router (TanStack Start) |
| Build | Vite 7 + Cloudflare plugin |
| AI | Anthropic Claude API – Supabase Edge Function-ön keresztül |
| Auth + DB | Supabase |
| Fájlfeldolgozás | pdfjs-dist (PDF), docx-parser (DOCX), ExcelJS + xlsx (XLSX) |
| Export | ExcelJS (Zephyr XLSX), xlsx (Azure CSV / TestRail CSV / Xray CSV), Gherkin (szöveges) |
| Form kezelés | react-hook-form + zod |
| State/Query | TanStack Query |

---

## Supabase Edge Functions

| Függvény neve | Feladata |
|---------------|----------|
| `generate-test-cases` | Anthropic Claude API hívás – teszteset generálás |
| `confluence-proxy` | Confluence API hívás – oldalak lekérése |
| `admin-create-user` | Admin felületről új felhasználó létrehozása |

**Supabase projekt ref:** `biomhdbyscrtpbgznlsz`

---

## Kész funkciók (v0.13.0)

- Fájlfeltöltés: PDF, DOCX, XLSX
- Teszteset típusok: Gyors teszt, Kulcsszavas, Felhasználói igény
- Export: Gherkin, Zephyr XLSX, Azure DevOps CSV, TestRail CSV, Xray CSV
- Confluence integráció (több oldal támogatás), per-user Confluence token (titkosítva tárolva)
- Több dokumentum: spec + kiegészítő + meglévő tesztesetek
- Dokumentum struktúra elemzés + téma kiválasztás (chunking)
- 4-lépéses progressive disclosure workflow
- Authentikáció, admin panel, per-user feature flag-ek, session limit, usage logging
- Cost tracking admin panelben
- User Guide oldal
- Playwright UI feltérképezés (Railway-hosztolt scraper)
- Landing page árakkal, kétnyelvű UI (HU/EN), dark mode (perzisztens)

---

## Árazás

| Csomag | Ár/hó | Felhasználók | Generálás | Confluence oldalak |
|--------|-------|--------------|-----------|-------------------|
| Starter | 45 000 HUF | 3 | 100/hó | 50/hó |
| Team | 120 000 HUF | 10 | 300/hó | 150/hó |
| Pro | 600 000 HUF | 25 | 500/hó | 500/hó |

---

## Kritikus biztonsági szabályok

- ⚠️ Az Anthropic API key **SOHA nem kerülhet frontend kódba** — kizárólag `generate-test-cases` edge functionön keresztül
- ⚠️ **SOHA ne használj `VITE_` prefixet** az `ANTHROPIC_API_KEY`-hez — a frontend bundle-be kerül
- RLS be van kapcsolva — minden DB művelethez megfelelő policy szükséges
- Confluence token: felhasználónként titkosítva tárolva a DB-ben

---

## Fontos technikai korlátok

- **Cloudflare Workers runtime** — nem Node.js, új dependency előtt mindig ellenőrizd a Workers kompatibilitást
- **pdfjs-dist** — worker fájl külön kezelés kell Vite-ban (`vite.config.ts`)
- **TanStack Router** — `routeTree.gen.ts` automatikusan generálódik, ne nyúlj hozzá manuálisan
- **Playwright** — nem futhat Cloudflare Workers-ön, ezért külön Railway service-en van

---

## Infrastruktúra

- **GitHub:** `github.com/tamas-csendes-qa/qagen`
- **Supabase ref:** `biomhdbyscrtpbgznlsz`
- **Railway scraper:** `https://spec-to-test-gen-production.up.railway.app`
  - Auth: Bearer token env változóból
  - Hívás: `POST /scrape`, body: `{ url: string }`
