import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from "react";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

/**
 * Canon §20 — the one way back.
 *
 * Presentational on purpose. The app resolves where "back" goes (the link that opened the page,
 * falling back to the parent route) and passes the destination as `href` and `label`; this component
 * owns the shape: a 32px outlined control, one Phosphor arrow at 16px, an 8px gap, a square hairline.
 *
 * `onNavigate` lets a router intercept the click to restore the origin's own state (`history.back()`)
 * while the anchor stays a real link for a cold load, a new tab and a middle click.
 *
 * No `cn` and no framework import: one file compiles unchanged in Next, Vite and Astro (rule 9, §20).
 */
export function BackLink({
  href,
  label,
  onNavigate,
  className = "",
  ...props
}: Omit<ComponentPropsWithoutRef<"a">, "href" | "children"> & {
  href: string;
  /** "Back to the queue" — the destination, sentence case, Golos. */
  label: ReactNode;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <a
      href={href}
      onClick={onNavigate}
      className={[
        "inline-flex h-8 w-fit shrink-0 items-center gap-2 rounded-none border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 text-sm font-medium text-[var(--foreground)] no-underline",
        "transition-[background-color,border-color,color] duration-150",
        "hover:bg-[var(--surface-2)]",
        className,
      ]
        .join(" ")
        .trim()}
      {...props}
    >
      <ArrowLeft weight="bold" size={16} aria-hidden="true" className="shrink-0" />
      {label}
    </a>
  );
}
