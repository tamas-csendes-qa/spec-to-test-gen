# QAgen – Memória napló

> Ez a fájl dinamikusan bővül. Minden megoldott bug, architekturális döntés és elvetett
> megközelítés ide kerül, hogy ne ismételjük meg a hibákat.

---

## Verziótörténet (összefoglaló)

| Verzió | Státusz | Leírás |
|--------|---------|--------|
| v0.1.0 | ✅ Kész | UI, fájlfeltöltés, mock output |
| v0.2.0 | ✅ Kész | Claude API integráció, Edge Function |
| v0.3.0 | ✅ Kész | Tab struktúra, role-based system promptok, letöltések, Azure CSV |
| v0.4.0 | ✅ Kész | User Story textarea, alapértelmezett formátumok, tagline, bugjavítások |
| v0.5.0 | ✅ Kész | Logo, publish, első demo |
| v0.6.0 | ✅ Kész | Login, autentikáció, admin panel, session limit, usage logging, multi-doc feltöltés |
| v0.7.0 | ✅ Kész | Confluence API integráció, oldal kiválasztás modal, több oldal támogatás |
| v0.8.0 | ✅ Kész | Dokumentum struktúra elemzés, téma kiválasztás, chunking, landing page árakkal |
| v0.9.0 | ✅ Kész | Migráció Claude Code-ra, új Supabase projekt, stabilitási javítások |
| v0.10.0 | ✅ Kész | Playwright UI feltérképezés (publikus appok), Railway szerver deployment |
| v0.11.0 | ✅ Kész | UX refaktor – progressive disclosure workflow, generálási beállítások panel, per-user feature láthatóság |
| v0.12.0 | ✅ Kész | Új design system, tipográfia szabványosítás, dark mode perzisztencia, login és landing page újratervezés |
| v0.13.0 | ✅ Kész | TestRail CSV export, Xray CSV export, cost tracking admin panelben, User Guide oldal |
| v0.14.0 | ✅ Kész | Biztonsági megerősítés, cég-szintű RLS, cégenként konfigurálható export formátumok, admin panel fejlesztések |

**Jelenlegi állapot: v0.14.0 – a tervezett MVP funkciók mind elkészültek.**

---

## Megoldott problémák

### Supabase API kulcs formátum
- **Probléma:** Az új Supabase API kulcs formátum (sb- prefix) eltörte a klienst
- **Megoldás:** A legacy `eyJ...` JWT formátumot kell használni
- **Státusz:** Megoldva

### VITE_ prefix biztonsági probléma
- **Probléma:** `VITE_ANTHROPIC_API_KEY` használata esetén a kulcs bekerül a frontend bundle-be
- **Szabály:** Az Anthropic API key-t SOHA nem szabad `VITE_` prefixszel ellátni
- **Megoldás:** Kizárólag Supabase Edge Function környezeti változóban él
- **Státusz:** Megoldva

### pdfjs-dist Vite worker konfiguráció
- **Probléma:** PDF feldolgozáshoz a worker fájlt külön kell kezelni, különben Vite build hibát dob
- **Megoldás:** `vite.config.ts`-ben explicit worker konfiguráció szükséges
- **Státusz:** Megoldva

### Playwright Workers-inkompatibilitás
- **Probléma:** Playwright nem futtatható Cloudflare Workers runtime-on (Node.js dependency)
- **Megoldás:** Külön Railway service-re került (v0.10.0)
- **Státusz:** Megoldva

---

## Architekturális döntések

### Cég-szintű RLS (company-scoped) – sor-szintű helyett
- **Döntés:** company-scoped RLS az elfogadott megközelítés
- **Ok:** Sor-szintű RLS jelenlegi igényekhez túl granulális, skálánál teljesítményproblémát okozna

### Confluence token titkosítás
- **Döntés:** Per-user Confluence token titkosítva tárolódik a DB-ben, nem plaintext
- **Ok:** Biztonsági követelmény, enterprise ügyfelek elvárása

### Progressive disclosure workflow (4 lépés)
- **Döntés:** A generálási folyamat 4 lépésre van bontva
- **Ok:** Sok opció egyszerre megzavarja a felhasználókat
- **Verzió:** v0.11.0-tól éles

### Railway scraper – külön service
- **Döntés:** A Playwright-alapú scraper külön Railway service-en fut, nem Supabase edge functionön
- **Ok:** Cloudflare Workers runtime nem támogatja a Playwright-ot

---

## Elvetett megközelítések

### Cypress / Selenium
- **Ok:** Projekt Playwrightra standardizált, mindkettő értékelés után elvetésre került
- **Ne javasolj ilyet újra**

### Anthropic API közvetlen frontend hívás
- **Ok:** Biztonsági kockázat — API key kiexponálódna a böngészőben
- **Elfogadott megoldás:** Kizárólag `generate-test-cases` edge functionön keresztül

---

## Következő lépések (v1.0.0 felé)

- [ ] Domain beállítása
- [ ] Éles production deployment
- [ ] Egyéb: TBD az aktuális session elején add meg Tominak

---

## Napló – frissítési útmutató

Minden session után, ahol valami fontosat megoldottunk vagy döntöttünk:

```
### [Dátum] – [Rövid cím]
- **Probléma/Kérdés:** ...
- **Megoldás/Döntés:** ...
- **Státusz:** Megoldva / Elvetett / Függőben
```
