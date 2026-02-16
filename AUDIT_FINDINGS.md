# CCRO Dashboard - Audit Findings & Action Plan

**Date:** 2026-02-16
**Audit Completed By:** Claude Code Comprehensive Codebase Review

---

## Executive Summary

The CCRO Dashboard is functionally complete and well-structured, but has several areas requiring attention before production deployment. Key concerns:

- **Critical:** Missing input validation and error handling across API routes (security risk)
- **High:** Store synchronization issues causing data consistency problems
- **Medium:** Performance issues with N+1 queries and missing pagination
- **Low:** Accessibility and UX improvements needed

**Overall Assessment:** 7/10 - Good foundation, needs hardening for production

---

## Critical Issues (Fix Immediately)

### 1. Missing Input Validation on API Routes
**Impact:** SQL injection risk, data corruption
**Affected Files:** All API routes under `src/app/api/`

**Example:**
```typescript
// ❌ Current (unsafe)
const { status } = await request.json();
where.status = status; // No validation

// ✅ Fixed
const { status } = await request.json();
if (!['OPEN', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'].includes(status)) {
  return errorResponse('Invalid status', 400);
}
```

**Action Items:**
- [ ] Install Zod: `npm install zod`
- [ ] Create validation schemas in `src/lib/schemas/`
- [ ] Validate all POST/PATCH request bodies before database operations
- [ ] Validate all query parameters against allowed enums

**Estimated Time:** 4-6 hours

---

### 2. Missing Error Handling in API Routes
**Impact:** Unhandled exceptions cause 500 errors, no visibility into failures
**Affected Files:** 15+ API route files

**Example:**
```typescript
// ❌ Current
export async function PATCH(request: NextRequest) {
  const body = await request.json(); // Could throw
  const updated = await prisma.update({ data: body }); // Could throw
  return jsonResponse(updated);
}

// ✅ Fixed
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    // Validate body here
    const updated = await prisma.update({ data: body });
    return jsonResponse(updated);
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse('Failed to update', 500);
  }
}
```

**Action Items:**
- [ ] Wrap all API route handlers in try-catch
- [ ] Add proper error logging (consider Sentry)
- [ ] Return consistent error response format

**Estimated Time:** 3-4 hours

---

### 3. Store Sync Race Conditions
**Impact:** Data inconsistency between client and server, silent failures
**File:** `src/lib/store.ts` (Lines 94-97)

**Current Issue:**
```typescript
function sync(fn: () => Promise<unknown>): void {
  fn().catch((err) => console.warn("[store sync]", err));
}

addReport: (report) => {
  set((state) => ({ reports: [report, ...state.reports] })); // Optimistic
  sync(() => api("/api/reports", { method: "POST", body: report })); // Fire-and-forget
},
```

If API fails, report exists locally but not in database. User has no idea.

**Action Items:**
- [ ] Add retry logic with exponential backoff
- [ ] Show toast notifications on sync failures
- [ ] Consider pessimistic updates (await API, then update store)
- [ ] Or implement sync queue for manual retry

**Estimated Time:** 6-8 hours

---

### 4. Missing Authorization Checks
**Impact:** Unauthorized users can modify data
**Affected Files:** Multiple API routes

**Missing checks:**
- `/api/consumer-duty/outcomes/[id]` - No role check on PATCH
- `/api/components/*` - No role check on POST/DELETE
- `/api/templates/*` - No role check on operations

**Action Items:**
- [ ] Add `getUserId()` check to all state-changing routes
- [ ] Add role validation: `if (user.role !== 'CCRO_TEAM') return 403`
- [ ] Create middleware helper for role checks

**Estimated Time:** 2-3 hours

---

## High Priority Issues

### 5. N+1 Query Problem in CSV Import
**Impact:** Slow imports, database load
**File:** `src/app/api/actions/import/route.ts`

**Current:**
```typescript
for (const row of rows) {
  const user = await prisma.user.findFirst({ where: { email: row.email } });
  // 100 rows = 100 queries
}
```

**Fix:**
```typescript
const allEmails = rows.map(r => r.email);
const users = await prisma.user.findMany({ where: { email: { in: allEmails } } });
const userMap = new Map(users.map(u => [u.email, u]));
// Then lookup from map
```

**Action Items:**
- [ ] Batch load users/outcomes before loop
- [ ] Use Map for O(1) lookups

**Estimated Time:** 1 hour

---

### 6. Missing Database Constraints
**Impact:** Data integrity issues
**File:** `prisma/schema.prisma`

**Issues:**
- `owner` field is string, not FK to User (can reference non-existent users)
- No unique constraint check in user creation API

**Action Items:**
- [ ] Add FK constraint: `owner User? @relation(fields: [ownerId], references: [id])`
- [ ] Handle unique constraint violations with proper error messages
- [ ] Run migration: `npx prisma migrate dev`

**Estimated Time:** 2 hours

---

### 7. Broken Dashboard Link
**Impact:** User confusion
**File:** `src/app/page.tsx` (Line 158)

**Issue:** Link to `/actions?status=DUE_THIS_MONTH` but status enum doesn't include this value

**Action Items:**
- [ ] Remove link or implement "due this month" filter
- [ ] Add client-side date filtering for due dates

**Estimated Time:** 30 minutes

---

## Medium Priority Issues

### 8. Missing Pagination
**Impact:** Performance degradation as data grows
**Affected:** All list endpoints

**Action Items:**
- [ ] Add `skip` and `take` parameters to list endpoints
- [ ] Implement cursor-based pagination for audit logs
- [ ] Add pagination UI components

**Estimated Time:** 4-5 hours

---

### 9. No Loading States
**Impact:** Poor UX, users don't know if app is working
**Affected:** All pages

