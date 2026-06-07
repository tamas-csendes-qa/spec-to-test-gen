const express = require("express");
const { chromium } = require("playwright");

// Prevent unexpected errors from killing the process
process.on("uncaughtException", (err) => {
  console.error("[process] uncaughtException:", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("[process] unhandledRejection:", reason);
});

const app = express();
app.use(express.json({ limit: "1mb" }));

const MAX_URLS = 10;
const NAV_TIMEOUT = 30_000;
const EVAL_TIMEOUT = 15_000;
const BROWSER_IDLE_MS = 5 * 60 * 1000;

// Optional bearer-token auth – set API_KEY env var to enable
const API_KEY = process.env.API_KEY ?? null;

function authMiddleware(req, res, next) {
  if (!API_KEY) return next();
  const header = req.headers.authorization ?? "";
  if (header !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── Lazy browser singleton ──────────────────────────────────────────────────
let browser = null;
let browserLastUsed = 0;
let browserInitializing = false;

async function getBrowser() {
  if (browser && browser.isConnected()) {
    browserLastUsed = Date.now();
    return browser;
  }
  // Wait if another request is already launching the browser
  if (browserInitializing) {
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (!browserInitializing) { clearInterval(interval); resolve(); }
      }, 100);
    });
    if (browser && browser.isConnected()) {
      browserLastUsed = Date.now();
      return browser;
    }
  }
  browserInitializing = true;
  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    browserLastUsed = Date.now();
    console.log("[browser] launched");
  } finally {
    browserInitializing = false;
  }
  return browser;
}

// Close browser after idle period to reclaim memory
setInterval(async () => {
  if (browser && browser.isConnected() && Date.now() - browserLastUsed > BROWSER_IDLE_MS) {
    console.log("[browser] closing due to inactivity");
    await browser.close().catch(() => {});
    browser = null;
  }
}, 60_000);

// ── Routes ──────────────────────────────────────────────────────────────────

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/scrape", authMiddleware, async (req, res) => {
  const { urls } = req.body ?? {};

  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: "Body must contain a non-empty urls array" });
  }
  if (urls.length > MAX_URLS) {
    return res.status(400).json({ error: `Maximum ${MAX_URLS} URLs per request` });
  }

  const invalid = urls.filter((u) => {
    try { new URL(u); return false; } catch { return true; }
  });
  if (invalid.length > 0) {
    return res.status(400).json({ error: "Invalid URLs detected", invalid });
  }

  let b;
  try {
    b = await getBrowser();
    const results = await Promise.all(urls.map((url) => scrapeUrl(b, url)));
    res.json({ results });
  } catch (err) {
    console.error("[scrape] error:", err.message);
    // Reset browser on error so next request gets a fresh one
    if (browser) { await browser.close().catch(() => {}); browser = null; }
    res.status(500).json({ error: "Browser error", details: err.message });
  }
});

async function scrapeUrl(b, url) {
  const page = await b.newPage();
  page.setDefaultNavigationTimeout(NAV_TIMEOUT);
  page.setDefaultTimeout(EVAL_TIMEOUT);

  try {
    await page.goto(url, { waitUntil: "load" });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const data = await page.evaluate(() => {
      const title = document.title;
      const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

      const inputEls = Array.from(
        document.querySelectorAll('input:not([type="hidden"]), textarea, select')
      );
      const inputs = inputEls
        .map((el) => {
          const id = el.getAttribute("id");
          const name = el.getAttribute("name");
          const type = el.getAttribute("type") ?? el.tagName.toLowerCase();
          const ariaLabel = el.getAttribute("aria-label");
          const ariaLabelledBy = el.getAttribute("aria-labelledby");
          const placeholder = el.getAttribute("placeholder");

          let labelText = null;
          if (id) {
            const labelEl = document.querySelector(`label[for="${id}"]`);
            if (labelEl) labelText = labelEl.innerText.trim();
          }
          if (!labelText && ariaLabelledBy) {
            const labeller = document.getElementById(ariaLabelledBy);
            if (labeller) labelText = labeller.innerText.trim();
          }
          if (!labelText) {
            const wrap = el.closest("label");
            if (wrap) {
              const clone = wrap.cloneNode(true);
              clone.querySelectorAll("input, textarea, select").forEach((c) => c.remove());
              labelText = clone.innerText.trim() || null;
            }
          }

          const label =
            ariaLabel ||
            labelText ||
            (placeholder ? cap(placeholder) : null) ||
            (name ? cap(name) : null);

          return { type, name: name || null, label: label || null, placeholder: placeholder || null, ariaLabel: ariaLabel || null };
        })
        .filter((i) => i.name || i.label);

      const buttonEls = Array.from(
        document.querySelectorAll(
          'button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"], a[class*="btn"], a[class*="button"]'
        )
      );
      const buttons = [
        ...new Set(
          buttonEls
            .map((el) => {
              const text = el.innerText?.trim();
              if (text) return text;
              return el.getAttribute("value") || el.getAttribute("aria-label") || el.getAttribute("title") || null;
            })
            .filter(Boolean)
        ),
      ];

      const links = [
        ...new Set(
          Array.from(document.querySelectorAll("a"))
            .map((a) => a.innerText?.trim())
            .filter((t) => t && t.length > 0 && t.length < 80)
        ),
      ];

      const ariaLabels = [
        ...new Set(
          Array.from(document.querySelectorAll("[aria-label]"))
            .map((el) => el.getAttribute("aria-label"))
            .filter(Boolean)
        ),
      ];

      const navEls = Array.from(
        document.querySelectorAll(
          'nav a, nav button, [role="navigation"] a, [role="menuitem"], header nav a, header a'
        )
      );
      const navItems = [
        ...new Set(navEls.map((el) => el.innerText?.trim()).filter(Boolean)),
      ];

      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"))
        .map((el) => ({ level: el.tagName.toLowerCase(), text: el.innerText?.trim() }))
        .filter((h) => h.text);

      return { title, inputs, buttons, links, ariaLabels, navItems, headings };
    });

    return { url, success: true, ...data };
  } catch (err) {
    return { url, success: false, error: err.message };
  } finally {
    await page.close().catch(() => {});
  }
}

// ── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Playwright server listening on port ${PORT}`);
});
