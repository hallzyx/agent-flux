"use client";

import { useEffect, useState } from "react";

interface PlanApprovalCardProps {
  steps: string[];
  precedents?: Array<{ blocked_decision: string; ruling: string }>;
  onApprove: (steps: string[]) => void;
}

export function PlanApprovalCard({ steps, precedents, onApprove }: PlanApprovalCardProps) {
  const [edited, setEdited] = useState(steps.join("\n"));

  useEffect(() => {
    setEdited(steps.join("\n"));
  }, [steps]);

  return (
    <div className="plan-approval-panel">
      <div className="checkpoint-header">
        <h2>Approve execution plan</h2>
        <span className="checkpoint-time-cue" title="Typical supervisor review time">
          ~15s
        </span>
      </div>
      <p className="hint">
        First supervision checkpoint — review what the Planner will execute before any retrieval or tool runs.
      </p>
      {precedents && precedents.length > 0 && (
        <div className="precedent-in-plan">
          <h4>Session precedents in plan context</h4>
          <ul>
            {precedents.map((p, i) => (
              <li key={i}>
                {p.blocked_decision} → <strong>{p.ruling}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
      <label className="plan-steps-edit">
        Plan steps (editable)
        <textarea
          value={edited}
          onChange={(e) => setEdited(e.target.value)}
          rows={Math.min(10, Math.max(4, steps.length + 1))}
        />
      </label>
      <div className="actions">
        <button
          type="button"
          className="primary"
          onClick={() => {
            const parsed = edited.split("\n").map((s) => s.trim()).filter(Boolean);
            onApprove(parsed.length ? parsed : steps);
          }}
        >
          Approve plan &amp; execute
        </button>
      </div>
    </div>
  );
}
