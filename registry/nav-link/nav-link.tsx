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
 * Two shapes, one rule. `text` is the family's reading link: Golos at 14px, a hover underline and one
 * 12px destination arrow in `--text-3`. `control` is the action shape — the same 32px outlined box as
 * `back-link`, for the one or two places a page asks the reader to go somewhere ("Read the story").
 * The arrow is `ArrowRight` for an internal route and `ArrowUpRight` for another origin, so a reader
 * can tell a page change from an outbound link before clicking.
 *
 * Presentational on purpose: the app supplies `href`, may route through `linkComponent` for a soft
 * navigation, and keeps the click's meaning in `onNavigate`. No framework import.
 */
export function NavLink({
  href,
  children,
  external = false,
  tone = "default",
  variant = "text",
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
  /** `control` is the 32px outlined action shape (the back-link box), for a page's primary link. */
  variant?: "text" | "control";
  linkComponent?: ElementType<NavLinkTargetProps>;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const Comp = (linkComponent ?? "a") as ElementType;
  const Arrow = external ? ArrowUpRight : ArrowRight;
  const target = external ? (props.target ?? "_blank") : props.target;
  const rel = external ? (props.rel ?? "noreferrer") : props.rel;
  const control = variant === "control";
  return (
    <Comp
      href={href}
      onClick={onNavigate}
      target={target}
      rel={rel}
      className={[
        "inline-flex w-fit shrink-0 items-center no-underline",
        control
          ? "h-8 gap-2 rounded-none border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 text-sm font-medium text-[var(--foreground)] transition-[background-color,border-color,color] duration-150 hover:bg-[var(--surface-2)] hover:no-underline"
          : [
              "gap-1.5 underline-offset-[3px] decoration-[var(--border-strong)] hover:underline hover:decoration-[var(--foreground)]",
              "transition-[color,text-decoration-color] duration-150",
              tone === "quiet" ? "text-[12.5px] font-normal text-[var(--text-2)]" : "text-sm font-medium text-[var(--foreground)]",
            ].join(" "),
        className,
      ]
        .join(" ")
        .trim()}
      {...props}
    >
      {children}
      <Arrow
        weight="bold"
        size={control ? 16 : 12}
        aria-hidden="true"
        className={control ? "shrink-0" : "shrink-0 text-[var(--text-3)]"}
      />
    </Comp>
  );
}
