"use client";

import type { TraceEvent } from "@/lib/trace/events";

const TYPE_LABELS: Record<string, string> = {
  plan: "Plan",
  retrieval: "Retrieval",
  tool_call: "Tool",
  escalation: "Escalation",
  precedent_applied: "Precedent",
  critic: "Critic",
  verdict: "Verdict",
  status: "Status",
  prd_draft: "PRD",
  prd_final: "PRD Final",
};

interface TracePanelProps {
  events: TraceEvent[];
  running: boolean;
  mode?: "rail" | "expanded";
}

function renderEngineBadge(engine?: string) {
  if (engine === "vultr") return <span className="engine-badge vultr">Vultr</span>;
  if (engine === "partial") return <span className="engine-badge partial">Vultr · partial</span>;
  if (engine === "deterministic_fallback") return <span className="engine-badge fallback">local fallback</span>;
  if (engine === "deterministic") return <span className="engine-badge local">local</span>;
  return null;
}

export function TracePanel({ events, running, mode = "expanded" }: TracePanelProps) {
  if (mode === "rail") {
    return (
      <aside className="trace-panel trace-panel-rail" aria-label="Flux Cycle trace">
        <span className="trace-rail-label">Trace</span>
        <span className="trace-rail-badge" aria-label={`${events.length} events`}>
          {events.length}
        </span>
        {running && <span className="trace-rail-live" aria-hidden title="Live" />}
      </aside>
    );
  }

  return (
    <div className="trace-panel trace-panel-expanded">
      <h2>Flux Cycle Trace</h2>
      {running && <p className="trace-live">● Live</p>}
      <div className="trace-list">
        {events.length === 0 && <p className="hint">Trace events appear here during execution.</p>}
        {events.map((ev) => (
          <div key={ev.id} className={`trace-event trace-${ev.type}`}>
            <div className="trace-header">
              <span className="trace-type">{TYPE_LABELS[ev.type] || ev.type}</span>
              <span className="trace-time">{new Date(ev.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="trace-message">{ev.message}</p>
            {ev.type === "plan" && Array.isArray(ev.data.steps) && (
              <>
                {ev.data.pending_approval ? (
                  <p className="plan-pending">Awaiting supervisor approval</p>
                ) : null}
                {ev.data.engine ? (
                  <p className="tool-call-line">{renderEngineBadge(ev.data.engine as string)}</p>
                ) : null}
                <ol>{(ev.data.steps as string[]).map((s, i) => <li key={i}>{s}</li>)}</ol>
              </>
            )}
            {ev.type === "retrieval" && (
              <blockquote>{String(ev.data.excerpt || "").slice(0, 200)}…</blockquote>
            )}
            {ev.type === "tool_call" && (
              <p className="tool-call-line">
                <code>{String(ev.data.tool)}</code>
                {renderEngineBadge(ev.data.engine as string | undefined)}
              </p>
            )}
            {ev.type === "critic" && (
              <p className="tool-call-line">
                {ev.data.engine === "vultr" ? (
                  <span className="engine-badge vultr">Vultr · {String(ev.data.model)}</span>
                ) : (
                  renderEngineBadge(ev.data.engine as string | undefined)
                )}
              </p>
            )}
            {ev.type === "critic" && !!ev.data.completion_report && (
              <p className="completion-summary">
                {(() => {
                  const s = (ev.data.completion_report as { summary: { met: number; total: number } }).summary;
                  return `Completion: ${s.met}/${s.total} clauses met`;
                })()}
              </p>
            )}
            {ev.type === "critic" && Array.isArray(ev.data.findings) && (
              <ul>{(ev.data.findings as string[]).map((f, i) => <li key={i}>{f}</li>)}</ul>
            )}
            {ev.type === "precedent_applied" && (
              <p className="precedent-badge">precedent applied</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
