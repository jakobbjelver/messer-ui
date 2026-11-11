import type { ComponentPropsWithoutRef, ElementType, MouseEvent, ReactNode } from "react";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

type BackLinkTargetProps = {
  href: string;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  children?: ReactNode;
};

/**
 * Canon §20 — the one way back.
 *
 * Presentational on purpose. The app resolves where "back" goes (the link that opened the page,
 * falling back to the parent route) and passes the destination as `href` and `label`; this component
 * owns the shape: a 32px outlined control, one Phosphor arrow at 16px, an 8px gap, a square hairline.
 *
 * `onNavigate` lets a router intercept the click to restore the origin's own state (`history.back()`)
 * while the anchor stays a real link for a cold load, a new tab and a middle click. `linkComponent`
 * takes a router link wrapper when a soft navigation matters.
 *
 * No `cn` and no framework import: one file compiles unchanged in Next, Vite and Astro (rule 9, §20).
 */
export function BackLink({
  href,
  label,
  onNavigate,
  linkComponent,
  className = "",
  ...props
}: Omit<ComponentPropsWithoutRef<"a">, "href" | "children"> & {
  href: string;
  /** "Back to the queue" — the destination, sentence case, Golos. */
  label: ReactNode;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
  linkComponent?: ElementType<BackLinkTargetProps>;
}) {
  const Comp = (linkComponent ?? "a") as ElementType;
  return (
    <Comp
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
    </Comp>
  );
}
