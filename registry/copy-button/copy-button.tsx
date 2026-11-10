"use client";

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";

export type CopyButtonProps = {
  value: string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Icon-only copy control at a control height (28 or 32). The label is the accessible name; wrap it
 * in HybridTooltip when the surface wants a visible one.
 */
export function CopyButton({ value, label = "Copy", size = "md", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: leave the button in its resting state */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      className={[
        "inline-grid shrink-0 place-items-center border border-[var(--border-strong)] bg-[var(--surface)]",
        "text-[var(--text-2)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
        size === "sm" ? "size-7" : "size-8",
        className ?? "",
      ].join(" ")}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}
