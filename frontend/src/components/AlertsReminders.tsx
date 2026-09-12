import { useMemo, useState } from "react";
import { api } from "../api/client";
import { useSessionStore, displayNameFor } from "../store/sessionStore";
import { eventLabel } from "../lib/format";
import type { ConvEvent } from "../api/types";

const REMINDER_TYPES = new Set(["deadline", "action_item", "commitment", "follow_up", "email_request"]);

function ReminderCard({ event, sessionId }: { event: ConvEvent; sessionId: string }) {
  const participants = useSessionStore((s) => s.participants);
  const updateEventLocal = useSessionStore((s) => s.updateEventLocal);
  const addPendingAction = useSessionStore((s) => s.addPendingAction);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const owner = event.owner_name || (event.owner_speaker_label ? displayNameFor({ participants }, event.owner_speaker_label) : null);

  const mark = async (status: "open" | "done") => {
    updateEventLocal(event.id, status);
    try {
      await api.updateEvent(sessionId, event.id, status);
    } catch {
      updateEventLocal(event.id, event.status);
    }
  };

  const mailReminder = async () => {
    setBusy(true);
    setError(null);
    try {
      const action = await api.sendSessionMail(sessionId, {
        to,
        subject: `Reminder: ${event.summary}`,
        body: [
          "Hi,",
          "",
          `Reminder from the conversation: ${event.summary}`,
          event.due_text ? `When: ${event.due_text}` : "",
          owner ? `Owner: ${owner}` : "",
          "",
          "Thanks",
        ]
          .filter(Boolean)
          .join("\n"),
      });
      addPendingAction(action);
      setTo("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the reminder.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`reminder-card${event.status === "done" ? " is-done" : ""}`}>
      <div className="row-between">
        <span className={`pill ${event.type === "deadline" || event.type === "risk" ? "pill-amber" : "pill-blue"}`}>
          {eventLabel(event.type)}
        </span>
        {event.due_text && <span className="t-meta">{event.due_text}</span>}
      </div>
      <h3 className="reminder-title">{event.summary}</h3>
      <p className="t-meta">
        {owner ? `${owner}` : "Unassigned"}
        {` · ${Math.round(event.confidence * 100)}%`}
      </p>
      {event.evidence_quote && <p className="event-quote">“{event.evidence_quote}”</p>}

      <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
        {event.status === "done" ? (
          <button className="btn btn-ghost btn-sm" onClick={() => void mark("open")}>
            Reopen
          </button>
        ) : (
          <button className="btn btn-secondary btn-sm" onClick={() => void mark("done")}>
            Mark done
          </button>
        )}
      </div>

      {event.status !== "done" && (
        <div className="reminder-mail">
          <input
            className="draft-input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="email@address.com"
            aria-label="Reminder recipient"
          />
          <button className="btn btn-primary btn-sm" onClick={mailReminder} disabled={busy || !to.trim()}>
            {busy && <span className="spinner" />}
            Email reminder
          </button>
        </div>
      )}
      {error && <p className="t-meta" style={{ color: "var(--risk)", marginTop: 8 }}>{error}</p>}
    </article>
  );
}

export function AlertsReminders({ sessionId }: { sessionId: string }) {
  const alerts = useSessionStore((s) => s.alerts);
  const events = useSessionStore((s) => s.events);
  const reminders = useMemo(
    () => events.filter((ev) => REMINDER_TYPES.has(ev.type)),
    [events],
  );

  return (
    <div className="stack">
      <section className="panel card-pad">
        <h3 className="section-title">Alerts</h3>
        {alerts.length === 0 ? (
          <p className="muted">No alerts fired in this session.</p>
        ) : (
          alerts.map((alert) => (
            <div className={`alert-row alert-${alert.level}`} key={alert.id}>
              <strong>{alert.title}</strong>
              {alert.body && <p className="t-meta">{alert.body}</p>}
            </div>
          ))
        )}
      </section>

      <section>
        <div className="convo-head" style={{ marginBottom: 12 }}>
          <h3 className="convo-heading">Triggers and reminders</h3>
          <p className="t-meta">Deadlines, promises, and follow-ups</p>
        </div>
        {reminders.length === 0 ? (
          <div className="panel card-pad">
            <p className="muted">Nothing to chase yet. Promises and dates will land here.</p>
          </div>
        ) : (
          <div className="reminder-grid">
            {reminders.map((ev) => (
              <ReminderCard key={ev.id} event={ev} sessionId={sessionId} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
