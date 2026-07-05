"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PlanApprovalCard } from "@/components/PlanApprovalCard";
import { BoundaryReview } from "@/components/BoundaryReview";
import { ContractChip, ContractPanel } from "@/components/ContractPanel";
import { EscalationCard } from "@/components/Escalation";
import { FluxStepper, type Step } from "@/components/FluxStepper";
import { TracePanel } from "@/components/TracePanel";
import { Upload } from "@/components/Upload";
import { ValidationPanel } from "@/components/ValidationPanel";
import { StepToast } from "@/components/StepToast";
import {
  approvePlan,
  fetchContract,
  grepEntities,
  pingVultr,
  resumeCycle,
  streamCycle,
  submitVerdict,
} from "@/lib/api/client";
import { GOLDEN_BRIEF, GOLDEN_ENTITIES, GOLDEN_GEMMA_ONLY_ENTITIES, DEMO_VERTICAL, DEMO_VERTICAL_TAGLINE } from "@/lib/fixtures/goldenBrief";
import { createPseudonymizer, setPseudonymizer } from "@/lib/privacy/regexPseudonymizer";
import { buildReidentifiedExport } from "@/lib/privacy/reidentifyExport";
import { downloadTextFile } from "@/lib/downloadFile";
import { GemmaPseudonymizer, isGemmaPseudonymizer, tryEnableGemma } from "@/lib/privacy/gemmaPseudonymizer";
import type { MappingEntry } from "@/lib/privacy/types";
import type { EscalationPayload, PrdDraft, TraceEvent } from "@/lib/trace/events";

function uid() {
  return crypto.randomUUID();
}

