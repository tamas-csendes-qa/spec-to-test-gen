import { useState, useEffect, type FormEvent } from "react";
import { Moon, Sun, Eye, EyeOff } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

interface LoginPageProps {
  dark: boolean;
  onToggleDark: () => void;
  onSuccess: () => void;
}

export function LoginPage({ dark, onToggleDark }: LoginPageProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const accent = '#3b7ff5';
  const bg   = dark ? '#090c14' : '#f8f9ff';
  const surf = dark ? '#0f1626' : '#ffffff';
  const br   = dark ? '#1e2d4a' : '#d0d8f0';
  const tx   = dark ? '#c8d8f0' : '#1a1e2e';
  const mu   = dark ? '#8aa6cf' : '#39414f';
  const su   = dark ? '#9ec4ee' : '#222838';

  useEffect(() => {
    const id = 'qagen-styles';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = `
      .qa-bg{background-image:linear-gradient(rgba(59,127,245,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,127,245,.04) 1px,transparent 1px);background-size:28px 28px}
      @keyframes fadeUp{from{transform:translateY(8px);opacity:.3}to{transform:translateY(0);opacity:1}}
      @keyframes dotPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.7}}
      .fade-up{animation:fadeUp .28s ease-out forwards}
      .dot-pulse{animation:dotPulse 2s ease-in-out infinite}
    `;
    document.head.appendChild(el);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("[LoginPage] Submit clicked, email:", email, "password length:", password.length);
    setError(null);
    setLoading(true);
    try {
      const result = await signIn(email, password);
      console.log("[LoginPage] signIn result:", result);
      if (result.error) setError(result.error);
    } catch (err) {
      console.error("[LoginPage] Unexpected error:", err);
      setError("Váratlan hiba történt. Kérjük próbálja újra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="qa-bg min-h-screen w-full flex flex-col"
      style={{ background: bg, color: tx, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-6"
        style={{ height: 56, borderBottom: `1px solid ${br}`, background: dark ? 'rgba(9,12,20,0.92)' : 'rgba(248,249,255,0.92)', backdropFilter: 'blur(8px)' }}
      >
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div style={{ border: `1.5px solid ${accent}`, borderRadius: 7, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, position: 'relative', color: accent, letterSpacing: '-0.05em' }}>
            QA
            <div className="dot-pulse" style={{ position: 'absolute', bottom: 3, right: 3, width: 4, height: 4, borderRadius: '50%', background: accent }} />
          </div>
          <span style={{ color: tx, fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>QAgen</span>
        </Link>
        <button
          onClick={onToggleDark}
          aria-label="Toggle dark mode"
          style={{ border: `1px solid ${br}`, borderRadius: 8, padding: 6, color: su, background: 'transparent', cursor: 'pointer', display: 'flex' }}
        >
          {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </header>

      {/* Login card */}
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm fade-up">
          <div
            className="rounded-xl p-8"
            style={{ background: surf, border: `1px solid ${br}`, boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 24px rgba(59,127,245,0.08)' }}
          >
            {/* Card logo */}
            <div className="flex flex-col items-center mb-8">
              <div style={{ border: `1.5px solid ${accent}`, borderRadius: 11, width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, position: 'relative', color: accent, letterSpacing: '-0.05em', marginBottom: 12 }}>
                QA
                <div className="dot-pulse" style={{ position: 'absolute', bottom: 4, right: 4, width: 5, height: 5, borderRadius: '50%', background: accent }} />
              </div>
              <span style={{ color: tx, fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>QAgen</span>
              <span className="text-sm mt-1 text-center" style={{ color: mu }}>A specifikáció értelmezése a mi dolgunk.</span>
            </div>

            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: mu }}>
                  E-mail cím
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="nev@ceg.hu"
                  className="flex h-10 w-full rounded-lg px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7ff5]"
                  style={{ border: `1px solid ${br}`, background: dark ? '#111b2e' : '#ffffff', color: tx }}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider mb-1.5" style={{ color: mu }}>
                  Jelszó
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="flex h-10 w-full rounded-lg px-3 py-2 pr-10 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7ff5]"
                    style={{ border: `1px solid ${br}`, background: dark ? '#111b2e' : '#ffffff', color: tx }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 transition-opacity hover:opacity-60"
                    style={{ color: mu, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg px-4 py-3" style={{ border: '1px solid #fca5a5', background: dark ? '#1a0808' : '#fff1f1' }}>
                  <p className="text-sm" style={{ color: dark ? '#fca5a5' : '#b91c1c' }}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: accent, border: 'none', cursor: 'pointer' }}
              >
                {loading ? "Bejelentkezés…" : "Bejelentkezés"}
              </button>
            </form>

            <p className="text-sm text-center mt-6" style={{ color: mu }}>
              A fiókhoz csak meghívással lehet hozzáférni.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
