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

  async selfTest(): Promise<string> {
    if (!this.ready) return "";
    return gemmaSelfTest();
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

/**
 * Attempts auto-load from the configured model URL. When it fails (e.g. gated
 * HuggingFace repo returns 401, or no local model is served), returns an
 * unready instance so the UI can offer manual file loading instead of hanging.
 */
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
