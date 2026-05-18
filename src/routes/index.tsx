import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { QAgen } from "@/components/QAgen";
import { LoginPage } from "@/components/LoginPage";
import { AdminPanel } from "@/components/AdminPanel";
import { useAuth } from "@/lib/auth";

function App() {
  const { user, profile, sessionToken, loading, signOut } = useAuth();
  const [dark, setDark] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <LoginPage
        dark={dark}
        onToggleDark={() => setDark((d) => !d)}
        onSuccess={() => {/* auth state updates automatically */}}
      />
    );
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
      onAdminClick={profile.is_admin ? () => setShowAdmin(true) : undefined}
      onSignOut={signOut}
    />
  );
}

export const Route = createFileRoute("/")({
  component: App,
  head: () => ({
    meta: [
      { title: "QAgen – Tesztesetek generálása specifikációból" },
      {
        name: "description",
        content:
          "QAgen: tölts fel egy specifikációt és generálj Gherkin vagy Zephyr XLSX teszteseteket másodpercek alatt.",
      },
    ],
  }),
});
