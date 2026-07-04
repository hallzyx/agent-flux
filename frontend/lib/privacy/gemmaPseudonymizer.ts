import type { PseudonymizeResult, PseudonymizerPort } from "./types";
import { applyDetectedEntities } from "./entityMasking";
import { extractEntitiesWithGemma, initializeGemmaEngine, isGemmaEngineReady } from "./gemmaEngine";
import { RegexPseudonymizer } from "./regexPseudonymizer";

/**
 * Gemma on-device pseudonymizer (M10).
 * Regex baseline always runs; Gemma 3 (MediaPipe + WebGPU) adds supplemental NER when loaded.
 */
export class GemmaPseudonymizer implements PseudonymizerPort {
  readonly name = "gemma-3-on-device";
  private fallback = new RegexPseudonymizer();
  private ready = false;

  async initialize(onProgress?: (pct: number) => void): Promise<boolean> {
    try {
      if (typeof navigator === "undefined" || !("gpu" in navigator)) {
        return false;
      }
      const ok = await initializeGemmaEngine(onProgress);
      this.ready = ok;
      return ok;
    } catch (err) {
      console.warn("Gemma initialization failed; using regex fallback", err);
      this.ready = false;
      return false;
    }
  }

  pseudonymize(text: string): PseudonymizeResult {
    return this.fallback.pseudonymize(text);
  }

  async enrichWithGemma(text: string, base: PseudonymizeResult): Promise<PseudonymizeResult> {
    if (!this.ready || !isGemmaEngineReady()) return base;

    const mapping = base.mapping.map((entry) => ({ ...entry }));
    const counters: Record<string, number> = {};
    for (const entry of mapping) {
      const match = entry.placeholder.match(/\[([A-Z]+)_(\d+)/);
      if (!match) continue;
      const type = match[1];
      const id = Number(match[2]);
      counters[type] = Math.max(counters[type] || 0, id);
    }

    try {
      const entities = await extractEntitiesWithGemma(text);
      const maskedText = applyDetectedEntities(base.maskedText, mapping, counters, entities);
      return { maskedText, mapping };
    } catch (err) {
      console.warn("Gemma entity extraction failed; keeping regex-only mask", err);
      return base;
    }
  }

  reidentify(text: string, mapping: ReturnType<RegexPseudonymizer["pseudonymize"]>["mapping"]) {
    return this.fallback.reidentify(text, mapping);
  }

  isReady() {
    return this.ready;
  }
}

export function isGemmaPseudonymizer(
  impl: PseudonymizerPort,
): impl is GemmaPseudonymizer {
  return impl instanceof GemmaPseudonymizer;
}

export async function tryEnableGemma(onProgress?: (pct: number) => void): Promise<GemmaPseudonymizer | null> {
  const gemma = new GemmaPseudonymizer();
  const ok = await gemma.initialize(onProgress);
  return ok ? gemma : null;
}
