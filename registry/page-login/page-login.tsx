"use client";

import { Stack } from "@phosphor-icons/react";
import { AuthCard } from "@/components/ui/auth-card";
import { LoginForm } from "@/components/ui/login-form";

/**
 * app/login/page.tsx. Replace the fetch with your auth client; keep the rule that a failed attempt
 * returns exactly "Invalid email or password". Vite: render this at <Route path="/login">.
 * Astro: mount it as an island, client:load.
 */
export default function LoginPage() {
  return (
    <AuthCard
      brand={{ name: "Your app", mark: <Stack weight="fill" /> }}
      title="Sign in"
      description="Use the account you already have."
      footer={
        <>
          No account? <a href="/signup" className="text-[var(--foreground)] underline underline-offset-2">Request one</a>
        </>
      }
    >
      <LoginForm
        onSubmit={async ({ email, password }) => {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          if (!response.ok) return { error: "Invalid email or password" };
          window.location.assign("/");
        }}
      />
    </AuthCard>
  );
}
