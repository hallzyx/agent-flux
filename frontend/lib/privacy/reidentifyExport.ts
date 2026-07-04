import type { MappingEntry, PseudonymizerPort } from "./types";

function reidentifyDeep(value: unknown, pseudonymizer: PseudonymizerPort, mapping: MappingEntry[]): unknown {
  if (typeof value === "string") {
    return pseudonymizer.reidentify(value, mapping);
  }
  if (Array.isArray(value)) {
    return value.map((item) => reidentifyDeep(item, pseudonymizer, mapping));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        reidentifyDeep(item, pseudonymizer, mapping),
      ]),
    );
  }
  return value;
}

export function buildReidentifiedExport(
  prd: { export?: { markdown?: string; jira?: unknown } },
  pseudonymizer: PseudonymizerPort,
  mapping: MappingEntry[],
): { markdown: string; jira: unknown } | null {
  if (!prd.export?.markdown) return null;
  return {
    markdown: pseudonymizer.reidentify(prd.export.markdown, mapping),
    jira: reidentifyDeep(prd.export.jira ?? { issues: [] }, pseudonymizer, mapping),
  };
}
