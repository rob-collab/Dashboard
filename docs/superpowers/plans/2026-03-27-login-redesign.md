# Login Page Redesign + Google One Tap — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the glassmorphic login page with a Precision Dark design and add Google One Tap so users sign in without leaving the page.

**Architecture:** Two independent changes — (1) visual rewrite of `src/app/login/page.tsx` with new styles and GIS script wiring, (2) server-side credentials provider added to `src/lib/auth-config.ts` that validates Google ID tokens. The existing Google OAuth redirect is kept as the fallback button; nothing else in the app changes.

**Tech Stack:** Next.js 14, next-auth v5 beta, Tailwind CSS, `next/script`, Google Identity Services (GIS), `google-auth-library`, `@types/google-one-tap`

**Spec:** `docs/superpowers/specs/2026-03-27-login-redesign-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/login/page.tsx` | Modify | Login page UI — visual design, GIS script, One Tap callback |
| `src/lib/auth-config.ts` | Modify | Add `google-onetap` CredentialsProvider |
| `src/app/globals.css` | Modify | Add `animate-entrance` keyframe inside existing reduced-motion block |
| `.env.local` | Note only | Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (same value as `GOOGLE_CLIENT_ID`) |

---

## Chunk 1: Dependencies + Environment

### Task 1: Install packages

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install runtime dependency**

```bash
npm install google-auth-library
```

Expected: `package.json` now lists `google-auth-library` under `dependencies`.

- [ ] **Step 2: Install type declarations**

```bash
npm install -D @types/google-one-tap
```

Expected: `package.json` lists `@types/google-one-tap` under `devDependencies`.

The `@types/google-one-tap` package uses `export as namespace google` — a UMD-style global ambient declaration. Once installed, TypeScript automatically knows about the `google.accounts.id` API globally. **Do not add any `declare const google` line** to source files.

- [ ] **Step 3: Verify build still passes**

```bash
npx next build 2>&1 | tail -20
```

Expected: zero type errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add google-auth-library + @types/google-one-tap"
```

---

### Task 2: Expose `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

**Files:**
- Note: `.env.local` (dev only — Vercel env var must also be set)

- [ ] **Step 1: Add env var to `.env.local`**

Open `.env.local`. Add the following line — using the **same value** already set for `GOOGLE_CLIENT_ID`:

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<same value as GOOGLE_CLIENT_ID>
```

- [ ] **Step 2: Verify at runtime**

Start dev server (`npm run dev`), open `http://localhost:3000/login` in the browser, and open the browser console. Confirm no message `[google-onetap] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set` appears. (The `NEXT_PUBLIC_` prefix makes this value available in the browser bundle at build time — not a server-side runtime check.)

- [ ] **Step 3: Note for deployment**

> ⚠️ Before deploying: add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to Vercel project environment variables (Settings → Environment Variables). Value is identical to `GOOGLE_CLIENT_ID`.

---

## Chunk 2: Server-Side Credentials Provider

### Task 3: Add `google-onetap` CredentialsProvider to `auth-config.ts`

**Files:**
- Modify: `src/lib/auth-config.ts`

- [ ] **Step 1: Read the full file before editing**

Read `src/lib/auth-config.ts` in full. Confirm the following are present before touching anything:
- `import prisma from "./prisma"` at the top
- `Google(...)` provider with `checks: [] as any` and the `// Disable ALL check cookies` comment block
- `session: { strategy: "jwt", maxAge: 8 * 60 * 60 }` config
- `pages: { signIn: "/login" }`
- `signIn`, `jwt`, and `session` callbacks

- [ ] **Step 2: Add the `Credentials` import**

At the top of the file, alongside the existing `import Google from "next-auth/providers/google"`, add:

```typescript
import Credentials from "next-auth/providers/credentials";
```

- [ ] **Step 3: Add the `google-onetap` provider to the providers array**

Inside `NextAuth({ providers: [ ... ] })`, after the existing `Google(...)` provider block, add:

