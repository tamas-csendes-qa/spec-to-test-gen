import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { UserProfile } from "./supabase";

const SESSION_TOKEN_KEY = "qagen-session-token";
const SESSION_ACTIVE_INTERVAL = 5 * 60 * 1000;

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  sessionToken: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      if (error) {
        console.error("[Auth] fetchProfile error:", error);
        return null;
      }
      return data as UserProfile | null;
    } catch (err) {
      console.error("[Auth] fetchProfile threw:", err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  }, [user, fetchProfile]);

  const ensureSession = useCallback(async (uid: string): Promise<string> => {
    let token = sessionStorage.getItem(SESSION_TOKEN_KEY);

    if (token) {
      const { data } = await supabase
        .from("sessions")
        .select("id")
        .eq("session_token", token)
        .eq("user_id", uid)
        .maybeSingle();
      if (!data) token = null;
    }

    if (!token) {
      token = generateToken();
      const { error } = await supabase
        .from("sessions")
        .insert({ user_id: uid, session_token: token });
      if (error) {
        console.error("[Auth] ensureSession insert error:", error);
      } else {
        sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      }
    }

    return token;
  }, []);

  const enforceSessionLimit = useCallback(async (uid: string): Promise<void> => {
    try {
      const prof = await fetchProfile(uid);
      if (!prof) return;

      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: activeSessions } = await supabase
        .from("sessions")
        .select("id, last_active, created_at")
        .eq("user_id", uid)
        .gte("last_active", thirtyMinAgo)
        .order("last_active", { ascending: true });

      const active = activeSessions ?? [];
      const limit = prof.max_concurrent_sessions;

      if (active.length >= limit) {
        const toDelete = active.slice(0, active.length - limit + 1);
        for (const s of toDelete) {
          await supabase.from("sessions").delete().eq("id", s.id);
        }
      }
    } catch (err) {
      console.error("[Auth] enforceSessionLimit error:", err);
    }
  }, [fetchProfile]);

  const touchSession = useCallback(async (uid: string, token: string) => {
    await supabase
      .from("sessions")
      .update({ last_active: new Date().toISOString() })
      .eq("user_id", uid)
      .eq("session_token", token);
  }, []);

  useEffect(() => {
    let mounted = true;

    // Bootstrap: check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log("[Auth] getSession:", session?.user?.email ?? "no session", error ?? "");
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id).then((p) => {
          if (!mounted) return;
          setProfile(p);
          ensureSession(session.user.id).then((token) => {
            if (!mounted) return;
            setSessionToken(token);
            setLoading(false);
          }).catch(() => setLoading(false));
        }).catch(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.error("[Auth] getSession error:", err);
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[Auth] onAuthStateChange event:", event, "user:", session?.user?.email ?? "none");

      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setSessionToken(null);
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
        setLoading(false);
        return;
      }

      // Only act on SIGNED_IN; INITIAL_SESSION is handled by getSession above
      if (event === "SIGNED_IN") {
        setUser(session.user);
        (async () => {
          try {
            const p = await fetchProfile(session.user.id);
            setProfile(p);
            await enforceSessionLimit(session.user.id);
            const token = await ensureSession(session.user.id);
            setSessionToken(token);
          } catch (err) {
            console.error("[Auth] SIGNED_IN handler error:", err);
          } finally {
            setLoading(false);
          }
        })();
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [fetchProfile, ensureSession, enforceSessionLimit]);

  // Heartbeat: touch session every 5 minutes
  useEffect(() => {
    if (!user || !sessionToken) return;
    const interval = setInterval(() => {
      void touchSession(user.id, sessionToken);
    }, SESSION_ACTIVE_INTERVAL);
    return () => clearInterval(interval);
  }, [user, sessionToken, touchSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log("[Auth] signIn called for:", email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log("[Auth] signInWithPassword response — user:", data?.user?.id ?? "none", "error:", error?.message ?? "none");
      if (error) return { error: error.message };
      return { error: null };
    } catch (err) {
      console.error("[Auth] signIn threw:", err);
      return { error: "Bejelentkezési hiba. Kérjük próbálja újra." };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (user && sessionToken) {
      await supabase
        .from("sessions")
        .delete()
        .eq("user_id", user.id)
        .eq("session_token", sessionToken);
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
    await supabase.auth.signOut();
  }, [user, sessionToken]);

  return (
    <AuthContext.Provider value={{ user, profile, sessionToken, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export async function logUsage(params: {
  userId: string;
  companyId: string | null;
  tabType: string;
  outputFormat: string;
  tokenCount: number;
}) {
  const { error } = await supabase.from("usage_logs").insert({
    user_id: params.userId,
    company_id: params.companyId,
    tab_type: params.tabType,
    output_format: params.outputFormat,
    token_count: params.tokenCount,
  });
  if (error) console.error("[Auth] logUsage error:", error);
}

export async function getMonthlyUsageCount(userId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count, error } = await supabase
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart);
  if (error) {
    console.error("[Auth] getMonthlyUsageCount error:", error);
    return 0;
  }
  return count ?? 0;
}

export async function touchSessionByToken(userId: string, token: string) {
  await supabase
    .from("sessions")
    .update({ last_active: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("session_token", token);
}
