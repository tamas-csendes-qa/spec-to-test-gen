import { useState } from "react";
import { Sparkles, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

interface LoginPageProps {
  dark: boolean;
  onToggleDark: () => void;
  onSuccess: () => void;
}

export function LoginPage({ dark, onToggleDark, onSuccess }: LoginPageProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">QAgen</h1>
        </div>
        <button
          onClick={onToggleDark}
          aria-label="Toggle dark mode"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      {/* Login form */}
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Bejelentkezés</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A fiókodhoz csak meghívással lehet hozzáférni.
            </p>
          </div>

          <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5"
              >
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
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Jelszó
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 px-4 py-3">
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-10 font-semibold">
              {loading ? "Bejelentkezés…" : "Bejelentkezés"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
