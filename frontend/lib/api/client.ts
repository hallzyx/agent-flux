import type { TraceEvent } from "@/lib/trace/events";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function pingVultr(prompt = "Reply with exactly: pong") {
  const res = await fetch(`${API_URL}/api/ping`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchContract(): Promise<string[]> {
  const res = await fetch(`${API_URL}/api/contract`);
  if (!res.ok) throw new Error("Failed to fetch contract");
  const data = await res.json();
  return data.clauses as string[];
}

export function streamCycle(
  body: {
    masked_text: string;
    session_id: string;
    resume_token?: string;
    escalation_response?: { selected_option_id: string };
    supervisor_note?: string;
  },
  onEvent: (event: TraceEvent) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_URL}/api/cycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const line = part.trim();
          if (line.startsWith("data: ")) {
            const event = JSON.parse(line.slice(6)) as TraceEvent;
            onEvent(event);
          }
        }
      }
      onDone();
    } catch (err) {
      if ((err as Error).name !== "AbortError") onError(err as Error);
    }
  })();

  return () => controller.abort();
}

export function resumeCycle(
  body: { session_id: string; resume_token: string; selected_option_id: string },
  onEvent: (event: TraceEvent) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_URL}/api/cycle/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const line = part.trim();
          if (line.startsWith("data: ")) {
            onEvent(JSON.parse(line.slice(6)) as TraceEvent);
          }
        }
      }
      onDone();
    } catch (err) {
      if ((err as Error).name !== "AbortError") onError(err as Error);
    }
  })();

  return () => controller.abort();
}

export async function submitVerdict(body: {
  session_id: string;
  cycle_id: string;
  verdict: "accept" | "redirect";
  note?: string;
}) {
  const res = await fetch(`${API_URL}/api/verdict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function grepEntities(text: string, entities: string[]): string[] {
  return entities.filter((e) => text.includes(e));
}
