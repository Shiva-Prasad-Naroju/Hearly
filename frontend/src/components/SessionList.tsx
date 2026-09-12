import { useEffect } from "react";
import { useSessionStore } from "../store/sessionStore";
import { api } from "../api/client";
import { formatClock } from "../lib/format";
import { EmptySessionsArt } from "./Illustrations";

function statusClass(status: string) {
  if (status === "complete") return "pill-green";
  if (status === "live") return "pill-red";
  return "pill-grey";
}

function statusLabel(status: string) {
  if (status === "complete") return "Complete";
  if (status === "live") return "Live";
  if (status === "processing") return "Wrapping up";
  return "Created";
}

export function SessionList({ onOpen }: { onOpen: (id: string) => void }) {
  const sessions = useSessionStore((s) => s.sessions);
  const setSessions = useSessionStore((s) => s.setSessions);

  useEffect(() => {
    api.listSessions().then(setSessions).catch(() => undefined);
  }, [setSessions]);

  if (sessions.length === 0) {
    return (
      <div className="workspace-panel">
        <div className="empty-state" style={{ padding: "28px 8px" }}>
          <EmptySessionsArt />
          <span>No sessions yet. Start listening to keep your first record.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-panel">
      {sessions.map((s) => (
        <button className="session-row" key={s.id} type="button" onClick={() => onOpen(s.id)}>
          <div>
            <div className="session-title">{s.title}</div>
            <div className="session-sub">{formatClock(s.started_at) || "Not started"}</div>
          </div>
          <span className={`pill ${statusClass(s.status)}`}>{statusLabel(s.status)}</span>
        </button>
      ))}
    </div>
  );
}
