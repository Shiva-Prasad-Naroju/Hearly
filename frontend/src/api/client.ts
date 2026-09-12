import type {
  SessionSummary,
  SessionDetail,
  AudioChunkResponse,
  PendingAction,
  AskResponse,
} from "./types";

function resolveApiBase(): string {
  const env = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (env) return env;
  return "";
}

const BASE_URL = resolveApiBase();

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  createSession: (title: string) =>
    request<SessionSummary>("/api/sessions", { method: "POST", body: JSON.stringify({ title }) }),

  listSessions: () => request<SessionSummary[]>("/api/sessions"),

  getSession: (id: string) => request<SessionDetail>(`/api/sessions/${id}`),

  startSession: (id: string) =>
    request<SessionSummary>(`/api/sessions/${id}/start`, {
      method: "POST",
      body: JSON.stringify({ consent_acknowledged: true }),
    }),

  stopSession: (id: string) => request<SessionSummary>(`/api/sessions/${id}/stop`, { method: "POST" }),

  renameParticipant: (sessionId: string, speakerLabel: string, displayName: string) =>
    request(`/api/sessions/${sessionId}/participants/${speakerLabel}`, {
      method: "PATCH",
      body: JSON.stringify({ display_name: displayName }),
    }),

  uploadAudioChunk: async (sessionId: string, speakerLabel: string, blob: Blob): Promise<AudioChunkResponse> => {
    const form = new FormData();
    form.append("speaker_label", speakerLabel);
    form.append("file", blob, "chunk.webm");
    const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}/audio-chunk`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = await res.json();
        detail = body.detail ?? detail;
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, detail);
    }
    return (await res.json()) as AudioChunkResponse;
  },

  listActions: (sessionId: string) => request<PendingAction[]>(`/api/actions?session_id=${sessionId}`),

  approveAction: (actionId: string, editedArgs?: Record<string, unknown>) =>
    request<PendingAction>(`/api/actions/${actionId}/approve`, {
      method: "POST",
      body: JSON.stringify({ edited_args: editedArgs ?? null }),
    }),

  rejectAction: (actionId: string) =>
    request<PendingAction>(`/api/actions/${actionId}/reject`, { method: "POST" }),

  ask: (sessionId: string, question: string) =>
    request<AskResponse>(`/api/sessions/${sessionId}/ask`, {
      method: "POST",
      body: JSON.stringify({ question }),
    }),

  tts: (text: string) =>
    request<{ audio_base64: string; format: string }>("/api/tts", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
};

export { ApiError };
