export function PageFooter({
  children,
  meta,
  className = "",
}: {
  children?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <footer
      data-page-footer
      className={[
        "mt-auto border-t border-[var(--border)] pt-3",
        "text-[12.5px] leading-relaxed text-[var(--text-3)]",
        className,
      ].join(" ")}
    >
      {children ? <div className="max-w-[72ch]">{children}</div> : null}
      {meta ? <div className="m-label mt-2 text-[var(--text-3)]">{meta}</div> : null}
    </footer>
  );
}
