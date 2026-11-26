import { AlertDialog } from "radix-ui";

/**
 * The one confirmation shape. Radix owns focus trapping, Escape and the
 * labelled/described semantics; this block owns the canon chrome.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
}) {
  const confirmClass =
    tone === "danger"
      ? "bg-[var(--destructive)] text-white hover:opacity-90"
      : "bg-primary text-primary-foreground hover:opacity-90";
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <AlertDialog.Content
          data-slot="confirm-dialog"
          className="fixed left-1/2 top-1/2 z-50 w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 border border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-[var(--shadow-pop)]"
        >
          <AlertDialog.Title className="m-0 text-xl font-medium tracking-tight text-[var(--foreground)]">
            {title}
          </AlertDialog.Title>
          {description ? (
            <AlertDialog.Description className="m-0 mt-2 text-sm leading-relaxed text-[var(--text-2)]">
              {description}
            </AlertDialog.Description>
          ) : null}
          {children ? <div className="mt-4 text-sm text-[var(--text-2)]">{children}</div> : null}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                disabled={busy}
                className="h-8 cursor-pointer border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelLabel}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                disabled={busy}
                onClick={(event) => {
                  event.preventDefault();
                  void onConfirm();
                }}
                className={`h-8 cursor-pointer border border-transparent px-4 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${confirmClass}`}
              >
                {busy ? "Working…" : confirmLabel}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
