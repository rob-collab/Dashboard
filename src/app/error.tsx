"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
      <div className="rounded-full bg-red-50 p-4 mb-4">
        <AlertTriangle size={40} className="text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-updraft-deep font-poppins mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-gray-600 mb-1 max-w-md">
        An unexpected error occurred. This has been logged for review.
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 mt-1">Error ID: {error.digest}</p>
      )}
      <details className="mt-4 text-left max-w-md">
        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
          Error details
        </summary>
        <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs overflow-auto max-h-40">
          {error.message}
        </pre>
      </details>
      <div className="flex gap-3 mt-6">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Home size={16} />
          Dashboard
        </a>
      </div>
    </div>
  );
}
