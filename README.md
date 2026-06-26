# QAgen

**A specifikáció értelmezése a mi dolgunk.**

QAgen is an AI-powered test case generator for software testers. Upload a specification document and get structured test cases instantly — in Hungarian or English.

## Features

- 📄 File upload: PDF, DOCX, XLSX
- 🧪 Three test case types: Overview Test, Keyword-driven, User Story
- 🔄 Guided workflow: step-by-step test case creation with progressive disclosure
- 📤 Export formats: Gherkin, Zephyr XLSX, Azure DevOps CSV, TestRail CSV, Xray CSV
- 🔗 Confluence integration: connect and import pages directly
- 🌐 Playwright UI mapping: scrape real UI element names from public apps (Railway)
- 📎 Multi-document support: specification + additional context + existing test cases
- 📋 Document structure analysis: analyse and select specific topics before generation
- ⚙️ Generation settings: control test case types, focus areas, priority and count
- 🔐 Authentication: login, admin panel, per-user session and usage limits, feature flags
- 🛡️ Security: JWT auth on all edge functions, server-side rate limiting, SSRF protection, encrypted Confluence tokens, CORS allowlist
- 🏢 Multi-tenant: company-scoped RLS, per-company export format restrictions
- 🔁 Real-time settings: UI updates instantly when admin changes per-user feature flags
- 📖 User Guide: built-in bilingual documentation
- 🌐 Bilingual: Hungarian and English UI
- 🌙 Dark mode support (persistent)
- ⚡ Powered by Claude AI (Anthropic)

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4
- **UI Components:** Radix UI, shadcn/ui, Lucide React
- **Routing:** TanStack Router
- **File processing:** pdfjs-dist (PDF), docx-parser (DOCX), ExcelJS / xlsx (XLSX)
- **AI:** Anthropic Claude API via Supabase Edge Function
- **Auth & Database:** Supabase
- **Playwright Server:** Node.js/Express on Railway
- **Build:** Vite 7

## Status

| Version | Status | Description |
|---------|--------|-------------|
| v0.1.0 | ✅ Done | UI, file upload, mock output |
| v0.2.0 | ✅ Done | Claude API integration, Edge Function |
| v0.3.0 | ✅ Done | Tab structure, role-based system prompts, downloads, Azure CSV |
| v0.4.0 | ✅ Done | User Story textarea, default formats, tagline, bug fixes |
| v0.5.0 | ✅ Done | Logo, publish, first demo |
| v0.6.0 | ✅ Done | Login, authentication, admin panel, concurrent session limit, usage logging, multi-document upload, existing test case expansion |
| v0.7.0 | ✅ Done | Confluence API integration, page selection modal, multi-page support |
| v0.8.0 | ✅ Done | Document structure analysis, topic selection, chunking support, landing page with pricing |
| v0.9.0 | ✅ Done | Migrated to Claude Code, new Supabase project, stability fixes |
| v0.10.0 | ✅ Done | Playwright UI mapping (public apps), Railway server deployment |
| v0.11.0 | ✅ Done | UX refactor – progressive disclosure workflow, generation settings panel, per-user feature visibility |
| v0.12.0 | ✅ Done | New design system, typography standardisation, dark mode persistence, login and landing page redesign |
| v0.13.0 | ✅ Done | TestRail CSV export, Xray CSV export, cost tracking in admin panel, User Guide page |
| v0.14.0 | ✅ Done | Security hardening (JWT, SSRF, CORS, encryption), company-scoped RLS, per-company export formats, admin panel improvements |
| v1.0.0 | ⏳ Planned | Domain, production deployment, Stripe payments |

---

# Magyar leírás

**A specifikáció értelmezése a mi dolgunk.**

A QAgen egy mesterséges intelligencia alapú teszteset-generátor szoftvertesztelőknek. Tölts fel egy specifikációs dokumentumot és azonnal kapj strukturált teszteseteket – magyarul vagy angolul.

## Funkciók

