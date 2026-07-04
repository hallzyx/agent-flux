export type EntityType = "CLIENT" | "PERSON" | "EMAIL" | "BUDGET" | "DEADLINE" | "NDA" | "PHONE";

export interface MappingEntry {
  placeholder: string;
  original: string;
  type: EntityType;
  magnitude?: string;
}

export interface PseudonymizeResult {
  maskedText: string;
  mapping: MappingEntry[];
}

export interface PseudonymizerPort {
  pseudonymize(text: string): PseudonymizeResult;
  reidentify(text: string, mapping: MappingEntry[]): string;
  readonly name: string;
}
