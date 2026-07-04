import type { EntityType, MappingEntry } from "./types";

const VALID_TYPES = new Set<EntityType>(["CLIENT", "PERSON", "EMAIL", "BUDGET", "DEADLINE", "NDA", "PHONE"]);

export function budgetMagnitude(value: string): string {
  const num = parseInt(value.replace(/[^0-9]/g, ""), 10);
  if (Number.isNaN(num)) return "unknown magnitude";
  if (num >= 1_000_000) return "7-figures USD";
  if (num >= 100_000) return "low-6-figures USD";
  if (num >= 10_000) return "5-figures USD";
  return "4-figures USD";
}

function nextId(counters: Record<string, number>, type: EntityType): number {
  counters[type] = (counters[type] || 0) + 1;
  return counters[type];
}

function placeholderFor(type: EntityType, id: number, match: string): string {
  if (type === "BUDGET") {
    const mag = budgetMagnitude(match);
    return `[BUDGET_${id}: ~${mag}]`;
  }
  return `[${type}_${id}]`;
}

export function applyDetectedEntities(
  text: string,
  mapping: MappingEntry[],
  counters: Record<string, number>,
  entities: Array<{ text: string; type: string }>,
): string {
  let masked = text;
  const sorted = [...entities].sort((a, b) => b.text.length - a.text.length);

  for (const entity of sorted) {
    if (!VALID_TYPES.has(entity.type as EntityType)) continue;
    if (entity.text.includes("[") || mapping.some((m) => m.original === entity.text)) continue;

    const type = entity.type as EntityType;
    const escaped = entity.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "g");

    masked = masked.replace(re, (match) => {
      const existing = mapping.find((m) => m.original === match);
      if (existing) return existing.placeholder;
      const id = nextId(counters, type);
      const placeholder = placeholderFor(type, id, match);
      const entry: MappingEntry = { placeholder, original: match, type };
      if (type === "BUDGET") entry.magnitude = budgetMagnitude(match);
      mapping.push(entry);
      return placeholder;
    });
  }

  return masked;
}
