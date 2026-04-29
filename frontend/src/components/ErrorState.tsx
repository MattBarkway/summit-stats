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
    <div className="rounded-2xl bg-red-50/60 backdrop-blur-xl shadow-md ring-1 ring-red-200/70 p-5 flex items-start gap-3">
      <AlertCircle
        className="text-red-600 mt-0.5 shrink-0"
        size={20}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-red-800">{title}</p>
        {message && (
          <p className="mt-1 text-sm text-red-700 break-words">{message}</p>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/60 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-white/80 transition-colors"
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
    <p className="flex items-center gap-1.5 text-sm text-red-700">
      <AlertCircle size={14} aria-hidden="true" />
      {message}
    </p>
  );
}
