import { useState } from "react";
import { useSessionStore } from "../store/sessionStore";
import { SessionReportView } from "../components/SessionReport";
import { ConversationThread } from "../components/ConversationThread";
import { ApprovalCards } from "../components/ApprovalCard";
import { AskBar } from "../components/AskBar";
import { AlertsReminders } from "../components/AlertsReminders";
import { MailCompose } from "../components/MailCompose";

type ReportTab = "conversation" | "summary" | "alerts" | "mail";

const TABS: { id: ReportTab; label: string }[] = [
  { id: "conversation", label: "Conversation" },
  { id: "summary", label: "Summary" },
  { id: "alerts", label: "Alerts" },
  { id: "mail", label: "Mail" },
];

export function ReportPage({ onBackHome }: { onBackHome: () => void }) {
  const report = useSessionStore((s) => s.report);
  const title = useSessionStore((s) => s.title);
  const sessionId = useSessionStore((s) => s.activeSessionId);
  const segments = useSessionStore((s) => s.segments);
  const pendingActions = useSessionStore((s) => s.pendingActions);
  const alerts = useSessionStore((s) => s.alerts);
  const [tab, setTab] = useState<ReportTab>("conversation");

  const mailCount = pendingActions.filter((a) => a.status === "pending").length;
  const alertCount = alerts.length;

  return (
    <div>
      <button className="btn btn-ghost btn-sm back-link" onClick={onBackHome}>
        Back to sessions
      </button>

      <div className="report-tabs" role="tablist" aria-label="Session record">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            className={`report-tab${tab === item.id ? " is-active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.id === "mail" && mailCount > 0 && <span className="tab-count">{mailCount}</span>}
            {item.id === "alerts" && alertCount > 0 && <span className="tab-count">{alertCount}</span>}
          </button>
        ))}
      </div>

      {!report ? (
        <div className="panel card-pad">
          <span className="row">
            <span className="spinner spinner-dark" />
            <span className="muted">Writing the session record…</span>
          </span>
        </div>
      ) : (
        <div className="report-tab-panel">
          {tab === "conversation" && <ConversationThread segments={segments} />}
          {tab === "summary" && (
            <div className="report-main">
              <SessionReportView report={report} title={title} />
              {sessionId && <AskBar sessionId={sessionId} />}
            </div>
          )}
          {tab === "alerts" && sessionId && <AlertsReminders sessionId={sessionId} />}
          {tab === "mail" && sessionId && (
            <div className="report-main">
              <ApprovalCards />
              <MailCompose sessionId={sessionId} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
