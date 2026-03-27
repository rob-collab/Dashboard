# Design Spec: Login Page Redesign + Google One Tap

**Date:** 2026-03-27
**Status:** Approved
**Sprint:** Login Redesign

---

## Problem

The current login page (`/login`) has three significant issues:

1. **AI slop aesthetic** — glassmorphic card, purple gradient mesh, glowing orbs. Looks generic and unpolished.
2. **Full-page Google redirect** — clicking "Continue with Google" navigates away from Meridian entirely. Breaks immersion and makes the pre-Lottie experience feel disjointed.
3. **Disconnect from brand** — the loading animation (Lottie) looks polished; the login page does not match that quality bar.

---

## Design Decisions

| Decision | Choice |
|---|---|
| Visual direction | Precision Dark |
| Auth flow | Google One Tap (auto-prompt on load), fallback to existing redirect |
| Logo | Updraft balloon image (`/loading-logo.jpeg`) |
| Headline copy | "Compliance. Clearly." |
| Tagline copy | "Governance · Risk · Controls" |

---

## Visual Design

### Background

- Full viewport: `#0D0D1A`
- Overlay: subtle grid pattern — `rgba(124,58,237,0.07)` lines, `28px` grid size
- Two soft radial corner glows for depth (top-right, bottom-left) — `rgba(124,58,237,0.12)` and `rgba(99,102,241,0.08)`, each ~180px, `blur-3xl`. Smaller and more restrained than current orbs.
- No `backdrop-blur`, no `bg-white/[0.07]`, no glassmorphism

### Layout

Centred single column, `max-width: 280px`, vertically centred on viewport. Content stack (top to bottom):

1. **Logo** — Updraft balloon image (`/loading-logo.jpeg`), `44×44px`, `border-radius: 10px`, `ring-1 ring-white/10`
2. **Eyebrow** — "Meridian", `9px`, uppercase, `letter-spacing: 0.22em`, `rgba(255,255,255,0.3)`, flanked by thin `1px rgba(255,255,255,0.1)` horizontal rules
3. **Tagline** — "Governance · Risk · Controls", `11px`, `rgba(255,255,255,0.28)`, `margin-bottom: 28px`
4. **"Continue with Google" button** — always visible; `rgba(255,255,255,0.06)` background, `1px rgba(255,255,255,0.1)` border, `border-radius: 10px`, Google G icon + label `rgba(255,255,255,0.7)`. Calls `signIn("google", { callbackUrl })` (existing redirect — unchanged fallback path)
5. **Footer note** — "Authorised Updraft accounts only", `9px`, `rgba(255,255,255,0.2)`, `margin-top: 16px`

### Google One Tap Prompt

Google One Tap renders Google's **own** floating prompt UI (bottom-right corner of the viewport) — this is Google's branded card, not a custom component we build. It fires automatically on page load when Google detects a signed-in account. No custom "One Tap zone" is built in our UI; we only handle the credential callback.

When One Tap is dismissed or unavailable (popup blocked, no account detected, cooldown period), users fall back to the "Continue with Google" button — which is always visible regardless of One Tap state. No conditional show/hide logic on our button.

### Suspense Fallback

The `LoginPage` `Suspense` fallback background must be updated to `bg-[#0D0D1A]` (matching the new page background) to prevent a visible gradient flash on load. The three-dot loading animation inside it is unchanged.

### Error / Session States

Shown above the sign-in stack, styled to match the new aesthetic:
- `reason=session_expired` → `rgba(255,255,255,0.06)` banner, `rgba(255,255,255,0.8)` text
- `error=AccessDenied` → `rgba(239,68,68,0.12)` banner, `rgb(252,165,165)` text

### Animation

Single entrance: `opacity: 0 → 1`, `translateY: 12px → 0`, `duration: 200ms`, `ease-out`. Applied to the inner card div. Respects `prefers-reduced-motion`.

---

## Auth: Google One Tap

### Flow

1. Page loads → Google Identity Services (GIS) script is loaded via `next/script` strategy `"afterInteractive"` (not `"beforeInteractive"` — that is incompatible with client components in Next.js 14)
2. `next/script`'s `onLoad` callback fires when GIS is ready → `google.accounts.id.initialize({ client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, callback: handleCredentialResponse, auto_select: false })`
3. `google.accounts.id.prompt()` — triggers One Tap floating UI if Google detects an account
4. If the user approves One Tap: `handleCredentialResponse` receives `{ credential: string }` (Google JWT ID token) and **immediately** calls `signIn("google-onetap", { credential, callbackUrl, redirect: true })`. In next-auth v5 beta, CredentialsProvider is invoked via its provider `id` field, not the generic `"credentials"` string. No additional button click required — One Tap is a single-gesture approval.
5. **Fallback**: "Continue with Google" button calls `signIn("google", { callbackUrl })` — existing redirect OAuth flow, unchanged.