```typescript
Credentials({
  id: "google-onetap",
  credentials: { credential: { type: "text" } },
  async authorize(credentials) {
    if (!credentials?.credential) return null;
    try {
      const { OAuth2Client } = await import("google-auth-library");
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: credentials.credential as string,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.email) return null;

      const dbUser = await prisma.user.findUnique({
        where: { email: payload.email },
        select: { id: true, email: true, name: true, isActive: true },
      });

      // Mirror the signIn callback guard: reject if not found or inactive.
      // Note: the signIn callback does NOT fire for CredentialsProvider in next-auth v5 beta —
      // these guards and lastLoginAt must live here instead.
      if (!dbUser || !dbUser.isActive) return null;

      // Update lastLoginAt — best-effort, same pattern as the signIn callback
      try {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { lastLoginAt: new Date() },
        });
      } catch (updateErr) {
        console.error("[google-onetap] lastLoginAt update failed:", updateErr);
      }

      return { id: dbUser.id, email: dbUser.email, name: dbUser.name };
    } catch (err) {
      // verifyIdToken throws on network error, expired/invalid token.
      // Return null → next-auth converts to AccessDenied redirect.
      console.error("[google-onetap] verifyIdToken failed:", err);
      return null;
    }
  },
}),
```

- [ ] **Step 4: Verify no existing code was removed**

Re-read `src/lib/auth-config.ts` in full after the edit. Confirm every item below is still present and unchanged:

- [ ] `import prisma from "./prisma"` present
- [ ] `Google(...)` provider with `checks: [] as any` present
- [ ] The `// Disable ALL check cookies (PKCE, state).` comment block and its `eslint-disable` line are intact
- [ ] `session: { strategy: "jwt", maxAge: 8 * 60 * 60 }` — both `strategy` and `maxAge` present
- [ ] `pages: { signIn: "/login" }` present
- [ ] `signIn` callback (with `isActive` check and `lastLoginAt` update) present
- [ ] `jwt` callback (with `signedAt` stamping and 8-hour expiry enforcement) present
- [ ] `session` callback present

- [ ] **Step 5: Build check**

```bash
npx next build 2>&1 | tail -20
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth-config.ts
git commit -m "feat(auth): add google-onetap credentials provider"
```

---

## Chunk 3: Login Page Visual Redesign + One Tap Wiring

