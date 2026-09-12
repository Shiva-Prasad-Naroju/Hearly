import { useState } from "react";
import { api } from "../api/client";
import { useSessionStore } from "../store/sessionStore";

export function MailCompose({ sessionId }: { sessionId: string }) {
  const report = useSessionStore((s) => s.report);
  const addPendingAction = useSessionStore((s) => s.addPendingAction);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(report?.summary ? `Follow-up: ${report.summary.slice(0, 60)}` : "Follow-up from our conversation");
  const [body, setBody] = useState(() => {
    const bits = [
      report?.summary,
      ...(report?.action_items ?? []).map((item) => `• ${item}`),
    ].filter(Boolean);
    return bits.length
      ? `Hi,\n\n${bits.join("\n\n")}\n\nThanks`
      : "Hi,\n\nFollowing up from our conversation.\n\nThanks";
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const send = async () => {
    setBusy(true);
    setError(null);
    setSent(false);
    try {
      const action = await api.sendSessionMail(sessionId, {
        to,
        cc: cc.split(",").map((c) => c.trim()).filter(Boolean),
        subject,
        body,
      });
      addPendingAction(action);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the email.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="approval-card">
      <strong className="t-card">Write your own</strong>
      <p className="t-meta" style={{ margin: "8px 0 14px" }}>
        No one promised a mail, or you want a different one. This still goes from your Gmail.
      </p>
      <div className="field-row">
        <label className="field-label" htmlFor="compose-to">To</label>
        <input id="compose-to" className="draft-input" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@company.com" />
      </div>
      <div className="field-row">
        <label className="field-label" htmlFor="compose-cc">Cc</label>
        <input id="compose-cc" className="draft-input" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="optional" />
      </div>
      <div className="field-row">
        <label className="field-label" htmlFor="compose-subject">Subject</label>
        <input id="compose-subject" className="draft-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <textarea className="draft-body" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Email body" />
      {error && <p className="t-meta" style={{ color: "var(--risk)", marginTop: 8 }}>{error}</p>}
      {sent && <p className="t-meta" style={{ color: "var(--ok)", marginTop: 8 }}>Sent.</p>}
      <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
        <button className="btn btn-primary btn-sm" onClick={send} disabled={busy || !to.trim()}>
          {busy && <span className="spinner" />}
          Send from Gmail
        </button>
      </div>
    </div>
  );
}