export default function HomePage() {
  const [sessionId, setSessionId] = useState("");
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [originalText, setOriginalText] = useState("");
  const [maskedText, setMaskedText] = useState("");
  const [mapping, setMapping] = useState<MappingEntry[]>([]);
  const [contract, setContract] = useState<string[]>([]);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [escalation, setEscalation] = useState<{ payload: EscalationPayload; token: string } | null>(null);
  const [planApproval, setPlanApproval] = useState<{
    steps: string[];
    token: string;
    precedents?: Array<{ blocked_decision: string; ruling: string }>;
  } | null>(null);
  const [prd, setPrd] = useState<PrdDraft | null>(null);
  const [cycleId, setCycleId] = useState("");
  const [precedentRecorded, setPrecedentRecorded] = useState(false);
  const [reidentifiedMd, setReidentifiedMd] = useState("");
  const [pingResult, setPingResult] = useState<string>("");
  const [pseudonymizerName, setPseudonymizerName] = useState("regex-v1");
  const [gemmaProgress, setGemmaProgress] = useState<number | null>(null);
  const [enrichingMask, setEnrichingMask] = useState(false);
  const [gemmaState, setGemmaState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle");
  const [gemmaSelfTest, setGemmaSelfTest] = useState("");
  const gemmaRef = useRef<GemmaPseudonymizer | null>(null);
  const gemmaFileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const [networkSent, setNetworkSent] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [stepToast, setStepToast] = useState<string | null>(null);

  const showStepToast = useCallback((message: string) => {
    setStepToast(message);
  }, []);

  useEffect(() => {
    setMounted(true);
    setSessionId(crypto.randomUUID());
    const debug = new URLSearchParams(window.location.search).get("debug") === "1";
    setDebugMode(debug);
    void fetchContract().then(setContract).catch(console.error);
    if (debug) {
      void pingVultr()
        .then((r) => setPingResult(JSON.stringify(r, null, 2)))
        .catch((e) => setPingResult(String(e)));
    }

    setGemmaState("loading");
    setGemmaProgress(0);
    void tryEnableGemma((pct) => setGemmaProgress(pct))
      .then(async ({ pseudonymizer: gemma, ready, webgpu }) => {
        gemmaRef.current = gemma;
        if (!webgpu) {
          setGemmaState("unavailable");
          setGemmaProgress(null);
          return;
        }
        if (ready) {
          await activateGemma(gemma);
        } else {
          setGemmaState("error");
          setGemmaProgress(null);
          setError("Gemma auto-load failed. Use “Load bundled model” or pick a .task file.");
        }
      })
      .catch((err) => {
        setGemmaState("error");
        setGemmaProgress(null);
        setError(`Gemma auto-load error: ${err instanceof Error ? err.message : String(err)}`);
      });
  }, []);

  const activateGemma = useCallback(async (gemma: GemmaPseudonymizer) => {
    setPseudonymizer(gemma);
    setPseudonymizerName(gemma.name);
    setPseudonymizerVersion((v) => v + 1);
    setGemmaState("ready");
    setGemmaProgress(100);
    try {
      const reply = await gemma.selfTest();
      if (reply) setGemmaSelfTest(reply);
    } catch {
      // self-test is best-effort proof only
    }
  }, []);

  const handleGemmaModelFile = useCallback(
    async (file: File) => {
      const gemma = gemmaRef.current ?? new GemmaPseudonymizer();
      gemmaRef.current = gemma;
      setGemmaState("loading");
      setGemmaProgress(0);
      setError("");
      try {
        const ok = await gemma.initializeFromFile(file, (pct) => setGemmaProgress(pct));
        if (ok) {
          await activateGemma(gemma);
        } else {
          setGemmaState("error");
          setGemmaProgress(null);
          setError("Gemma failed to initialize from file. Check WebGPU support (Chrome/Edge).");
        }
      } catch (err) {
        setGemmaState("error");
        setGemmaProgress(null);
        setError(`Gemma load error: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [activateGemma],
  );

  const handleLoadBundledGemma = useCallback(async () => {
    const gemma = gemmaRef.current ?? new GemmaPseudonymizer();
    gemmaRef.current = gemma;
    setGemmaState("loading");
    setGemmaProgress(0);
    setError("");
    try {
      const ok = await gemma.initialize((pct) => setGemmaProgress(pct));
      if (ok) {
        await activateGemma(gemma);
      } else {
        setGemmaState("error");
        setGemmaProgress(null);
        setError("Bundled Gemma model failed to load. Ensure frontend/public/models/gemma3-270m-it-q4_0-web.task exists.");
      }
    } catch (err) {
      setGemmaState("error");
      setGemmaProgress(null);
      setError(`Gemma load error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [activateGemma]);

  const [pseudonymizerVersion, setPseudonymizerVersion] = useState(0);
  const [error, setError] = useState("");
  const pseudonymizer = useMemo(() => createPseudonymizer(), [pseudonymizerVersion]);

  const handleTextExtracted = useCallback(
    async (text: string) => {
      setOriginalText(text);
      setStep("boundary");
      setNetworkSent(false);

      let result;
      if (isGemmaPseudonymizer(pseudonymizer) && pseudonymizer.isReady()) {
        setEnrichingMask(true);
        try {
          result = await pseudonymizer.pseudonymizeOnDevice(text);
        } catch (err) {
          console.warn("Gemma on-device NER failed; regex fallback", err);
          result = pseudonymizer.pseudonymize(text);
        } finally {
          setEnrichingMask(false);
        }
      } else {
        result = pseudonymizer.pseudonymize(text);
      }

      setMaskedText(result.maskedText);
      setMapping(result.mapping);
      showStepToast("Brief loaded → review privacy boundary");
    },
    [pseudonymizer, showStepToast],
  );

  const handleEvent = useCallback((ev: TraceEvent) => {
    setEvents((prev) => [...prev, ev]);
    if (ev.cycle_id) setCycleId(ev.cycle_id);

    if (ev.type === "escalation" && ev.data.payload && ev.data.resume_token) {
      setEscalation({
        payload: ev.data.payload as EscalationPayload,
        token: String(ev.data.resume_token),
      });
      setStep("escalation");
      setRunning(false);
      setStepToast("Decision required — review escalation");
    }

    if (ev.type === "plan" && ev.data.pending_approval && ev.data.resume_token) {
      const steps = Array.isArray(ev.data.steps) ? (ev.data.steps as string[]) : [];
      const rawPrecedents = ev.data.precedents_in_plan as Array<{ blocked_decision: string; ruling?: string; label?: string }> | undefined;
      setPlanApproval({
        steps,
        token: String(ev.data.resume_token),
        precedents: rawPrecedents?.map((p) => ({
          blocked_decision: p.blocked_decision,
          ruling: p.ruling ?? p.label ?? "",
        })),
      });
      setStep("plan_approval");
      setRunning(false);
      setStepToast("Plan ready — review before execute");
    }

    if (ev.type === "precedent_applied") {
      setPrecedentRecorded(true);
    }

    if (ev.type === "prd_draft" && ev.data.prd) {
      setPrd(ev.data.prd as PrdDraft);
      setStep("validate");
      setRunning(false);
      setStepToast("PRD ready — validate against contract");
    }
  }, []);

  const reidentifiedPreview = useMemo(() => {
    if (!prd) return "";
    return buildReidentifiedExport(prd, pseudonymizer, mapping)?.markdown ?? "";
  }, [prd, pseudonymizer, mapping]);

  const escalationReached = useMemo(
    () => step === "escalation" || events.some((ev) => ev.type === "escalation"),
    [step, events],
  );

  const traceMode: "rail" | "expanded" | "hidden" = useMemo(() => {
    if (step === "upload") return "hidden";
    if (step === "running" || step === "done") return "expanded";
    return "rail";
  }, [step]);

  const privacyLabel = useMemo(() => {
    if (gemmaState === "loading") return "Privacy: loading…";
    if (gemmaState === "ready") return "Privacy: on-device ✓";
    return "Privacy: regex fallback";
  }, [gemmaState]);

  const boundaryLeaks = useMemo(
    () => grepEntities(maskedText, [...GOLDEN_ENTITIES, ...GOLDEN_GEMMA_ONLY_ENTITIES]),
    [maskedText],
  );

  const startCycle = useCallback((options?: { keepTrace?: boolean; keepPrecedent?: boolean; supervisorNote?: string }) => {
    if (!options?.keepTrace) setEvents([]);
    setRunning(true);
    setStep("running");
    setEscalation(null);
    setPlanApproval(null);
    setPrd(null);
    if (!options?.keepPrecedent) setPrecedentRecorded(false);

    const leaks = grepEntities(maskedText, GOLDEN_ENTITIES);
    if (leaks.length > 0) {
      console.warn("Privacy gate: masked text still contains entities", leaks);
    }

    abortRef.current = streamCycle(
      {
        masked_text: maskedText,
        session_id: sessionId,
        supervisor_note: options?.supervisorNote,
      },
      handleEvent,
      () => setRunning(false),
      (err) => {
        console.error(err);
        setError(String(err));
        setRunning(false);
      },
    );
  }, [maskedText, sessionId, handleEvent]);

  const handleApproveBoundary = () => {
    setNetworkSent(true);
    showStepToast("Boundary approved → starting Flux Cycle");
    startCycle();
  };

  const handleApprovePlan = (steps: string[]) => {
    if (!planApproval) return;
    setRunning(true);
    setStep("running");
    setPlanApproval(null);
    showStepToast("Plan approved → executing");
    abortRef.current = approvePlan(
      { session_id: sessionId, resume_token: planApproval.token, approved_steps: steps },
      handleEvent,
      () => setRunning(false),
      (err) => {
        console.error(err);
        setError(String(err));
        setRunning(false);
      },
    );
  };

  const handleEscalationResolve = (optionId: string) => {
    setRunning(true);
    setStep("running");
    setPrecedentRecorded(true);
    showStepToast("Escalation resolved → continuing");
    abortRef.current = resumeCycle(
      { session_id: sessionId, resume_token: escalation!.token, selected_option_id: optionId },
      handleEvent,
      () => setRunning(false),
      (err) => {
        console.error(err);
        setError(String(err));
        setRunning(false);
      },
    );
  };

  const handleAccept = async () => {
    if (!prd) return;
    const exported = buildReidentifiedExport(prd, pseudonymizer, mapping);
    const md = exported?.markdown ?? pseudonymizer.reidentify(JSON.stringify(prd), mapping);
    setReidentifiedMd(md);
    await submitVerdict({ session_id: sessionId, cycle_id: cycleId, verdict: "accept" });
    setEvents((prev) => [
      ...prev,
      {
        id: uid(),
        type: "verdict",
        timestamp: new Date().toISOString(),
        cycle_id: cycleId,
        message: "Human verdict: accept",
        data: { verdict: "accept" },
      },
    ]);
    setStep("done");
    showStepToast("Accepted → Flux Cycle complete");
  };

  const handleRedirect = async (note: string) => {
    const redirectEvent: TraceEvent = {
      id: uid(),
      type: "verdict",
      timestamp: new Date().toISOString(),
      cycle_id: cycleId,
      message: "Human verdict: redirect",
      data: { verdict: "redirect", note },
    };
    await submitVerdict({ session_id: sessionId, cycle_id: cycleId, verdict: "redirect", note });
    setEvents((prev) => [...prev, redirectEvent]);
    setReidentifiedMd("");
    startCycle({ keepTrace: true, keepPrecedent: true, supervisorNote: note });
  };

  const handleReject = async (note: string) => {
    await submitVerdict({ session_id: sessionId, cycle_id: cycleId, verdict: "reject", note });
    setEvents((prev) => [
      ...prev,
      {
        id: uid(),
        type: "verdict",
        timestamp: new Date().toISOString(),
        cycle_id: cycleId,
        message: "Human verdict: reject — re-frame delegation",
        data: { verdict: "reject", note },
      },
    ]);
    abortRef.current?.();
    setPrd(null);
    setReidentifiedMd("");
    setEscalation(null);
    setPlanApproval(null);
    setRunning(false);
    setStep("upload");
  };

  const handleExport = () => {
    if (!prd) return;
    const exported = buildReidentifiedExport(prd, pseudonymizer, mapping);
    if (!exported) return;
    setReidentifiedMd(exported.markdown);
    downloadTextFile(exported.markdown, "prd.md", "text/markdown");
    window.setTimeout(() => {
      downloadTextFile(JSON.stringify(exported.jira, null, 2), "prd-jira.json", "application/json");
    }, 400);
  };

  return (
    <div className="app">
      <header>
        <h1>Agent Flux</h1>
        <p className="vertical-tagline">
          <span className="vertical-badge">{DEMO_VERTICAL}</span>
          {DEMO_VERTICAL_TAGLINE}
        </p>
        <p className="header-sub">Reference implementation — one supervised Flux Cycle from RFP to delivery spec</p>
        <div className="status-bar">
          <span className="status-pill hitl-chip">Human-in-the-loop: ON</span>
          <span className={`status-pill privacy-pill ${gemmaState === "ready" ? "ok" : ""}`}>
            {privacyLabel}
          </span>
          {mounted && (
            <span className={`status-pill outbound-pill ${networkSent ? "ok" : ""}`}>
              Outbound: {networkSent ? "masked text approved" : "not sent"}
            </span>
          )}
        </div>
        <details className="tech-details">
          <summary>Technical details</summary>
          <div className="tech-details-body">
            <span>
              Pseudonymizer: <strong>{pseudonymizerName}</strong>
            </span>
            {gemmaState === "loading" && gemmaProgress !== null && (
              <span className="gemma-status">Loading Gemma… {gemmaProgress}%</span>
            )}
            {gemmaState === "ready" && gemmaSelfTest && (
              <span className="gemma-status">Gemma inference OK — replied “{gemmaSelfTest}”</span>
            )}
            {mounted && gemmaState === "error" && (
              <button type="button" className="gemma-load-btn" onClick={() => void handleLoadBundledGemma()}>
                Load bundled model
              </button>
            )}
            {mounted && (gemmaState === "error" || gemmaState === "idle") && (
              <>
                <button
                  type="button"
                  className="gemma-load-btn secondary"
                  onClick={() => gemmaFileInputRef.current?.click()}
                >
                  Pick .task file…
                </button>
                <input
                  ref={gemmaFileInputRef}
                  type="file"
                  accept=".task,.bin,.litertlm"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleGemmaModelFile(f);
                    e.target.value = "";
                  }}
                />
              </>
            )}
            {mounted && gemmaState === "unavailable" && (
              <span className="gemma-status">Gemma needs WebGPU (Chrome/Edge) — using regex</span>
            )}
          </div>
        </details>
      </header>

      <FluxStepper currentStep={step} escalationReached={escalationReached} />

      <div className={`layout${traceMode === "rail" ? " layout-trace-rail" : ""}`}>
        <div className="main-flow">
          <ErrorBanner message={error} onDismiss={() => setError("")} />
          {contract.length > 0 && step === "upload" && (
            <ContractPanel clauses={contract} />
          )}
          {contract.length > 0 &&
            step !== "upload" &&
            step !== "validate" &&
            step !== "done" && <ContractChip clauses={contract} />}

          {step === "upload" && (
            <Upload
              onTextExtracted={handleTextExtracted}
              onLoadFixture={() => handleTextExtracted(GOLDEN_BRIEF)}
            />
          )}

          {step === "boundary" && (
            <>
              {enrichingMask && (
                <p className="gemma-status">Checking privacy locally…</p>
              )}
              <BoundaryReview
                original={originalText}
                masked={maskedText}
                mapping={mapping}
                leaks={boundaryLeaks}
                onApprove={handleApproveBoundary}
                onCancel={() => setStep("upload")}
              />
            </>
          )}

          {(step === "running" || step === "plan_approval" || step === "escalation" || step === "validate" || step === "done") && (
            <div className="running-status">
              <p>Flux Cycle {running ? "in progress…" : step === "done" ? "complete ✓" : "paused / ready"}</p>
              {precedentRecorded && (
                <span className="precedent-chip">Recorded as precedent — this question won&apos;t be asked again</span>
              )}
            </div>
          )}

          {step === "plan_approval" && planApproval && (
            <PlanApprovalCard
              steps={planApproval.steps}
              precedents={planApproval.precedents}
              onApprove={handleApprovePlan}
            />
          )}

          {step === "escalation" && escalation && (
            <EscalationCard
              payload={escalation.payload}
              resumeToken={escalation.token}
              onAcceptDefault={() => handleEscalationResolve(escalation.payload.default)}
              onSelectOption={handleEscalationResolve}
            />
          )}

          {(step === "validate" || step === "done") && prd && (
            <ValidationPanel
              prd={prd}
              contractClauses={contract}
              completed={step === "done"}
              reidentifiedMarkdown={reidentifiedMd || reidentifiedPreview || undefined}
              onAccept={handleAccept}
              onRedirect={handleRedirect}
              onReject={handleReject}
              onExport={handleExport}
            />
          )}

          {step === "done" && (
            <div className="done-banner">
              <h2>Flux Cycle complete</h2>
              <p>PRD validated, re-identified locally, and ready for export. Sensitive data never left your device unmasked.</p>
              <button type="button" onClick={() => { setStep("upload"); setEvents([]); }}>
                Run again (test precedent on 2nd run)
              </button>
            </div>
          )}

          {debugMode && (
            <div className="ping-panel">
              <h3>Vultr connectivity (M0 gate)</h3>
              <pre>{pingResult || "Checking…"}</pre>
            </div>
          )}
        </div>

        {traceMode !== "hidden" && (
          <TracePanel events={events} running={running} mode={traceMode} />
        )}
      </div>

      <StepToast message={stepToast} onDismiss={() => setStepToast(null)} />
    </div>
  );
}