- 📄 Fájlfeltöltés: PDF, DOCX, XLSX
- 🧪 Háromféle teszteset típus: Áttekintő teszt, Kulcsszavas, Felhasználói igény
- 🔄 Irányított workflow: lépésről lépésre vezető teszteset készítés
- 📤 Exportálási formátumok: Gherkin, Zephyr XLSX, Azure DevOps CSV, TestRail CSV, Xray CSV
- 🔗 Confluence integráció: oldalak közvetlen importálása
- 🌐 Playwright UI feltérképezés: valódi UI elemnevek kinyerése publikus appokból (Railway)
- 📎 Több dokumentum támogatás: specifikáció + kiegészítő dokumentum + meglévő tesztesetek
- 📋 Dokumentum struktúra elemzés: témák kiválasztása generálás előtt
- ⚙️ Generálási beállítások: teszteset típus, fókuszterület, prioritás és darabszám vezérlése
- 🔐 Authentikáció: bejelentkezés, admin panel, felhasználónkénti session és használati limitek, funkció kapcsolók
- 🛡️ Biztonság: JWT auth minden edge functionön, szerver oldali rate limiting, SSRF védelem, titkosított Confluence tokenek, CORS allowlist
- 🏢 Multi-tenant: cég-szintű RLS, cégenként konfigurálható export formátumok
- 🔁 Valós idejű beállítások: az admin által módosított funkció kapcsolók azonnal frissülnek
- 📖 Felhasználói útmutató: beépített kétnyelvű dokumentáció
- 🌐 Kétnyelvű: magyar és angol felület
- 🌙 Sötét mód támogatás (perzisztens)
- ⚡ Claude AI (Anthropic) alapú generálás

## Technológiai stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4
- **UI komponensek:** Radix UI, shadcn/ui, Lucide React
- **Routing:** TanStack Router
- **Fájlfeldolgozás:** pdfjs-dist (PDF), docx-parser (DOCX), ExcelJS / xlsx (XLSX)
- **AI:** Anthropic Claude API, Supabase Edge Function-ön keresztül
- **Auth & Adatbázis:** Supabase
- **Playwright szerver:** Node.js/Express, Railway-en deployolva
- **Build:** Vite 7

## Állapot

| Verzió | Státusz | Leírás |
|--------|---------|--------|
| v0.1.0 | ✅ Kész | Felület, fájlfeltöltés, mock kimenet |
| v0.2.0 | ✅ Kész | Claude API integráció, Edge Function |
| v0.3.0 | ✅ Kész | Tab struktúra, szerepkör alapú system promptok, letöltések, Azure CSV |
| v0.4.0 | ✅ Kész | User Story szövegdoboz, alapértelmezett formátumok, szlogen, hibajavítások |
| v0.5.0 | ✅ Kész | Logo, publish, első megmutatás |
| v0.6.0 | ✅ Kész | Login, authentikáció, admin panel, concurrent session limit, usage logging, több dokumentum feltöltés, meglévő tesztesetek bővítése |
| v0.7.0 | ✅ Kész | Confluence API integráció, oldalkiválasztó modal, több oldal támogatás |
| v0.8.0 | ✅ Kész | Dokumentum struktúra elemzés, téma kiválasztás, chunking támogatás, landing page csomagokkal |
| v0.9.0 | ✅ Kész | Átköltözés Claude Code-ba, új Supabase projekt, stabilitási javítások |
| v0.10.0 | ✅ Kész | Playwright UI feltérképezés (publikus appok), Railway szerver deployment |
| v0.11.0 | ✅ Kész | UX refaktor – progressive disclosure workflow, generálási beállítások panel, felhasználónkénti funkció láthatóság |
| v0.12.0 | ✅ Kész | Új design rendszer, tipográfia egységesítés, dark mode perzisztencia, login és landing page újratervezés |
| v0.13.0 | ✅ Kész | TestRail CSV export, Xray CSV export, költségkövetés admin panelen, felhasználói útmutató oldal |
| v0.14.0 | ✅ Kész | Biztonsági megerősítés (JWT, SSRF, CORS, titkosítás), cég-szintű RLS, cégenként konfigurálható export formátumok, admin panel fejlesztések |
| v1.0.0 | ⏳ Tervezett | Domain, éles deployment, Stripe fizetés |
