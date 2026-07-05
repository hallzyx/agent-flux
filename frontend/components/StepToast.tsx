"use client";

import { useEffect } from "react";

interface StepToastProps {
  message: string | null;
  onDismiss: () => void;
}

export function StepToast({ message, onDismiss }: StepToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 3200);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="step-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
