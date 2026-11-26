import { useId, useState } from "react";

export type UseSeeMoreResult<T> = {
  /** Pass to the list element's `id`; the button's `aria-controls` points at it. */
  id: string;
  visible: T[];
  expanded: boolean;
  canExpand: boolean;
  total: number;
  hidden: number;
  toggle: () => void;
  /** Spread onto `SeeMoreButton` so the count and the controlled id cannot drift. */
  buttonProps: SeeMoreButtonProps;
};

/**
 * The visible slice of a long list. A list at or below the limit is never truncated and the button
 * renders nothing.
 *
 *   const rows = useSeeMore(flights);
 *   <ul id={rows.id}>{rows.visible.map(...)}</ul>
 *   <SeeMoreButton {...rows.buttonProps} />
 */
export function useSeeMore<T>(items: T[], limit = 8): UseSeeMoreResult<T> {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const total = items.length;
  const canExpand = total > limit;
  const visible = expanded || !canExpand ? items : items.slice(0, limit);
  const toggle = () => setExpanded((value) => !value);

  return {
    id,
    visible,
    expanded,
    canExpand,
    total,
    hidden: expanded ? 0 : Math.max(0, total - limit),
    toggle,
    buttonProps: { total, expanded, onToggle: toggle, controls: id, limit },
  };
}

export type SeeMoreButtonProps = {
  total: number;
  expanded: boolean;
  onToggle: () => void;
  /** The id of the list this control expands — `aria-controls` must name a real element. */
  controls: string;
  limit?: number;
  className?: string;
};

/** `Show all N` / `Show fewer`, with `aria-expanded` and `aria-controls`; nothing on a short list. */
export function SeeMoreButton({
  total,
  expanded,
  onToggle,
  controls,
  limit = 8,
  className,
}: SeeMoreButtonProps) {
  if (total <= limit) return null;
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
      className={[
        "inline-flex h-8 cursor-pointer items-center justify-center border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 text-sm font-medium text-[var(--text-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
        className ?? "",
      ].join(" ")}
    >
      {expanded ? "Show fewer" : `Show all ${total}`}
    </button>
  );
}
