import { useCallback, useRef, useState } from "react";
import { useSessionStore } from "./store/sessionStore";
import { api } from "./api/client";
import { useAudioCapture } from "./hooks/useAudioCapture";
import { Header } from "./components/Header";
import { ConsentModal } from "./components/ConsentModal";
import { AlertToasts } from "./components/AlertToasts";
import { HomePage } from "./pages/HomePage";
import { LivePage } from "./pages/LivePage";
import { ReportPage } from "./pages/ReportPage";

export default function App() {
  const view = useSessionStore((s) => s.view);
  const setView = useSessionStore((s) => s.setView);
  const resetLiveState = useSessionStore((s) => s.resetLiveState);
  const loadSessionDetail = useSessionStore((s) => s.loadSessionDetail);
  const setRecording = useSessionStore((s) => s.setRecording);
  const tickElapsed = useSessionStore((s) => s.tickElapsed);
  const setReport = useSessionStore((s) => s.setReport);
  const elapsedSeconds = useSessionStore((s) => s.elapsedSeconds);

  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const uploadsRef = useRef<Promise<unknown>[]>([]);
  const [chunkError, setChunkError] = useState<string | null>(null);

  const onChunk = useCallback(async (blob: Blob, speakerLabel: string) => {
    const sessionId = useSessionStore.getState().activeSessionId;
    if (!sessionId) return;
    const upload = (async () => {
      try {
        const resp = await api.uploadAudioChunk(sessionId, speakerLabel, blob);
        useSessionStore.getState().mergeAudioChunkResponse(resp);
        setChunkError(null);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Transcription failed.";
        setChunkError(message);
        console.error("chunk upload failed", e);
      }
    })();
    uploadsRef.current.push(upload);
    await upload;
  }, []);

  const getSpeakerLabel = useCallback(() => useSessionStore.getState().activeSpeaker, []);

  const audioCapture = useAudioCapture({ chunkMs: 10000, getSpeakerLabel, onChunk });

  const startTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => tickElapsed(), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleStartListening = async () => {
    setStarting(true);
    try {
      const session = await api.createSession(`Conversation – ${new Date().toLocaleString()}`);
      setPendingSessionId(session.id);
      setShowConsent(true);
    } catch (e) {
      console.error(e);
      alert("Couldn't start a new session. Is the backend running?");
    } finally {
      setStarting(false);
    }
  };

  const handleConfirmConsent = async () => {
    if (!pendingSessionId) return;
    setStarting(true);
    try {
      const session = await api.startSession(pendingSessionId);
      resetLiveState(session.id, session.title);
      uploadsRef.current = [];
      setChunkError(null);
      await audioCapture.start();
      setRecording(true);
      startTimer();
    } catch (e) {
      console.error(e);
      alert("Couldn't start listening. Check the backend logs.");
    } finally {
      setShowConsent(false);
      setPendingSessionId(null);
      setStarting(false);
    }
  };

  const handleStop = async () => {
    const sessionId = useSessionStore.getState().activeSessionId;
    if (!sessionId) return;
    setStopping(true);
    setRecording(false);
    stopTimer();
    try {
      await audioCapture.stop();
      await Promise.allSettled(uploadsRef.current);
      const session = await api.stopSession(sessionId);
      try {
        const detail = await api.getSession(sessionId);
        loadSessionDetail(detail);
        setReport(detail.report ?? session.report);
      } catch {
        setReport(session.report);
      }
    } catch (e) {
      console.error(e);
      alert("Couldn't finalize the session, but nothing was lost — try reopening it from the list.");
      setView("home");
    } finally {
      setStopping(false);
    }
  };

  const handleOpenSession = async (id: string) => {
    try {
      const detail = await api.getSession(id);
      loadSessionDetail(detail);
      setView(detail.status === "complete" ? "report" : detail.status === "live" ? "live" : "home");
    } catch (e) {
      console.error(e);
    }
  };

  const handleBackHome = () => setView("home");
  const shellKind = view === "home" ? "landing" : view === "live" ? "listen" : "work";

  return (
    <div className={`app-shell app-shell--${shellKind}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header
        onStartListening={view === "home" ? handleStartListening : undefined}
        starting={starting}
      />
      {view !== "live" && <AlertToasts />}
      <main id="main" className={`app-main app-main--${shellKind}`}>
        {view === "home" && (
          <HomePage onStartListening={handleStartListening} onOpenSession={handleOpenSession} starting={starting} />
        )}
        {view === "live" && (
          <LivePage
            onStop={handleStop}
            stopping={stopping}
            micError={audioCapture.error || chunkError}
            level={audioCapture.level}
            elapsedSeconds={elapsedSeconds}
          />
        )}
        {view === "report" && <ReportPage onBackHome={handleBackHome} />}
      </main>

      {showConsent && (
        <ConsentModal
          busy={starting}
          onConfirm={handleConfirmConsent}
          onCancel={() => {
            setShowConsent(false);
            setPendingSessionId(null);
          }}
        />
      )}
    </div>
  );
}
