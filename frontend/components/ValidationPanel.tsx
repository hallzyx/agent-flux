"use client";

import { useState } from "react";
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
  const [redirectNote, setRedirectNote] = useState("Needs revision on scope");

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
        <label className="redirect-note">
          Supervisor redirect note
          <textarea
            value={redirectNote}
            onChange={(e) => setRedirectNote(e.target.value)}
            rows={2}
            placeholder="What should change in the next revision?"
          />
        </label>
        <button type="button" className="primary" onClick={onAccept}>
          Accept
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!redirectNote.trim()}
          onClick={() => onRedirect(redirectNote.trim())}
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
