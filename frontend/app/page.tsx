"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { BoundaryReview } from "@/components/BoundaryReview";
import { ContractPanel } from "@/components/ContractPanel";
import { EscalationCard } from "@/components/Escalation";
import { TracePanel } from "@/components/TracePanel";
import { Upload } from "@/components/Upload";
import { ValidationPanel } from "@/components/ValidationPanel";
import {
  fetchContract,
  grepEntities,
  pingVultr,
  resumeCycle,
  streamCycle,
  submitVerdict,
} from "@/lib/api/client";
import { GOLDEN_BRIEF, GOLDEN_ENTITIES } from "@/lib/fixtures/goldenBrief";
import { createPseudonymizer, setPseudonymizer } from "@/lib/privacy/regexPseudonymizer";
import { buildReidentifiedExport } from "@/lib/privacy/reidentifyExport";
import { isGemmaPseudonymizer, tryEnableGemma } from "@/lib/privacy/gemmaPseudonymizer";
import type { MappingEntry } from "@/lib/privacy/types";
import type { EscalationPayload, PrdDraft, TraceEvent } from "@/lib/trace/events";

type Step = "upload" | "boundary" | "running" | "escalation" | "validate" | "done";

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
  const [prd, setPrd] = useState<PrdDraft | null>(null);
  const [cycleId, setCycleId] = useState("");
  const [precedentRecorded, setPrecedentRecorded] = useState(false);
  const [reidentifiedMd, setReidentifiedMd] = useState("");
  const [pingResult, setPingResult] = useState<string>("");
  const [pseudonymizerName, setPseudonymizerName] = useState("regex-v1");
  const [gemmaProgress, setGemmaProgress] = useState<number | null>(null);
  const [enrichingMask, setEnrichingMask] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);
  const [networkSent, setNetworkSent] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSessionId(crypto.randomUUID());
    void fetchContract().then(setContract).catch(console.error);
    void pingVultr()
      .then((r) => setPingResult(JSON.stringify(r, null, 2)))
      .catch((e) => setPingResult(String(e)));

    void tryEnableGemma((pct) => setGemmaProgress(pct)).then((gemma) => {
      if (gemma) {
        setPseudonymizer(gemma);
        setPseudonymizerName(gemma.name);
        setPseudonymizerVersion((v) => v + 1);
      }
    });
  }, []);

  const [pseudonymizerVersion, setPseudonymizerVersion] = useState(0);
  const [error, setError] = useState("");
  const pseudonymizer = useMemo(() => createPseudonymizer(), [pseudonymizerVersion]);

  const handleTextExtracted = useCallback(
    async (text: string) => {
      setOriginalText(text);
      let result = pseudonymizer.pseudonymize(text);
      setMaskedText(result.maskedText);
      setMapping(result.mapping);
      setStep("boundary");
      setNetworkSent(false);

      if (isGemmaPseudonymizer(pseudonymizer) && pseudonymizer.isReady()) {
        setEnrichingMask(true);
        try {
          result = await pseudonymizer.enrichWithGemma(text, result);
          setMaskedText(result.maskedText);
          setMapping(result.mapping);
        } catch (err) {
          console.warn("Gemma enrichment skipped", err);
        } finally {
          setEnrichingMask(false);
        }
      }
    },
    [pseudonymizer],
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
    }

    if (ev.type === "precedent_applied") {
      setPrecedentRecorded(true);
    }

    if (ev.type === "prd_draft" && ev.data.prd) {
      setPrd(ev.data.prd as PrdDraft);
      setStep("validate");
      setRunning(false);
    }
  }, []);

  const reidentifiedPreview = useMemo(() => {
    if (!prd) return "";
    return buildReidentifiedExport(prd, pseudonymizer, mapping)?.markdown ?? "";
  }, [prd, pseudonymizer, mapping]);

  const startCycle = useCallback((options?: { keepTrace?: boolean; keepPrecedent?: boolean }) => {
    if (!options?.keepTrace) setEvents([]);
    setRunning(true);
    setStep("running");
    setEscalation(null);
    setPrd(null);
    if (!options?.keepPrecedent) setPrecedentRecorded(false);

    const leaks = grepEntities(maskedText, GOLDEN_ENTITIES);
    if (leaks.length > 0) {
      console.warn("Privacy gate: masked text still contains entities", leaks);
    }

    abortRef.current = streamCycle(
      { masked_text: maskedText, session_id: sessionId },
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
    startCycle();
  };

  const handleEscalationResolve = (optionId: string) => {
    setRunning(true);
    setStep("running");
    setPrecedentRecorded(true);
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
    startCycle({ keepTrace: true, keepPrecedent: true });
  };

  const handleExport = () => {
    if (!prd) return;
    const exported = buildReidentifiedExport(prd, pseudonymizer, mapping);
    if (!exported) return;
    setReidentifiedMd(exported.markdown);
    const blob = new Blob([exported.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prd.md";
    a.click();
    URL.revokeObjectURL(url);
    const jsonBlob = new Blob([JSON.stringify(exported.jira, null, 2)], { type: "application/json" });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const a2 = document.createElement("a");
    a2.href = jsonUrl;
    a2.download = "prd-jira.json";
    a2.click();
    URL.revokeObjectURL(jsonUrl);
  };

  return (
    <div className="app">
      <header>
        <h1>Agent Flux</h1>
        <p>Reference implementation — one full Flux Cycle from brief to PRD</p>
        <div className="status-bar">
          <span>Pseudonymizer: <strong>{pseudonymizerName}</strong></span>
          {gemmaProgress !== null && gemmaProgress < 100 && (
            <span className="gemma-status">Loading Gemma… {gemmaProgress}%</span>
          )}
          {mounted && (
            <>
              <span>Network sent: {networkSent ? "yes (approved)" : "no"}</span>
              <span>Session: {sessionId.slice(0, 8)}…</span>
            </>
          )}
        </div>
      </header>

      <div className="layout">
        <div className="main-flow">
          <ErrorBanner message={error} onDismiss={() => setError("")} />
          {contract.length > 0 && <ContractPanel clauses={contract} />}

          {step === "upload" && (
            <Upload
              onTextExtracted={handleTextExtracted}
              onLoadFixture={() => handleTextExtracted(GOLDEN_BRIEF)}
            />
          )}

          {step === "boundary" && (
            <>
              {enrichingMask && (
                <p className="gemma-status">Enriching mask with Gemma on-device…</p>
              )}
              <BoundaryReview
                original={originalText}
                masked={maskedText}
                mapping={mapping}
                onApprove={handleApproveBoundary}
                onCancel={() => setStep("upload")}
              />
            </>
          )}

          {(step === "running" || step === "escalation" || step === "validate" || step === "done") && (
            <div className="running-status">
              <p>Flux Cycle {running ? "in progress…" : step === "done" ? "complete ✓" : "paused / ready"}</p>
              {precedentRecorded && (
                <span className="precedent-chip">Recorded as precedent — this question won&apos;t be asked again</span>
              )}
            </div>
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
              reidentifiedMarkdown={reidentifiedMd || reidentifiedPreview || undefined}
              onAccept={handleAccept}
              onRedirect={handleRedirect}
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

          <div className="ping-panel">
            <h3>Vultr connectivity (M0 gate)</h3>
            <pre>{pingResult || "Checking…"}</pre>
          </div>
        </div>

        <TracePanel events={events} running={running} />
      </div>
    </div>
  );
}
