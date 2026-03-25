# Design Spec: Dashboard Notification Banner Restyle

**Date:** 2026-03-25
**Status:** Approved

---

## Overview

Restyle the dashboard notification from a floating rounded card inside the greeting header to a full-width banner pinned to the bottom edge of the gradient header card.

---

## Design Intent

**Who:** All users — the notification is the first thing they read when landing on the dashboard.
**One thing:** The message must read as a broadcast, not a secondary detail. A full-width banner makes it feel authoritative and unmissable without breaking the header's visual flow.
**Remove:** The rounded border and inner background of the current notification card — the banner inherits the header's gradient with a subtle tint overlay instead.

---

## What Changes

**File:** `src/app/page.tsx` — `GreetingHeader` component only.

### Current behaviour
- Notifications rendered as `mt-4 space-y-2` block inside the gradient card body
- Each notification is a `rounded-xl border px-4 py-2.5` card with a light-mode background (bg-red-50, bg-amber-50, bg-updraft-pale-purple/30)
- Light-mode colours look out of place on the dark purple gradient

### New behaviour
- Notifications rendered as a single banner strip pinned to the bottom of the gradient `div`
- Banner is full-width, flush with card edges (negative margin to cancel card padding)
- `border-top` separator above the banner; no border-radius
- Urgency badge (small pill label: INFO / WARNING / URGENT) sits at the left of the message text
- Dark-gradient-aware colour tints:
  - `INFO` — `rgba(255,255,255,0.13)` background, `rgba(255,255,255,0.18)` border-top
  - `WARNING` — `rgba(251,191,36,0.18)` background, `rgba(251,191,36,0.3)` border-top, amber badge
  - `URGENT` — `rgba(239,68,68,0.20)` background, `rgba(239,68,68,0.35)` border-top, red badge
- If multiple active notifications exist, stack them as separate banner strips (most urgent first)
- The `Megaphone` icon is removed — the badge label replaces it

### No changes to
- The gradient itself (`from-updraft-deep via-updraft-bar to-updraft-bright-purple`)
- The greeting text, date, or logo mark
- The `DashboardNotification` type or API
- Any other component

---

## Testing

- INFO notification renders with white-tint banner and INFO badge
- WARNING notification renders with amber-tint banner and WARNING badge
- URGENT notification renders with red-tint banner and URGENT badge
- Multiple notifications stack correctly
- No notification: banner strip absent, header looks unchanged
