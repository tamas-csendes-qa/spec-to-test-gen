# QAgen

**A specifikáció értelmezése a mi dolgunk.**

QAgen is an AI-powered test case generator for software testers. Upload a specification document and get structured test cases instantly — in Hungarian or English.

## Features

- 📄 File upload: PDF, DOCX, XLSX
- 🧪 Three test case types: Quick Test, Keyword-driven, User Story
- 🔄 Guided workflow: step-by-step test case creation with progressive disclosure
- 📤 Export formats: Gherkin, Zephyr XLSX, Azure DevOps CSV
- 🔗 Confluence integration: connect and import pages directly
- 📎 Multi-document support: specification + additional context + existing test cases
- 📋 Document structure analysis: analyse and select specific topics before generation
- 🔐 Authentication: login, admin panel, per-user session and usage limits
- 🌐 Bilingual: Hungarian and English UI
- 🌙 Dark mode support
- ⚡ Powered by Claude AI (Anthropic)

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4
- **UI Components:** Radix UI, shadcn/ui, Lucide React
- **Routing:** TanStack Router
- **File processing:** pdfjs-dist (PDF), docx-parser (DOCX), ExcelJS / xlsx (XLSX)
- **AI:** Anthropic Claude API via Supabase Edge Function
- **Auth & Database:** Supabase
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
| v0.9.0 | ⏳ Planned | UX refactor, progressive disclosure workflow, Playwright placeholder, per-user feature visibility |
| v0.10.0 | ⏳ Planned | Playwright UI mapping (public apps), TestRail and Xray export |
| v1.0.0 | ⏳ Planned | Domain, production deployment |

---

# Magyar leírás

**A specifikáció értelmezése a mi dolgunk.**

A QAgen egy mesterséges intelligencia alapú teszteset-generátor szoftvertesztelőknek. Tölts fel egy specifikációs dokumentumot és azonnal kapj strukturált teszteseteket – magyarul vagy angolul.

## Funkciók

- 📄 Fájlfeltöltés: PDF, DOCX, XLSX
- 🧪 Háromféle teszteset típus: Gyors teszt, Kulcsszavas, Felhasználói igény
- 🔄 Irányított workflow: lépésről lépésre vezető teszteset készítés
- 📤 Exportálási formátumok: Gherkin, Zephyr XLSX, Azure DevOps CSV
- 🔗 Confluence integráció: oldalak közvetlen importálása
- 📎 Több dokumentum támogatás: specifikáció + kiegészítő dokumentum + meglévő tesztesetek
- 📋 Dokumentum struktúra elemzés: témák kiválasztása generálás előtt
- 🔐 Authentikáció: bejelentkezés, admin panel, felhasználónkénti session és használati limitek
- 🌐 Kétnyelvű: magyar és angol felület
- 🌙 Sötét mód támogatás
- ⚡ Claude AI (Anthropic) alapú generálás

## Technológiai stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4
- **UI komponensek:** Radix UI, shadcn/ui, Lucide React
- **Routing:** TanStack Router
- **Fájlfeldolgozás:** pdfjs-dist (PDF), docx-parser (DOCX), ExcelJS / xlsx (XLSX)
- **AI:** Anthropic Claude API, Supabase Edge Function-ön keresztül
- **Auth & Adatbázis:** Supabase
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
| v0.9.0 | ⏳ Tervezett | UX refaktor, progressive disclosure workflow, Playwright placeholder, felhasználónkénti funkció láthatóság |
| v0.10.0 | ⏳ Tervezett | Playwright UI feltérképezés (publikus appok), TestRail és Xray export |
| v1.0.0 | ⏳ Tervezett | Domain, éles deployment |
