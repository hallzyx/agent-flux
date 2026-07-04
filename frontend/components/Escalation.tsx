"use client";

import type { EscalationPayload } from "@/lib/trace/events";

interface EscalationProps {
  payload: EscalationPayload;
  resumeToken: string;
  onAcceptDefault: () => void;
  onSelectOption: (optionId: string) => void;
}

export function EscalationCard({ payload, onAcceptDefault, onSelectOption }: EscalationProps) {
  const defaultOption = payload.options.find((o) => o.id === payload.default);

  return (
    <div className="escalation-card">
      <div className="checkpoint-header">
        <h3>Escalation — decision required</h3>
        <span className="checkpoint-time-cue" title="Typical supervisor review time">
          ~15s
        </span>
      </div>
      <p><strong>Blocked:</strong> {payload.blocked_decision}</p>
      <div className="evidence">
        <strong>Evidence from brief:</strong>
        <blockquote>{payload.evidence}</blockquote>
      </div>
      <div className="options">
        {payload.options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={opt.id === payload.default ? "option default" : "option"}
            onClick={() => onSelectOption(opt.id)}
          >
            <strong>{opt.label}</strong>
            <span>{opt.implication}</span>
          </button>
        ))}
      </div>
      <button type="button" className="primary accept-default" onClick={onAcceptDefault}>
        Accept default ({defaultOption?.label || payload.default}) — 1 click
      </button>
    </div>
  );
}
