import Link from "next/link";
import { ErrorState } from "@/components/ui/error-state";

/**
 * app/not-found.tsx. Wire app/error.tsx the same way with a 500 and a `reset` action; in Vite or
 * Astro, render <ErrorState> directly from the router's catch-all.
 */
export default function NotFound() {
  return (
    <ErrorState
      code="404"
      title="Page not found"
      description="The page you asked for does not exist, or it moved."
      actions={
        <Link
          href="/"
          className="inline-flex h-8 items-center justify-center border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] no-underline transition-colors duration-150 hover:bg-[var(--surface-2)]"
        >
          Back home
        </Link>
      }
    />
  );
}
