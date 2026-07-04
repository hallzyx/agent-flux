import type { EntityType, MappingEntry, PseudonymizeResult, PseudonymizerPort } from "./types";

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const BUDGET_RE = /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR)?/g;
const DATE_RE =
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi;
const NDA_RE = /\bNDA-\d{4}-\d{4}\b/gi;
const PHONE_RE = /\b\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g;

const KNOWN_CLIENTS = ["Meridian Capital", "Globex Inc", "Initech", "Acme Corp"];
const KNOWN_PEOPLE = ["Jane Smith", "Robert Chen", "John Doe"];

function budgetMagnitude(value: string): string {
  const num = parseInt(value.replace(/[^0-9]/g, ""), 10);
  if (num >= 1_000_000) return "7-figures USD";
  if (num >= 100_000) return "low-6-figures USD";
  if (num >= 10_000) return "5-figures USD";
  return "4-figures USD";
}

function nextId(counters: Record<string, number>, type: EntityType): number {
  counters[type] = (counters[type] || 0) + 1;
  return counters[type];
}

function applyReplacements(
  text: string,
  pattern: RegExp,
  type: EntityType,
  mapping: MappingEntry[],
  counters: Record<string, number>,
  placeholderFn: (match: string, id: number) => string,
): string {
  return text.replace(pattern, (match) => {
    const existing = mapping.find((m) => m.original === match);
    if (existing) return existing.placeholder;
    const id = nextId(counters, type);
    const placeholder = placeholderFn(match, id);
    const entry: MappingEntry = { placeholder, original: match, type };
    if (type === "BUDGET") entry.magnitude = budgetMagnitude(match);
    mapping.push(entry);
    return placeholder;
  });
}

/** Deterministic pass for formats LLMs often miss (emails, currency, dates). */
export function applyStructuredPatterns(
  text: string,
  mapping: MappingEntry[],
  counters: Record<string, number>,
): string {
  let masked = text;
  masked = applyReplacements(masked, EMAIL_RE, "EMAIL", mapping, counters, (_, id) => `[EMAIL_${id}]`);
  masked = applyReplacements(masked, BUDGET_RE, "BUDGET", mapping, counters, (m, id) => {
    const mag = budgetMagnitude(m);
    return `[BUDGET_${id}: ~${mag}]`;
  });
  masked = applyReplacements(masked, DATE_RE, "DEADLINE", mapping, counters, (_, id) => `[DEADLINE_${id}]`);
  masked = applyReplacements(masked, NDA_RE, "NDA", mapping, counters, (_, id) => `[NDA_${id}]`);
  masked = applyReplacements(masked, PHONE_RE, "PHONE", mapping, counters, (_, id) => `[PHONE_${id}]`);
  return masked;
}

function applyKnownNamedEntities(
  text: string,
  mapping: MappingEntry[],
  counters: Record<string, number>,
): string {
  let masked = text;
  for (const client of KNOWN_CLIENTS) {
    const re = new RegExp(client.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    masked = applyReplacements(masked, re, "CLIENT", mapping, counters, (_, id) => `[CLIENT_${id}]`);
  }
  for (const person of KNOWN_PEOPLE) {
    const re = new RegExp(person.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    masked = applyReplacements(masked, re, "PERSON", mapping, counters, (_, id) => `[PERSON_${id}]`);
  }
  return masked;
}

export class RegexPseudonymizer implements PseudonymizerPort {
  readonly name = "regex-v1";

  pseudonymize(text: string): PseudonymizeResult {
    const mapping: MappingEntry[] = [];
    const counters: Record<string, number> = {};
    let masked = applyKnownNamedEntities(text, mapping, counters);
    masked = applyStructuredPatterns(masked, mapping, counters);
    return { maskedText: masked, mapping };
  }

  reidentify(text: string, mapping: MappingEntry[]): string {
    let result = text;
    const sorted = [...mapping].sort((a, b) => b.placeholder.length - a.placeholder.length);
    for (const entry of sorted) {
      result = result.split(entry.placeholder).join(entry.original);
    }
    return result;
  }
}

export function createPseudonymizer(): PseudonymizerPort {
  if (typeof window !== "undefined") {
    const w = window as unknown as { __agentFluxPseudonymizer?: PseudonymizerPort };
    if (w.__agentFluxPseudonymizer) return w.__agentFluxPseudonymizer;
  }
  return new RegexPseudonymizer();
}

export function setPseudonymizer(impl: PseudonymizerPort): void {
  if (typeof window !== "undefined") {
    (window as unknown as { __agentFluxPseudonymizer?: PseudonymizerPort }).__agentFluxPseudonymizer = impl;
  }
}
