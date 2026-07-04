import { fetchModelBytes } from "./opfsModelCache";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai/wasm";
const DEFAULT_MODEL_URL =
  "https://huggingface.co/litert-community/gemma-3-270m-it/resolve/main/gemma3-270m-it-q8-web.task";

export function gemmaModelUrl(): string {
  return process.env.NEXT_PUBLIC_GEMMA_MODEL_URL || DEFAULT_MODEL_URL;
}

type LlmInferenceInstance = {
  generateResponse: (query: string) => Promise<string>;
  close?: () => void;
};

let llmInstance: LlmInferenceInstance | null = null;

export async function initializeGemmaEngine(onProgress?: (pct: number) => void): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("gpu" in navigator)) return false;

  onProgress?.(5);

  const { FilesetResolver, LlmInference } = await import("@mediapipe/tasks-genai");
  const modelUrl = gemmaModelUrl();

  onProgress?.(8);
  const modelBytes = await fetchModelBytes(modelUrl, (pct) => {
    onProgress?.(8 + Math.round(pct * 0.82));
  });

  onProgress?.(92);
  const genai = await FilesetResolver.forGenAiTasks(WASM_BASE);
  llmInstance = await LlmInference.createFromModelBuffer(genai, modelBytes);
  onProgress?.(100);
  return true;
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
