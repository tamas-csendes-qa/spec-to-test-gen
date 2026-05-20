import { useEffect, useState } from "react";
import { X, Link, Plus, Loader as Loader2, Check, CircleAlert as AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function confluenceProxy(body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/confluence-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

export interface ConfluencePage {
  id: string;
  page_id: string;
  page_title: string;
  page_url: string;
  confluence_url: string;
}

interface Props {
  userId: string;
  lang: "hu" | "en";
  selectedPages: ConfluencePage[];
  onSave: (pages: ConfluencePage[]) => void;
  onClose: () => void;
}

const S = {
  hu: {
    title: "Confluence oldalak",
    stepConnect: "1. Kapcsolat",
    stepPages: "2. Oldalak",
    confluenceUrl: "Confluence URL",
    confluenceUrlPlaceholder: "yourcompany.atlassian.net",
    email: "E-mail",
    emailPlaceholder: "your@email.com",
    apiToken: "API Token",
    apiTokenPlaceholder: "••••••••••••",
    connect: "Kapcsolódás",
    connecting: "Kapcsolódás…",
    connected: "Kapcsolódva",
    reconnect: "Újrakapcsolódás",
    pageUrlLabel: "Confluence oldal URL-je",
    pageUrlPlaceholder: "https://yourcompany.atlassian.net/wiki/spaces/.../pages/...",
    listPages: "Listázás",
    listing: "Betöltés…",
    addManually: "Hozzáadás",
    foundPages: "Talált oldalak",
    selectedPages: "Kiválasztott oldalak",
    noSelected: "Még nincs kiválasztott oldal.",
    cancel: "Mégse",
    save: "Mentés",
    error: "Hiba",
    tokenHelp: "Atlassian fiókodban: Account Settings → Security → API tokens",
  },
  en: {
    title: "Confluence pages",
    stepConnect: "1. Connection",
    stepPages: "2. Pages",
    confluenceUrl: "Confluence URL",
    confluenceUrlPlaceholder: "yourcompany.atlassian.net",
    email: "Email",
    emailPlaceholder: "your@email.com",
    apiToken: "API Token",
    apiTokenPlaceholder: "••••••••••••",
    connect: "Connect",
    connecting: "Connecting…",
    connected: "Connected",
    reconnect: "Reconnect",
    pageUrlLabel: "Confluence page URL",
    pageUrlPlaceholder: "https://yourcompany.atlassian.net/wiki/spaces/.../pages/...",
    listPages: "List pages",
    listing: "Loading…",
    addManually: "Add",
    foundPages: "Found pages",
    selectedPages: "Selected pages",
    noSelected: "No pages selected yet.",
    cancel: "Cancel",
    save: "Save",
    error: "Error",
    tokenHelp: "In your Atlassian account: Account Settings → Security → API tokens",
  },
} as const;

type Step = "connect" | "pages";

export function ConfluenceModal({ userId, lang, selectedPages, onSave, onClose }: Props) {
  const t = S[lang];
  const [step, setStep] = useState<Step>("connect");
  const [connUrl, setConnUrl] = useState("");
  const [connEmail, setConnEmail] = useState("");
  const [connToken, setConnToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connError, setConnError] = useState<string | null>(null);
  const [existingConn, setExistingConn] = useState<{ confluence_url: string; email: string } | null>(null);
  const [loadingConn, setLoadingConn] = useState(true);

  const [pageUrl, setPageUrl] = useState("");
  const [listing, setListing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [foundPages, setFoundPages] = useState<Array<{ id: string; title: string; page_url: string }>>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<ConfluencePage[]>(selectedPages);

  // Load existing connection on mount
  useEffect(() => {
    setLoadingConn(true);
    confluenceProxy({ action: "get_connection" })
      .then((res) => {
        if (res.connection) {
          setExistingConn(res.connection);
          setStep("pages");
        }
      })
      .catch(() => {/* no connection yet */})
      .finally(() => setLoadingConn(false));
  }, []);

  const handleConnect = async () => {
    if (!connUrl.trim() || !connEmail.trim() || !connToken.trim()) return;
    setConnecting(true);
    setConnError(null);
    try {
      await confluenceProxy({
        action: "save_connection",
        confluence_url: connUrl.trim(),
        email: connEmail.trim(),
        api_token: connToken.trim(),
      });
      setExistingConn({ confluence_url: connUrl.trim(), email: connEmail.trim() });
      setStep("pages");
    } catch (err) {
      setConnError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  const handleListPages = async () => {
    if (!pageUrl.trim()) return;
    setListing(true);
    setListError(null);
    setFoundPages([]);
    setCheckedIds(new Set());
    try {
      const res = await confluenceProxy({ action: "list_children", page_url: pageUrl.trim() });
      setFoundPages(res.pages ?? []);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to list pages");
    } finally {
      setListing(false);
    }
  };

  const handleAddManually = async () => {
    if (!pageUrl.trim()) return;
    setListing(true);
    setListError(null);
    try {
      const res = await confluenceProxy({ action: "get_page_content", page_url: pageUrl.trim() });
      const connUrl = existingConn?.confluence_url ?? "";
      const newPage: ConfluencePage = {
        id: crypto.randomUUID(),
        page_id: res.id,
        page_title: res.title,
        page_url: pageUrl.trim(),
        confluence_url: connUrl,
      };
      if (!draft.find((p) => p.page_id === res.id)) {
        setDraft((prev) => [...prev, newPage]);
      }
      setPageUrl("");
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to fetch page");
    } finally {
      setListing(false);
    }
  };

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCheckedPages = () => {
    const connUrl = existingConn?.confluence_url ?? "";
    const toAdd: ConfluencePage[] = foundPages
      .filter((p) => checkedIds.has(p.id) && !draft.find((d) => d.page_id === p.id))
      .map((p) => ({
        id: crypto.randomUUID(),
        page_id: p.id,
        page_title: p.title,
        page_url: p.page_url,
        confluence_url: connUrl,
      }));
    setDraft((prev) => [...prev, ...toAdd]);
    setCheckedIds(new Set());
  };

  const removeDraft = (pageId: string) => {
    setDraft((prev) => prev.filter((p) => p.page_id !== pageId));
  };

  const handleSave = async () => {
    // Persist selected pages to DB: delete old, insert new
    await supabase.from("confluence_selected_pages").delete().eq("user_id", userId);
    if (draft.length > 0) {
      await supabase.from("confluence_selected_pages").insert(
        draft.map((p) => ({
          user_id: userId,
          page_id: p.page_id,
          page_title: p.page_title,
          page_url: p.page_url,
          confluence_url: p.confluence_url,
        }))
      );
    }
    onSave(draft);
    onClose();
  };

  if (loadingConn) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-6 shadow-2xl">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Betöltés…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <h3 className="font-semibold text-foreground">{t.title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex gap-1 bg-muted/40 px-6 pt-3 shrink-0">
          <button
            onClick={() => setStep("connect")}
            className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
              step === "connect"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.stepConnect}
          </button>
          <button
            onClick={() => existingConn && setStep("pages")}
            disabled={!existingConn}
            className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
              step === "pages"
                ? "border-primary text-foreground"
                : existingConn
                ? "border-transparent text-muted-foreground hover:text-foreground"
                : "border-transparent text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            {t.stepPages}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Step 1: Connect */}
          {step === "connect" && (
            <div className="space-y-4">
              {existingConn && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 px-4 py-3">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">{t.connected}</p>
                    <p className="text-xs text-green-700 dark:text-green-300 truncate">{existingConn.confluence_url} · {existingConn.email}</p>
                  </div>
                  <button
                    onClick={() => setExistingConn(null)}
                    className="text-xs text-green-700 dark:text-green-300 hover:underline shrink-0"
                  >
                    {t.reconnect}
                  </button>
                </div>
              )}

              {!existingConn && (
                <>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">{t.confluenceUrl}</label>
                    <input
                      type="text"
                      value={connUrl}
                      onChange={(e) => setConnUrl(e.target.value)}
                      placeholder={t.confluenceUrlPlaceholder}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">{t.email}</label>
                    <input
                      type="email"
                      value={connEmail}
                      onChange={(e) => setConnEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">{t.apiToken}</label>
                    <input
                      type="password"
                      value={connToken}
                      onChange={(e) => setConnToken(e.target.value)}
                      placeholder={t.apiTokenPlaceholder}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">{t.tokenHelp}</p>
                  </div>

                  {connError && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-4 py-3">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800 dark:text-red-300">{connError}</p>
                    </div>
                  )}

                  <Button
                    onClick={() => { void handleConnect(); }}
                    disabled={connecting || !connUrl.trim() || !connEmail.trim() || !connToken.trim()}
                    className="w-full"
                  >
                    {connecting ? <><Loader2 className="h-4 w-4 animate-spin" />{t.connecting}</> : <><Link className="h-4 w-4" />{t.connect}</>}
                  </Button>
                </>
              )}

              {existingConn && (
                <Button onClick={() => setStep("pages")} className="w-full">
                  {t.stepPages} →
                </Button>
              )}
            </div>
          )}

          {/* Step 2: Pages */}
          {step === "pages" && (
            <div className="space-y-5">
              {/* URL input + buttons */}
              <div className="space-y-2">
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.pageUrlLabel}</label>
                <input
                  type="text"
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleListPages()}
                  placeholder={t.pageUrlPlaceholder}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { void handleListPages(); }}
                    disabled={listing || !pageUrl.trim()}
                    className="flex-1"
                  >
                    {listing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />{t.listing}</> : t.listPages}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { void handleAddManually(); }}
                    disabled={listing || !pageUrl.trim()}
                    className="flex-1"
                  >
                    <Plus className="h-3.5 w-3.5" />{t.addManually}
                  </Button>
                </div>
              </div>

              {listError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-3 py-2">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800 dark:text-red-300">{listError}</p>
                </div>
              )}

              {/* Found pages list */}
              {foundPages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.foundPages}</p>
                    {checkedIds.size > 0 && (
                      <Button size="sm" variant="outline" onClick={addCheckedPages}>
                        <Plus className="h-3.5 w-3.5" />
                        {lang === "hu" ? `${checkedIds.size} hozzáadása` : `Add ${checkedIds.size}`}
                      </Button>
                    )}
                  </div>
                  <div className="rounded-lg border border-border divide-y divide-border max-h-44 overflow-y-auto">
                    {foundPages.map((p) => {
                      const alreadyAdded = !!draft.find((d) => d.page_id === p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors ${alreadyAdded ? "opacity-40" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checkedIds.has(p.id) || alreadyAdded}
                            disabled={alreadyAdded}
                            onChange={() => toggleCheck(p.id)}
                            className="h-4 w-4 rounded border-input accent-primary"
                          />
                          <span className="text-sm truncate">{p.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected pages */}
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.selectedPages}</p>
                {draft.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t.noSelected}</p>
                ) : (
                  <div className="rounded-lg border border-border divide-y divide-border max-h-44 overflow-y-auto">
                    {draft.map((p) => (
                      <div key={p.page_id} className="flex items-center gap-3 px-3 py-2.5">
                        <span className="flex-1 text-sm truncate">{p.page_title}</span>
                        <button
                          onClick={() => removeDraft(p.page_id)}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end border-t border-border px-6 py-4 shrink-0">
          <Button variant="outline" onClick={onClose}>{t.cancel}</Button>
          {step === "pages" && (
            <Button onClick={() => { void handleSave(); }}>{t.save}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
