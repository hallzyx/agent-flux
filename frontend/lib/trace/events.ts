export type TraceEventType =
  | "plan"
  | "retrieval"
  | "tool_call"
  | "escalation"
  | "precedent_applied"
  | "critic"
  | "verdict"
  | "status"
  | "prd_draft"
  | "prd_final";

export interface EscalationOption {
  id: string;
  label: string;
  implication: string;
}

export interface EscalationPayload {
  blocked_decision: string;
  evidence: string;
  options: EscalationOption[];
  default: string;
}

export interface TraceEvent {
  id: string;
  type: TraceEventType;
  timestamp: string;
  cycle_id: string;
  message: string;
  data: Record<string, unknown>;
}

export interface PrdDraft {
  title?: string;
  epics?: Array<{
    id: string;
    title: string;
    stories: Array<{ title: string; size: string; criteria: string[] }>;
  }>;
  risks?: Array<{ requirement_id: string; overall_score: number; justification: string }>;
  critic_findings?: string[];
  export?: { markdown: string; jira: { issues: unknown[] } };
  [key: string]: unknown;
}
