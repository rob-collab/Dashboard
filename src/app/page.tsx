"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  GripVertical,
  Eye,
  EyeOff,
  LayoutGrid,
  RotateCcw,
  Save,
  X,
  ChevronDown,
  Copy,
  Users,
  Pin,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { naturalCompare, cn } from "@/lib/utils";
import type { RGLLayoutItem } from "@/lib/types";
import { useHasPermission, usePermissionSet } from "@/lib/usePermission";
import type { ComplianceStatus, DashboardLayoutConfig } from "@/lib/types";
import { usePageTitle } from "@/lib/usePageTitle";
import { DASHBOARD_SECTIONS, DEFAULT_SECTION_ORDER, CCRO_DEFAULT_SECTION_ORDER, ROLE_DEFAULT_HIDDEN, DEFAULT_GRID_LAYOUT, SECTION_ELEMENTS } from "@/lib/dashboard-sections";
import ReactGridLayout, { WidthProvider, type Layout as RGLLayout } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
const GridLayout = WidthProvider(ReactGridLayout);
import WelcomeBanner from "@/components/common/WelcomeBanner";
import ScrollReveal from "@/components/common/ScrollReveal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { InnerElementEditor } from "@/components/dashboard/DashboardElementChip";
import { useDashboardSectionMap } from "./_useDashboardSectionMap";

function daysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/* ── (SortableDashboardSection removed — replaced by react-grid-layout) ── */

