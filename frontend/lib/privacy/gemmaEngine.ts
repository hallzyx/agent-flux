import { fetchModelBytes } from "./opfsModelCache";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm";

/**
 * Default points to a locally-served model under `public/models/`.
 * The litert-community HuggingFace repos are gated (HTTP 401 without a token),
 * so the reliable offline path is a local file: either served from `public/`
 * or picked from disk via `initializeGemmaEngineFromFile`.
 */
const DEFAULT_MODEL_URL = "/models/gemma3-270m-it-q4_0-web.task";

export function gemmaModelUrl(): string {
  return process.env.NEXT_PUBLIC_GEMMA_MODEL_URL || DEFAULT_MODEL_URL;
}

function authHeaders(url: string): Record<string, string> {
  const token = process.env.NEXT_PUBLIC_HF_TOKEN;
  if (token && url.includes("huggingface.co")) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export function webGpuAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

type LlmInferenceInstance = {
  generateResponse: (query: string) => Promise<string>;
  close?: () => void;
};

let llmInstance: LlmInferenceInstance | null = null;

async function createFromBytes(
  modelBytes: Uint8Array,
  onProgress?: (pct: number) => void,
): Promise<boolean> {
  onProgress?.(92);
  const { FilesetResolver, LlmInference } = await import("@mediapipe/tasks-genai");
  const genai = await FilesetResolver.forGenAiTasks(WASM_BASE);
  llmInstance = await LlmInference.createFromModelBuffer(genai, modelBytes);
  onProgress?.(100);
  return true;
}

/**
 * Loads Gemma from a configured URL (local `public/` path or authenticated HF).
 * Returns false when WebGPU is unavailable or the model cannot be fetched,
 * so callers can fall back to regex without leaving the UI in a stuck state.
 */
export async function initializeGemmaEngine(onProgress?: (pct: number) => void): Promise<boolean> {
  if (!webGpuAvailable()) return false;

  const modelUrl = gemmaModelUrl();
  onProgress?.(8);
  const modelBytes = await fetchModelBytes(
    modelUrl,
    (pct) => onProgress?.(8 + Math.round(pct * 0.82)),
    authHeaders(modelUrl),
  );

  return createFromBytes(modelBytes, onProgress);
}

/**
 * Loads Gemma from a user-selected file on disk — fully offline, no network.
 */
export async function initializeGemmaEngineFromFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<boolean> {
  if (!webGpuAvailable()) return false;
  onProgress?.(20);
  const bytes = new Uint8Array(await file.arrayBuffer());
  onProgress?.(80);
  return createFromBytes(bytes, onProgress);
}

export function isGemmaEngineReady(): boolean {
  return llmInstance !== null;
}

function formatGemma3Prompt(instruction: string): string {
  return `<start_of_turn>user\n${instruction}\n<end_of_turn>\n<start_of_turn>model\n`;
}

/** Gemma 3 270M web task: maxTokens=512 (input + output). Keep each prompt well under that. */
const GEMMA_MAX_SNIPPET_CHARS = 900;
const GEMMA_MAX_CHUNKS = 3;

const ENTITY_PROMPT = `Extract PII from the document. Return ONLY a JSON array of {"text":"...","type":"..."} with type in CLIENT|PERSON|EMAIL|BUDGET|DEADLINE|NDA|PHONE.

Document:
`;

/** Split long briefs into head/tail chunks so each LLM call stays within the 512-token window. */
export function gemmaDocumentChunks(text: string): string[] {
  if (text.length <= GEMMA_MAX_SNIPPET_CHARS) return [text];
  const chunks: string[] = [];
  for (let i = 0; i < text.length && chunks.length < GEMMA_MAX_CHUNKS; i += GEMMA_MAX_SNIPPET_CHARS) {
    chunks.push(text.slice(i, i + GEMMA_MAX_SNIPPET_CHARS));
  }
  return chunks;
}

export async function extractEntitiesWithGemma(text: string): Promise<Array<{ text: string; type: string }>> {
  if (!llmInstance) return [];

  const seen = new Set<string>();
  const merged: Array<{ text: string; type: string }> = [];

  for (const snippet of gemmaDocumentChunks(text)) {
    try {
      const query = formatGemma3Prompt(`${ENTITY_PROMPT}${snippet}`);
      const raw = await llmInstance.generateResponse(query);
      for (const ent of parseEntityJson(raw)) {
        const key = `${ent.type}:${ent.text.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(ent);
        }
      }
    } catch (err) {
      console.warn("Gemma chunk extraction failed; regex mask remains authoritative", err);
    }
  }

  return merged;
}

/** Runs a tiny prompt so the UI can prove Gemma is doing real on-device inference. */
export async function gemmaSelfTest(): Promise<string> {
  if (!llmInstance) return "";
  const query = formatGemma3Prompt("Reply with exactly one word: ready");
  const raw = await llmInstance.generateResponse(query);
  return raw.trim();
}

export function parseEntityJson(raw: string): Array<{ text: string; type: string }> {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is { text: string; type: string } => {
        return (
          !!item &&
          typeof item === "object" &&
          typeof (item as { text?: unknown }).text === "string" &&
          typeof (item as { type?: unknown }).type === "string"
        );
      })
      .map((item) => ({ text: item.text.trim(), type: item.type.trim().toUpperCase() }))
      .filter((item) => item.text.length >= 2);
  } catch {
    return [];
  }
}
