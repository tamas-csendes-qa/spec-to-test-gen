# QAgen

**Specifikációból tesztesetek – másodpercek alatt**

QAgen is an AI-powered test case generator for software testers. Upload a specification document and get structured test cases instantly — in Hungarian or English.

## Features

- 📄 File upload: PDF, DOCX, XLSX (max 30 pages)
- 🧪 Three test case types: Quick Test, Keyword-driven, User Story
- 📤 Export formats: Gherkin, Zephyr XLSX
- 🌐 Bilingual: Hungarian and English UI
- 🌙 Dark mode support
- ⚡ Powered by Claude AI (Anthropic)

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4
- **UI Components:** Radix UI, shadcn/ui, Lucide React
- **Routing:** TanStack Router
- **File processing:** pdfjs-dist (PDF), docx-parser (DOCX), ExcelJS / xlsx (XLSX)
- **AI:** Anthropic Claude API via Supabase Edge Function
- **Build:** Vite 7

## Status

## Status

| Version | Status | Description |
|---------|--------|-------------|
| v0.1.0 | ✅ Done | UI, file upload, mock output |
| v0.2.0 | ✅ Done | Claude API integration, Edge Function |
| v0.3.0 | ✅ Done | Tab structure, role-based system prompts, downloads, Azure CSV |
| v0.4.0 | ✅ Done | User Story textarea, default formats, tagline, bug fixes |

---

# Magyar leírás

**Specifikációból tesztesetek – másodpercek alatt**

A QAgen egy mesterséges intelligencia alapú teszteset-generátor szoftvertesztelőknek. Tölts fel egy specifikációs dokumentumot és azonnal kapj strukturált teszteseteket – magyarul vagy angolul.

## Funkciók

- 📄 Fájlfeltöltés: PDF, DOCX, XLSX (max 30 oldal)
- 🧪 Háromféle teszteset típus: Gyors teszt, Kulcsszavas, Felhasználói igény
- 📤 Exportálási formátumok: Gherkin, Zephyr XLSX
- 🌐 Kétnyelvű: magyar és angol felület
- 🌙 Sötét mód támogatás
- ⚡ Claude AI (Anthropic) alapú generálás

## Technológiai stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4
- **UI komponensek:** Radix UI, shadcn/ui, Lucide React
- **Routing:** TanStack Router
- **Fájlfeldolgozás:** pdfjs-dist (PDF), docx-parser (DOCX), ExcelJS / xlsx (XLSX)
- **AI:** Anthropic Claude API, Supabase Edge Function-ön keresztül
- **Build:** Vite 7

## Állapot

| Verzió | Státusz | Leírás |
|--------|---------|--------|
| v0.1.0 | ✅ Kész | Felület, fájlfeltöltés, mock kimenet |
| v0.2.0 | ✅ Kész | Claude API integráció, Edge Function |
| v0.3.0 | ✅ Kész | Tab struktúra, szerepkör alapú system promptok, letöltések, Azure CSV |
| v0.4.0 | ✅ Kész | User Story szövegdoboz, alapértelmezett formátumok, szlogen, hibajavítások |
