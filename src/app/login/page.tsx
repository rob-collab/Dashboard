"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useCallback } from "react";
import Script from "next/script";

// Note: @types/google-one-tap provides the global `google` namespace automatically —
// no `declare const google` needed here.

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");
  const reason = searchParams.get("reason");

  const handleCredentialResponse = useCallback(
    (response: { credential: string }) => {
      // In next-auth v5 beta, CredentialsProvider is invoked via its provider id ("google-onetap"),
      // not the generic "credentials" string.
      signIn("google-onetap", {
        credential: response.credential,
        callbackUrl,
        redirect: true,
      });
    },
    [callbackUrl]
  );

  useEffect(() => {
    // If the GIS script was already loaded (e.g. back-navigation), initialise immediately
    if (typeof google !== "undefined" && google?.accounts?.id) {
      google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: handleCredentialResponse,
        auto_select: false,
      });
      google.accounts.id.prompt();
    }
  }, [handleCredentialResponse]);

  return (
    <>
      {/* Google Identity Services — afterInteractive is required for client components in Next.js 14 */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
            console.error("[google-onetap] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set");
            return;
          }
          google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
          });
          google.accounts.id.prompt();
        }}
      />

      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0D0D1A]">
        {/* Subtle grid overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage: `
              linear-gradient(rgba(124,58,237,0.07) 1px, transparent 1px),
              linear-gradient(90deg, rgba(124,58,237,0.07) 1px, transparent 1px)
            `,
            backgroundSize: "28px 28px",
          }}
        />

        {/* Corner depth accents */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-[180px] w-[180px] rounded-full blur-3xl"
          aria-hidden="true"
          style={{ background: "rgba(124,58,237,0.12)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-[160px] w-[160px] rounded-full blur-3xl"
          aria-hidden="true"
          style={{ background: "rgba(99,102,241,0.08)" }}
        />

        {/* Card */}
        <div className="relative w-full max-w-[280px] animate-entrance px-2">
          {/* Logo — 44×44px, border-radius 10px */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/loading-logo.jpeg"
            alt="Updraft"
            className="mx-auto mb-5 block h-11 w-11 rounded-[10px] object-cover ring-1 ring-white/10"
          />

          {/* Eyebrow — "Meridian" flanked by horizontal rules */}
          <div className="mb-1 flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-white/10" />
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              Meridian
            </span>
            <span className="h-px w-8 bg-white/10" />
          </div>

          {/* Headline */}
          <p
            className="mb-1 text-center"
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.5px",
              lineHeight: 1.1,
            }}
          >
            Compliance.{" "}
            <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 300 }}>Clearly.</span>
          </p>

          {/* Tagline */}
          <p
            className="mb-7 text-center"
            style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", letterSpacing: "0.04em" }}
          >
            Governance · Risk · Controls
          </p>

          {/* Session expired notice */}
          {reason === "session_expired" && (
            <div
              className="mb-4 rounded-lg px-3 py-2.5 text-center"
              style={{
                fontSize: 12,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.8)",
              }}
            >
              Your session has expired. Please sign in again.
            </div>
          )}

          {/* Error notice */}
          {error && (
            <div
              className="mb-4 rounded-lg px-3 py-2.5 text-center"
              style={{
                fontSize: 12,
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "rgb(252,165,165)",
              }}
            >
              {error === "AccessDenied"
                ? "Your account does not have access."
                : "Something went wrong. Please try again."}
            </div>
          )}

          {/* Continue with Google — always visible */}
          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="flex w-full items-center justify-center gap-2.5 rounded-[10px] px-4 py-[11px] transition-colors hover:bg-white/[0.09] active:scale-[0.98]"
            style={{
              fontSize: 12,
              fontWeight: 600,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)",
              letterSpacing: "0.01em",
            }}
          >
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Footer */}
          <p
            className="mt-4 text-center"
            style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.03em" }}
          >
            Authorised Updraft accounts only
          </p>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0D0D1A]">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="h-2 w-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="h-2 w-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
