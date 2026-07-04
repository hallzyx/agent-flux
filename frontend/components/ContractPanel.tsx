"use client";

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
