import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { QAgen } from "@/components/QAgen";
import { AdminPanel } from "@/components/AdminPanel";
import { useAuth } from "@/lib/auth";

function AppRoute() {
  const { user, profile, sessionToken, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [dark] = useState(() =>
    typeof window !== 'undefined' && window.localStorage.getItem('qagen-dark-mode') === 'true'
  );
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (!loading && (!user || !profile)) {
      void navigate({ to: "/login" });
    }
  }, [loading, user, profile, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  if (showAdmin && profile.is_admin) {
    return <AdminPanel onClose={() => setShowAdmin(false)} />;
  }

  return (
    <QAgen
      userId={user.id}
      companyId={profile.company_id}
      sessionToken={sessionToken}
      isAdmin={profile.is_admin}
      userEmail={profile.email}
      monthlyGenerationLimit={profile.monthly_generation_limit ?? 100}
      playwrightEnabled={profile.playwright_enabled ?? false}
      confluenceEnabled={profile.confluence_enabled ?? false}
      onAdminClick={profile.is_admin ? () => setShowAdmin(true) : undefined}
      onSignOut={signOut}
    />
  );
}

export const Route = createFileRoute("/app")({
  component: AppRoute,
  head: () => ({
    meta: [{ title: "QAgen – Tesztesetek generálása" }],
  }),
});
