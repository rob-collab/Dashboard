# CCRO Dashboard - Missing Features Report

**Date:** 2026-02-16
**Analysis:** Features that SHOULD exist but are missing or incomplete

---

## Critical Issues (Breaks Core Workflows)

### 1. Outcomes Cannot Be Deleted ⚠️
**Impact:** HIGH - Data management incomplete
**File:** `src/app/api/consumer-duty/outcomes/[id]/route.ts`

**Issue:**
- Delete button exists in UI (`src/app/consumer-duty/page.tsx:468`)
- `deleteOutcome()` exists in store (`src/lib/store.ts:211`)
- But DELETE API endpoint is missing - only PATCH implemented
- Deletions only happen locally, not persisted to database

**Fix Required:**
```typescript
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireCCRORole(request);
    if ('error' in authResult) return authResult.error;

    const { id } = await params;
    await prisma.consumerDutyOutcome.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[API Error]', error);
    return errorResponse(error instanceof Error ? error.message : 'Operation failed', 500);
  }
}
```

**Effort:** 30 minutes

---

### 2. Report Deletion Not Available in UI ⚠️
**Impact:** HIGH - Users cannot remove outdated reports
**File:** `src/components/reports/ReportCard.tsx`

**Issue:**
- DELETE API exists (`src/app/api/reports/[id]/route.ts:56-65`)
- But no Delete button in ReportCard component
- No delete action in reports page

**Fix Required:**
- Add Delete button to ReportCard (conditional: only for DRAFT or CCRO_TEAM)
- Add confirmation modal before delete
- Wire to API endpoint

**Effort:** 1 hour

---

### 3. Template Application Non-Functional 🚫
**Impact:** CRITICAL - Core feature doesn't work
**File:** `src/app/reports/new/page.tsx:133-147`

**Issue:**
```typescript
<div onClick={() => {}} // Line 134 - DOES NOTHING
  className="... cursor-pointer ..."
>
  <FileText size={32} className="..." />
  <h3>Standard CCRO Report</h3>
</div>
```

**Current State:**
- Two template options shown
- Clicking does nothing
- User ends up on blank report editor regardless

**Fix Required:**
1. Pass selected template ID to report editor
2. Load template sections from database
3. Clone template sections to new report
4. Populate content schema

**Effort:** 3-4 hours

---

### 4. Section Reordering Not Persisted 🚫
**Impact:** CRITICAL - User changes lost
**File:** `src/app/reports/[id]/edit/page.tsx:175-187`

**Issue:**
```typescript
const handleDragEnd = (result: DropResult) => {
  // ... reorders locally ...
  reorderSections(reordered);
  // Missing: sync() call to persist to API
};
```

**Fix Required:**
```typescript
const handleDragEnd = (result: DropResult) => {
  // existing reorder logic
  reorderSections(reordered);

  // Persist new order to API
  sync(() => api(`/api/reports/${report.id}/sections`, {
    method: 'PUT',
    body: { sections: reordered.map((s, idx) => ({ id: s.id, position: idx })) }
  }));
};
```

**Effort:** 1 hour

---

### 5. Chart Section Type Not Implemented 📊
**Impact:** HIGH - Advertised feature doesn't work
**File:** `src/components/sections/SectionRenderer.tsx`

**Issue:**
- CHART is valid SectionType in schema
- Shows placeholder in report view
- No actual chart rendering

**Fix Required:**
- Install Recharts (already used in MetricDrillDown)
- Create ChartSection component
- Support chart types: bar, line, pie, area
- Bind to data sources

**Effort:** 4-6 hours

---

## High Priority (Missing Core Features)

### 6. No Archive Workflow for Reports
**Impact:** MEDIUM - Reports accumulate without cleanup
**File:** `src/app/reports/page.tsx`

**Issue:**
- ARCHIVED status exists in enum
- No UI to transition PUBLISHED → ARCHIVED
- No "Archive" button anywhere

**Fix Required:**
- Add "Archive" button to published reports
- Create `PATCH /api/reports/[id]` call with `{status: "ARCHIVED"}`
- Show archived reports in separate section

**Effort:** 2 hours

---

### 7. No Duplicate Report Feature
**Impact:** MEDIUM - Users must manually recreate similar reports
**File:** `src/app/reports/page.tsx`

**Issue:**
- Common use case: duplicate previous report for new period
- No duplicate button or endpoint

**Fix Required:**
- Add POST `/api/reports/[id]/duplicate` endpoint
- Deep copy report + sections + outcomes
- Update period to new value
- Status reset to DRAFT

**Effort:** 2-3 hours

---

### 8. Cannot Edit Imported Components
**Impact:** MEDIUM - Users must delete and re-import to fix typos
**File:** `src/app/components-lib/page.tsx`

**Issue:**
- Components can only be previewed, duplicated, deleted
- No edit button
- If HTML has error, must delete and recreate

**Fix Required:**
- Add Edit button
- Reuse ImportComponentDialog in edit mode
- Pre-populate with existing HTML/name/description

**Effort:** 1-2 hours

---

### 9. Measure Owners Cannot Be Reassigned
**Impact:** MEDIUM - Staffing changes require delete/recreate
**File:** `src/components/consumer-duty/MeasureFormDialog.tsx`

**Issue:**
- Owner field is text input
- No validation against user list
- No dropdown to select from active users

