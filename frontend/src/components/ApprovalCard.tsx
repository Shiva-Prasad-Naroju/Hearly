import { useState } from "react";
import type { PendingAction } from "../api/types";
import { api } from "../api/client";
import { useSessionStore } from "../store/sessionStore";

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function SingleApproval({ action }: { action: PendingAction }) {
  const updatePendingAction = useSessionStore((s) => s.updatePendingAction);
  const [to, setTo] = useState(action.args.to);
  const [subject, setSubject] = useState(action.args.subject);
  const [cc, setCc] = useState((action.args.cc ?? []).join(", "));
  const [body, setBody] = useState(action.args.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.approveAction(action.id, {
        to,
        subject,
        cc: cc.split(",").map((c) => c.trim()).filter(Boolean),
        body,
      });
      updatePendingAction(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the email.");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    try {
      const updated = await api.rejectAction(action.id);
      updatePendingAction(updated);
    } finally {
      setBusy(false);
    }
  };

  if (action.status === "rejected") {
    return (
      <div className="panel card-pad">
        <span className="muted t-support">Dismissed a draft email to {action.args.to || "an unnamed recipient"}.</span>
      </div>
    );
  }

  if (action.status === "executed" || action.status === "approved") {
    const sentTo = action.result?.to || action.args.to;
    return (
      <div className="approval-card is-done">
        <div className="row-between">
          <strong className="t-card">{action.result?.sent ? "Email sent" : "Draft approved"}</strong>
          <span className="pill pill-green">{action.result?.sent ? "Sent" : "Approved"}</span>
        </div>
        <p className="t-meta" style={{ marginTop: 8 }}>
          {action.result?.sent
            ? `Sent to ${sentTo} from your Gmail.`
            : "The draft is ready."}
        </p>
      </div>
    );
  }

  return (
    <div className="approval-card">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <strong className="t-card">Follow-up to send</strong>
        <span className="pill pill-blue">{Math.round(action.confidence * 100)}%</span>
      </div>
      {action.reason && (
        <p className="t-meta" style={{ margin: "0 0 12px" }}>
          {action.reason}
        </p>
      )}
      <p className="t-meta" style={{ margin: "0 0 12px" }}>
        Add the recipient address, then send from your Gmail.
      </p>

      {!looksLikeEmail(to) && (
        <div className="pill pill-amber" style={{ marginBottom: 12 }}>
          Recipient still needs a real email address
        </div>
      )}

      <div className="field-row">
        <label className="field-label" htmlFor={`to-${action.id}`}>To</label>
        <input
          id={`to-${action.id}`}
          className="draft-input"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="name@company.com"
        />
      </div>
      <div className="field-row">
        <label className="field-label" htmlFor={`cc-${action.id}`}>Cc</label>
        <input id={`cc-${action.id}`} className="draft-input" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="comma-separated" />
      </div>
      <div className="field-row">
        <label className="field-label" htmlFor={`subject-${action.id}`}>Subject</label>
        <input id={`subject-${action.id}`} className="draft-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <textarea className="draft-body" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Email body" />

      {error && (
        <p className="t-meta" style={{ color: "var(--risk)", marginTop: 8 }}>
          {error}
        </p>
      )}

      <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
        <button className="btn btn-ghost btn-sm" onClick={reject} disabled={busy}>
          Dismiss
        </button>
        <button className="btn btn-primary btn-sm" onClick={send} disabled={busy}>
          {busy && <span className="spinner" />}
          Send from Gmail
        </button>
      </div>
    </div>
  );
}

export function ApprovalCards() {
  const pendingActions = useSessionStore((s) => s.pendingActions);
  if (pendingActions.length === 0) return null;

  return (
    <div className="stack">
      {pendingActions.map((a) => (
        <SingleApproval key={a.id} action={a} />
      ))}
    </div>
  );
}
