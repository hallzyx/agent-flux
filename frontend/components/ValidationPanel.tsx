"use client";

import { useState } from "react";
import type { PrdDraft } from "@/lib/trace/events";
import { CompletionReportPanel, type CompletionReport } from "@/components/CompletionReportPanel";

interface ValidationPanelProps {
  prd: PrdDraft;
  contractClauses?: string[];
  onAccept: () => void;
  onRedirect: (note: string) => void;
  onReject: (note: string) => void;
  onExport: () => void;
  reidentifiedMarkdown?: string;
  /** True once supervisor has accepted — hides pre-verdict warnings and actions. */
  completed?: boolean;
}

export function ValidationPanel({
  prd,
  contractClauses = [],
  onAccept,
  onRedirect,
  onReject,
  onExport,
  reidentifiedMarkdown,
  completed = false,
}: ValidationPanelProps) {
  const [redirectNote, setRedirectNote] = useState("Needs revision on scope");
  const [rejectNote, setRejectNote] = useState("Frame/delegation was wrong — re-upload brief");
  const [prdOpen, setPrdOpen] = useState(false);

  const report = prd.completion_report as CompletionReport | undefined;
  const hasUnmet = (report?.summary.unmet ?? 0) > 0;

  return (
    <div className="validation-panel">
      <h2>Validate PRD</h2>
      {report && (
        <CompletionReportPanel report={report} contractClauses={contractClauses} />
      )}
      {prd.critic_findings && prd.critic_findings.length > 0 && (
        <div className="critic-findings">
          <h4>Critic findings</h4>
          <ul>{prd.critic_findings.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
      )}
      {hasUnmet && !completed && (
        <p className="warn-banner">Contract has unmet clauses — consider Redirect before Accept.</p>
      )}
      {completed && (
        <p className="verdict-accepted">Supervisor verdict: Accepted — re-identified locally, ready for export.</p>
      )}
      <div className="prd-preview-section">
        <button
          type="button"
          className="prd-preview-toggle secondary"
          onClick={() => setPrdOpen((o) => !o)}
          aria-expanded={prdOpen}
        >
          Full PRD draft {prdOpen ? "▴" : "▾"}
        </button>
        {!prdOpen && (
          <p className="hint prd-preview-hint">
            Contract vs delivery above is the supervisor view — expand only if you need the full draft text.
          </p>
        )}
        {prdOpen && (
          <div className="prd-preview">
            {reidentifiedMarkdown ? (
              <pre>{reidentifiedMarkdown}</pre>
            ) : (
              <pre>{JSON.stringify(prd, null, 2).slice(0, 3000)}</pre>
            )}
          </div>
        )}
      </div>
      <div className="actions validation-actions">
        {!completed && (
          <>
            <label className="redirect-note">
              Redirect note (output fixable)
              <textarea
                value={redirectNote}
                onChange={(e) => setRedirectNote(e.target.value)}
                rows={2}
                placeholder="What should change in the next revision?"
              />
            </label>
            <label className="redirect-note">
              Reject note (frame wrong)
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={2}
                placeholder="Why re-frame the delegation?"
              />
            </label>
          </>
        )}
        <div className="verdict-buttons">
          {!completed && (
            <>
              <button
                type="button"
                className="secondary"
                disabled={!redirectNote.trim()}
                onClick={() => onRedirect(redirectNote.trim())}
              >
                Redirect
              </button>
              <button
                type="button"
                className="danger"
                disabled={!rejectNote.trim()}
                onClick={() => onReject(rejectNote.trim())}
              >
                Reject frame
              </button>
              <button type="button" className="primary" onClick={onAccept}>
                Accept
              </button>
            </>
          )}
          <button type="button" onClick={onExport}>
            Export JSON + Markdown
          </button>
        </div>
      </div>
    </div>
  );
}
