export type SessionStatus = "created" | "live" | "processing" | "complete";

export interface Participant {
  speaker_label: string;
  display_name: string | null;
  name_confidence: number;
  name_source: "user" | "inferred" | "none";
}

export interface Segment {
  id: string;
  sequence: number;
  speaker_label: string;
  text: string;
  start_ms: number;
  end_ms: number;
  confidence: number;
}

export type EventType =
  | "decision"
  | "action_item"
  | "commitment"
  | "deadline"
  | "question"
  | "follow_up"
  | "risk"
  | "important_event"
  | "email_request"
  | "person_mention";

export interface ConvEvent {
  id: string;
  type: EventType;
  summary: string;
  owner_speaker_label: string | null;
  owner_name: string | null;
  due_text: string | null;
  modality: string;
  confidence: number;
  status: string;
  evidence_quote: string;
}

export type AlertLevel = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AlertItem {
  id: string;
  level: AlertLevel;
  title: string;
  body: string;
}

export interface PendingActionArgs {
  to: string;
  cc: string[];
  subject: string;
  body: string;
  recipient_resolved: boolean;
}

export interface PendingAction {
  id: string;
  tool_name: string;
  status: "pending" | "approved" | "rejected" | "executed";
  confidence: number;
  reason: string;
  args: PendingActionArgs;
  result: {
    sent?: boolean;
    to?: string;
    from?: string;
    eml_text?: string;
    recipient_resolved?: boolean;
  } | null;
}

export interface SessionReport {
  summary: string;
  decisions: string[];
  action_items: string[];
  deadlines: string[];
  follow_ups: string[];
  open_questions: string[];
  participants: string[];
}

export interface SessionSummary {
  id: string;
  title: string;
  status: SessionStatus;
  started_at: string | null;
  ended_at: string | null;
  running_summary: string;
  report: SessionReport | null;
}

export interface SessionDetail extends SessionSummary {
  participants: Participant[];
  segments: Segment[];
  events: ConvEvent[];
  alerts: AlertItem[];
  pending_actions: PendingAction[];
}

export interface AudioChunkResponse {
  segments: Segment[];
  events: ConvEvent[];
  alerts: AlertItem[];
  pending_actions: PendingAction[];
  participants: Participant[];
  running_summary: string;
  extraction_ran: boolean;
}

export interface AskResponse {
  answer: string;
  citations: string[];
}
