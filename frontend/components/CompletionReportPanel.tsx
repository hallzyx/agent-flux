"use client";

export interface CompletionClause {
  clause: string;
  status: "met" | "unmet" | "partial";
  evidence: string;
}

export interface CompletionReport {
  clauses: CompletionClause[];
  summary: { met: number; unmet: number; partial: number; total: number };
}

interface CompletionReportPanelProps {
  report: CompletionReport;
  /** When set, renders the unified contract-vs-delivery view (P1 #6). */
  contractClauses?: string[];
}

const STATUS_LABEL: Record<string, string> = {
  met: "Met",
  unmet: "Unmet",
  partial: "Partial",
};

function mergeContractWithReport(
  contractClauses: string[],
  report: CompletionReport,
): CompletionClause[] {
  const byClause = new Map(report.clauses.map((row) => [row.clause, row]));
  return contractClauses.map(
    (clause) =>
      byClause.get(clause) ?? {
        clause,
        status: "partial" as const,
        evidence: "Not yet evaluated against draft",
      },
  );
}

export function CompletionReportPanel({ report, contractClauses }: CompletionReportPanelProps) {
  const { summary } = report;
  const merged = contractClauses && contractClauses.length > 0;
  const rows = merged ? mergeContractWithReport(contractClauses, report) : report.clauses;

  return (
    <div className={`completion-report${merged ? " completion-report-merged" : ""}`}>
      <h3>{merged ? "Contract vs delivery" : "Completion report"}</h3>
      <p className="hint">
        {merged
          ? `Acceptance contract checked against the PRD draft — ${summary.met}/${summary.total} clauses met.`
          : `Critic computed "done" clause-by-clause vs acceptance contract (${summary.met}/${summary.total} met).`}
      </p>
      <table>
        <thead>
          <tr>
            <th>Contract clause</th>
            <th>Status</th>
            <th>Evidence from draft</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`completion-row completion-${row.status}`}>
              <td>{row.clause}</td>
              <td>{STATUS_LABEL[row.status] ?? row.status}</td>
              <td>{row.evidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
