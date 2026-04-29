"use client";

import { AlertCircle, RefreshCcw } from "lucide-react";

export default function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl bg-red-500/10 backdrop-blur-xl ring-1 ring-red-400/30 shadow-md p-5 flex items-start gap-3">
      <AlertCircle
        className="text-red-400 mt-0.5 shrink-0"
        size={20}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-red-200">{title}</p>
        {message && (
          <p className="mt-1 text-sm text-red-300/90 break-words">{message}</p>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-red-200 hover:bg-white/20 transition-colors"
          >
            <RefreshCcw size={14} />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1.5 text-sm text-red-300">
      <AlertCircle size={14} aria-hidden="true" />
      {message}
    </p>
  );
}
