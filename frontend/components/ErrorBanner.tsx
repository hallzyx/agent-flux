"use client";

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div className="error-banner" role="alert">
      <strong>Error:</strong> {message}
      {onDismiss && (
        <button type="button" className="secondary" onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </div>
  );
}
