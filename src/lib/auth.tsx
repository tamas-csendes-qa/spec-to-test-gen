import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { UserProfile } from "./supabase";

const SESSION_TOKEN_KEY = "qagen-session-token";
const SESSION_ACTIVE_INTERVAL = 5 * 60 * 1000; // update last_active every 5 min

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
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    return data as UserProfile | null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  }, [user, fetchProfile]);

  const ensureSession = useCallback(async (uid: string): Promise<string> => {
    let token = sessionStorage.getItem(SESSION_TOKEN_KEY);

    if (token) {
      // Verify this token still exists in DB
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
      await supabase.from("sessions").insert({ user_id: uid, session_token: token });
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    }

    return token;
  }, []);

  const enforceSessionLimit = useCallback(async (uid: string): Promise<void> => {
    const profile = await fetchProfile(uid);
    if (!profile) return;

    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // Count active sessions (last_active within 30 min)
    const { data: activeSessions } = await supabase
      .from("sessions")
      .select("id, last_active, created_at")
      .eq("user_id", uid)
      .gte("last_active", thirtyMinAgo)
      .order("last_active", { ascending: true });

    const active = activeSessions ?? [];
    const limit = profile.max_concurrent_sessions;

    // If at or over limit, delete the oldest until we're under
    if (active.length >= limit) {
      const toDelete = active.slice(0, active.length - limit + 1);
      for (const s of toDelete) {
        await supabase.from("sessions").delete().eq("id", s.id);
      }
    }
  }, [fetchProfile]);

  // Update last_active periodically
  const touchSession = useCallback(async (uid: string, token: string) => {
    await supabase
      .from("sessions")
      .update({ last_active: new Date().toISOString() })
      .eq("user_id", uid)
      .eq("session_token", token);
  }, []);

  useEffect(() => {
    // Bootstrap from existing Supabase auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        if (session?.user) {
          setUser(session.user);
          const p = await fetchProfile(session.user.id);
          setProfile(p);
          const token = await ensureSession(session.user.id);
          setSessionToken(token);
        }
        setLoading(false);
      })();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (session?.user) {
          setUser(session.user);
          const p = await fetchProfile(session.user.id);
          setProfile(p);
          if (event === "SIGNED_IN") {
            await enforceSessionLimit(session.user.id);
            const token = await ensureSession(session.user.id);
            setSessionToken(token);
          }
        } else {
          setUser(null);
          setProfile(null);
          setSessionToken(null);
          sessionStorage.removeItem(SESSION_TOKEN_KEY);
        }
      })();
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchProfile, ensureSession, enforceSessionLimit]);

  // Touch session every 5 minutes
  useEffect(() => {
    if (!user || !sessionToken) return;
    const interval = setInterval(() => {
      void touchSession(user.id, sessionToken);
    }, SESSION_ACTIVE_INTERVAL);
    return () => clearInterval(interval);
  }, [user, sessionToken, touchSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
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
  await supabase.from("usage_logs").insert({
    user_id: params.userId,
    company_id: params.companyId,
    tab_type: params.tabType,
    output_format: params.outputFormat,
    token_count: params.tokenCount,
  });
}

export async function touchSessionByToken(userId: string, token: string) {
  await supabase
    .from("sessions")
    .update({ last_active: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("session_token", token);
}
