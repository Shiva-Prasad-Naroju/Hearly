import { useState } from "react";
import { api } from "../api/client";

function base64ToBlob(base64: string, mime: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  return new Blob([new Uint8Array(byteNumbers)], { type: mime });
}

export function AskBar({ sessionId }: { sessionId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.ask(sessionId, question.trim());
      setAnswer(res.answer);
      setCitations(res.citations);
    } catch {
      setErrorMsg("Couldn't get an answer right now.");
    } finally {
      setLoading(false);
    }
  };

  const speak = async () => {
    if (!answer) return;
    setSpeaking(true);
    setErrorMsg(null);
    try {
      const res = await api.tts(answer);
      const blob = base64ToBlob(res.audio_base64, "audio/wav");
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      setErrorMsg("Voice playback failed. Is SARVAM_API_KEY set?");
    } finally {
      setSpeaking(false);
    }
  };

  return (
    <div className="panel card-pad">
      <h3 className="section-title">Ask this conversation</h3>
      <div className="ask-row">
        <input
          className="draft-input"
          placeholder="What did we decide about the deployment?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          aria-label="Question about this conversation"
        />
        <button className="btn btn-secondary btn-sm" onClick={ask} disabled={loading}>
          {loading ? <span className="spinner spinner-dark" /> : "Ask"}
        </button>
      </div>
      {answer && (
        <div className="ask-answer">
          <p className="t-support" style={{ margin: 0, color: "var(--ink)" }}>
            {answer}
          </p>
          {citations.length > 0 && (
            <ul className="report-list" style={{ fontSize: "var(--text-meta)", color: "var(--ink-mute)", marginTop: 8 }}>
              {citations.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
          <button className="btn btn-ghost btn-sm" onClick={speak} disabled={speaking} style={{ marginTop: 8, paddingLeft: 0 }}>
            {speaking ? <span className="spinner spinner-dark" /> : "Play answer"}
          </button>
        </div>
      )}
      {errorMsg && (
        <p className="t-meta" style={{ color: "var(--risk)", marginTop: 8 }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}
