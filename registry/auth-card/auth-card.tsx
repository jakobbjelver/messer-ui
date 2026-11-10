import type { ReactNode } from "react";
import { Warning } from "@phosphor-icons/react";

export type AuthCardProps = {
  brand: { name: string; mark?: ReactNode; href?: string };
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  error?: string | null;
  loading?: boolean;
};

/**
 * The auth screen frame: no shell, one 380px column, the mark above the card. Every app's login and
 * signup sits here so the first screen a user sees is the same shape everywhere.
 */
export function AuthCard({ brand, title, description, children, footer, error, loading }: AuthCardProps) {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--background)] px-4 py-10 text-[var(--foreground)]">
      <div className="w-full max-w-[380px]">
        <a
          href={brand.href ?? "/"}
          className="mb-6 flex items-center justify-center gap-2 no-underline"
        >
          {brand.mark ? <span className="shrink-0 [&_svg]:size-6">{brand.mark}</span> : null}
          <span className="font-mono text-sm font-medium uppercase tracking-[0.1em] text-[var(--foreground)]">
            {brand.name}
          </span>
        </a>

        <div className="border border-border bg-[var(--surface)] p-6">
          <h1 className="m-0 text-xl font-medium leading-tight">{title}</h1>
          {description ? <p className="m-0 mt-1 text-sm text-[var(--text-2)]">{description}</p> : null}

          {error ? (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 border-l-2 border-[var(--destructive)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--destructive)]"
            >
              <span className="mt-0.5 shrink-0 [&_svg]:size-4" aria-hidden="true">
                <Warning size={16} />
              </span>
              <span>{error}</span>
            </div>
          ) : null}

          <div className={["mt-5", loading ? "opacity-60" : ""].join(" ")} aria-busy={loading || undefined}>
            {children}
          </div>
        </div>

        {footer ? <div className="mt-4 text-center text-sm text-[var(--text-2)]">{footer}</div> : null}
      </div>
    </div>
  );
}
