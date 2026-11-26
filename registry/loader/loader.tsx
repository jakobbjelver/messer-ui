/**
 * The canon loader: one small animated mark in the exact region the content will fill, never a grey
 * copy of the page. Nine 4 px squares on a 3×3 grid, one wave, reduced-motion aware.
 *
 * The region keeps its height while the query runs — wrap it where the content will be:
 *
 *   {isPending ? <div className="min-h-[320px]"><Loader label="Reading the register" /></div> : content}
 *
 * A spinner belongs inside the control that was pressed; this block is for content.
 */
export function Loader({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-loader=""
      className={[
        "flex items-center justify-center gap-3 py-16 text-[var(--text-3)]",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      <span className="messer-loader" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <span
            key={i}
            style={{ animationDelay: `${(i % 3) * 0.12 + Math.floor(i / 3) * 0.06}s` }}
          />
        ))}
      </span>
      <span className="m-label">{label}</span>
    </div>
  );
}
