"use client";

import { useState } from "react";

interface ContractPanelProps {
  clauses: string[];
}

export function ContractPanel({ clauses }: ContractPanelProps) {
  return (
    <div className="contract-panel">
      <h2>Acceptance Contract</h2>
      <p className="hint">The PRD will be validated against these clauses.</p>
      <ul>
        {clauses.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
    </div>
  );
}

interface ContractChipProps {
  clauses: string[];
}

export function ContractChip({ clauses }: ContractChipProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="contract-chip-wrap">
      <button
        type="button"
        className="contract-chip"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        Contract: {clauses.length} clause{clauses.length === 1 ? "" : "s"} {expanded ? "▴" : "▾"}
      </button>
      {expanded && <ContractPanel clauses={clauses} />}
    </div>
  );
}
