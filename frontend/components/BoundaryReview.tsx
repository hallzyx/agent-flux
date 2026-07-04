"use client";

import type { MappingEntry } from "@/lib/privacy/types";

interface BoundaryReviewProps {
  original: string;
  masked: string;
  mapping: MappingEntry[];
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

export function BoundaryReview({ original, masked, mapping, onApprove, onCancel }: BoundaryReviewProps) {
  return (
    <div className="boundary-review">
      <h2>2. Review what leaves your device</h2>
      <p className="hint">Sensitive entities are replaced with typed placeholders. Approve only when ready.</p>
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
        <h4>Mapping ({mapping.length} entities)</h4>
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
