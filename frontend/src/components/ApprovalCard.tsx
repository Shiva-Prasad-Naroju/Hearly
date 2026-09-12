import { useState } from "react";
import type { PendingAction } from "../api/types";
import { api } from "../api/client";
import { useSessionStore } from "../store/sessionStore";

function SingleApproval({ action }: { action: PendingAction }) {
  const updatePendingAction = useSessionStore((s) => s.updatePendingAction);
  const [to, setTo] = useState(action.args.to);
  const [subject, setSubject] = useState(action.args.subject);
  const [cc, setCc] = useState((action.args.cc ?? []).join(", "));
  const [body, setBody] = useState(action.args.body);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const approve = async () => {
    setBusy(true);
    try {
      const updated = await api.approveAction(action.id, {
        to,
        subject,
        cc: cc.split(",").map((c) => c.trim()).filter(Boolean),
        body,
      });
      updatePendingAction(updated);
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

  const copyDraft = async () => {
    if (!action.result) return;
    await navigator.clipboard.writeText(action.result.eml_text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (action.status === "rejected") {
    return (
      <div className="panel card-pad">
        <span className="muted t-support">Dismissed a draft email to {action.args.to}.</span>
      </div>
    );
  }

  if (action.status === "executed" || action.status === "approved") {
    return (
      <div className="approval-card is-done">
        <div className="row-between">
          <strong className="t-card">Draft ready to copy</strong>
          <span className="pill pill-green">Approved</span>
        </div>
        <p className="t-meta" style={{ marginTop: 8 }}>
          Send it from your own mail client. Hearly never sends email.
        </p>
        <button className="btn btn-secondary btn-sm" onClick={copyDraft} style={{ marginTop: 12 }}>
          {copied ? "Copied" : "Copy draft"}
        </button>
      </div>
    );
  }

  return (
    <div className="approval-card">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <strong className="t-card">Email draft to review</strong>
        <span className="pill pill-blue">{Math.round(action.confidence * 100)}%</span>
      </div>

      {!action.args.recipient_resolved && (
        <div className="pill pill-amber" style={{ marginBottom: 12 }}>
          Recipient is not a confirmed address
        </div>
      )}

      <div className="field-row">
        <label className="field-label" htmlFor={`to-${action.id}`}>To</label>
        <input id={`to-${action.id}`} className="draft-input" value={to} onChange={(e) => setTo(e.target.value)} />
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

      <p className="t-meta" style={{ marginTop: 10, marginBottom: 4 }}>
        Because: {action.reason}
      </p>

      <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
        <button className="btn btn-ghost btn-sm" onClick={reject} disabled={busy}>
          Dismiss
        </button>
        <button className="btn btn-primary btn-sm" onClick={approve} disabled={busy}>
          {busy && <span className="spinner" />}
          Approve draft
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
