import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Canon §16 — the page-final list.
 *
 * A list that can grow without a natural end and sits at the bottom of a page reveals one page of
 * rows at a time as its sentinel enters the viewport. It is not a See more control: there is no
 * "Show all" for a list whose whole point is that it may be thousands of rows, and the reader never
 * has to press a button to keep reading.
 *
 * This hook is client-side reveal over an already-loaded array; a server-paged surface keeps the
 * same visible/sentinel contract and feeds `items` from TanStack Query's infinite query.
 */
export function useInfiniteReveal<T>(items: T[], pageSize = 24) {
  const [limit, setLimit] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLimit(pageSize);
  }, [items, pageSize]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || limit >= items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLimit((current) => Math.min(items.length, current + pageSize));
        }
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [items.length, limit, pageSize]);

  return {
    visible: items.slice(0, limit),
    hasMore: limit < items.length,
    total: items.length,
    sentinelRef: sentinelRef as RefObject<HTMLDivElement | null>,
  };
}

/** The sentinel and the quiet end-of-page marker for `useInfiniteReveal`. */
export function InfiniteSentinel({
  hasMore,
  sentinelRef,
  label = "Loading more",
}: {
  hasMore: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  label?: string;
}) {
  if (!hasMore) return null;
  return (
    <div
      ref={sentinelRef}
      role="status"
      aria-live="polite"
      className="flex min-h-11 items-center justify-center border-t border-border font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--text-3)]"
    >
      {label}
    </div>
  );
}
