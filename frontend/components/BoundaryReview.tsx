"use client";

import { useState } from "react";
import type { MappingEntry } from "@/lib/privacy/types";

interface BoundaryReviewProps {
  original: string;
  masked: string;
  mapping: MappingEntry[];
  leaks?: string[];
  onApprove: () => void;
  onCancel: () => void;
}

function highlightEntities(text: string, mapping: MappingEntry[]) {
  const originals = [...new Set(mapping.map((m) => m.original))].sort((a, b) => b.length - a.length);
  let html = text;
  for (const orig of originals) {
    html = html.split(orig).join(`<mark class="entity">${orig}</mark>`);
  }
  return html;
}

export function BoundaryReview({ original, masked, mapping, leaks = [], onApprove, onCancel }: BoundaryReviewProps) {
  const [mappingOpen, setMappingOpen] = useState(false);

  return (
    <div className="boundary-review">
      <div className="checkpoint-header">
        <h2>Review what leaves your device</h2>
        <span className="checkpoint-time-cue" title="Typical supervisor review time">
          ~15s
        </span>
      </div>
      <p className="hint boundary-lead">
        Your original RFP stays on this device. Only the masked text below can be sent after you approve.
      </p>
      {leaks.length > 0 && (
        <p className="boundary-leak-warn">
          Possible unmasked entities detected: {leaks.join(", ")}. Review before approving.
        </p>
      )}
      <div className="boundary-panels">
        <div className="panel">
          <h3>Original (stays local)</h3>
          <pre
            className="doc-preview"
            dangerouslySetInnerHTML={{ __html: highlightEntities(original, mapping) }}
          />
        </div>
        <div className="panel">
          <h3>Masked (sent to cloud)</h3>
          <pre className="doc-preview masked">{masked}</pre>
        </div>
      </div>
      <div className="mapping-table">
        <button
          type="button"
          className="mapping-toggle secondary"
          onClick={() => setMappingOpen((o) => !o)}
          aria-expanded={mappingOpen}
        >
          Entity mapping ({mapping.length}) {mappingOpen ? "▴" : "▾"}
        </button>
        {mappingOpen && (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Original</th>
                <th>Placeholder</th>
              </tr>
            </thead>
            <tbody>
              {mapping.map((m, i) => (
                <tr key={i}>
                  <td>{m.type}</td>
                  <td>{m.original}</td>
                  <td><code>{m.placeholder}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="primary" onClick={onApprove}>
          Approve &amp; send masked text
        </button>
      </div>
    </div>
  );
}