### TypeScript: GIS Global Type

The `google.accounts.id` API is injected at runtime by the GIS script. Add `@types/google-one-tap` as a devDependency:

```
npm install -D @types/google-one-tap
```

This provides the `google.accounts.id` global type declarations without requiring `(window as any).google` casts.

### Environment Variables

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — the public client ID used in the browser-side GIS `initialize()` call. This is the same value as the existing `GOOGLE_CLIENT_ID` server env var; expose it publicly (it is safe — this is a public identifier, not a secret).
- All existing env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET` / `AUTH_SECRET`) are unchanged.

### Server-side: New Credentials Provider in `src/lib/auth-config.ts`

Add `google-onetap` credentials provider to `src/lib/auth-config.ts` alongside the existing Google OAuth provider. **Note:** In next-auth v5 beta, the `signIn` callback does not fire for CredentialsProvider. All guards and side-effects that the `signIn` callback handles for the Google OAuth path must be reproduced explicitly inside `authorize`.

```typescript
CredentialsProvider({
  id: "google-onetap",
  credentials: { credential: { type: "text" } },
  async authorize(credentials) {
    if (!credentials?.credential) return null;
    try {
      const { OAuth2Client } = await import("google-auth-library");
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: credentials.credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.email) return null;

      const dbUser = await prisma.user.findUnique({
        where: { email: payload.email },
        select: { id: true, email: true, name: true, isActive: true },
      });

      // Mirror signIn callback: reject if not found or inactive
      if (!dbUser || !dbUser.isActive) return null;

      // signIn callback does NOT fire for CredentialsProvider in next-auth v5 beta —
      // update lastLoginAt here instead (best-effort, same pattern as signIn callback)
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
      // verifyIdToken throws on network error, expired token, or invalid signature.
      // Return null → next-auth converts to AccessDenied redirect.
      console.error("[google-onetap] verifyIdToken failed:", err);
      return null;
    }
  },
})
```

**`checks` compatibility:** The `checks: [] as any` override in the existing Google provider is scoped to that provider object only. The new CredentialsProvider is unaffected by it.

**Runtime dependency:** `google-auth-library` (runtime, not dev):
```
npm install google-auth-library
```

### Auth Callbacks: `jwt` and `session` — No Changes Required

The `jwt` callback's `trigger === "signIn"` path (which stamps `signedAt`) **does** fire for the CredentialsProvider in next-auth v5. The `session` callback is unchanged. No modifications to either callback are needed.

---

## Unchanged

- `callbackUrl` / `reason` query param handling logic
- `next-auth` Google OAuth provider (kept as redirect fallback)
- All other pages, routes, and store logic

---

## Acceptance Criteria

- [ ] Login page renders with dark `#0D0D1A` background + subtle grid overlay
- [ ] No glassmorphism, no blur backdrop, no gradient mesh
- [ ] Updraft balloon logo renders at `44×44px` with subtle ring
- [ ] "Compliance. Clearly." headline and "Governance · Risk · Controls" tagline visible
- [ ] `@types/google-one-tap` installed as devDependency; `google-auth-library` as runtime dependency
- [ ] GIS script loaded with `strategy="afterInteractive"` via `next/script`
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` set in environment (same value as `GOOGLE_CLIENT_ID`)
- [ ] Google One Tap auto-prompt fires on page load when a Google account is detected
- [ ] Approving One Tap signs the user in without a full-page redirect
- [ ] Inactive user (`isActive: false`) cannot sign in via One Tap — `authorize` returns `null`
- [ ] `verifyIdToken` errors are caught, logged with `console.error`, and return `null` (no 500)
- [ ] `lastLoginAt` is updated inside `authorize` on successful One Tap sign-in
- [ ] "Continue with Google" button is always visible regardless of One Tap availability
- [ ] "Continue with Google" falls back correctly to the existing OAuth redirect
- [ ] `Suspense` fallback background updated to `#0D0D1A` — no gradient flash on load
- [ ] Session expired and access denied error states render correctly in new style
- [ ] Entrance animation plays on the card; reduced motion preference respected
- [ ] `npx next build` passes with zero errors
