import type { PseudonymizeResult, PseudonymizerPort } from "./types";
import { applyDetectedEntities } from "./entityMasking";
import {
  extractEntitiesWithGemma,
  gemmaSelfTest,
  initializeGemmaEngine,
  initializeGemmaEngineFromFile,
  isGemmaEngineReady,
  webGpuAvailable,
} from "./gemmaEngine";
import { applyStructuredPatterns, RegexPseudonymizer } from "./regexPseudonymizer";

/**
 * Gemma on-device pseudonymizer (M10).
 * When loaded: Gemma leads NER on the full brief; regex applies structured patterns as safety net.
 * When unavailable: falls back to full regex pseudonymization.
 */
export class GemmaPseudonymizer implements PseudonymizerPort {
  readonly name = "gemma-3-on-device";
  private fallback = new RegexPseudonymizer();
  private ready = false;

  async initialize(onProgress?: (pct: number) => void): Promise<boolean> {
    try {
      if (!webGpuAvailable()) return false;
      const ok = await initializeGemmaEngine(onProgress);
      this.ready = ok;
      return ok;
    } catch (err) {
      console.warn("Gemma auto-load failed; regex fallback active", err);
      this.ready = false;
      return false;
    }
  }

  async initializeFromFile(file: File, onProgress?: (pct: number) => void): Promise<boolean> {
    try {
      if (!webGpuAvailable()) return false;
      const ok = await initializeGemmaEngineFromFile(file, onProgress);
      this.ready = ok;
      return ok;
    } catch (err) {
      console.warn("Gemma file load failed; regex fallback active", err);
      this.ready = false;
      return false;
    }
  }

  /** Sync path — regex only (used when Gemma is not ready yet). */
  pseudonymize(text: string): PseudonymizeResult {
    return this.fallback.pseudonymize(text);
  }

  /**
   * Primary on-device path when Gemma is loaded: LLM NER first, then structured regex safety net.
   */
  async pseudonymizeOnDevice(text: string): Promise<PseudonymizeResult> {
    if (!this.ready || !isGemmaEngineReady()) {
      return this.fallback.pseudonymize(text);
    }

    const mapping: PseudonymizeResult["mapping"] = [];
    const counters: Record<string, number> = {};

    try {
      const entities = await extractEntitiesWithGemma(text);
      if (entities.length === 0) {
        console.warn("Gemma returned no entities; falling back to regex");
        return this.fallback.pseudonymize(text);
      }

      let masked = applyDetectedEntities(text, mapping, counters, entities);
      masked = applyStructuredPatterns(masked, mapping, counters);
      return { maskedText: masked, mapping };
    } catch (err) {
      console.warn("Gemma NER failed; falling back to regex", err);
      return this.fallback.pseudonymize(text);
    }
  }

  reidentify(text: string, mapping: ReturnType<RegexPseudonymizer["pseudonymize"]>["mapping"]) {
    return this.fallback.reidentify(text, mapping);
  }

  async selfTest(): Promise<string> {
    if (!this.ready) return "";
    return gemmaSelfTest();
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

export async function tryEnableGemma(onProgress?: (pct: number) => void): Promise<{
  pseudonymizer: GemmaPseudonymizer;
  ready: boolean;
  webgpu: boolean;
}> {
  const webgpu = webGpuAvailable();
  const gemma = new GemmaPseudonymizer();
  if (!webgpu) return { pseudonymizer: gemma, ready: false, webgpu };
  const ready = await gemma.initialize(onProgress);
  return { pseudonymizer: gemma, ready, webgpu };
}
