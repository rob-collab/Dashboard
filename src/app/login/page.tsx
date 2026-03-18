"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");
  const reason = searchParams.get("reason");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-updraft-deep via-updraft-bar to-updraft-bright-purple">
      {/* Decorative depth orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-updraft-bright-purple/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-purple-950/40 blur-3xl" />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white/[0.07] p-8 backdrop-blur-2xl border border-white/20 shadow-glass animate-entrance">
        {/* Logo + brand */}
        <div className="mb-8 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/loading-logo.jpeg"
            alt="Updraft"
            className="mb-4 h-16 w-16 rounded-2xl ring-2 ring-white/25 shadow-lg object-cover"
          />
          <h1 className="font-poppins text-xl font-semibold text-white">
            Meridian
          </h1>
          <p className="mt-1 text-sm text-white/75 text-center">
            Your compliance platform
          </p>
        </div>

        {reason === "session_expired" && (
          <div className="mb-4 rounded-lg bg-white/10 border border-white/20 p-3 text-center text-sm text-white/80">
            Your session has expired. Please sign in again.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/15 border border-red-400/25 p-3 text-center text-sm text-red-200">
            {error === "AccessDenied"
              ? "Your account does not have access."
              : "Something went wrong. Please try again."}
          </div>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-updraft-deep via-updraft-bar to-updraft-bright-purple">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-2 w-2 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-2 w-2 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