### Task 4: Rewrite `src/app/login/page.tsx`

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/globals.css`

This is a complete visual rewrite of the login page. The auth logic (session params, `signIn` calls, `Suspense` boundary) is preserved; only the JSX structure and styles change.

- [ ] **Step 1: Read the complete existing file**

Read `src/app/login/page.tsx` in full. Note every piece of logic that must be preserved:
- `useSearchParams()` for `callbackUrl`, `error`, `reason`
- `signIn("google", { callbackUrl })` on the button
- The `Suspense` boundary wrapping `LoginForm`
- The fallback loading state inside `Suspense`

- [ ] **Step 2: Write the new `page.tsx`**

Replace the file entirely with the following:

```tsx
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
    // If the GIS script was already loaded (e.g. back-navigation), initialize immediately
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
```

- [ ] **Step 3: Add `animate-entrance` to `globals.css`**

Read `src/app/globals.css`. Check for an existing `animate-entrance` definition. If it already exists, skip this step.

If it does **not** exist:

1. Find the existing `@media (prefers-reduced-motion: reduce)` block in `globals.css`
2. Add `.animate-entrance { animation: none; }` inside that **existing** block — do not create a new media query block
3. Add the `@keyframes` and class definition **outside** the media query (anywhere in the file before the media query):

```css
@keyframes entrance {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-entrance {
  animation: entrance 200ms ease-out both;
}
```

Do not duplicate the `@media (prefers-reduced-motion: reduce)` wrapper.

- [ ] **Step 4: Verify no existing logic was silently removed**

Re-read the written `page.tsx`. Confirm all of the following are present:
- [ ] `useSearchParams()` reading `callbackUrl`, `error`, `reason`
- [ ] `signIn("google", { callbackUrl })` on the "Continue with Google" button
- [ ] `signIn("google-onetap", { credential, callbackUrl, redirect: true })` in `handleCredentialResponse`
- [ ] `Script` tag with `strategy="afterInteractive"` and `onLoad` callback
- [ ] Guard in `onLoad`: logs error and returns if `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is not set
- [ ] `useEffect` initialising GIS if `google` global is already available (back-navigation case)
- [ ] `Suspense` boundary wrapping `LoginForm`
- [ ] Suspense fallback uses `bg-[#0D0D1A]` (not the old gradient)
- [ ] "Compliance. Clearly." headline present in JSX
- [ ] "Governance · Risk · Controls" tagline present

- [ ] **Step 5: Build check**

```bash
npx next build 2>&1 | tail -30
```

Expected: zero errors, zero type errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/login/page.tsx src/app/globals.css
git commit -m "feat(login): Precision Dark redesign + Google One Tap wiring"
```

---

## Chunk 4: Final Verification

### Task 5: End-to-end acceptance check

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Navigate to `http://localhost:3000/login`.

- [ ] **Step 2: Visual check**

Confirm all of the following:
- [ ] Background is `#0D0D1A` (near-black, not purple gradient)
- [ ] Subtle grid lines visible over the dark background
- [ ] No glassmorphism card, no blurred backdrop, no gradient mesh
- [ ] Updraft balloon logo renders at top-centre (~44px)
- [ ] "Meridian" eyebrow text with flanking horizontal lines visible
- [ ] **"Compliance. Clearly."** headline visible (white "Compliance." + lighter "Clearly.")
- [ ] "Governance · Risk · Controls" tagline visible below headline
- [ ] "Continue with Google" button visible with Google G icon
- [ ] "Authorised Updraft accounts only" footer note visible

- [ ] **Step 3: One Tap check** (requires a signed-in Google account in the browser)

If you have an active Google session:
- Wait ~1 second after page load
- Google's One Tap prompt should appear (bottom-right corner — Google's own UI)
- Click "Continue as [name]" → should sign in and redirect to dashboard without a separate Google page opening

If no Google session is active, One Tap will not appear — this is correct.

- [ ] **Step 4: Fallback button check**

Click "Continue with Google":
- Should redirect to Google's OAuth page (existing redirect flow, unchanged)
- After auth, should return to the Meridian dashboard

- [ ] **Step 5: Error state check**

Navigate to `http://localhost:3000/login?error=AccessDenied`:
- Red error banner should appear, styled in new dark aesthetic (no purple gradient background)

Navigate to `http://localhost:3000/login?reason=session_expired`:
- Neutral session-expired banner should appear

- [ ] **Step 6: Reduced motion check**

In browser devtools → Rendering tab → Emulate CSS media → `prefers-reduced-motion: reduce`:
- Entrance animation disabled (card appears immediately)
- Button and One Tap still functional

- [ ] **Step 7: Inactive user check** (if test user is available)

Sign in via One Tap as a user with `isActive: false` in the DB:
- Should receive `AccessDenied` (redirected to `/login?error=AccessDenied`) rather than accessing the app

- [ ] **Step 8: Final build**

```bash
npx next build 2>&1 | grep -E "error" | grep -v "^info" | head -20
```

Expected: no errors.

- [ ] **Step 9: Final commit**

```bash
git add src/app/login/page.tsx src/app/globals.css src/lib/auth-config.ts package.json package-lock.json
git commit -m "chore(login): acceptance pass complete"
```

---

## Deployment Checklist

Before pushing to production:

- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` added to Vercel environment variables (value = `GOOGLE_CLIENT_ID`)
- [ ] Verify no Content-Security-Policy header in `next.config.*` blocks `accounts.google.com` — if a CSP exists, ensure `accounts.google.com` is in both `script-src` and `connect-src` (One Tap credential POST goes to Google)
- [ ] Confirm Google Cloud Console OAuth consent screen shows correct app name and branding (GCP config — no code change)
