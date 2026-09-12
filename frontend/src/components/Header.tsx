import { useSessionStore } from "../store/sessionStore";
import { BrandMark } from "./Illustrations";

interface HeaderProps {
  onStartListening?: () => void;
  starting?: boolean;
}

export function Header({ onStartListening, starting }: HeaderProps) {
  const view = useSessionStore((s) => s.view);
  const isRecording = useSessionStore((s) => s.isRecording);
  const setView = useSessionStore((s) => s.setView);

  const goHome = () => {
    if (!isRecording) setView("home");
  };

  return (
    <header className="app-header">
      <button
        className="brand"
        onClick={goHome}
        disabled={isRecording}
        aria-label="Hearly home"
      >
        <BrandMark />
        Hearly
      </button>

      {view === "home" && (
        <nav className="header-nav" aria-label="Page">
          <a className="header-link" href="#how-it-works">
            How it works
          </a>
          <a className="header-link" href="#sessions">
            Sessions
          </a>
          {onStartListening && (
            <button className="btn btn-primary btn-sm header-cta" onClick={onStartListening} disabled={starting}>
              {starting ? <span className="spinner" /> : (
                <>
                  <span className="btn-label-full">Start listening</span>
                  <span className="btn-label-short">Start</span>
                </>
              )}
            </button>
          )}
        </nav>
      )}

      {view === "live" && isRecording && (
        <span className="listen-header-mark" aria-live="polite">
          <span className="dot dot-listen" />
          Listening
        </span>
      )}
    </header>
  );
}
