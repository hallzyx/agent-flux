const CACHE_DIR = "agent-flux-models";

function cacheFileName(modelUrl: string): string {
  return modelUrl.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-120);
}

export async function readCachedModel(modelUrl: string): Promise<Uint8Array | null> {
  if (typeof navigator === "undefined" || !("storage" in navigator)) return null;
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(CACHE_DIR, { create: false });
    const handle = await dir.getFileHandle(cacheFileName(modelUrl), { create: false });
    const file = await handle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}

export async function writeCachedModel(modelUrl: string, bytes: Uint8Array): Promise<void> {
  if (typeof navigator === "undefined" || !("storage" in navigator)) return;
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(CACHE_DIR, { create: true });
    const handle = await dir.getFileHandle(cacheFileName(modelUrl), { create: true });
    const writable = await handle.createWritable();
    // TS's Uint8Array<ArrayBufferLike> (which includes SharedArrayBuffer) is stricter than
    // what OPFS's write() actually requires; this is always a plain ArrayBuffer-backed view
    // at runtime (built via `new Uint8Array(...)` above/upstream), so BufferSource is accurate.
    await writable.write(bytes as BufferSource);
    await writable.close();
  } catch {
    // OPFS unavailable — skip cache write
  }
}

export async function fetchModelBytes(
  modelUrl: string,
  onProgress?: (pct: number) => void,
  headers?: Record<string, string>,
): Promise<Uint8Array> {
  const cached = await readCachedModel(modelUrl);
  if (cached) {
    onProgress?.(100);
    return cached;
  }

  const response = await fetch(modelUrl, headers ? { headers } : undefined);
  if (!response.ok) {
    throw new Error(`Failed to download Gemma model (${response.status})`);
  }

  const total = Number(response.headers.get("content-length") || 0);
  if (!response.body || total <= 0) {
    const buf = new Uint8Array(await response.arrayBuffer());
    void writeCachedModel(modelUrl, buf);
    onProgress?.(100);
    return buf;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress?.(Math.min(99, Math.round((loaded / total) * 100)));
  }

  const merged = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  void writeCachedModel(modelUrl, merged);
  onProgress?.(100);
  return merged;
}
