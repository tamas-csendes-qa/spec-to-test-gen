import { useEffect, useState, useCallback } from "react";
import { Building2, Users, ChartBar as BarChart3, Shield, Plus, Trash2, LogOut, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { Company, UserProfile, Session, UsageLog } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

type AdminTab = "companies" | "users" | "usage" | "sessions";

interface UserRow extends UserProfile {
  company_name?: string;
}

interface UsageRow extends UsageLog {
  user_email?: string;
  company_name?: string;
}

interface SessionRow extends Session {
  user_email?: string;
  company_name?: string;
  is_active: boolean;
}

// ── Inline editable cell ────────────────────────────────────────────────────

function EditableNumber({
  value,
  onSave,
}: {
  value: number;
  onSave: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 1) onSave(n);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="number"
        min={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        autoFocus
        className="w-16 rounded border border-input bg-background px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
    );
  }
  return (
    <button
      onClick={() => { setEditing(true); setDraft(String(value)); }}
      className="rounded px-2 py-0.5 text-sm font-mono hover:bg-accent transition-colors"
    >
      {value}
    </button>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Companies tab ────────────────────────────────────────────────────────────

function CompaniesTab() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("companies").select("*").order("name");
    setCompanies((data as Company[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const addCompany = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await supabase.from("companies").insert({ name: newName.trim() });
    setNewName("");
    setShowAdd(false);
    setSaving(false);
    void load();
  };

  const deleteCompany = async (id: string) => {
    if (!confirm("Biztosan törli a céget?")) return;
    await supabase.from("companies").delete().eq("id", id);
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cégek</h2>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Új cég
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Betöltés…</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Cégnév</th>
                <th className="px-4 py-3 text-left">Létrehozva</th>
                <th className="px-4 py-3 text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(c.created_at).toLocaleDateString("hu")}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { void deleteCompany(c.id); }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">Még nincs cég felvéve.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="Új cég hozzáadása" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Cégnév</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void addCompany()}
                autoFocus
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Cég neve"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Mégse</Button>
              <Button size="sm" onClick={() => { void addCompany(); }} disabled={saving || !newName.trim()}>
                {saving ? "Mentés…" : "Mentés"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Users tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", company_id: "", is_admin: false, max_concurrent_sessions: 1 });
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: usersData }, { data: companiesData }] = await Promise.all([
      supabase.from("users").select("*").order("email"),
      supabase.from("companies").select("*").order("name"),
    ]);
    const companyMap = Object.fromEntries((companiesData as Company[] ?? []).map((c) => [c.id, c.name]));
    const rows: UserRow[] = (usersData as UserProfile[] ?? []).map((u) => ({
      ...u,
      company_name: u.company_id ? companyMap[u.company_id] : undefined,
    }));
    setUsers(rows);
    setCompanies((companiesData as Company[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateUser = async (id: string, updates: Partial<UserProfile>) => {
    await supabase.from("users").update(updates).eq("id", id);
    void load();
  };

  const deleteUser = async (id: string, email: string) => {
    if (!confirm(`Biztosan törli: ${email}?`)) return;
    // Delete from users table first (auth user deletion requires service role, skip here)
    await supabase.from("users").delete().eq("id", id);
    void load();
  };

  const addUser = async () => {
    if (!newUser.email || !newUser.password) return;
    setSaving(true);
    setAddError(null);

    // Create Supabase auth user via admin API (edge function)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    const res = await fetch(`${supabaseUrl}/functions/v1/admin-create-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        email: newUser.email,
        password: newUser.password,
        company_id: newUser.company_id || null,
        is_admin: newUser.is_admin,
        max_concurrent_sessions: newUser.max_concurrent_sessions,
      }),
    });

    const json = await res.json() as { error?: string };
    setSaving(false);

    if (!res.ok || json.error) {
      setAddError(json.error ?? "Ismeretlen hiba");
      return;
    }

    setNewUser({ email: "", password: "", company_id: "", is_admin: false, max_concurrent_sessions: 1 });
    setShowAdd(false);
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Felhasználók</h2>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Új felhasználó
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Betöltés…</div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">E-mail</th>
                <th className="px-4 py-3 text-left">Cég</th>
                <th className="px-4 py-3 text-center">Max munkamenetek</th>
                <th className="px-4 py-3 text-center">Admin</th>
                <th className="px-4 py-3 text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <select
                      value={u.company_id ?? ""}
                      onChange={(e) => { void updateUser(u.id, { company_id: e.target.value || null }); }}
                      className="rounded border border-input bg-background px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">— nincs —</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <EditableNumber
                      value={u.max_concurrent_sessions}
                      onSave={(v) => { void updateUser(u.id, { max_concurrent_sessions: v }); }}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={u.is_admin}
                      onChange={(e) => { void updateUser(u.id, { is_admin: e.target.checked }); }}
                      className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { void deleteUser(u.id, u.email); }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Még nincs felhasználó.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="Új felhasználó" onClose={() => { setShowAdd(false); setAddError(null); }}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">E-mail</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="nev@ceg.hu"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Jelszó</label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Cég</label>
              <select
                value={newUser.company_id}
                onChange={(e) => setNewUser((p) => ({ ...p, company_id: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">— nincs —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Max munkamenetek</label>
                <input
                  type="number"
                  min={1}
                  value={newUser.max_concurrent_sessions}
                  onChange={(e) => setNewUser((p) => ({ ...p, max_concurrent_sessions: parseInt(e.target.value) || 1 }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2 mt-5">
                <input
                  id="new-is-admin"
                  type="checkbox"
                  checked={newUser.is_admin}
                  onChange={(e) => setNewUser((p) => ({ ...p, is_admin: e.target.checked }))}
                  className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                />
                <label htmlFor="new-is-admin" className="text-sm text-foreground cursor-pointer">Admin</label>
              </div>
            </div>
            {addError && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-4 py-3">
                <p className="text-sm text-red-800 dark:text-red-300">{addError}</p>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowAdd(false); setAddError(null); }}>Mégse</Button>
              <Button size="sm" onClick={() => { void addUser(); }} disabled={saving || !newUser.email || !newUser.password}>
                {saving ? "Mentés…" : "Létrehozás"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Usage tab ────────────────────────────────────────────────────────────────

function UsageTab() {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCompany, setFilterCompany] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("usage_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filterCompany) query = query.eq("company_id", filterCompany);
    if (filterFrom) query = query.gte("created_at", filterFrom);
    if (filterTo) query = query.lte("created_at", filterTo + "T23:59:59");

    const [{ data: logsData }, { data: usersData }, { data: companiesData }] = await Promise.all([
      query,
      supabase.from("users").select("id, email"),
      supabase.from("companies").select("*").order("name"),
    ]);

    const userMap = Object.fromEntries((usersData ?? []).map((u: { id: string; email: string }) => [u.id, u.email]));
    const companyMap = Object.fromEntries((companiesData as Company[] ?? []).map((c) => [c.id, c.name]));

    const enriched: UsageRow[] = (logsData as UsageLog[] ?? []).map((l) => ({
      ...l,
      user_email: userMap[l.user_id],
      company_name: l.company_id ? companyMap[l.company_id] : undefined,
    }));

    setRows(enriched);
    setCompanies((companiesData as Company[]) ?? []);
    setLoading(false);
  }, [filterCompany, filterFrom, filterTo]);

  useEffect(() => { void load(); }, [load]);

  const tabLabel: Record<string, string> = { quick: "Gyors teszt", keyword: "Kulcsszavas", userstory: "Felhasználói igény" };
  const formatLabel: Record<string, string> = { gherkin: "Gherkin", zephyr: "Zephyr XLSX", azurecsv: "Azure CSV" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Használati napló</h2>
        <button onClick={() => { void load(); }} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Összes cég</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          type="date"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          type="date"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {(filterCompany || filterFrom || filterTo) && (
          <button
            onClick={() => { setFilterCompany(""); setFilterFrom(""); setFilterTo(""); }}
            className="h-9 px-3 rounded-md text-sm text-muted-foreground hover:text-foreground border border-input hover:bg-muted transition-colors"
          >
            Szűrő törlése
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Betöltés…</div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Felhasználó</th>
                <th className="px-4 py-3 text-left">Cég</th>
                <th className="px-4 py-3 text-left">Típus</th>
                <th className="px-4 py-3 text-left">Formátum</th>
                <th className="px-4 py-3 text-right">Tokenek</th>
                <th className="px-4 py-3 text-right">Dátum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{r.user_email ?? r.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.company_name ?? "—"}</td>
                  <td className="px-4 py-3">{tabLabel[r.tab_type] ?? r.tab_type}</td>
                  <td className="px-4 py-3">{formatLabel[r.output_format] ?? r.output_format}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.token_count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("hu", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Nincs adat a szűrési feltételekre.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Sessions tab ─────────────────────────────────────────────────────────────

function SessionsTab() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const [{ data: sessionsData }, { data: usersData }] = await Promise.all([
      supabase.from("sessions").select("*").order("last_active", { ascending: false }),
      supabase.from("users").select("id, email, company_id, companies(name)"),
    ]);

    const userMap: Record<string, { email: string; company_name?: string }> = {};
    for (const u of (usersData ?? []) as Array<{ id: string; email: string; company_id: string | null; companies: { name: string } | null }>) {
      userMap[u.id] = { email: u.email, company_name: u.companies?.name };
    }

    const enriched: SessionRow[] = (sessionsData as Session[] ?? []).map((s) => ({
      ...s,
      user_email: userMap[s.user_id]?.email,
      company_name: userMap[s.user_id]?.company_name,
      is_active: new Date(s.last_active) > new Date(thirtyMinAgo),
    }));

    setRows(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const forceLogout = async (sessionId: string) => {
    if (!confirm("Biztosan kijelentkezteti ezt a munkamenetet?")) return;
    await supabase.from("sessions").delete().eq("id", sessionId);
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Munkamenetek</h2>
        <button onClick={() => { void load(); }} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Betöltés…</div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Felhasználó</th>
                <th className="px-4 py-3 text-left">Cég</th>
                <th className="px-4 py-3 text-left">Állapot</th>
                <th className="px-4 py-3 text-left">Utolsó aktivitás</th>
                <th className="px-4 py-3 text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{s.user_email ?? s.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.company_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.is_active
                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.is_active ? "bg-green-500" : "bg-muted-foreground"}`} />
                      {s.is_active ? "Aktív" : "Inaktív"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(s.last_active).toLocaleString("hu", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { void forceLogout(s.id); }}
                      title="Kijelentkeztetés"
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Nincs aktív munkamenet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main AdminPanel ──────────────────────────────────────────────────────────

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTab>("companies");

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "companies", label: "Cégek", icon: <Building2 className="h-4 w-4" /> },
    { id: "users", label: "Felhasználók", icon: <Users className="h-4 w-4" /> },
    { id: "usage", label: "Használat", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "sessions", label: "Munkamenetek", icon: <Shield className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="mx-auto max-w-5xl px-6 py-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin panel</h1>
            <p className="text-sm text-muted-foreground mt-1">Cégek, felhasználók és használat kezelése</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-4 w-4" />
            Vissza az alkalmazáshoz
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1 mb-6 border border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="animate-fade-in">
          {activeTab === "companies" && <CompaniesTab />}
          {activeTab === "users" && <UsersTab />}
          {activeTab === "usage" && <UsageTab />}
          {activeTab === "sessions" && <SessionsTab />}
        </div>
      </div>
    </div>
  );
}