**Action Items:**
- [ ] Add `_hydrated` check in layout
- [ ] Show skeleton loaders while fetching
- [ ] Add loading spinners to buttons

**Estimated Time:** 3-4 hours

---

### 10. No Error Boundaries
**Impact:** App crashes on unhandled errors

**Action Items:**
- [ ] Create `ErrorBoundary` component
- [ ] Wrap pages in error boundary
- [ ] Add Sentry or error tracking

**Estimated Time:** 2 hours

---

### 11. Monolithic Store
**Impact:** Hard to maintain, slow HMR
**File:** `src/lib/store.ts` (300+ lines)

**Action Items:**
- [ ] Split into feature slices:
  - `stores/reports.ts`
  - `stores/consumer-duty.ts`
  - `stores/actions.ts`
  - `stores/auth.ts`
- [ ] Use Zustand's `combine` or `createSlice`

**Estimated Time:** 4-6 hours

---

## Low Priority (Nice to Have)

### 12. Accessibility Improvements
- Add proper ARIA labels to interactive elements
- Support keyboard navigation (Space key on role=button)
- Add focus management in modals
- Test with screen reader

**Estimated Time:** 3-4 hours

---

### 13. Type Generation from Prisma
- Install `zod-prisma-types` or similar
- Generate Zod schemas from Prisma models
- Remove type duplication between `types.ts` and schema

**Estimated Time:** 2 hours

---

### 14. Request Deduplication
- Install React Query or SWR
- Deduplicate identical concurrent requests
- Add request caching

**Estimated Time:** 4-6 hours

---

### 15. Email Service Integration
- Integrate SendGrid/Mailgun/Resend
- Implement actual email sending in `src/lib/email.ts`
- Add email templates

**Estimated Time:** 4-6 hours

---

## Missing Features

### 16. Action Change Approval Workflow
**Status:** Partially implemented
**Missing:** `/api/actions/[id]/changes/[changeId]` endpoints

**Action Items:**
- [ ] Create approve/reject endpoints
- [ ] Add UI for reviewing proposed changes
- [ ] Send email notifications on approval/rejection

**Estimated Time:** 6-8 hours

---

### 17. Report Export Improvements
**Current:** Client-side HTML generation
**Needed:** Server-side PDF export with proper styling

**Action Items:**
- [ ] Install Puppeteer or similar
- [ ] Create `/api/reports/[id]/export` endpoint
- [ ] Generate PDF with embedded CSS
- [ ] Add watermark for draft reports

**Estimated Time:** 6-8 hours

---

### 18. User Management Enhancements
**Missing:**
- User deactivation
- Password reset
- Profile editing
- Audit trail for user changes

**Action Items:**
- [ ] Add `isActive` toggle in user management
- [ ] Implement proper auth (NextAuth.js or Clerk)
- [ ] Add user audit logging

**Estimated Time:** 8-10 hours

---

## Recommended Roadmap

### Sprint 1: Security & Stability (Critical)
**Duration:** 1 week
**Focus:** Production-readiness

- [ ] Input validation with Zod (6 hours)
- [ ] Error handling in API routes (4 hours)
- [ ] Authorization checks (3 hours)
- [ ] Fix store sync issues (8 hours)
- [ ] Database constraints (2 hours)

**Total:** ~23 hours

---

### Sprint 2: Performance & Data Integrity (High)
**Duration:** 1 week
**Focus:** Scalability

- [ ] Fix N+1 queries (1 hour)
- [ ] Implement pagination (5 hours)
- [ ] Add database indexes (2 hours)
- [ ] Batch operations optimization (3 hours)
- [ ] Fix broken dashboard link (30 min)

**Total:** ~11.5 hours

---

### Sprint 3: UX & Polish (Medium)
**Duration:** 1 week
**Focus:** User experience

- [ ] Loading states (4 hours)
- [ ] Error boundaries (2 hours)
- [ ] Toast notifications (2 hours)
- [ ] Refactor monolithic store (6 hours)
- [ ] Accessibility improvements (4 hours)

**Total:** ~18 hours

---

### Sprint 4: Features & Enhancements (Low)
**Duration:** 2 weeks
**Focus:** Complete functionality

- [ ] Action change approval (8 hours)
- [ ] Report PDF export (8 hours)
- [ ] Email service integration (6 hours)
- [ ] User management enhancements (10 hours)
- [ ] Request deduplication (6 hours)

**Total:** ~38 hours

---

## Quick Wins (Do These Today)

1. **Add try-catch to all API routes** (4 hours) - Prevents unhandled crashes
2. **Fix broken dashboard link** (30 min) - Immediate UX improvement
3. **Batch user lookups in CSV import** (1 hour) - 10x performance improvement
4. **Add loading spinner to CSV import** (30 min) - Better UX
5. **Validate status enums in action API** (1 hour) - Prevents invalid data

**Total Quick Wins:** ~7 hours, high impact

---

## Long-Term Considerations

### Authentication & Authorization
- Replace demo auth with NextAuth.js or Clerk
- Implement SSO/SAML for enterprise
- Add multi-factor authentication

### Observability
- Add APM (DataDog, New Relic)
- Implement structured logging
- Add performance monitoring
- Set up error tracking (Sentry)

### Testing
- Add unit tests (Jest + React Testing Library)
- Add E2E tests (Playwright)
- Add API integration tests
- Add visual regression tests

### Infrastructure
- Set up CI/CD pipeline
- Add staging environment
- Implement feature flags
- Add database backups

---

## Notes

- **Code Quality:** Generally good, consistent patterns
- **Security:** Needs hardening before production
- **Performance:** Good for current scale, needs optimization for growth
- **UX:** Functional but needs polish
- **Maintainability:** Well-structured, needs refactoring of large files

**Confidence:** High - codebase is in good shape, just needs production hardening.
