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
}

const STATUS_LABEL: Record<string, string> = {
  met: "Met",
  unmet: "Unmet",
  partial: "Partial",
};

export function CompletionReportPanel({ report }: CompletionReportPanelProps) {
  const { summary } = report;
  return (
    <div className="completion-report">
      <h3>Completion report</h3>
      <p className="hint">
        Critic computed &quot;done&quot; clause-by-clause vs acceptance contract ({summary.met}/{summary.total} met).
      </p>
      <table>
        <thead>
          <tr>
            <th>Clause</th>
            <th>Status</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {report.clauses.map((row, i) => (
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
