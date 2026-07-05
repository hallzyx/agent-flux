"use client";

export type Step =
  | "upload"
  | "boundary"
  | "running"
  | "plan_approval"
  | "escalation"
  | "validate"
  | "done";

interface FluxStepperProps {
  currentStep: Step;
  /** True once the cycle has paused on an escalation (skipped styling when false past Plan). */
  escalationReached?: boolean;
}

const STEPS = [
  { key: "upload", label: "Upload", optional: false },
  { key: "boundary", label: "Boundary", optional: false },
  { key: "plan", label: "Plan", optional: false },
  { key: "escalation", label: "Escalation", optional: true },
  { key: "validate", label: "Validate", optional: false },
  { key: "done", label: "Done", optional: false },
] as const;

function activeIndex(step: Step): number {
  switch (step) {
    case "upload":
      return 0;
    case "boundary":
      return 1;
    case "plan_approval":
    case "running":
      return 2;
    case "escalation":
      return 3;
    case "validate":
      return 4;
    case "done":
      return 5;
  }
}

type StepState = "completed" | "current" | "upcoming" | "skipped";

function stepState(index: number, active: number, optional: boolean, escalationReached: boolean): StepState {
  if (index < active) return "completed";
  if (index === active) return "current";
  if (optional && index === 3 && active > 3 && !escalationReached) return "skipped";
  return "upcoming";
}

export function FluxStepper({ currentStep, escalationReached = false }: FluxStepperProps) {
  const active = activeIndex(currentStep);
  const executing = currentStep === "running";

  return (
    <nav className="flux-stepper" aria-label="Flux Cycle progress">
      <ol className="flux-stepper-list">
        {STEPS.map((step, index) => {
          const state = stepState(index, active, !!step.optional, escalationReached);
          const isPlanDuringRun = executing && step.key === "plan";
          return (
            <li
              key={step.key}
              className={[
                "flux-stepper-item",
                `flux-stepper-${state}`,
                step.optional ? "flux-stepper-optional" : "",
                isPlanDuringRun ? "flux-stepper-executing" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={state === "current" || isPlanDuringRun ? "step" : undefined}
            >
              <span className="flux-stepper-marker" aria-hidden />
              <span className="flux-stepper-label">
                {step.label}
                {isPlanDuringRun && <span className="flux-stepper-execute-hint"> · executing</span>}
              </span>
              {index < STEPS.length - 1 && <span className="flux-stepper-connector" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
