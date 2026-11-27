import type { ComponentPropsWithoutRef, ElementType, MouseEvent, ReactNode } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

type RowLinkTargetProps = {
  href: string;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  children?: ReactNode;
};

/**
 * Canon §16/§21 — a row that goes somewhere.
 *
 * The title is the anchor; its `after:absolute after:inset-0` makes the whole row the hit area, so a
 * table row or a list row navigates as one target while any control inside it keeps its own click
 * (give the control `relative z-10`). The row must carry `class="group relative"`; this component
 * draws the hover underline on the title and the internal/external arrow beside it.
 *
 * Why not wrap the whole row in an `<a>`: a table row cannot contain one, and an overlay on top of
 * a row's own controls swallows their clicks. The title anchor plus an inset pseudo-element is the
 * shape that keeps both.
 *
 * In a `<table>` the later cells paint over the pseudo-element, so a table row needs a row-level
 * click handler as well (the archive does); on a div-based list the overlay owns the whole target.
 *
 * `dir="prev"` is the same row read backwards: the arrow leads the label and points left, because a
 * "previous" that points forward misstates where the click goes. An external row is always forward.
 */
export function RowLink({
  href,
  children,
  external = false,
  dir = "next",
  linkComponent,
  onNavigate,
  className = "",
  ...props
}: Omit<ComponentPropsWithoutRef<"a">, "href" | "children"> & {
  href: string;
  children: ReactNode;
  external?: boolean;
  /** `prev` leads with a left arrow; the default trails with a right one. */
  dir?: "next" | "prev";
  linkComponent?: ElementType<RowLinkTargetProps>;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const Comp = (linkComponent ?? "a") as ElementType;
  const leading = dir === "prev" && !external;
  const Arrow = external ? ArrowUpRight : dir === "prev" ? ArrowLeft : ArrowRight;
  const target = external ? (props.target ?? "_blank") : props.target;
  const rel = external ? (props.rel ?? "noreferrer") : props.rel;
  return (
    <Comp
      href={href}
      onClick={onNavigate}
      target={target}
      rel={rel}
      className={[
        "relative inline-flex items-center gap-2 font-medium text-[var(--foreground)] no-underline",
        "after:absolute after:inset-0 after:content-['']",
        "decoration-[var(--border-strong)] underline-offset-[3px]",
        "group-hover:underline group-hover:decoration-[var(--foreground)]",
        className,
      ]
        .join(" ")
        .trim()}
      {...props}
    >
      {leading ? <Arrow weight="bold" size={12} aria-hidden="true" className="shrink-0 text-[var(--text-3)]" /> : null}
      {children}
      {leading ? null : <Arrow weight="bold" size={12} aria-hidden="true" className="shrink-0 text-[var(--text-3)]" />}
    </Comp>
  );
}
