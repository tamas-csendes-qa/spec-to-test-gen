# QAgen – Eszközök és parancsok

---

## Fejlesztői parancsok

| Parancs | Cél |
|---------|-----|
| `npm run dev` | Lokális dev szerver indítása (Vite) |
| `npm run build` | Produkciós build |
| `npm run typecheck` | TypeScript típusellenőrzés |
| `supabase functions serve` | Lokális edge function fejlesztés |
| `supabase db push` | Migrációk alkalmazása az adatbázisra |
| `supabase db pull` | Remote séma lehúzása lokálra |

---

## Supabase CLI – gyakori parancsok

### TypeScript típusok generálása DB-ből
```bash
supabase gen types typescript --project-id biomhdbyscrtpbgznlsz > src/types/database.types.ts
```

### Egy adott edge function deployolása
```bash
supabase functions deploy generate-test-cases --project-ref biomhdbyscrtpbgznlsz
supabase functions deploy confluence-proxy --project-ref biomhdbyscrtpbgznlsz
supabase functions deploy admin-create-user --project-ref biomhdbyscrtpbgznlsz
```

### Összes edge function deployolása
```bash
supabase functions deploy --project-ref biomhdbyscrtpbgznlsz
```

### Edge function lokális tesztelése
```bash
supabase functions serve generate-test-cases --env-file .env.local
```

---

## Környezeti változók

Lásd `.env.example` a teljes listáért.

| Változó | Hol él | Megjegyzés |
|---------|--------|-----------|
| `ANTHROPIC_API_KEY` | Supabase edge function env | ⚠️ SOHA ne `VITE_` prefixszel! |
| `SUPABASE_URL` | `.env` | Lehet `VITE_` prefixes, publikus adat |
| `SUPABASE_ANON_KEY` | `.env` | Lehet `VITE_` prefixes, publikus adat |
| `CONFLUENCE_ENCRYPTION_KEY` | Supabase edge function env | Token titkosításhoz |

---

## Export formátumok specifikációja

| Formátum | Fájl típus | Oszlopok / Struktúra |
|----------|-----------|----------------------|
| Gherkin | `.feature` | Standard Cucumber format (Feature / Scenario / Given-When-Then) |
| Zephyr XLSX | `.xlsx` | ID, Összefoglaló, Lépések, Elvárt eredmény |
| Azure DevOps CSV | `.csv` | Cím, Leírás, Lépések, Elvárt eredmény |
| TestRail CSV | `.csv` | Cím, Szekció, Lépések, Elvárt eredmény *(v0.10.0)* |
| Xray CSV/Excel | `.csv` / `.xlsx` | TBD *(v0.10.0)* |

---

## Railway scraper

- **Endpoint:** `https://spec-to-test-gen-production.up.railway.app`
- **Auth:** Bearer token (env változóból)
- **Hívás:**
```bash
POST /scrape
Content-Type: application/json
Authorization: Bearer <token>

{ "url": "https://your-app.example.com/feature-page" }
```

---

## Új shadcn/ui komponens hozzáadása

```bash
npx shadcn@latest add [komponens-neve]
# Példa:
npx shadcn@latest add dialog
npx shadcn@latest add data-table
```

> ⚠️ A generált komponenst ne módosítsd direktben — hozz létre egy wrapper komponenst.

---

## TanStack Router – új route hozzáadása

1. Hozz létre új fájlt a `routes/` mappában (pl. `routes/settings.tsx`)
2. A `routeTree.gen.ts` **automatikusan frissül** — ne nyúlj hozzá manuálisan
3. Route paraméterek: TanStack Router dokumentáció szerint

---

## Cloudflare Workers kompatibilitás ellenőrzése

Mielőtt új npm package-et adsz hozzá:
1. Ellenőrizd: [https://workers.cloudflare.com/works](https://workers.cloudflare.com/works)
2. Kerüld a Node.js built-in modulokat igénylő csomagokat (`fs`, `path`, `crypto` natív stb.)
3. Ha Workers-incompatible package muszáj → Railway service-re tedd (mint a scraper)
