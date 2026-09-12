import { useMemo, useState } from "react";
import { useSessionStore, displayNameFor } from "../store/sessionStore";
import { avatarColor, initialsFor } from "../lib/format";
import { api } from "../api/client";
import type { Segment } from "../api/types";

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
      /* local name still stands */
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        className="draft-input convo-name-input"
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
      className="convo-name"
      onClick={() => {
        const raw = name.replace(/\?$/, "");
        setValue(raw.startsWith("Speaker ") ? "" : raw);
        setEditing(true);
      }}
      title="Rename this speaker"
    >
      {name}
    </button>
  );
}

function groupTurns(segments: Segment[]): { speaker: string; texts: string[]; id: string }[] {
  const groups: { speaker: string; texts: string[]; id: string }[] = [];
  for (const seg of segments) {
    const last = groups[groups.length - 1];
    if (last && last.speaker === seg.speaker_label) {
      last.texts.push(seg.text);
    } else {
      groups.push({ speaker: seg.speaker_label, texts: [seg.text], id: seg.id });
    }
  }
  return groups;
}

export function ConversationThread({ segments }: { segments: Segment[] }) {
  const participants = useSessionStore((s) => s.participants);
  const turns = useMemo(() => groupTurns(segments), [segments]);
  const speakerLabels = useMemo(
    () => [...new Set(segments.map((s) => s.speaker_label))],
    [segments],
  );

  if (segments.length === 0) {
    return (
      <section className="convo">
        <h3 className="convo-heading">The conversation</h3>
        <p className="muted">No speech was captured in this session.</p>
      </section>
    );
  }

  return (
    <section className="convo">
      <div className="convo-head">
        <h3 className="convo-heading">The conversation</h3>
        <p className="t-meta">Tap a name to rename it</p>
      </div>
      {speakerLabels.length > 1 && (
        <ul className="convo-people">
          {speakerLabels.map((label) => {
            const name = displayNameFor({ participants }, label);
            return (
              <li key={label} className="convo-person">
                <span className="avatar" style={{ background: avatarColor(label) }}>
                  {initialsFor(name)}
                </span>
                <SpeakerName speakerLabel={label} />
              </li>
            );
          })}
        </ul>
      )}
      <ol className="convo-list">
        {turns.map((turn) => {
          const name = displayNameFor({ participants }, turn.speaker);
          return (
            <li className="convo-turn" key={turn.id}>
              <div className="avatar" style={{ background: avatarColor(turn.speaker) }}>
                {initialsFor(name)}
              </div>
              <div className="convo-body">
                <SpeakerName speakerLabel={turn.speaker} />
                {turn.texts.map((text, i) => (
                  <p className="convo-text" key={`${turn.id}-${i}`}>
                    {text}
                  </p>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
