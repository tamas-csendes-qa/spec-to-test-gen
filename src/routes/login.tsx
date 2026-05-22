import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { LoginPage } from "@/components/LoginPage";
import { useAuth } from "@/lib/auth";

function LoginRoute() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (!loading && user && profile) {
      void navigate({ to: "/app" });
    }
  }, [loading, user, profile, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <LoginPage
      dark={dark}
      onToggleDark={() => setDark((d) => !d)}
      onSuccess={() => {/* auth state redirects automatically */}}
    />
  );
}

export const Route = createFileRoute("/login")({
  component: LoginRoute,
  head: () => ({
    meta: [{ title: "QAgen – Bejelentkezés" }],
  }),
});
