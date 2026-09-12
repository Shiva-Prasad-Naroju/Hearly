import { useEffect } from "react";
import { useSessionStore } from "../store/sessionStore";

export function AlertToasts() {
  const toasts = useSessionStore((s) => s.toasts);
  const dismissToast = useSessionStore((s) => s.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => window.setTimeout(() => dismissToast(t.toastId), 8000));
    return () => timers.forEach(window.clearTimeout);
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="alert-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div className={`alert-toast alert-${t.level}`} key={t.toastId}>
          <div style={{ flex: 1 }}>
            <div className="t-label">{t.title}</div>
            {t.body && <div className="t-meta" style={{ marginTop: 4, color: "inherit" }}>{t.body}</div>}
          </div>
          <button className="alert-dismiss" onClick={() => dismissToast(t.toastId)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