**Fix Required:**
- Change owner field to dropdown
- Load active users from store
- Allow email input as fallback for external owners

**Effort:** 1 hour

---

### 10. TEMPLATE_INSTANCE Rendering Missing
**Impact:** MEDIUM - Incomplete section type support
**File:** `src/components/sections/SectionRenderer.tsx`

**Issue:**
- TEMPLATE_INSTANCE type exists but not rendered
- Would allow embedding templates within sections

**Fix Required:**
- Add case for TEMPLATE_INSTANCE in SectionRenderer
- Load referenced template
- Recursively render template sections

**Effort:** 2-3 hours

---

## Medium Priority (UX/Usability)

### 11. Branding Settings Not Persisted
**Impact:** MEDIUM - Settings lost on refresh
**File:** `src/components/settings/BrandingSettings.tsx`

**Issue:**
- Branding updates only stored in Zustand
- No API endpoint to persist
- No database table for settings

**Fix Required:**
1. Create Settings table in schema
2. Add POST `/api/settings` endpoint
3. Wire BrandingSettings to API

**Effort:** 2 hours

---

### 12. Action Status Not Auto-Updated
**Impact:** LOW-MEDIUM - Requires manual refresh
**File:** Client-side logic only

**Issue:**
- OVERDUE status calculated client-side
- No server-side cron job
- Stale until page refresh

**Fix Required:**
- Add cron job (Vercel Cron or similar)
- Endpoint: PATCH `/api/actions/update-overdue`
- Run daily at midnight

**Effort:** 2-3 hours

---

### 13. Audit Export Button Missing
**Impact:** LOW - API exists, UI missing
**File:** `src/app/audit/page.tsx`

**Issue:**
- Export endpoint exists: `/api/audit/export/route.ts`
- No "Export CSV" button in UI

**Fix Required:**
- Add export button
- Call API endpoint
- Trigger download

**Effort:** 30 minutes

---

### 14. Template Preview Missing
**Impact:** LOW - Users can't see before using
**File:** `src/app/templates/page.tsx`

**Issue:**
- "Use" button just navigates without preview
- Users don't know what template contains

**Fix Required:**
- Create TemplatePreviewModal component
- Show section structure, types, layout
- "Use This Template" confirmation

**Effort:** 2-3 hours

---

## Low Priority (Polish/Enhancement)

### 15. Confirmation Dialogs Inconsistent
**Impact:** LOW - Some destructive actions lack confirmation
**Pattern:** Some use double-click, some use modals

**Fix Required:**
- Standardize on confirmation modal
- Create reusable ConfirmDialog component
- Apply to all delete operations

**Effort:** 2 hours

---

### 16. Component CSS/JS Upload Missing
**Impact:** LOW - Components are HTML-only
**File:** `src/components/components-lib/ImportComponentDialog.tsx`

**Issue:**
- Schema supports cssContent, jsContent
- UI only has HTML textarea

**Fix Required:**
- Add CSS textarea
- Add JS textarea (with security warning)
- Render both in component preview

**Effort:** 1 hour

---

## NOT MISSING (Already Implemented)

These appear to be missing but actually work:

✅ **Action change approval** - Fully implemented
✅ **User deactivation** - Working in UI and API
✅ **Measure deletion** - API and UI both work
✅ **Outcome editing** - PATCH endpoint exists
✅ **Report publishing** - Full workflow implemented
✅ **MI metric snapshots** - Lazy-loaded correctly

---

## Recommended Implementation Order

### Phase 1: Critical Fixes (1-2 days)
1. Add DELETE /api/consumer-duty/outcomes/[id] (30 min)
2. Add Delete button to ReportCard (1 hour)
3. Fix template application workflow (4 hours)
4. Fix section reordering persistence (1 hour)

**Total:** ~6.5 hours

---

### Phase 2: Core Features (3-5 days)
1. Implement Chart section rendering (6 hours)
2. Add archive workflow for reports (2 hours)
3. Add duplicate report feature (3 hours)
4. Add component editing (2 hours)
5. Add measure owner dropdown (1 hour)
6. Add TEMPLATE_INSTANCE rendering (3 hours)

**Total:** ~17 hours

---

### Phase 3: Settings & Polish (2-3 days)
1. Persist branding settings to DB (2 hours)
2. Add notification preferences (3 hours)
3. Add audit export button (30 min)
4. Add template preview (3 hours)
5. Standardize confirmation dialogs (2 hours)
6. Add component CSS/JS fields (1 hour)

**Total:** ~11.5 hours

---

### Phase 4: Advanced Features (1 week)
1. Auto-update overdue actions (3 hours)
2. Measure reassignment between outcomes (2 hours)
3. User activity dashboard (4 hours)
4. Audit log field search (2 hours)
5. Component usage tracking (2 hours)

**Total:** ~13 hours

---

## Grand Total

**Critical + Core + Settings:** ~35 hours to complete all genuinely missing features

**With Advanced:** ~48 hours for 100% feature completeness

---

## Recommendation

**Do Next:**
1. Phase 1 (Critical Fixes) - 6.5 hours
   - Fixes broken workflows that users expect to work
   - Highest ROI for time invested

2. Then evaluate if Phase 2-4 are needed based on actual user feedback
   - Many "missing" features might not be needed in practice
   - Better to ship and learn than over-build

**Current State:** 9/10 production-ready
**After Phase 1:** 9.5/10 with no broken workflows
