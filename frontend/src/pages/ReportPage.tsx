import { useSessionStore } from "../store/sessionStore";
import { SessionReportView } from "../components/SessionReport";
import { ConversationThread } from "../components/ConversationThread";
import { EventFeed } from "../components/EventFeed";
import { ApprovalCards } from "../components/ApprovalCard";
import { AskBar } from "../components/AskBar";

export function ReportPage({ onBackHome }: { onBackHome: () => void }) {
  const report = useSessionStore((s) => s.report);
  const title = useSessionStore((s) => s.title);
  const sessionId = useSessionStore((s) => s.activeSessionId);
  const segments = useSessionStore((s) => s.segments);

  return (
    <div>
      <button className="btn btn-ghost btn-sm back-link" onClick={onBackHome}>
        Back to sessions
      </button>

      <div className="report-layout">
        <div className="report-main">
          {report ? (
            <>
              <ConversationThread segments={segments} />
              <SessionReportView report={report} title={title} />
            </>
          ) : (
            <div className="panel card-pad">
              <span className="row">
                <span className="spinner spinner-dark" />
                <span className="muted">Writing the session record…</span>
              </span>
            </div>
          )}
        </div>
        <aside className="report-aside">
          <ApprovalCards />
          <EventFeed compact />
          {sessionId && <AskBar sessionId={sessionId} />}
        </aside>
      </div>
    </div>
  );
}
