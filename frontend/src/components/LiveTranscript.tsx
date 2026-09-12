import { useEffect, useRef, useState } from "react";
import { useSessionStore, displayNameFor } from "../store/sessionStore";
import { avatarColor, initialsFor } from "../lib/format";
import { api } from "../api/client";
import { EmptyTranscriptArt } from "./Illustrations";

function SpeakerName({ speakerLabel }: { speakerLabel: string }) {
  const sessionId = useSessionStore((s) => s.activeSessionId);
  const participants = useSessionStore((s) => s.participants);
  const renameParticipantLocal = useSessionStore((s) => s.renameParticipantLocal);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const name = displayNameFor({ participants }, speakerLabel);

  const save = async () => {
    setEditing(false);
    const trimmed = value.trim();
    if (!trimmed || !sessionId) return;
    renameParticipantLocal(speakerLabel, trimmed);
    try {
      await api.renameParticipant(sessionId, speakerLabel, trimmed);
    } catch {
      /* local optimistic rename stands even if the request fails */
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        className="draft-input"
        style={{ width: 140, display: "inline-block", padding: "2px 6px", minHeight: 28 }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && save()}
        aria-label="Speaker name"
      />
    );
  }

  return (
    <button
      className="transcript-speaker"
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
      onClick={() => {
        setValue(name.replace("Speaker ", "").replace("?", ""));
        setEditing(true);
      }}
      title="Rename speaker"
    >
      {name}
    </button>
  );
}

export function LiveTranscript() {
  const segments = useSessionStore((s) => s.segments);
  const participants = useSessionStore((s) => s.participants);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [segments.length]);

  return (
    <div className="panel card-pad transcript-panel">
      <h3 className="section-title">Live transcript</h3>
      <div className="transcript-list" ref={listRef}>
        {segments.length === 0 && (
          <div className="empty-state">
            <EmptyTranscriptArt />
            <span>Waiting for the first words…</span>
          </div>
        )}
        {segments.map((seg) => {
          const name = displayNameFor({ participants }, seg.speaker_label);
          return (
            <div className="transcript-turn" key={seg.id}>
              <div className="avatar" style={{ background: avatarColor(seg.speaker_label) }}>
                {initialsFor(name)}
              </div>
              <div className="transcript-body">
                <SpeakerName speakerLabel={seg.speaker_label} />
                <div className="transcript-text">{seg.text}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
