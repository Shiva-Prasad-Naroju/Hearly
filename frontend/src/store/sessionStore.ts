import { create } from "zustand";
import type {
  SessionSummary,
  SessionDetail,
  Segment,
  ConvEvent,
  AlertItem,
  PendingAction,
  Participant,
  AudioChunkResponse,
} from "../api/types";

export type View = "home" | "live" | "report";

interface ToastAlert extends AlertItem {
  toastId: string;
}

interface SessionState {
  view: View;
  sessions: SessionSummary[];
  activeSessionId: string | null;
  status: SessionSummary["status"] | null;
  title: string;
  runningSummary: string;
  segments: Segment[];
  events: ConvEvent[];
  alerts: AlertItem[];
  toasts: ToastAlert[];
  pendingActions: PendingAction[];
  participants: Participant[];
  activeSpeaker: string;
  speakerLabels: string[];
  report: SessionDetail["report"] | null;
  isRecording: boolean;
  elapsedSeconds: number;

  setView: (v: View) => void;
  setSessions: (s: SessionSummary[]) => void;
  loadSessionDetail: (s: SessionDetail) => void;
  resetLiveState: (sessionId: string, title: string) => void;
  mergeAudioChunkResponse: (resp: AudioChunkResponse) => void;
  setActiveSpeaker: (label: string) => void;
  addSpeaker: () => void;
  setRecording: (v: boolean) => void;
  tickElapsed: () => void;
  dismissToast: (toastId: string) => void;
  updatePendingAction: (action: PendingAction) => void;
  addPendingAction: (action: PendingAction) => void;
  updateEventLocal: (eventId: string, status: string) => void;
  renameParticipantLocal: (speakerLabel: string, name: string) => void;
  setReport: (r: SessionDetail["report"]) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  view: "home",
  sessions: [],
  activeSessionId: null,
  status: null,
  title: "",
  runningSummary: "",
  segments: [],
  events: [],
  alerts: [],
  toasts: [],
  pendingActions: [],
  participants: [],
  activeSpeaker: "speaker_1",
  speakerLabels: ["speaker_1", "speaker_2", "speaker_3", "speaker_4"],
  report: null,
  isRecording: false,
  elapsedSeconds: 0,

  setView: (v) => set({ view: v }),

  setSessions: (s) => set({ sessions: s }),

  loadSessionDetail: (s) =>
    set({
      activeSessionId: s.id,
      title: s.title,
      status: s.status,
      runningSummary: s.running_summary,
      segments: s.segments,
      events: s.events,
      alerts: s.alerts,
      pendingActions: s.pending_actions,
      participants: s.participants,
      report: s.report,
    }),

  resetLiveState: (sessionId, title) =>
    set({
      activeSessionId: sessionId,
      title,
      status: "live",
      runningSummary: "",
      segments: [],
      events: [],
      alerts: [],
      toasts: [],
      pendingActions: [],
      participants: [],
      activeSpeaker: "speaker_1",
      report: null,
      isRecording: false,
      elapsedSeconds: 0,
      view: "live",
    }),

  mergeAudioChunkResponse: (resp) =>
    set((state) => {
      const newToasts: ToastAlert[] = resp.alerts.map((a) => ({ ...a, toastId: `${a.id}-${Date.now()}` }));
      return {
        segments: [...state.segments, ...resp.segments],
        events: [...resp.events, ...state.events],
        alerts: [...resp.alerts, ...state.alerts],
        toasts: [...state.toasts, ...newToasts],
        pendingActions: [...resp.pending_actions, ...state.pendingActions],
        participants: resp.participants.length ? resp.participants : state.participants,
        runningSummary: resp.running_summary || state.runningSummary,
      };
    }),

  setActiveSpeaker: (label) => set({ activeSpeaker: label }),

  addSpeaker: () =>
    set((state) => {
      const n = state.speakerLabels.length + 1;
      return { speakerLabels: [...state.speakerLabels, `speaker_${n}`] };
    }),

  setRecording: (v) => set({ isRecording: v }),

  tickElapsed: () => set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 })),

  dismissToast: (toastId) => set((state) => ({ toasts: state.toasts.filter((t) => t.toastId !== toastId) })),

  updatePendingAction: (action) =>
    set((state) => ({
      pendingActions: state.pendingActions.map((a) => (a.id === action.id ? action : a)),
    })),

  addPendingAction: (action) =>
    set((state) => ({ pendingActions: [action, ...state.pendingActions] })),

  updateEventLocal: (eventId, status) =>
    set((state) => ({
      events: state.events.map((ev) => (ev.id === eventId ? { ...ev, status } : ev)),
    })),

  renameParticipantLocal: (speakerLabel, name) =>
    set((state) => {
      const next = {
        speaker_label: speakerLabel,
        display_name: name,
        name_confidence: 1,
        name_source: "user" as const,
      };
      const exists = state.participants.some((p) => p.speaker_label === speakerLabel);
      return {
        participants: exists
          ? state.participants.map((p) => (p.speaker_label === speakerLabel ? { ...p, ...next } : p))
          : [...state.participants, next],
      };
    }),

  setReport: (r) => set({ report: r, status: "complete", view: "report", toasts: [] }),
}));

export function displayNameFor(state: Pick<SessionState, "participants">, speakerLabel: string): string {
  const p = state.participants.find((p) => p.speaker_label === speakerLabel);
  if (p?.display_name) {
    return p.name_confidence >= 0.9 ? p.display_name : `${p.display_name}?`;
  }
  const num = speakerLabel.replace("speaker_", "");
  return `Speaker ${num}`;
}
