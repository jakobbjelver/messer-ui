import { useEffect } from "react";

/**
 * The document head, one function per app. `<Screen> · <Product>`, with the count of what is waiting on
 * the person as a `(n) ` prefix — the same number the nav badge shows, so a backgrounded tab still tells
 * you something is pending. The root screen is the product alone; a detail route passes the item's name.
 *
 * Never a tagline, never a second separator, never a hand-written string per page: a title assembled in
 * five places is five titles that disagree, and a stale one after navigation is a bug.
 *
 *   formatTitle({ screen: "Now", product: "Messer Warden", count: 2 })
 *   → "(2) Now · Messer Warden"
 */

export const TITLE_SEP = " · ";
const LIMIT = 60;
const SCREEN_MIN = 12;

export type TitleInput = { screen?: string; product: string; count?: number; limit?: number };

const clean = (s?: string) => (s ?? "").replace(/\s+/g, " ").trim();

export function formatTitle({ screen, product, count = 0, limit = LIMIT }: TitleInput): string {
  const prefix = count > 0 ? `(${count}) ` : "";
  const name = clean(screen);
  if (!name) return prefix + product;
  // The product is the stable suffix and must survive: over the cap, the screen is what gets clipped,
  // and below a readable minimum it is dropped rather than reduced to an ellipsis in a tab.
  const budget = limit - prefix.length - TITLE_SEP.length - product.length;
  let shown = name;
  if (shown.length > budget) shown = budget >= SCREEN_MIN ? name.slice(0, budget - 1).trimEnd() + "…" : "";
  return prefix + (shown ? shown + TITLE_SEP + product : product);
}

/** Apply `formatTitle` on every route change; pass the screen and the count, never a whole string. */
export function useDocumentTitle(input: TitleInput) {
  const title = formatTitle(input);
  useEffect(() => {
    document.title = title;
  }, [title]);
  return title;
}
