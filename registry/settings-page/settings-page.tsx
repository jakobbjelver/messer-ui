"use client";

import type { ReactNode } from "react";

export type SettingsPageProps = {
  title: string;
  description?: ReactNode;
  /** How many rows differ from the values the API returned. */
  unsaved: number;
  pending?: boolean;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  children: ReactNode;
};

/**
 * A settings page whose values live behind one Save.
 *
 * The page owns the draft; this block owns the bar. Per-row save buttons are the
 * wrong shape past a handful of values — twenty buttons is twenty chances to
 * forget one, and one button over twenty rows turns a typo into a page-wide
 * rejection. Here the bar is global and the error still lands per row
 * (`SettingsRow`), which is what the server's `field` is for.
 */
export function SettingsPage({
  title,
  description,
  unsaved,
  pending = false,
  onSave,
  onDiscard,
  children,
}: SettingsPageProps) {
  const dirty = unsaved > 0;

  return (
    <div className="grid gap-6 pb-2">
      <header className="grid gap-1">
        <h1 className="m-0 text-xl font-medium leading-tight">{title}</h1>
        {description ? <p className="m-0 text-sm text-[var(--text-2)]">{description}</p> : null}
      </header>

      <div className="grid border border-border bg-[var(--surface)] px-4 sm:px-5">{children}</div>

      <div
        className="sticky bottom-0 z-10 -mx-4 flex items-center gap-2 border-t border-border bg-[var(--background)] px-4 py-3 sm:-mx-6 sm:px-6"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <span
          aria-live="polite"
          className="mr-auto font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--text-3)]"
        >
          {pending ? "saving" : dirty ? `${unsaved} unsaved` : "all saved"}
        </span>
        <button
          type="button"
          onClick={onDiscard}
          disabled={!dirty || pending}
          className="inline-flex h-8 items-center justify-center border border-border px-3 text-sm font-medium text-[var(--text-2)] transition-colors duration-150 hover:text-foreground disabled:opacity-50"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || pending}
          className="inline-flex h-8 items-center justify-center bg-primary px-3 text-sm font-medium text-[var(--primary-foreground)] transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
