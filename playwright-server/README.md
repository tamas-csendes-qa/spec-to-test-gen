# playwright-server

Playwright scraping microservice for QAgen. Accepts a list of URLs and returns structured UI data extracted from each page: titles, input fields, buttons, navigation items, and headings.

---

## API

### `GET /health`

Returns `{ "status": "ok" }`. Use this as a Railway health check endpoint.

### `POST /scrape`

**Request body**

```json
{
  "urls": [
    "https://example.com",
    "https://app.example.com/login"
  ]
}
```

- `urls` – required, array of strings, max 10 items, must be valid `http://` or `https://` URLs

**Response**

```json
{
  "results": [
    {
      "url": "https://example.com",
      "success": true,
      "title": "Example Domain",
      "inputs": [
        { "type": "email", "name": "email", "label": "Email address" }
      ],
      "buttons": ["Sign in", "Forgot password?"],
      "navItems": ["Home", "Pricing", "Docs"],
      "headings": [
        { "level": "h1", "text": "Welcome back" },
        { "level": "h2", "text": "Sign in to your account" }
      ]
    },
    {
      "url": "https://broken.example.com",
      "success": false,
      "error": "net::ERR_NAME_NOT_RESOLVED"
    }
  ]
}
```

**Authentication (optional)**

Set `API_KEY` environment variable on the server. When set, every request must include:

```
Authorization: Bearer <your-api-key>
```

---

## Local development

```bash
cd playwright-server
npm install
npx playwright install chromium
npm run dev
```

Test with curl:

```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://example.com"]}'
```

---

## Deploy to Railway

### 1. Create a new Railway project

Go to [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo**.

Select the repository. Railway will detect the `Dockerfile` inside `playwright-server/` automatically if you set the root directory — see step 2.

### 2. Set the root directory

In the Railway service settings → **Source** → set **Root Directory** to:

```
playwright-server
```

This tells Railway to build from `playwright-server/Dockerfile` instead of the repo root.

### 3. Configure environment variables

In the service settings → **Variables**, add:

| Variable | Value | Required |
|----------|-------|----------|
| `API_KEY` | a random secret string | Optional but recommended |

`PORT` is set automatically by Railway — do not override it.

### 4. Set the health check path

In service settings → **Networking** → **Health Check Path**, enter:

```
/health
```

### 5. Deploy

Railway builds the Docker image using the official `mcr.microsoft.com/playwright` base image, which includes Chromium and all system dependencies. No additional setup is needed.

After deploy, Railway provides a public URL (e.g. `https://playwright-server-production.up.railway.app`). Store it as an environment variable in the main QAgen app:

```
VITE_PLAYWRIGHT_SERVER_URL=https://playwright-server-production.up.railway.app
```

Or reference it from the `generate-test-cases` Supabase Edge Function via a secret:

```
PLAYWRIGHT_SERVER_URL=https://playwright-server-production.up.railway.app
PLAYWRIGHT_SERVER_API_KEY=<same value as API_KEY above>
```

---

## Notes

- Pages are loaded with `waitUntil: "domcontentloaded"` plus a 1.5 s pause to allow JS-rendered content to appear.
- Each URL in a request is scraped in parallel.
- Navigation timeout: 30 s per page. If a page exceeds this, that result will have `"success": false`.
- The server launches a single Chromium instance per request and closes it when done.
