import { useSessionStore, displayNameFor } from "../store/sessionStore";
import { eventLabel } from "../lib/format";
import { EmptyTranscriptArt, EventGlyph } from "./Illustrations";

export function EventFeed({ compact = false }: { compact?: boolean }) {
  const events = useSessionStore((s) => s.events);
  const participants = useSessionStore((s) => s.participants);

  return (
    <div className="panel card-pad">
      <h3 className="section-title">Detected so far</h3>
      {events.length === 0 ? (
        <div className="empty-state">
          {!compact && <EmptyTranscriptArt />}
          <span>Decisions, actions and deadlines will land here as they are said.</span>
        </div>
      ) : (
        <div>
          {events.map((ev) => {
            const owner = ev.owner_speaker_label
              ? displayNameFor({ participants }, ev.owner_speaker_label)
              : null;
            return (
              <div className="event-item" key={ev.id}>
                <EventGlyph type={ev.type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="event-summary">{ev.summary}</div>
                  <div className="event-meta">
                    {eventLabel(ev.type)}
                    {owner ? ` · ${owner}` : ""}
                    {ev.due_text ? ` · ${ev.due_text}` : ""}
                    {` · ${Math.round(ev.confidence * 100)}%`}
                  </div>
                  <div className="event-quote">“{ev.evidence_quote}”</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
