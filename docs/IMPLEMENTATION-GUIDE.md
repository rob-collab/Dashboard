# Updraft CCRO Dashboard — Implementation Guide

**For:** Rob (Developer) & Team
**Version:** 0.1.0 — February 2025
**Purpose:** Get the dashboard running locally, understand how it works today, and plan the path to a hosted environment with real data.

---

## Table of Contents

1. [What We Have Today](#1-what-we-have-today)
2. [Running Locally in 5 Minutes](#2-running-locally-in-5-minutes)
3. [Architecture Overview](#3-architecture-overview)
4. [Current Limitations (Demo Mode)](#4-current-limitations-demo-mode)
5. [Path to Real Data & Hosting](#5-path-to-real-data--hosting)
6. [Step-by-Step: Connecting a Database](#6-step-by-step-connecting-a-database)
7. [Step-by-Step: Deploying to Vercel](#7-step-by-step-deploying-to-vercel)
8. [Step-by-Step: Adding Real Authentication](#8-step-by-step-adding-real-authentication)
9. [Environment Variables Reference](#9-environment-variables-reference)
10. [Testing Checklist for Feature Review](#10-testing-checklist-for-feature-review)
11. [Known Issues & Workarounds](#11-known-issues--workarounds)
12. [File Map](#12-file-map)

---

## 1. What We Have Today

A fully functional **client-side prototype** of the CCRO reporting dashboard. Everything runs in the browser — all data lives in memory (Zustand store) and is seeded with demo data on every page refresh.

**What works:**
- Full report builder with 8 section types (text, tables, cards, charts, images, accordions, consumer duty, imported components)
- Drag-and-drop section reordering
- Rich text editor (Tiptap) with inline images
- Consumer Duty dashboard with outcomes, measures, and MI metrics
- RAG status tracking (Good/Warning/Harm)
- Image upload (drag-and-drop, base64 storage)
- Team logo/branding settings
- HTML export with embedded images and logo
- Version history and publish workflow
- Audit trail logging
- Role-based access (CCRO Team / Metric Owner / Viewer)
- User switching (demo mode)
- Templates and imported HTML components library

**What doesn't persist:**
- Everything resets on page refresh. No database is connected yet.

---

## 2. Running Locally in 5 Minutes

### Prerequisites
- **Node.js** 18+ (check with `node --version`)
- **npm** (comes with Node)

### Steps

```bash
# 1. Navigate to the project
cd ~/updraft-ccro-dashboard

# 2. Install dependencies (already done, but run if needed)
npm install

# 3. Start the dev server
npm run dev
```

The app will be available at **http://localhost:3000**.

### What you'll see
- The dashboard loads as **Rob** (CCRO_TEAM role) by default
- The sidebar has links to all pages
- Three demo reports are pre-loaded (Feb 2025 Draft, Jan 2025 Published, Dec 2024 Archived)
- Switch users via the avatar at the bottom-left of the sidebar

### Useful commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build (checks for errors) |
| `npm run start` | Run the production build locally |
| `npm run lint` | Run ESLint checks |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                    Browser                       │
│                                                  │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐ │
│  │  Next.js   │  │  Zustand  │  │  Demo Data   │ │
│  │  App Router│──│  Store    │──│  (in-memory)  │ │
│  │  (pages)   │  │  (state)  │  │              │ │
│  └───────────┘  └──────────┘  └──────────────┘ │
│                                                  │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐ │
│  │  Tiptap    │  │  dnd-kit  │  │  Recharts    │ │
│  │  (editor)  │  │  (drag)   │  │  (charts)    │ │
│  └───────────┘  └──────────┘  └──────────────┘ │
└─────────────────────────────────────────────────┘
         │ (future)
         ▼
┌─────────────────────────────────────────────────┐
│  Supabase (Postgres + Auth + Storage)            │
│  OR Vercel Postgres + NextAuth                   │
└─────────────────────────────────────────────────┘
```

**Key technology choices:**
- **Next.js 14** — React framework with App Router (all pages are client-side today)
- **TypeScript** — Full type safety
- **Zustand** — Lightweight state management (replaces Redux)
- **Tailwind CSS** — Utility-first styling with custom Updraft brand colours
- **Tiptap** — Rich text editor (based on ProseMirror)
- **dnd-kit** — Drag-and-drop for section reordering
- **Recharts** — Charting library (installed, partially wired)
- **Prisma** — Database ORM (schema defined, not connected)
- **Supabase SDK** — Auth & database client (installed, not connected)

---

## 4. Current Limitations (Demo Mode)

| Limitation | Impact | Resolution |
|-----------|--------|-----------|
| **No database** | All data resets on refresh | Connect Supabase Postgres (see §6) |
| **No authentication** | Users switch via dropdown, no login screen | Wire Supabase Auth or NextAuth (see §8) |
| **Images stored as base64** | Large images bloat memory; no CDN | Move to Supabase Storage or S3 |
| **No API routes** | All logic runs client-side | Add Next.js API routes when DB is connected |
| **Single-user state** | No real-time collaboration | Fine for MVP; add websockets later if needed |
| **Demo data hardcoded** | Can't create truly new outcomes/measures from scratch | Will use real DB for CRUD |
| **Prisma schema missing IMAGE_BLOCK** | Schema out of sync with app types | Update schema before first migration |
| **No email/notifications** | No alerts when metrics need updating | Add via Supabase Edge Functions or Resend |

---

## 5. Path to Real Data & Hosting

There are three things to set up, roughly in this order:

### Option A: Supabase (Recommended for speed)
Supabase gives you Postgres + Auth + File Storage + Edge Functions in one platform. The SDK is already installed.

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Connect Prisma** to the Supabase Postgres URL
3. **Run migrations** to create all tables
4. **Swap Zustand reads/writes** for Supabase client calls (or add API routes)
5. **Wire Supabase Auth** for real login
6. **Deploy to Vercel** (free tier works fine for testing)

### Option B: Vercel Postgres + NextAuth
If you want to stay purely in the Vercel ecosystem.

### Option C: Self-hosted Postgres
If you need to keep data on-premises (compliance reasons).

**My recommendation:** Go with **Option A (Supabase)** for the testing phase. It's the fastest path, the SDK is already installed, and you can migrate to self-hosted later if needed. The free tier covers everything you need for testing.

---

## 6. Step-by-Step: Connecting a Database

### 6.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up / log in
2. Click **New Project**
3. Name: `updraft-ccro-dashboard`
4. Choose a region close to you (e.g. London)
5. Set a strong database password — save it somewhere safe
6. Wait for the project to provision (~2 minutes)

### 6.2 Get Your Connection Strings

In your Supabase dashboard:
1. Go to **Project Settings → Database**
2. Copy the **Connection string (URI)** — it looks like:
   ```
   postgresql://postgres.[ref]:[password]@aws-0-eu-west-2.pooler.supabase.com:6543/postgres
   ```
3. Also grab the **Direct connection** string (for migrations)

### 6.3 Update Your .env File

Replace the contents of `.env`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[your-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]

# Prisma (use the Direct connection for migrations)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-eu-west-2.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-eu-west-2.pooler.supabase.com:5432/postgres"
```

### 6.4 Update the Prisma Schema

In `prisma/schema.prisma`, update the datasource:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Add `IMAGE_BLOCK` to the SectionType enum:

```prisma
enum SectionType {
  TEXT_BLOCK
  DATA_TABLE
  CONSUMER_DUTY_DASHBOARD
  CHART
  CARD_GRID
  IMPORTED_COMPONENT
  TEMPLATE_INSTANCE
  ACCORDION
  IMAGE_BLOCK
}
```

### 6.5 Run Your First Migration

```bash
# Generate the Prisma client
npx prisma generate

# Create all tables in Supabase
npx prisma db push

# (Or if you want migration files for version control)
npx prisma migrate dev --name initial
```

### 6.6 Seed the Database (Optional)

Create `prisma/seed.ts` to insert the demo data into the real database, or start fresh and enter data through the UI.

### 6.7 Wire Up API Routes

The big piece of work: replace the Zustand store's in-memory operations with API calls. The pattern is:

```
src/app/api/reports/route.ts       → GET (list), POST (create)
src/app/api/reports/[id]/route.ts  → GET, PUT, DELETE
src/app/api/sections/route.ts      → CRUD for sections
src/app/api/outcomes/route.ts      → CRUD for outcomes
...etc
```

Each route uses Prisma to read/write the database.

---

## 7. Step-by-Step: Deploying to Vercel

### 7.1 Push to GitHub

```bash
# If not already a GitHub repo
gh repo create updraft-ccro-dashboard --private --source=. --push
```

### 7.2 Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New → Project**
3. Import `updraft-ccro-dashboard`
4. Add your environment variables (from §6.3)
5. Click **Deploy**

That's it. Vercel auto-deploys on every push to `main`.

### 7.3 Custom Domain (Optional)

In Vercel project settings → Domains → Add your domain (e.g. `ccro.updraft.com`).

---

## 8. Step-by-Step: Adding Real Authentication

### Using Supabase Auth (Recommended)

1. In Supabase dashboard → Authentication → Providers → Enable **Email**
2. Create users for Cath, Ash, Chris, Micha, etc.
3. Update `src/lib/auth.ts` to use Supabase auth instead of demo users
4. Add a `/login` page with email/password form
5. Protect routes with middleware or the existing RoleGuard pattern
6. Map Supabase user IDs to the User table in your database

The `@supabase/auth-helpers-nextjs` package is already installed — it provides middleware and session helpers.

---

## 9. Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | For Supabase | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For Supabase | Public anonymous key |
| `DATABASE_URL` | For database | Postgres connection string |
| `DIRECT_URL` | For migrations | Direct Postgres connection (no pooler) |

---

## 10. Testing Checklist for Feature Review

Use this when sitting down with Cath to test. Start the dev server (`npm run dev`) and work through:

### Core Navigation
- [ ] Dashboard loads, shows summary stats
- [ ] All sidebar links work
- [ ] User switcher works (try all 6 users)
- [ ] Sidebar collapses/expands
- [ ] Role-based pages hidden for non-CCRO users

### Reports
- [ ] Reports list shows 3 demo reports with correct statuses
- [ ] Search and status filters work
- [ ] Create new report (title + period)
- [ ] Open report editor
- [ ] Add each section type (Text, Table, Cards, Chart, Image, Accordion, Consumer Duty)
- [ ] Drag to reorder sections
- [ ] Edit section titles (click the title text)
- [ ] Delete sections (click trash icon, confirm)
- [ ] Save report (check "Saved!" flash)
- [ ] Preview report (view mode)
- [ ] Publish report (with note)
- [ ] Export HTML and open in browser

### Image Block (New)
- [ ] Add an Image section in the editor
- [ ] Drag-and-drop an image onto the upload zone
- [ ] Or click to browse and select a file
- [ ] Verify preview appears
- [ ] Set alt text and caption
- [ ] Change alignment (left/centre/right)
- [ ] Adjust width slider
- [ ] Change object fit (contain/cover/fill)
- [ ] Replace image
- [ ] Remove image
- [ ] Save and preview — image appears in view mode
- [ ] Export HTML — image embedded in the export
- [ ] Try uploading a file > 5MB — should show error
- [ ] Try uploading a non-image file — should show error

### Rich Text Inline Images (New)
- [ ] In a Text Block, click the image icon in the toolbar
- [ ] Select an image — it appears inline in the text
- [ ] Text wraps around/below the image

### Branding & Logo (New)
- [ ] Go to Settings (sidebar, CCRO_TEAM users only)
- [ ] Upload a team logo via drag-and-drop or browse
- [ ] Preview updates immediately
- [ ] Adjust logo width slider
- [ ] Set company name and alt text
- [ ] Toggle "Show in Header" / "Show in Footer"
- [ ] Go to a report view — logo appears in header and/or footer
- [ ] Export HTML — logo embedded in header/footer
- [ ] Remove logo — verify it disappears from reports

### Properties Panel
- [ ] Select an Image section, open Properties panel
- [ ] Image controls section appears (alignment, width, fit)
- [ ] Changes update the preview in real time

### Consumer Duty
- [ ] Dashboard shows 5 outcomes with RAG colours
- [ ] Click an outcome → measures expand below
- [ ] Click a measure → MI modal opens
- [ ] Edit MI values (as Metric Owner)
- [ ] RAG colours update correctly

### Audit Trail
- [ ] Audit page shows log entries
- [ ] Filters work (by action, user, date)

### Edge Cases
- [ ] Switch to CEO (Viewer) — admin pages are locked
- [ ] Switch to Ash (Metric Owner) — Templates, Components, Audit, Users, Settings hidden
- [ ] Refresh the page — data resets (expected in demo mode)

---

## 11. Known Issues & Workarounds

| Issue | Workaround |
|-------|-----------|
| Data resets on refresh | Expected — no DB connected yet |
| `<img>` lint warnings on build | Intentional — we use base64 data URLs which `next/image` can't optimise |
| Chart section shows placeholder in view mode | Recharts renders in edit mode; view mode shows a static placeholder |
| Large images (>2-3MB) may slow the editor | Keep images under 1MB where possible; resize before uploading |
| Prisma schema missing IMAGE_BLOCK enum | Update before first migration (see §6.4) |
| No undo for section deletion | Two-click confirm is the only guard |

---

## 12. File Map

```
updraft-ccro-dashboard/
├── prisma/
│   └── schema.prisma              # Database schema (not yet connected)
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with sidebar + auth
│   │   ├── page.tsx               # Dashboard home
│   │   ├── globals.css            # Tailwind imports + custom CSS
│   │   ├── reports/
│   │   │   ├── page.tsx           # Reports list
│   │   │   ├── new/page.tsx       # Create report
│   │   │   └── [id]/
│   │   │       ├── page.tsx       # View report (+ logo, image blocks)
│   │   │       └── edit/page.tsx  # Edit report (section builder)
│   │   ├── consumer-duty/page.tsx # Consumer Duty dashboard
│   │   ├── templates/page.tsx     # Templates library
│   │   ├── components-lib/page.tsx# Imported components
│   │   ├── audit/page.tsx         # Audit trail
│   │   ├── users/page.tsx         # User management
│   │   └── settings/page.tsx      # Branding settings (NEW)
│   ├── components/
│   │   ├── layout/                # Sidebar, Header
│   │   ├── sections/              # Section renderers (TextBlock, DataTable, ImageSection, etc.)
│   │   ├── editor/                # PropertiesPanel, RichTextEditor
│   │   ├── reports/               # ReportCard, PublishDialog, VersionList
│   │   ├── consumer-duty/         # OutcomeCard, MeasurePanel, MIModal
│   │   ├── settings/              # BrandingSettings (NEW)
│   │   └── common/                # RoleGuard
│   └── lib/
│       ├── types.ts               # All TypeScript interfaces
│       ├── store.ts               # Zustand store (all state)
│       ├── auth.ts                # Auth context + demo users
│       ├── demo-data.ts           # Seed data
│       ├── utils.ts               # Helpers (cn, formatDate, RAG colours, etc.)
│       ├── audit.ts               # Audit logging helper
│       ├── sanitize.ts            # HTML sanitisation (DOMPurify)
│       ├── export-html.ts         # HTML report export
│       ├── image-utils.ts         # Image validation & base64 conversion (NEW)
│       ├── prisma.ts              # Prisma client init (not active)
│       └── supabase.ts            # Supabase client init (not active)
├── .env                           # Environment variables
├── package.json                   # Dependencies & scripts
├── tailwind.config.ts             # Brand colours & custom theme
└── next.config.mjs                # Next.js config
```