export default function DashboardHome() {
  usePageTitle("Dashboard");
  const router = useRouter();
  const hydrated = useAppStore((s) => s._hydrated);
  const hydratedAt = useAppStore((s) => s._hydratedAt);
  const currentUser = useAppStore((s) => s.currentUser);
  const branding = useAppStore((s) => s.branding);
  const siteSettings = useAppStore((s) => s.siteSettings);
  const reports = useAppStore((s) => s.reports);
  const outcomes = useAppStore((s) => s.outcomes);
  const actions = useAppStore((s) => s.actions);
  const auditLogs = useAppStore((s) => s.auditLogs);
  const users = useAppStore((s) => s.users);
  const risks = useAppStore((s) => s.risks);
  const riskAcceptances = useAppStore((s) => s.riskAcceptances);
  const controls = useAppStore((s) => s.controls);
  const updateAction = useAppStore((s) => s.updateAction);
  const updateControl = useAppStore((s) => s.updateControl);
  const updateRisk = useAppStore((s) => s.updateRisk);
  const approveEntity = useAppStore((s) => s.approveEntity);
  const rejectEntity = useAppStore((s) => s.rejectEntity);
  const notifications = useAppStore((s) => s.notifications);
  const regulations = useAppStore((s) => s.regulations);
  const policies = useAppStore((s) => s.policies);
  const certifiedPersons = useAppStore((s) => s.certifiedPersons);
  const permissionSet = usePermissionSet();
  const hasCompliancePage = permissionSet.has("page:compliance");
  const canApproveEntities = useHasPermission("can:approve-entities");
  const canViewPending = useHasPermission("can:view-pending");
  const hasActionsPage = useHasPermission("page:actions");
  const hasConsumerDutyPage = useHasPermission("page:consumer-duty");
  const hasReportsPage = useHasPermission("page:reports");
  const hasAuditPage = useHasPermission("page:audit");
  const hasRiskRegisterPage = useHasPermission("page:risk-register");

  const role = currentUser?.role;
  const isCCRO = role === "CCRO_TEAM";

  // Dashboard layout state
  const horizonItems = useAppStore((s) => s.horizonItems);
  const dashboardLayout = useAppStore((s) => s.dashboardLayout);
  const setDashboardLayout = useAppStore((s) => s.setDashboardLayout);

  // Re-fetch layout when "View As" user changes
  const prevUserIdRef = useRef(currentUser?.id);
  useEffect(() => {
    if (!currentUser?.id || currentUser.id === prevUserIdRef.current) return;
    prevUserIdRef.current = currentUser.id;
    // Fetch the layout for the newly selected "View As" user
    api<DashboardLayoutConfig>("/api/dashboard-layout")
      .then((layout) => setDashboardLayout(layout))
      .catch(() => {}); // graceful fallback — defaults remain
  }, [currentUser?.id, setDashboardLayout]);

  // M6 — Last Refreshed ticker (updates every 30s)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const refreshedLabel = useMemo(() => {
    if (!hydratedAt) return null;
    const diff = Math.floor((now.getTime() - hydratedAt.getTime()) / 1000);
    if (diff < 60) return "Refreshed just now";
    if (diff < 3600) return `Refreshed ${Math.floor(diff / 60)} min ago`;
    return `Refreshed ${Math.floor(diff / 3600)}h ago`;
  }, [hydratedAt, now]);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editGrid, setEditGrid] = useState<RGLLayoutItem[]>(DEFAULT_GRID_LAYOUT);
  const [editHidden, setEditHidden] = useState<Set<string>>(new Set());
  const [editPinned, setEditPinned] = useState<Set<string>>(new Set());
  const [editElementOrder, setEditElementOrder] = useState<Record<string, string[]>>({});
  const [editHiddenElements, setEditHiddenElements] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Per-user editing: which user's layout is being configured
  const [editTargetUserId, setEditTargetUserId] = useState<string>("");
  const [userSelectorOpen, setUserSelectorOpen] = useState(false);
  const [copyFromOpen, setCopyFromOpen] = useState(false);
  const [loadingTargetLayout, setLoadingTargetLayout] = useState(false);
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false);
  const [pendingCopySourceId, setPendingCopySourceId] = useState<string | null>(null);

  const editTargetUser = users.find((u) => u.id === editTargetUserId);

  // Effective order for rendering (from DB layout or role-based defaults)
  const effectiveOrder = useMemo(() => {
    // Determine the role-appropriate default order
    const roleDefaultOrder = role === "CCRO_TEAM" ? CCRO_DEFAULT_SECTION_ORDER : DEFAULT_SECTION_ORDER;
    const savedOrder = dashboardLayout?.sectionOrder ?? roleDefaultOrder;
    let savedHidden: Set<string>;
    if (dashboardLayout?.hiddenSections != null) {
      // User has an explicit saved layout — honour it exactly
      savedHidden = new Set(dashboardLayout.hiddenSections);
    } else {
      // No saved layout — apply role-appropriate defaults so OWNER/REVIEWER
      // don't see CCRO-only sections (pending approvals, proposed changes, etc.)
      const roleDefaults = role ? (ROLE_DEFAULT_HIDDEN[role] ?? []) : [];
      savedHidden = new Set(roleDefaults);
    }
    // Forward-compat: append any new section keys not in saved order
    const order = [...savedOrder];
    for (let i = 0; i < DEFAULT_SECTION_ORDER.length; i++) {
      if (!order.includes(DEFAULT_SECTION_ORDER[i])) order.push(DEFAULT_SECTION_ORDER[i]);
    }
    return { order, hidden: savedHidden };
  }, [dashboardLayout, role]);

  // Effective grid for view mode — saved layoutGrid with any missing sections appended
  const effectiveGrid = useMemo<RGLLayoutItem[]>(() => {
    const base: RGLLayoutItem[] = (dashboardLayout?.layoutGrid as RGLLayoutItem[] | null) ?? DEFAULT_GRID_LAYOUT;
    const present = new Set(base.map((i) => i.i));
    const extra = DEFAULT_GRID_LAYOUT.filter((i) => !present.has(i.i));
    return [...base, ...extra];
  }, [dashboardLayout]);

  // In view mode, pinned sections cannot be hidden — filter them out of effectiveOrder.hidden
  const effectiveHidden = useMemo<Set<string>>(() => {
    const pinned = new Set<string>(dashboardLayout?.pinnedSections ?? []);
    return new Set(Array.from(effectiveOrder.hidden).filter((k) => !pinned.has(k)));
  }, [effectiveOrder.hidden, dashboardLayout?.pinnedSections]);

  // Effective element order for view mode — respects saved elementOrder
  const effectiveElementOrder = useMemo<Record<string, string[]>>(() => {
    const saved = (dashboardLayout?.elementOrder as Record<string, string[]> | null) ?? {};
    return Object.fromEntries(
      Object.entries(SECTION_ELEMENTS).map(([key, defs]) => {
        const defaultOrder = defs.map((d) => d.id);
        const savedOrder = saved[key];
        if (Array.isArray(savedOrder) && savedOrder.length > 0) {
          const validIds = new Set(defaultOrder);
          const filtered = savedOrder.filter((id) => validIds.has(id));
          const extra = defaultOrder.filter((id) => !filtered.includes(id));
          return [key, [...filtered, ...extra]];
        }
        return [key, defaultOrder];
      })
    );
  }, [dashboardLayout?.elementOrder]);

  const effectiveHiddenElements = useMemo<Set<string>>(() => {
    return new Set((dashboardLayout?.hiddenElements as string[] | null) ?? []);
  }, [dashboardLayout?.hiddenElements]);

  // Fetch a specific user's layout and load into the editor
  const fetchAndLoadUserLayout = useCallback(async (userId: string) => {
    setLoadingTargetLayout(true);
    try {
      const layout = await api<DashboardLayoutConfig>(`/api/dashboard-layout?userId=${userId}`);
      // Build effective grid: use saved layoutGrid or fall back to DEFAULT_GRID_LAYOUT
      const base: RGLLayoutItem[] = layout.layoutGrid ?? DEFAULT_GRID_LAYOUT;
      const present = new Set(base.map((i) => i.i));
      const extra = DEFAULT_GRID_LAYOUT.filter((i) => !present.has(i.i));
      setEditGrid([...base, ...extra]);
      setEditHidden(new Set(layout.hiddenSections ?? []));
      setEditPinned(new Set(layout.pinnedSections ?? []));
      // Load element order + hidden elements
      const savedEO = (layout.elementOrder as Record<string, string[]> | null) ?? {};
      setEditElementOrder(Object.fromEntries(
        Object.entries(SECTION_ELEMENTS).map(([k, defs]) => {
          const savedOrder = savedEO[k];
          if (Array.isArray(savedOrder) && savedOrder.length > 0) {
            const validIds = new Set(defs.map((d) => d.id));
            const filtered = savedOrder.filter((id) => validIds.has(id));
            const extra2 = defs.map((d) => d.id).filter((id) => !filtered.includes(id));
            return [k, [...filtered, ...extra2]];
          }
          return [k, defs.map((d) => d.id)];
        })
      ));
      setEditHiddenElements(new Set((layout.hiddenElements as string[]) ?? []));
    } catch {
      // Fallback to defaults
      setEditGrid([...DEFAULT_GRID_LAYOUT]);
      setEditHidden(new Set());
      setEditPinned(new Set());
      setEditElementOrder(Object.fromEntries(Object.entries(SECTION_ELEMENTS).map(([k, defs]) => [k, defs.map((d) => d.id)])));
      setEditHiddenElements(new Set());
    } finally {
      setLoadingTargetLayout(false);
    }
  }, []);

  function enterEditMode() {
    const targetId = currentUser?.id ?? "";
    setEditTargetUserId(targetId);
    // Build effective grid from saved layout or defaults
    const base: RGLLayoutItem[] = dashboardLayout?.layoutGrid ?? DEFAULT_GRID_LAYOUT;
    const present = new Set(base.map((i) => i.i));
    const extra = DEFAULT_GRID_LAYOUT.filter((i) => !present.has(i.i));
    setEditGrid([...base, ...extra]);
    setEditHidden(new Set(effectiveOrder.hidden));
    setEditPinned(new Set(dashboardLayout?.pinnedSections ?? []));
    setEditElementOrder({ ...effectiveElementOrder });
    setEditHiddenElements(new Set(effectiveHiddenElements));
    setEditMode(true);
  }

  function cancelEditMode() {
    setEditMode(false);
    setUserSelectorOpen(false);
    setCopyFromOpen(false);
  }

  function resetToDefault() {
    setEditGrid([...DEFAULT_GRID_LAYOUT]);
    setEditHidden(new Set());
    setEditPinned(new Set());
    setEditElementOrder(Object.fromEntries(Object.entries(SECTION_ELEMENTS).map(([k, defs]) => [k, defs.map((d) => d.id)])));
    setEditHiddenElements(new Set());
  }

  async function handleSelectEditTarget(userId: string) {
    setEditTargetUserId(userId);
    setUserSelectorOpen(false);
    await fetchAndLoadUserLayout(userId);
  }

  async function handleCopyFrom(sourceUserId: string) {
    setPendingCopySourceId(sourceUserId);
    setCopyConfirmOpen(true);
  }

  async function handleCopyFromConfirmed() {
    if (!pendingCopySourceId) return;
    setCopyConfirmOpen(false);
    const sourceUserId = pendingCopySourceId;
    setPendingCopySourceId(null);
    const sourceName = users.find((u) => u.id === sourceUserId)?.name ?? "user";
    setCopyFromOpen(false);
    await fetchAndLoadUserLayout(sourceUserId);
    toast.success(`Copied layout from ${sourceName}`);
  }

  async function saveLayout() {
    if (!editTargetUserId) {
      toast.error("No target user selected");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        userId: editTargetUserId,
        sectionOrder: editGrid.map((i) => i.i),
        hiddenSections: Array.from(editHidden),
        layoutGrid: editGrid,
        elementOrder: editElementOrder,
        hiddenElements: Array.from(editHiddenElements),
      };
      if (isCCRO) body.pinnedSections = Array.from(editPinned);

      const layout = await api<DashboardLayoutConfig>("/api/dashboard-layout", {
        method: "PUT",
        body,
      });
      // If the saved layout is for the currently viewed user, update the store
      if (editTargetUserId === currentUser?.id) {
        setDashboardLayout(layout);
      }
      setEditMode(false);
      setUserSelectorOpen(false);
      setCopyFromOpen(false);
      toast.success(`Layout saved for ${editTargetUser?.name ?? "user"}`);
    } catch {
      toast.error("Failed to save layout");
    } finally {
      setSaving(false);
    }
  }

  function toggleSectionVisibility(key: string) {
    setEditHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function togglePinned(key: string) {
    setEditPinned((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // (Stats computed inline where needed per role)

  // Priority action stats — CCRO/admin sees all, others see own
  const priorityStats = useMemo(() => {
    const pool = (canViewPending ? actions : actions.filter((a) => a.assignedTo === currentUser?.id))
      .filter((a) => a.status !== "COMPLETED");
    return {
      P1: pool.filter((a) => a.priority === "P1"),
      P2: pool.filter((a) => a.priority === "P2"),
      P3: pool.filter((a) => a.priority === "P3"),
    };
  }, [actions, canViewPending, currentUser?.id]);

  const actionStats = useMemo(() => {
    const open = actions.filter((a) => a.status === "OPEN" || a.status === "IN_PROGRESS").length;
    const overdue = actions.filter(
      (a) =>
        a.status === "OVERDUE" ||
        (a.status !== "COMPLETED" && daysUntilDue(a.dueDate) !== null && daysUntilDue(a.dueDate)! <= 0)
    ).length;
    const dueThisMonth = actions.filter((a) => {
      if (a.status === "COMPLETED") return false;
      const days = daysUntilDue(a.dueDate);
      return days !== null && days > 0 && days <= 30;
    }).length;
    const completed = actions.filter((a) => a.status === "COMPLETED").length;
    return { open, overdue, dueThisMonth, completed };
  }, [actions]);

  // Personal notification data
  const myOverdueActions = useMemo(() => {
    if (!currentUser) return [];
    return actions.filter((a) =>
      a.assignedTo === currentUser.id &&
      a.status !== "COMPLETED" &&
      (a.status === "OVERDUE" || (daysUntilDue(a.dueDate) !== null && daysUntilDue(a.dueDate)! <= 0))
    );
  }, [actions, currentUser]);

  const myDueThisMonthActions = useMemo(() => {
    if (!currentUser) return [];
    return actions.filter((a) => {
      if (a.assignedTo !== currentUser.id || a.status === "COMPLETED") return false;
      const days = daysUntilDue(a.dueDate);
      return days !== null && days > 0 && days <= 30;
    });
  }, [actions, currentUser]);

  const risksNeedingReview = useMemo(() => {
    return risks.filter((r) => {
      if (r.reviewRequested) return true;
      const lastRev = new Date(r.lastReviewed);
      const nextReview = new Date(lastRev);
      nextReview.setDate(nextReview.getDate() + (r.reviewFrequencyDays ?? 90));
      const daysUntil = Math.ceil((nextReview.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7;
    });
  }, [risks]);

  const pendingActionChanges = useMemo(() => {
    return actions.flatMap((a) =>
      (a.changes ?? []).filter((c) => c.status === "PENDING").map((c) => ({
        ...c,
        _type: "action" as const,
        _parentTitle: a.title,
        _parentId: a.id,
        _parentRef: a.reference ?? a.id.slice(0, 8),
      }))
    );
  }, [actions]);

  const pendingControlChanges = useMemo(() => {
    return controls.flatMap((ctrl) =>
      (ctrl.changes ?? []).filter((c) => c.status === "PENDING").map((c) => ({
        ...c,
        _type: "control" as const,
        _parentTitle: ctrl.controlName,
        _parentId: ctrl.id,
        _parentRef: ctrl.controlRef,
      }))
    );
  }, [controls]);

  const pendingRiskChanges = useMemo(() => {
    return risks.flatMap((r) =>
      (r.changes ?? []).filter((c) => c.status === "PENDING").map((c) => ({
        ...c,
        _type: "risk" as const,
        _parentTitle: r.name,
        _parentId: r.id,
        _parentRef: r.reference,
      }))
    );
  }, [risks]);

  const allPendingChanges = useMemo(() => {
    return [...pendingActionChanges, ...pendingControlChanges, ...pendingRiskChanges].sort(
      (a, b) => new Date(b.proposedAt).getTime() - new Date(a.proposedAt).getTime()
    );
  }, [pendingActionChanges, pendingControlChanges, pendingRiskChanges]);

  // OWNER-specific: my risks, my actions, my metrics
  const myRisks = useMemo(() => {
    if (!currentUser) return [];
    return risks.filter((r) => r.ownerId === currentUser.id);
  }, [risks, currentUser]);

  const myActions = useMemo(() => {
    if (!currentUser) return [];
    return actions
      .filter((a) => a.assignedTo === currentUser.id && a.status !== "COMPLETED")
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [actions, currentUser]);

  const myMetrics = useMemo(() => {
    if (!currentUser || currentUser.assignedMeasures.length === 0) return [];
    return outcomes.flatMap((o) =>
      (o.measures ?? []).filter((m) => currentUser.assignedMeasures.includes(m.measureId))
    ).sort((a, b) => naturalCompare(a.measureId, b.measureId));
  }, [outcomes, currentUser]);

  const myRisksNeedingReview = useMemo(() => {
    return risksNeedingReview.filter((r) => r.ownerId === currentUser?.id);
  }, [risksNeedingReview, currentUser?.id]);

  // Overdue metrics (not updated in 30+ days)
  const overdueMetrics = useMemo(() => {
    return outcomes.flatMap((o) =>
      (o.measures ?? []).filter((m) => {
        if (!m.lastUpdatedAt) return true;
        const lastUpdate = new Date(m.lastUpdatedAt);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return lastUpdate < thirtyDaysAgo;
      })
    ).sort((a, b) => naturalCompare(a.measureId, b.measureId));
  }, [outcomes]);

  // Risks in Focus — visible to all roles
  const focusRisks = useMemo(() => risks.filter((r) => r.inFocus), [risks]);

  // Pending new entities — for users with can:approve-entities
  const pendingNewEntities = useMemo(() => {
    if (!canApproveEntities) return [];
    const items: { type: "risk" | "action" | "control"; id: string; reference: string; name: string; createdBy: string; createdAt: string }[] = [];
    for (const r of risks) {
      if (r.approvalStatus === "PENDING_APPROVAL") {
        items.push({ type: "risk", id: r.id, reference: r.reference, name: r.name, createdBy: r.createdBy ?? r.ownerId, createdAt: r.createdAt });
      }
    }
    for (const a of actions) {
      if (a.approvalStatus === "PENDING_APPROVAL") {
        items.push({ type: "action", id: a.id, reference: a.reference, name: a.title, createdBy: a.createdBy, createdAt: a.createdAt });
      }
    }
    for (const c of controls) {
      if (c.approvalStatus === "PENDING_APPROVAL") {
        items.push({ type: "control", id: c.id, reference: c.controlRef, name: c.controlName, createdBy: c.controlOwnerId, createdAt: c.createdAt ?? "" });
      }
    }
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [risks, actions, controls, canApproveEntities]);

  // Published reports for non-CCRO users
  const publishedReports = useMemo(() => reports.filter((r) => r.status === "PUBLISHED"), [reports]);

  // Active dashboard notifications for current role
  const activeNotifications = useMemo(() => {
    const now = new Date();
    return notifications.filter((n) => {
      if (!n.active) return false;
      if (n.expiresAt && new Date(n.expiresAt) < now) return false;
      if (n.targetRoles && n.targetRoles.length > 0 && role && !n.targetRoles.includes(role)) return false;
      return true;
    });
  }, [notifications, role]);

  // Risk Acceptance stats — visible to all roles
  const raStats = useMemo(() => {
    const expired = riskAcceptances.filter((ra) => ra.status === "EXPIRED");
    const awaiting = riskAcceptances.filter((ra) => ra.status === "AWAITING_APPROVAL");
    const ccroReview = riskAcceptances.filter((ra) => ra.status === "CCRO_REVIEW" || ra.status === "PROPOSED");
    const accepted = riskAcceptances.filter((ra) => ra.status === "APPROVED");
    // Urgent: expired first, then awaiting approval
    const urgent = [...expired, ...awaiting].slice(0, 3);
    // Upcoming reviews: approved with review dates
    const now = Date.now();
    const withReview = accepted
      .filter((ra) => ra.reviewDate)
      .map((ra) => ({ ...ra, daysUntil: Math.ceil((new Date(ra.reviewDate!).getTime() - now) / 86400000) }))
      .sort((a, b) => a.daysUntil - b.daysUntil);
    const overdue = withReview.filter((r) => r.daysUntil < 0);
    const due30 = withReview.filter((r) => r.daysUntil >= 0 && r.daysUntil <= 30);
    const beyond30 = withReview.filter((r) => r.daysUntil > 30);
    return { expired: expired.length, awaiting: awaiting.length, ccroReview: ccroReview.length, accepted: accepted.length, urgent, overdue, due30, beyond30 };
  }, [riskAcceptances]);

  // Compliance health stats
  const complianceHealth = useMemo(() => {
    if (!hasCompliancePage || regulations.length === 0) return null;
    const applicable = regulations.filter((r) => r.isApplicable);
    const total = applicable.length;
    if (total === 0) return null;
    const statusCounts: Record<ComplianceStatus, number> = {
      COMPLIANT: 0, PARTIALLY_COMPLIANT: 0, NON_COMPLIANT: 0, NOT_ASSESSED: 0, GAP_IDENTIFIED: 0,
    };
    for (const r of applicable) {
      const s = (r.complianceStatus ?? "NOT_ASSESSED") as ComplianceStatus;
      statusCounts[s] = (statusCounts[s] ?? 0) + 1;
    }
    const compliantPct = Math.round((statusCounts.COMPLIANT / total) * 100);
    const gaps = statusCounts.NON_COMPLIANT + statusCounts.GAP_IDENTIFIED;
    const now = new Date();
    const overdueAssessments = applicable.filter(
      (r) => r.nextReviewDate && new Date(r.nextReviewDate) < now
    ).length;
    const pendingCerts = certifiedPersons.filter(
      (c) => c.status === "DUE" || c.status === "OVERDUE"
    ).length;
    return { total, compliantPct, gaps, overdueAssessments, pendingCerts, statusCounts };
  }, [regulations, certifiedPersons, hasCompliancePage]);

  // Controls Library stats
  const controlsStats = useMemo(() => {
    const active = controls.filter((c) => c.isActive);
    const total = active.length;
    if (total === 0) return null;
    const preventative = active.filter((c) => c.controlType === "PREVENTATIVE").length;
    const detective = active.filter((c) => c.controlType === "DETECTIVE").length;
    const directive = active.filter((c) => c.controlType === "DIRECTIVE").length;
    const corrective = active.filter((c) => c.controlType === "CORRECTIVE").length;
    const policiesWithControls = new Set(
      policies.filter((p) => (p.controlLinks ?? []).length > 0).map((p) => p.id)
    ).size;
    return { total, preventative, detective, directive, corrective, policiesWithControls, totalPolicies: policies.length };
  }, [controls, policies]);

  // Cross-entity insights — risks with failing controls, policies with gaps
  const crossEntityInsights = useMemo(() => {
    // Risks with failing or untested controls
    const risksWithFailingControls: { riskRef: string; riskName: string; riskId: string; failCount: number; totalControls: number }[] = [];
    for (const risk of risks) {
      const riskLinks = risk.controlLinks ?? [];
      if (riskLinks.length === 0) continue;
      let failCount = 0;
      for (const link of riskLinks) {
        const ctrl = controls.find((c) => c.id === link.controlId);
        if (!ctrl) continue;
        const results = ctrl.testingSchedule?.testResults ?? [];
        if (results.length === 0) { failCount++; continue; }
        const sorted = [...results].sort((a, b) => new Date(b.testedDate).getTime() - new Date(a.testedDate).getTime());
        if (sorted[0].result !== "PASS") failCount++;
      }
      if (failCount > 0) {
        risksWithFailingControls.push({ riskRef: risk.reference, riskName: risk.name, riskId: risk.id, failCount, totalControls: riskLinks.length });
      }
    }
    risksWithFailingControls.sort((a, b) => b.failCount - a.failCount);

    // Policies with coverage gaps (obligations without controls)
    const policiesWithGaps: { ref: string; name: string; id: string; uncovered: number; total: number }[] = [];
    for (const p of policies) {
      const obls = p.obligations ?? [];
      if (obls.length === 0) continue;
      const uncovered = obls.filter((o) => o.controlRefs.length === 0 && !(o.sections ?? []).some((s) => s.controlRefs.length > 0)).length;
      if (uncovered > 0) {
        policiesWithGaps.push({ ref: p.reference, name: p.name, id: p.id, uncovered, total: obls.length });
      }
    }
    policiesWithGaps.sort((a, b) => (b.uncovered / b.total) - (a.uncovered / a.total));

    // Most-used controls (supporting most policies)
    const controlPolicyCounts = new Map<string, { id: string; ref: string; name: string; policyCount: number }>();
    for (const p of policies) {
      for (const link of p.controlLinks ?? []) {
        const ctrl = link.control;
        if (!ctrl) continue;
        const existing = controlPolicyCounts.get(ctrl.id);
        if (existing) {
          existing.policyCount++;
        } else {
          controlPolicyCounts.set(ctrl.id, { id: ctrl.id, ref: ctrl.controlRef, name: ctrl.controlName, policyCount: 1 });
        }
      }
    }
    const keyControls = Array.from(controlPolicyCounts.values())
      .filter((c) => c.policyCount >= 2)
      .sort((a, b) => b.policyCount - a.policyCount)
      .slice(0, 5);

    return {
      risksWithFailingControls: risksWithFailingControls.slice(0, 5),
      policiesWithGaps: policiesWithGaps.slice(0, 5),
      keyControls,
      hasData: risksWithFailingControls.length > 0 || policiesWithGaps.length > 0 || keyControls.length > 0,
    };
  }, [risks, controls, policies]);

  // Map audit log entity type + id to a navigation URL
  function getEntityUrl(entityType: string | null, entityId: string | null): string {
    if (!entityId || !entityType) return "/audit";
    switch (entityType) {
      case "risk": return `/risk-register?risk=${entityId}`;
      case "action": return `/actions?edit=${entityId}`;
      case "control": return `/controls?control=${entityId}`;
      case "regulation": return `/compliance?tab=regulatory-universe&regulation=${entityId}`;
      case "risk_acceptance": return `/risk-acceptances?acceptance=${entityId}`;
      default: return "/audit";
    }
  }

  // Render-time element order: uses edit state in edit mode, effective state in view mode
  const elementOrderForRender = editMode ? editElementOrder : effectiveElementOrder;
  const hiddenElementsForRender = editMode ? editHiddenElements : effectiveHiddenElements;

  // Build section map
  const sectionMap = useDashboardSectionMap({
    currentUser,
    branding,
    siteSettings,
    reports,
    outcomes,
    actions,
    auditLogs,
    users,
    risks,
    riskAcceptances,
    policies,
    horizonItems,
    updateAction,
    updateControl,
    updateRisk,
    approveEntity,
    rejectEntity,
    isCCRO,
    canApproveEntities,
    canViewPending,
    hasActionsPage,
    hasConsumerDutyPage,
    hasReportsPage,
    hasAuditPage,
    hasRiskRegisterPage,
    priorityStats,
    actionStats,
    myOverdueActions,
    myDueThisMonthActions,
    risksNeedingReview,
    allPendingChanges,
    myRisks,
    myActions,
    myMetrics,
    myRisksNeedingReview,
    overdueMetrics,
    focusRisks,
    pendingNewEntities,
    publishedReports,
    activeNotifications,
    raStats,
    complianceHealth,
    controlsStats,
    crossEntityInsights,
    elementOrderForRender,
    hiddenElementsForRender,
    router,
    getEntityUrl,
  });

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-updraft-bright-purple border-t-transparent"></div>
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Role badge colour helper
  const roleBadge = (r: string) => {
    switch (r) {
      case "CCRO_TEAM": return "bg-purple-100 text-purple-700";
      case "CEO": return "bg-blue-100 text-blue-700";
      case "OWNER": return "bg-amber-100 text-amber-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* First-time user welcome banner */}
      {currentUser && <WelcomeBanner currentUser={currentUser} />}

      {/* Edit mode toolbar */}
      {editMode && (
        <div className="sticky top-0 z-30 rounded-2xl border-2 border-updraft-bright-purple/30 bg-white/95 backdrop-blur-sm px-6 py-3 shadow-lg space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <LayoutGrid size={18} className="text-updraft-bright-purple" />
              <span className="text-sm font-bold text-updraft-deep font-poppins">Customise Dashboard Layout</span>
              <span className="text-xs text-gray-400">Drag to reorder, toggle visibility</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={resetToDefault} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <RotateCcw size={12} /> Reset
              </button>
              <button onClick={cancelEditMode} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <X size={12} /> Cancel
              </button>
              <button onClick={saveLayout} disabled={saving || loadingTargetLayout} className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-4 py-1.5 text-xs font-medium text-white hover:bg-updraft-deep transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save Layout
              </button>
            </div>
          </div>

          {/* Per-user selector row — CCRO only (non-CCRO can only edit their own layout) */}
          {isCCRO && <div className="flex items-center gap-3 border-t border-updraft-light-purple/20 pt-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Users size={14} />
              <span className="font-medium">Configuring for:</span>
            </div>

            {/* User selector dropdown */}
            <div className="relative">
              <button
                onClick={() => { setUserSelectorOpen(!userSelectorOpen); setCopyFromOpen(false); }}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors min-w-[180px]"
              >
                {loadingTargetLayout ? (
                  <Loader2 size={12} className="animate-spin text-updraft-bright-purple" />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-updraft-bar text-[9px] font-semibold text-white">
                    {(editTargetUser?.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="flex-1 text-left truncate">{editTargetUser?.name ?? "Select user..."}</span>
                {editTargetUser && (
                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", roleBadge(editTargetUser.role))}>
                    {editTargetUser.role.replace("_", " ")}
                  </span>
                )}
                <ChevronDown size={12} className="text-gray-400" />
              </button>
              {userSelectorOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-lg border border-gray-200 bg-white shadow-lg max-h-72 overflow-y-auto">
                  {users.filter((u) => u.isActive).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectEditTarget(u.id)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50",
                        u.id === editTargetUserId && "bg-updraft-pale-purple/30"
                      )}
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-updraft-bar text-[9px] font-semibold text-white shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 font-medium text-gray-700 truncate">{u.name}</span>
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0", roleBadge(u.role))}>
                        {u.role.replace("_", " ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Copy From button */}
            <div className="relative">
              <button
                onClick={() => { setCopyFromOpen(!copyFromOpen); setUserSelectorOpen(false); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Copy size={12} /> Copy From...
              </button>
              {copyFromOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-lg border border-gray-200 bg-white shadow-lg max-h-72 overflow-y-auto">
                  <div className="px-3 py-2 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Copy layout from another user
                  </div>
                  {users.filter((u) => u.isActive && u.id !== editTargetUserId).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleCopyFrom(u.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-updraft-bar text-[9px] font-semibold text-white shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 font-medium text-gray-700 truncate">{u.name}</span>
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0", roleBadge(u.role))}>
                        {u.role.replace("_", " ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>}
        </div>
      )}

      {/* Customise button + Last Refreshed indicator */}
      {!editMode && (
        <div className="flex items-center justify-end gap-3">
          {refreshedLabel && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400" title="Time since last data refresh">
              <RefreshCw size={11} className="text-gray-300" />
              {refreshedLabel}
            </span>
          )}
          <button onClick={enterEditMode} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-updraft-light-purple transition-colors">
            <LayoutGrid size={14} />
            Customise Layout
          </button>
        </div>
      )}

      {editMode ? (
        <>
          {/* Edit mode — desktop: react-grid-layout 2D drag + resize */}
          <div className="hidden md:block">
            <GridLayout
              layout={editGrid}
              onLayoutChange={(newLayout: RGLLayout) => setEditGrid(Array.from(newLayout) as RGLLayoutItem[])}
              isDraggable
              isResizable
              draggableHandle=".rgl-drag-handle"
              rowHeight={40}
              cols={12}
              margin={[10, 10]}
              compactType="vertical"
              autoSize
            >
              {editGrid.map((item) => {
                const def = DASHBOARD_SECTIONS.find((s) => s.key === item.i);
                if (!def) return null;
                const isHidden = editHidden.has(item.i);
                const isPinned = isCCRO && editPinned.has(item.i);
                return (
                  <div key={item.i} className={cn(
                    "rounded-2xl border-2 border-dashed overflow-hidden",
                    isHidden ? "border-gray-200 opacity-40" : "border-updraft-light-purple/40"
                  )}>
                    {/* Drag handle bar */}
                    <div className="rgl-drag-handle cursor-grab active:cursor-grabbing h-8 flex items-center justify-between px-3 bg-updraft-deep/5 border-b border-updraft-light-purple/20 rounded-t-2xl select-none">
                      <div className="flex items-center gap-2">
                        <GripVertical size={14} className="text-gray-400" />
                        <span className="text-xs font-medium text-gray-500">{def.label}</span>
                        {isPinned && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-updraft-bar bg-updraft-pale-purple/40 px-1.5 py-0.5 rounded-full">
                            <Pin size={9} /> Pinned
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {isCCRO && (
                          <button
                            onClick={() => togglePinned(item.i)}
                            title={isPinned ? "Unpin section" : "Pin section for this user"}
                            className="rounded p-1 transition-colors hover:bg-updraft-pale-purple/30"
                          >
                            <Pin size={12} className={isPinned ? "text-updraft-bar" : "text-gray-300"} />
                          </button>
                        )}
                        {!isPinned && (
                          <button
                            onClick={() => toggleSectionVisibility(item.i)}
                            title={isHidden ? "Show section" : "Hide section"}
                            className="rounded p-1 transition-colors hover:bg-gray-100"
                          >
                            {isHidden ? <EyeOff size={14} className="text-red-400" /> : <Eye size={14} className="text-gray-400" />}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Scrollable content */}
                    <div className="h-[calc(100%-2rem)] overflow-y-auto">
                      {SECTION_ELEMENTS[item.i] && (
                        <InnerElementEditor
                          sectionKey={item.i}
                          elements={SECTION_ELEMENTS[item.i]}
                          elementOrder={editElementOrder[item.i] ?? SECTION_ELEMENTS[item.i].map((d) => d.id)}
                          hiddenElements={editHiddenElements}
                          onOrderChange={(newOrder) => setEditElementOrder((prev) => ({ ...prev, [item.i]: newOrder }))}
                          onToggleHidden={(compositeId) => {
                            setEditHiddenElements((prev) => {
                              const next = new Set(prev);
                              if (next.has(compositeId)) next.delete(compositeId);
                              else next.add(compositeId);
                              return next;
                            });
                          }}
                        />
                      )}
                      {sectionMap[item.i] ?? (
                        <div className="p-4 text-xs text-gray-400 text-center">{def.label}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </GridLayout>
          </div>

          {/* Edit mode — mobile: vertical stacked list (no grid) */}
          <div className="block md:hidden space-y-4">
            {editGrid.map((item) => {
              const def = DASHBOARD_SECTIONS.find((s) => s.key === item.i);
              if (!def) return null;
              const isHidden = editHidden.has(item.i);
              return (
                <div key={item.i} className={cn(
                  "rounded-2xl border-2 border-dashed overflow-hidden",
                  isHidden ? "border-gray-200 opacity-40" : "border-updraft-light-purple/40"
                )}>
                  <div className="h-8 flex items-center justify-between px-3 bg-updraft-deep/5 border-b border-updraft-light-purple/20">
                    <span className="text-xs font-medium text-gray-500">{def.label}</span>
                    <button onClick={() => toggleSectionVisibility(item.i)} className="rounded p-1 hover:bg-gray-100">
                      {isHidden ? <EyeOff size={14} className="text-red-400" /> : <Eye size={14} className="text-gray-400" />}
                    </button>
                  </div>
                  <div>{sectionMap[item.i] ?? null}</div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* View mode — desktop: react-grid-layout (read-only positions) */}
          <div className="hidden md:block">
            <GridLayout
              layout={effectiveGrid.filter((item) => !effectiveHidden.has(item.i))}
              isDraggable={false}
              isResizable={false}
              rowHeight={40}
              cols={12}
              margin={[10, 10]}
              compactType="vertical"
              autoSize
            >
              {effectiveGrid
                .filter((item) => !effectiveHidden.has(item.i))
                .map((item) => {
                  const pinned = (dashboardLayout?.pinnedSections ?? []).includes(item.i);
                  return (
                    <div key={item.i} className="rgl-section-item h-full overflow-hidden rounded-2xl relative">
                      {pinned && (
                        <div
                          title="This section is required by your CCRO and cannot be hidden"
                          className="absolute top-2 right-2 z-10 flex items-center gap-1 text-[10px] text-updraft-bar bg-updraft-pale-purple/60 px-2 py-0.5 rounded-full pointer-events-none"
                        >
                          <Pin size={8} /> Required
                        </div>
                      )}
                      <ScrollReveal className="h-full">
                        {sectionMap[item.i] ?? null}
                      </ScrollReveal>
                    </div>
                  );
                })}
            </GridLayout>
          </div>

          {/* View mode — mobile: stacked fallback */}
          <div className="block md:hidden space-y-4">
            {effectiveGrid
              .filter((item) => !effectiveHidden.has(item.i))
              .map((item) => (
                <ScrollReveal key={item.i}>
                  {sectionMap[item.i] ?? null}
                </ScrollReveal>
              ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={copyConfirmOpen}
        onClose={() => setCopyConfirmOpen(false)}
        onConfirm={handleCopyFromConfirmed}
        title="Copy layout"
        message={`This will replace all section positions, visibility, and pins for ${users.find(u => u.id === editTargetUserId)?.name ?? "this user"} with the layout from ${users.find(u => u.id === pendingCopySourceId)?.name ?? "selected user"}. Your current edit session will be overwritten. You can still cancel without saving.`}
        confirmLabel="Copy layout"
        variant="warning"
      />
    </div>
  );
}

