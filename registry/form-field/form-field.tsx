"use client";

import type { ReactNode } from "react";

export type FormFieldProps = {
  label: string;
  /** The control's id; the label points at it. */
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  /**
   * One action that belongs to the field — Generate, Generate password, Reveal —
   * rendered at the right end of the label row. Never inside the input: a button
   * there competes with the text, and on iOS it is a mis-tap away from firing.
   */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * A labelled control: label row, control, one line of explanation.
 *
 * The action lives in the label row, right-aligned, because that is where a
 * person looks for it and because putting it in the input is how a password
 * field ends up regenerating its value when the eye is tapped.
 *
 * `error` replaces `hint` rather than stacking under it: a field with two lines
 * of small text under it is a field nobody finishes reading.
 *
 * Wire `aria-describedby` yourself (`${htmlFor}-hint` / `${htmlFor}-error`) — this
 * block renders the id, it cannot see your control.
 */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  action,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <div className="flex min-h-7 items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium leading-tight">
          {label}
        </label>
        {action}
      </div>

      {children}

      {error ? (
        <p id={`${htmlFor}-error`} className="m-0 text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="m-0 text-xs text-[var(--text-3)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
