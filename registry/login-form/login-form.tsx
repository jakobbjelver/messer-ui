"use client";

import { useId, useState, type FormEvent } from "react";
import { CircleNotch, Eye, EyeSlash, Warning } from "@phosphor-icons/react";

export type LoginValues = { email: string; password: string };

export type LoginFormProps = {
  onSubmit: (values: LoginValues) => Promise<{ error?: string } | void>;
  submitLabel?: string;
  defaultEmail?: string;
};

const fieldLabel = "font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--text-3)]";
const field =
  "h-8 w-full border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-3)]";

/**
 * Email + password, nothing else. No form library: fork it. The submit handler owns the network and
 * returns { error }; the only message the form should ever show for a failed attempt is
 * "Invalid email or password" — anything more enumerates accounts.
 */
export function LoginForm({ onSubmit, submitLabel = "Sign in", defaultEmail = "" }: LoginFormProps) {
  const id = useId();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await onSubmit({ email, password });
      if (result?.error) setError(result.error);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-1.5">
        <label htmlFor={`${id}-email`} className={fieldLabel}>
          Email
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoFocus
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={field}
          placeholder="you@example.com"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor={`${id}-password`} className={fieldLabel}>
          Password
        </label>
        <div className="relative">
          <input
            id={`${id}-password`}
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={[field, "pr-9"].join(" ")}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute inset-y-0 right-0 grid w-9 place-items-center text-[var(--text-3)] transition-colors duration-150 hover:text-[var(--foreground)]"
          >
            {show ? <EyeSlash size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 border-l-2 border-[var(--destructive)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--destructive)]"
        >
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-8 items-center justify-center gap-2 bg-primary px-3 text-sm font-medium text-[var(--primary-foreground)] transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
      >
        {pending ? <CircleNotch size={16} className="animate-spin" aria-hidden="true" /> : null}
        {pending ? "Signing in…" : submitLabel}
      </button>
    </form>
  );
}
