import type { ComponentPropsWithoutRef, ElementType, MouseEvent, ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

type NavLinkTargetProps = {
  href: string;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  children?: ReactNode;
};

/**
 * Canon §21 — a link that goes somewhere, and says which kind of somewhere.
 *
 * The family's text link: Golos at 14px, an underline on hover, and exactly one 12px destination
 * arrow in `--text-3` — `ArrowRight` for an internal route, `ArrowUpRight` for another origin.
 * The arrow is part of the link, not decoration beside it, so a reader can tell an outbound link
 * from a page change before clicking.
 *
 * Presentational on purpose: the app supplies `href`, may route through `linkComponent` for a soft
 * navigation, and keeps the click's meaning in `onNavigate`. No framework import.
 */
export function NavLink({
  href,
  children,
  external = false,
  tone = "default",
  linkComponent,
  onNavigate,
  className = "",
  ...props
}: Omit<ComponentPropsWithoutRef<"a">, "href" | "children"> & {
  href: string;
  children: ReactNode;
  /** Another origin: draws `ArrowUpRight` and opens in a new tab unless `target` is set. */
  external?: boolean;
  /** `quiet` is the colophon/ledger register: 12.5px `--text-2`, same arrow. */
  tone?: "default" | "quiet";
  linkComponent?: ElementType<NavLinkTargetProps>;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const Comp = (linkComponent ?? "a") as ElementType;
  const Arrow = external ? ArrowUpRight : ArrowRight;
  const target = external ? (props.target ?? "_blank") : props.target;
  const rel = external ? (props.rel ?? "noreferrer") : props.rel;
  return (
    <Comp
      href={href}
      onClick={onNavigate}
      target={target}
      rel={rel}
      className={[
        "inline-flex w-fit items-center gap-1.5 no-underline",
        "underline-offset-[3px] decoration-[var(--border-strong)] hover:underline hover:decoration-[var(--foreground)]",
        "transition-[color,text-decoration-color] duration-150",
        tone === "quiet" ? "text-[12.5px] font-normal text-[var(--text-2)]" : "text-sm font-medium text-[var(--foreground)]",
        className,
      ]
        .join(" ")
        .trim()}
      {...props}
    >
      {children}
      <Arrow weight="bold" size={12} aria-hidden="true" className="shrink-0 text-[var(--text-3)]" />
    </Comp>
  );
}
