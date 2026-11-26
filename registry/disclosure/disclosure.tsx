import { useId, useState, type ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";

/**
 * Canon §16 — the one collapsible.
 *
 * A button, not a native `<details>`: the label and the chevron are one 32 px row in every browser,
 * the trigger reports `aria-expanded` and owns the panel with `aria-controls`, and the panel is
 * mounted only while open. A raw `<details>` inherits the browser's marker and its own summary
 * layout, which is how a chevron ends up on its own line in one app and beside the label in another.
 *
 * No `cn` import and no framework import: one file compiles unchanged in Vite, Next and Astro.
 */
export function Disclosure({
  label,
  count,
  defaultOpen = false,
  className = "",
  children,
}: {
  label: ReactNode;
  /** Optional machine count rendered beside the label; no "(s)" suffix. */
  count?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={className}>
      <button
        type="button"
        data-slot="disclosure"
        aria-expanded={open}
        aria-controls={panelId}
        data-state={open ? "open" : "closed"}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-8 w-full cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-left text-[var(--text-3)] transition-[color] duration-150 hover:text-[var(--foreground)]"
      >
        <CaretDown
          size={14}
          weight="bold"
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
        <span className="m-label min-w-0">{label}</span>
        {count !== undefined ? <span className="m-label ml-1 shrink-0">{count}</span> : null}
      </button>
      {open ? (
        <div id={panelId} className="mt-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
