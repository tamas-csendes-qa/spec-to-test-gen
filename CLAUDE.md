# QAgen – Claude Code kontextus

**"A specifikáció értelmezése a mi dolgunk."**

AI-alapú teszteset generátor szoftvertesztelőknek. Felhasználó feltölt egy specifikációs
dokumentumot, és strukturált teszteseteket kap vissza – magyarul vagy angolul.

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
| Export | ExcelJS (Zephyr XLSX), xlsx (Azure CSV), Gherkin (szöveges) |
| Form kezelés | react-hook-form + zod |
| State/Query | TanStack Query |

---

## Supabase Edge Functions

| Függvény neve | Feladata |
|---------------|----------|
| `generate-test-cases` | Anthropic Claude API hívás – teszteset generálás |
| `confluence-proxy` | Confluence API hívás – oldalak lekérése |
| `admin-create-user` | Admin felületről új felhasználó létrehozása |

---

## Jelenlegi állapot

| Verzió | Státusz | Leírás |
|--------|---------|--------|
| v0.9.0 | ✅ Kész | UX refaktor, progressive disclosure, admin toggle-ok, Playwright placeholder |
| v0.10.0 | ⏳ Következő | Playwright UI feltérképezés, TestRail CSV, Xray CSV/Excel export |
| v1.0.0 | ⏳ Tervezett | Domain, éles production deployment |

### Kész funkciók
- Fájlfeltöltés: PDF, DOCX, XLSX
- Teszteset típusok: Gyors teszt, Kulcsszavas, Felhasználói igény
- Export: Gherkin, Zephyr XLSX, Azure DevOps CSV
- Confluence integráció (több oldal támogatás)
- Több dokumentum: spec + kiegészítő + meglévő tesztesetek
- Dokumentum struktúra elemzés + téma kiválasztás (chunking)
- Authentikáció, admin panel, session limit, usage logging
- Landing page árakkal, kétnyelvű UI, dark mode

---

## Árazás

| Csomag | Ár/hó |
|--------|-------|
| Starter | 45 000 HUF |
| Team | 120 000 HUF |
| Pro | 600 000 HUF |

---

## Fejlesztési konvenciók

### Általános
- **TypeScript strict** – ne használj `any`-t indok nélkül
- **Komponensek:** shadcn/ui alapra építs, Radix UI primitíveket használj
- **Stílus:** Tailwind v4 utility class-ok, ne írj custom CSS-t ha elkerülhető
- **Routing:** TanStack Router file-based (`routes/` mappa) – ne módosítsd a `routeTree.gen.ts`-t manuálisan
- **Import:** `~/` path alias a `src/`-re

### Supabase
- Az Anthropic API key **soha nem kerül frontend kódba** – csak `generate-test-cases` edge functionön keresztül
- Supabase hívások: mindig kezeld az `error` return értéket
- RLS be van kapcsolva – minden DB művelethez megfelelő policy kell

### Komponens struktúra
- Kis, egyetlen felelősségű komponensek
- shadcn/ui komponenseket ne módosítsd direktben – wrap-eld őket

### Hibakezelés
- Loading state + error state mindig legyen a UI-ban
- Toast: `sonner` könyvtár (`toast.success`, `toast.error`)

---

## Fontos tudnivalók

- **Cloudflare Workers** – nem Node.js runtime, új dependency előtt ellenőrizd a Workers kompatibilitást
- **pdfjs-dist** – worker fájl külön kezelés kell Vite-ban (`vite.config.ts`)
- **TanStack Router** – `routeTree.gen.ts` automatikusan generálódik, ne nyúlj hozzá

---

## Együttműködési szabályok

1. Tomi ötletet ad, Claude implementál – működő kód a cél, ne magyarázat
2. Kisebb komponensnél mutasd meg a teljes fájlt, ne csak a diff-et
3. Ha a struktúrából valami nem világos, kérdezz rá mielőtt implementálsz
4. Változónevek, kommentek, minden kód angolul
5. A kód legyen Playwright-tal tesztelhető (ez a hosszú távú cél)
