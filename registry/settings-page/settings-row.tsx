"use client";

import type { ReactNode } from "react";

export type SettingsRowProvenance =
  | { kind: "default" }
  | { kind: "custom"; onReset?: () => void }
  | { kind: "env"; variable: string };

export type SettingsRowProps = {
  label: string;
  description?: ReactNode;
  /** The control's id, so the label points at it. */
  htmlFor: string;
  /** Where the current value comes from — never a dirty marker; that is `unsaved`. */
  provenance: SettingsRowProvenance;
  unsaved?: boolean;
  error?: string;
  children: ReactNode;
};

/**
 * One setting: what it is on the left, the control on the right, and where the
 * value comes from underneath.
 *
 * Three states, three words: `DEFAULT` (nothing written), `CUSTOM` (the page
 * wrote this, with Reset beside it), or the environment's variable in a code box
 * (the value is pinned; the control is disabled by the caller and keeps whatever
 * the page last stored underneath, so removing the variable restores it).
 *
 * `UNSAVED` sits next to the label rather than replacing the provenance: they
 * answer different questions, and a row can be both.
 *
 * The label never wraps the control — a `<label>` activates its first labelable
 * descendant, so an action inside one fires on any tap in the row (canon R16).
 */
export function SettingsRow({
  label,
  description,
  htmlFor,
  provenance,
  unsaved = false,
  error,
  children,
}: SettingsRowProps) {
  return (
    <div className="grid gap-3 border-b border-border py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,17rem)] sm:items-start sm:gap-6">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <label htmlFor={htmlFor} className="text-sm font-medium leading-tight">
            {label}
          </label>
          {unsaved ? (
            <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--text-2)]">
              unsaved
            </span>
          ) : null}
          <Provenance value={provenance} />
        </div>
        {description ? <p className="m-0 text-sm text-[var(--text-2)]">{description}</p> : null}
      </div>

      <div className="grid gap-1.5">
        {children}
        {error ? <p className="m-0 text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}

function Provenance({ value }: { value: SettingsRowProvenance }) {
  const base = "font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--text-3)]";

  if (value.kind === "env") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <code className="border border-border bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[11px] normal-case tracking-normal text-[var(--text-2)]">
          {value.variable}
        </code>
        <span className={base} title="Set by the environment; change the variable to change this">
          env
        </span>
      </span>
    );
  }

  if (value.kind === "custom") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={base}>custom</span>
        {value.onReset ? (
          <button
            type="button"
            onClick={value.onReset}
            className="inline-flex h-7 items-center border border-border px-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--text-2)] transition-colors duration-150 hover:text-foreground"
          >
            Reset
          </button>
        ) : null}
      </span>
    );
  }

  return <span className={base}>default</span>;
}
