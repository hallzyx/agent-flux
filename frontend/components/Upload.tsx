"use client";

import { useRef } from "react";

interface UploadProps {
  onTextExtracted: (text: string, filename: string) => void;
  onLoadFixture?: () => void;
  disabled?: boolean;
}

export function Upload({ onTextExtracted, onLoadFixture, disabled }: UploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const { extractTextFromFile } = await import("@/lib/ingest/pdf");
    const text = await extractTextFromFile(file);
    onTextExtracted(text, file.name);
  }

  return (
    <div className="upload">
      <h2>Upload client RFP</h2>
      <p className="hint">PDF or text — processed locally. Nothing leaves your device until you approve.</p>
      <div className="upload-actions">
        <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
          Choose file
        </button>
        {onLoadFixture && (
          <button type="button" className="secondary" disabled={disabled} onClick={onLoadFixture}>
            Load demo brief (Finance)
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.md,text/plain,application/pdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
    </div>
  );
}
