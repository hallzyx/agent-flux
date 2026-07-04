"use client";

import type { PrdDraft } from "@/lib/trace/events";

interface ValidationPanelProps {
  prd: PrdDraft;
  onAccept: () => void;
  onRedirect: (note: string) => void;
  onExport: () => void;
  reidentifiedMarkdown?: string;
}

export function ValidationPanel({
  prd,
  onAccept,
  onRedirect,
  onExport,
  reidentifiedMarkdown,
}: ValidationPanelProps) {
  return (
    <div className="validation-panel">
      <h2>Validate PRD</h2>
      {prd.critic_findings && prd.critic_findings.length > 0 && (
        <div className="critic-findings">
          <h4>Critic findings (addressed)</h4>
          <ul>{prd.critic_findings.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
      )}
      <div className="prd-preview">
        {reidentifiedMarkdown ? (
          <pre>{reidentifiedMarkdown}</pre>
        ) : (
          <pre>{JSON.stringify(prd, null, 2).slice(0, 3000)}</pre>
        )}
      </div>
      <div className="actions">
        <button type="button" className="primary" onClick={onAccept}>
          Accept
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => onRedirect("Needs revision on scope")}
        >
          Redirect
        </button>
        <button type="button" onClick={onExport}>
          Export JSON + Markdown
        </button>
      </div>
    </div>
  );
}
