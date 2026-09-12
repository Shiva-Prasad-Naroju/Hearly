import { useState } from "react";
import { api } from "../api/client";
import { useBrowserTts } from "../hooks/useBrowserTts";

export function AskBar({ sessionId }: { sessionId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const tts = useBrowserTts();

  const ask = async () => {
    if (!question.trim()) return;
    tts.stop();
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
          <div className="ask-speak">
            {tts.speaking ? (
              <button className="btn btn-ghost btn-sm ask-speak-btn" onClick={tts.stop}>
                <span className="ask-speak-wave" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                Stop speaking
              </button>
            ) : (
              <button
                className="btn btn-ghost btn-sm ask-speak-btn"
                onClick={() => void tts.speak(answer)}
                disabled={!tts.supported}
              >
                Hear the answer
              </button>
            )}
          </div>
        </div>
      )}
      {(errorMsg || tts.error) && (
        <p className="t-meta" style={{ color: "var(--risk)", marginTop: 8 }}>
          {errorMsg || tts.error}
        </p>
      )}
    </div>
  );
}
