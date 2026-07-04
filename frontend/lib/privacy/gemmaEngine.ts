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

const ENTITY_PROMPT = `You are a privacy assistant. Extract ALL personally identifiable information from the document below.
Return ONLY a valid JSON array. Each item must have "text" (exact substring from the document) and "type" (one of: CLIENT, PERSON, EMAIL, BUDGET, DEADLINE, NDA, PHONE).
Do not include markdown fences or commentary.

Document:
`;

export async function extractEntitiesWithGemma(text: string): Promise<Array<{ text: string; type: string }>> {
  if (!llmInstance) return [];

  const snippet = text.length > 3500 ? text.slice(0, 3500) : text;
  const query = formatGemma3Prompt(`${ENTITY_PROMPT}${snippet}`);
  const raw = await llmInstance.generateResponse(query);
  return parseEntityJson(raw);
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
