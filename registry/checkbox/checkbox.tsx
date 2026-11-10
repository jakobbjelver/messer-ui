import type { InputHTMLAttributes, ReactNode } from "react";
import { Check } from "@phosphor-icons/react";

/**
 * The canon checkbox. A native input with `appearance-none` over a Phosphor glyph, so it works in
 * Radix, Base UI and Astro without importing a primitive — the checkbox is the one atom where the
 * base library buys nothing and a native control keeps keyboard and form behaviour for free.
 *
 * Square (rule 1, radius 0), 16px, no shadow (rule 2), and the focus ring comes from the base
 * `:focus-visible` rule rather than being drawn here, so it matches every other control.
 */
export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Rendered inside a <label>; omit it and pass aria-label instead. */
  label?: ReactNode;
};

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const control = (
    <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
      <input
        id={id}
        type="checkbox"
        className={[
          "peer size-4 cursor-pointer appearance-none border border-[var(--border-strong)]",
          "bg-[var(--surface)] transition-colors duration-150",
          "checked:border-primary checked:bg-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-[var(--destructive)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
      <Check
        aria-hidden="true"
        size={12}
        weight="bold"
        className="pointer-events-none absolute hidden text-[var(--primary-foreground)] peer-checked:block"
      />
    </span>
  );

  if (!label) return control;

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--foreground)]">
      {control}
      {label}
    </label>
  );
}
