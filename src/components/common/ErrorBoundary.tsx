"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    // TODO: Send to error tracking service (Sentry, etc.)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="rounded-full bg-red-50 p-4 mb-4">
            <AlertTriangle size={48} className="text-risk-red" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-600 mb-1">
            An unexpected error occurred while rendering this page.
          </p>
          {this.state.error && (
            <details className="mt-4 text-left max-w-md">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                Error details
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs overflow-auto max-h-40">
                {this.state.error.message}
                {"\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <div className="flex gap-3 mt-6">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
            <button
              onClick={() => window.location.href = "/"}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
