import React from "react";
import { createPortal } from "react-dom";

const NotificationPanel = React.forwardRef(function NotificationPanel(
  { open, loading, error, notifications, onClose, container },
  ref,
) {
  const [mountNode, setMountNode] = React.useState(null);

  React.useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const target = container ?? document.body;
    setMountNode(target);
    return undefined;
  }, [container]);

  if (!open || !mountNode) return null;

  return createPortal(
    <div
      ref={ref}
      className="pointer-events-auto fixed right-4 top-24 z-40 w-80 rounded-2xl border border-white/20 bg-[rgba(var(--surface-card),0.96)] p-4 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 md:right-8 md:top-28"
      role="dialog"
      aria-live="polite"
    >
      <header className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">Notificações</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-xs text-[rgb(var(--text-secondary))] transition hover:bg-white/20"
          aria-label="Fechar Notificações"
        >
          ?-
        </button>
      </header>

      <div className="max-h-64 space-y-3 overflow-y-auto pr-1 text-sm">
        {loading ? (
          <p className="text-[rgb(var(--text-secondary))]">Carregando novidades…</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : notifications?.length ? (
          notifications.map((notification) => (
            <article
              key={notification.id}
              className="rounded-xl border border-white/15 bg-white/40 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/5"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-[color:rgba(var(--color-secondary-primary),0.8)]">
                {notification.type === "success" ? "Atualização" : "Info"}
              </p>
              <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">{notification.title}</p>
              <p className="text-xs text-[rgb(var(--text-secondary))]">{notification.message}</p>
              <span className="text-[10px] text-[rgb(var(--text-subtle))]">{notification.time}</span>
            </article>
          ))
        ) : (
          <p className="text-[rgb(var(--text-secondary))]">Nenhuma notificação por enquanto.</p>
        )}
      </div>
    </div>,
    mountNode,
  );
});

export default NotificationPanel;


