"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Shield,
  AlertTriangle,
  ArrowRight,
  Plus,
  Bell,
  Clock,
  ShieldAlert,
  ShieldQuestion,
  ListChecks,
  BarChart3,
  CheckCircle2,
  XCircle,
  ExternalLink,
  FlaskConical,
  Loader2,
  Info,
  Star,
  Scale,
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
import { api, friendlyApiError } from "@/lib/api-client";
import { formatDate, naturalCompare, cn } from "@/lib/utils";
import { getActionLabel } from "@/lib/audit";
import { getRiskScore } from "@/lib/risk-categories";
import type { ActionPriority, ActionChange, ControlChange, RiskChange, RGLLayoutItem } from "@/lib/types";
import { useHasPermission, usePermissionSet } from "@/lib/usePermission";
import type { ComplianceStatus, DashboardLayoutConfig, DashboardElementDef } from "@/lib/types";
import ScoreBadge from "@/components/risk-register/ScoreBadge";
import DirectionArrow from "@/components/risk-register/DirectionArrow";
import { usePageTitle } from "@/lib/usePageTitle";
import { DASHBOARD_SECTIONS, DEFAULT_SECTION_ORDER, CCRO_DEFAULT_SECTION_ORDER, ROLE_DEFAULT_HIDDEN, DEFAULT_GRID_LAYOUT, SECTION_ELEMENTS } from "@/lib/dashboard-sections";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import ReactGridLayout, { WidthProvider, type Layout as RGLLayout } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
const GridLayout = WidthProvider(ReactGridLayout);
import WelcomeBanner from "@/components/common/WelcomeBanner";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import { HorizonDashboardWidget } from "@/components/horizon/HorizonDashboardWidget";
import RiskMatrix from "@/components/dashboard/RiskMatrix";
import RiskTrendChart from "@/components/dashboard/RiskTrendChart";
import ActionPipeline from "@/components/dashboard/ActionPipeline";
import CDRadialRing from "@/components/dashboard/CDRadialRing";
import DomainScorecardRow from "@/components/dashboard/DomainScorecardRow";
import ActionRequiredSection from "@/components/dashboard/ActionRequiredSection";
import ScrollReveal from "@/components/common/ScrollReveal";
import ControlHealthTrendWidget from "@/components/dashboard/ControlHealthTrendWidget";
import QuarterlySummaryWidget from "@/components/dashboard/QuarterlySummaryWidget";
import ConfirmDialog from "@/components/common/ConfirmDialog";

function daysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const PRIORITY_CONFIG: Record<ActionPriority, { label: string; description: string; color: string; bg: string; border: string }> = {
  P1: { label: "P1 — Critical", description: "Urgent, requires immediate attention", color: "text-red-700", bg: "bg-red-50", border: "border-red-200 hover:border-red-400" },
  P2: { label: "P2 — Important", description: "Significant, needs timely resolution", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200 hover:border-amber-400" },
  P3: { label: "P3 — Routine", description: "Standard priority, planned resolution", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200 hover:border-slate-400" },
};

/* ── Field label humaniser ───────────────────────────────────────────── */
const FIELD_LABELS: Record<string, string> = {
  status: "Status",
  dueDate: "Due Date",
  assignedTo: "Assigned To",
  title: "Title",
  description: "Description",
  priority: "Priority",
  controlName: "Control Name",
  controlDescription: "Control Description",
  controlOwnerId: "Control Owner",
  consumerDutyOutcome: "Consumer Duty Outcome",
  controlFrequency: "Frequency",
  controlType: "Control Type",
  internalOrThirdParty: "Internal/Third Party",
  standingComments: "Standing Comments",
  businessAreaId: "Business Area",
};

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

/* ── (SortableDashboardSection removed — replaced by react-grid-layout) ── */

/* ── Pending Changes Panel ───────────────────────────────────────────── */
type PendingItem = (ActionChange | ControlChange | RiskChange) & {
  _type: "action" | "control" | "risk";
  _parentTitle: string;
  _parentId: string;
  _parentRef: string;
};

function PendingChangesPanel({
  changes,
  users,
  updateAction,
  updateControl,
  updateRisk,
}: {
  changes: PendingItem[];
  users: { id: string; name: string }[];
  updateAction: (id: string, data: Record<string, unknown>) => void;
  updateControl: (id: string, data: Record<string, unknown>) => void;
  updateRisk: (id: string, data: Record<string, unknown>) => void;
}) {
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [collapsedDiffs, setCollapsedDiffs] = useState<Set<string>>(
    () => new Set(changes.map((c) => c.id))
  );
  function toggleDiff(id: string) {
    setCollapsedDiffs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  const handleReview = useCallback(async (
    change: PendingItem,
    decision: "APPROVED" | "REJECTED"
  ) => {
    setReviewingId(change.id);
    setReviewErrors((prev) => { const next = { ...prev }; delete next[change.id]; return next; });
    try {
      const note = reviewNotes[change.id] || undefined;
      if (change._type === "action") {
        const ac = change as ActionChange & { _parentId: string };
        await api(`/api/actions/${ac._parentId}/changes/${change.id}`, {
          method: "PATCH",
          body: { status: decision, reviewNote: note },
        });
        // Refresh action changes in store
        const updatedChanges = await api<ActionChange[]>(`/api/actions/${ac._parentId}/changes`);
        updateAction(ac._parentId, { changes: updatedChanges });
      } else if (change._type === "control") {
        const cc = change as ControlChange & { _parentId: string };
        await api(`/api/controls/library/${cc._parentId}/changes/${change.id}`, {
          method: "PATCH",
          body: { status: decision, reviewNote: note },
        });
        const updatedChanges = await api<ControlChange[]>(`/api/controls/library/${cc._parentId}/changes`);
        updateControl(cc._parentId, { changes: updatedChanges });
      } else {
        const rc = change as RiskChange & { _parentId: string };
        await api(`/api/risks/${rc._parentId}/changes/${change.id}`, {
          method: "PATCH",
          body: { status: decision, reviewNote: note },
        });
        const updatedChanges = await api<RiskChange[]>(`/api/risks/${rc._parentId}/changes`);
        updateRisk(rc._parentId, { changes: updatedChanges });
      }
      setProcessedIds((prev) => { const next = new Set(prev); next.add(change.id); return next; });
      toast.success(decision === "APPROVED" ? "Change approved" : "Change rejected");
    } catch (err) {
      const { message, description } = friendlyApiError(err);
      setReviewErrors((prev) => ({ ...prev, [change.id]: `${message}${description ? ` — ${description}` : ""}` }));
      toast.error(message, { description });
    } finally {
      setReviewingId(null);
    }
  }, [reviewNotes, updateAction, updateControl, updateRisk]);

  const visibleChanges = changes.filter((c) => !processedIds.has(c.id));

  if (visibleChanges.length === 0) return null;

  return (
    <div className="bento-card border-2 border-amber-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-updraft-deep font-poppins">Proposed Changes</h2>
          <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold">{visibleChanges.length}</span>
        </div>
      </div>
      <div className="space-y-3">
        {visibleChanges.map((c) => {
          const proposerName = c.proposer?.name ?? users.find((u) => u.id === c.proposedBy)?.name ?? "Unknown";
          const isAction = c._type === "action";
          const isControl = c._type === "control";
          const isRisk = c._type === "risk";
          const ac = isAction ? (c as ActionChange & PendingItem) : null;
          const cc = isControl ? (c as ControlChange & PendingItem) : null;
          const isProcessing = reviewingId === c.id;
          const originHref = isAction ? `/actions?edit=${c._parentId}` : isControl ? `/controls?control=${c._parentId}` : `/risk-register?risk=${c._parentId}`;

          return (
            <div key={c.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {/* Header */}
              <div className="flex items-start gap-3 px-4 py-3 bg-gray-50/80">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isAction ? "bg-blue-100" : isRisk ? "bg-red-100" : "bg-purple-100"}`}>
                  {isAction ? <ListChecks className="h-4 w-4 text-blue-600" /> : isRisk ? <ShieldAlert className="h-4 w-4 text-red-600" /> : <FlaskConical className="h-4 w-4 text-purple-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isAction ? "bg-blue-50 text-blue-700" : isRisk ? "bg-red-50 text-red-700" : "bg-purple-50 text-purple-700"}`}>
                      {isAction ? "Action" : isRisk ? "Risk" : "Control"}
                    </span>
                    <span className="text-xs font-mono font-bold text-updraft-deep">{c._parentRef}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{c._parentTitle}</p>
                </div>
                <Link
                  href={originHref}
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-updraft-bright-purple hover:text-updraft-deep transition-colors px-2 py-1 rounded-md hover:bg-updraft-pale-purple/20"
                  title={`View ${isAction ? "action" : "control"} details`}
                >
                  <ExternalLink className="h-3 w-3" />
                  View
                </Link>
              </div>

              {/* Change Details — lead with who/when/why */}
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{proposerName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(c.proposedAt)}</p>
                    {cc?.rationale && (
                      <p className="text-xs text-gray-600 mt-1 italic">&ldquo;{cc.rationale}&rdquo;</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleDiff(c.id)}
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-updraft-bright-purple hover:text-updraft-deep transition-colors"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsedDiffs.has(c.id) ? "" : "rotate-180"}`} />
                    {collapsedDiffs.has(c.id) ? "Show changes" : "Hide changes"}
                  </button>
                </div>

                {!collapsedDiffs.has(c.id) && (ac?.isUpdate ? (
                  <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Progress Update</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{ac.newValue ?? "No details provided"}</p>
                    {ac.evidenceUrl && (
                      <a
                        href={ac.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {ac.evidenceName ?? "View evidence"}
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-50/60 border border-amber-100 p-3">
                    <p className="text-xs font-semibold text-amber-700 mb-2">
                      Field: {fieldLabel(c.fieldChanged)}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Current Value</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white/70 rounded px-2 py-1.5 border border-gray-100 min-h-[2rem]">
                          {c.oldValue || <span className="text-gray-400 italic">Empty</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Proposed Value</p>
                        <p className="text-sm text-gray-900 font-medium whitespace-pre-wrap bg-white/70 rounded px-2 py-1.5 border border-amber-200 min-h-[2rem]">
                          {c.newValue || <span className="text-gray-400 italic">Empty</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Review note input + action buttons */}
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  {reviewErrors[c.id] && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Failed to process change: {reviewErrors[c.id]}</span>
                    </div>
                  )}
                  <textarea
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple/30 outline-none resize-none"
                    rows={2}
                    placeholder="Review note (optional)..."
                    value={reviewNotes[c.id] ?? ""}
                    onChange={(e) => setReviewNotes((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleReview(c, "REJECTED")}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                      Reject
                    </button>
                    <button
                      onClick={() => handleReview(c, "APPROVED")}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Inner element editor for Phase 1 sections ───────────────────────── */
function SortableElementChip({
  id, label, isHidden, onToggleHidden,
}: { id: string; label: string; isHidden: boolean; onToggleHidden: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: DndCSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        isHidden
          ? "border-gray-200 bg-gray-50 text-gray-400 opacity-50"
          : "border-updraft-light-purple/40 bg-updraft-pale-purple/20 text-updraft-deep"
      )}
    >
      <span
        {...listeners}
        className="cursor-grab active:cursor-grabbing shrink-0 text-gray-400 hover:text-gray-600"
        title="Drag to reorder"
      >
        <GripVertical size={9} />
      </span>
      <span className="truncate max-w-[80px]">{label}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleHidden(); }}
        className="shrink-0 hover:opacity-70 transition-opacity"
        title={isHidden ? "Show element" : "Hide element"}
      >
        {isHidden
          ? <EyeOff size={9} className="text-gray-400" />
          : <Eye size={9} className="text-updraft-bright-purple" />}
      </button>
    </div>
  );
}

function InnerElementEditor({
  sectionKey, elements, elementOrder, hiddenElements, onOrderChange, onToggleHidden,
}: {
  sectionKey: string;
  elements: DashboardElementDef[];
  elementOrder: string[];
  hiddenElements: Set<string>;
  onOrderChange: (newOrder: string[]) => void;
  onToggleHidden: (compositeId: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = elementOrder.indexOf(active.id as string);
      const newIdx = elementOrder.indexOf(over.id as string);
      if (oldIdx !== -1 && newIdx !== -1) {
        onOrderChange(arrayMove(elementOrder, oldIdx, newIdx));
      }
    }
  }

  return (
    <div className="p-2 border-b border-updraft-light-purple/10 bg-updraft-pale-purple/5">
      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Elements — drag to reorder, click eye to hide</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={elementOrder} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-1">
            {elementOrder.map((id) => {
              const def = elements.find((d) => d.id === id);
              if (!def) return null;
              const compositeId = `${sectionKey}:${id}`;
              return (
                <SortableElementChip
                  key={id}
                  id={id}
                  label={def.label}
                  isHidden={hiddenElements.has(compositeId)}
                  onToggleHidden={() => onToggleHidden(compositeId)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

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

  // Build section map AFTER loading check
  const sectionMap: Record<string, React.ReactNode> = {
    "welcome": (
      <div className="card-entrance card-entrance-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1C1B29] via-updraft-deep to-updraft-bar p-8 text-white">
        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: `
            linear-gradient(135deg, rgba(255,255,255,0.1) 25%, transparent 25%),
            linear-gradient(225deg, rgba(255,255,255,0.1) 25%, transparent 25%),
            linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%),
            linear-gradient(315deg, rgba(255,255,255,0.05) 25%, transparent 25%)
          `,
          backgroundSize: '40px 40px',
          backgroundPosition: '0 0, 0 0, 20px 20px, 20px 20px',
        }} />
        {/* Angled accent lines */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
          <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
            <line x1="100" y1="0" x2="300" y2="200" stroke="#E1BEE7" strokeWidth="1" />
            <line x1="150" y1="0" x2="350" y2="200" stroke="#BA68C8" strokeWidth="0.5" />
            <line x1="200" y1="0" x2="400" y2="200" stroke="#E1BEE7" strokeWidth="1" />
            <line x1="250" y1="0" x2="400" y2="150" stroke="#BA68C8" strokeWidth="0.5" />
            <line x1="300" y1="0" x2="400" y2="100" stroke="#E1BEE7" strokeWidth="0.5" />
          </svg>
        </div>
        <div className="relative flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-poppins tracking-tight">
              Welcome back, {currentUser?.name || "User"}
            </h1>
            <p className="mt-1 text-white/60 text-sm">
              Updraft CCRO Report Management Dashboard
            </p>

            {/* Notification pills — unified, permission-based */}
            {(myOverdueActions.length > 0 || myDueThisMonthActions.length > 0 || (canViewPending && (risksNeedingReview.length > 0 || allPendingChanges.length > 0)) || myRisksNeedingReview.length > 0 || (hasConsumerDutyPage && overdueMetrics.length > 0)) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {hasConsumerDutyPage && overdueMetrics.length > 0 && (
                  <Link href="/consumer-duty?rag=ATTENTION" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <BarChart3 className="h-3 w-3 text-red-300" />
                    {overdueMetrics.length} overdue metric{overdueMetrics.length > 1 ? "s" : ""}
                  </Link>
                )}
                {myOverdueActions.length > 0 && (
                  <Link href="/actions?status=OVERDUE" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <AlertTriangle className="h-3 w-3 text-red-300" />
                    {myOverdueActions.length} overdue action{myOverdueActions.length > 1 ? "s" : ""}
                  </Link>
                )}
                {myDueThisMonthActions.length > 0 && (
                  <Link href="/actions" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <Clock className="h-3 w-3 text-amber-300" />
                    {myDueThisMonthActions.length} due this month
                  </Link>
                )}
                {canViewPending && risksNeedingReview.length > 0 && (
                  <Link href="/risk-register" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <ShieldAlert className="h-3 w-3 text-updraft-pale-purple" />
                    {risksNeedingReview.length} risk{risksNeedingReview.length > 1 ? "s" : ""} due for review
                  </Link>
                )}
                {!canViewPending && myRisksNeedingReview.length > 0 && (
                  <Link href="/risk-register" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <ShieldAlert className="h-3 w-3 text-updraft-pale-purple" />
                    {myRisksNeedingReview.length} risk{myRisksNeedingReview.length > 1 ? "s" : ""} due for review
                  </Link>
                )}
                {canViewPending && allPendingChanges.length > 0 && (
                  <Link href="/change-requests" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors">
                    <Bell className="h-3 w-3 text-blue-300" />
                    {allPendingChanges.length} pending approval{allPendingChanges.length > 1 ? "s" : ""}
                  </Link>
                )}
              </div>
            )}

            {/* Action buttons — only CCRO gets New Report */}
            <div className="mt-4 flex gap-3">
              {isCCRO && (
                <Link
                  href="/reports/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/25 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  New Report
                </Link>
              )}
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 rounded-lg bg-white/[0.07] backdrop-blur-sm border border-white/10 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/15 hover:text-white transition-all"
              >
                <FileText className="h-4 w-4" />
                View Reports
              </Link>
            </div>
          </div>
          {branding.dashboardIconSrc && (
            <div className="flex-shrink-0 hidden sm:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.dashboardIconSrc}
                alt={branding.dashboardIconAlt}
                className="object-contain"
                style={{
                  width: (siteSettings?.logoScale ?? 1) * 80,
                  height: (siteSettings?.logoScale ?? 1) * 80,
                  marginRight: siteSettings?.logoX ?? 0,
                  marginTop: siteSettings?.logoY ?? 0,
                }}
              />
            </div>
          )}
        </div>
      </div>
    ),

    "notifications": activeNotifications.length > 0 ? (
      <div className="space-y-2">
        {activeNotifications.map((n) => {
          const styles = n.type === "URGENT"
            ? { bg: "bg-red-50 border-red-200", text: "text-red-800", icon: <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" /> }
            : n.type === "WARNING"
            ? { bg: "bg-amber-50 border-amber-200", text: "text-amber-800", icon: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" /> }
            : { bg: "bg-blue-50 border-blue-200", text: "text-blue-800", icon: <Info className="h-4 w-4 text-blue-500 shrink-0" /> };
          return (
            <div key={n.id} className={`flex items-start gap-3 rounded-xl border ${styles.bg} px-4 py-3`}>
              {styles.icon}
              <p className={`text-sm font-medium ${styles.text} flex-1`}>{n.message}</p>
            </div>
          );
        })}
      </div>
    ) : null,

    "action-required": (() => {
      const reviewList = canViewPending ? risksNeedingReview : myRisksNeedingReview;
      const overdueActions = canViewPending
        ? actions.filter((a) => a.status === "OVERDUE" || (a.status !== "COMPLETED" && daysUntilDue(a.dueDate) !== null && daysUntilDue(a.dueDate)! < 0))
        : myOverdueActions;
      const hasPending = canApproveEntities && pendingNewEntities.length > 0;
      const hasChanges = canViewPending && allPendingChanges.length > 0;
      const hasItems = reviewList.length > 0 || overdueActions.length > 0 || hasPending || hasChanges;
      if (!hasItems) return null;

      const groups: { icon: React.ReactNode; label: string; count: number; href: string; colour: string; items: { label: string; sub?: string; href: string }[] }[] = [];

      if (overdueActions.length > 0) {
        groups.push({
          icon: <AlertTriangle className="h-4 w-4" />,
          label: "Overdue Actions",
          count: overdueActions.length,
          href: "/actions?status=OVERDUE",
          colour: "text-red-600 bg-red-50 border-red-200",
          items: overdueActions.slice(0, 3).map((a) => ({
            label: a.title,
            sub: a.dueDate ? `Due ${new Date(a.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : undefined,
            href: `/actions?edit=${a.id}`,
          })),
        });
      }

      if (reviewList.length > 0) {
        groups.push({
          icon: <ShieldAlert className="h-4 w-4" />,
          label: "Risks Due for Review",
          count: reviewList.length,
          href: "/risk-register",
          colour: "text-amber-600 bg-amber-50 border-amber-200",
          items: reviewList.slice(0, 3).map((r) => ({
            label: r.name,
            sub: r.reference,
            href: `/risk-register?risk=${r.id}`,
          })),
        });
      }

      if (hasPending) {
        groups.push({
          icon: <Bell className="h-4 w-4" />,
          label: "Pending Approvals",
          count: pendingNewEntities.length,
          href: "/risk-register",
          colour: "text-blue-600 bg-blue-50 border-blue-200",
          items: pendingNewEntities.slice(0, 3).map((e) => ({
            label: e.name,
            sub: e.reference,
            href: e.type === "risk" ? `/risk-register?risk=${e.id}` : e.type === "action" ? `/actions?edit=${e.id}` : `/controls?id=${e.id}`,
          })),
        });
      }

      if (hasChanges) {
        groups.push({
          icon: <Clock className="h-4 w-4" />,
          label: "Proposed Changes",
          count: allPendingChanges.length,
          href: "#proposed-changes",
          colour: "text-purple-600 bg-purple-50 border-purple-200",
          items: allPendingChanges.slice(0, 3).map((c) => ({
            label: c._parentTitle,
            sub: c._parentRef,
            href: c._type === "risk" ? `/risk-register?risk=${c._parentId}` : c._type === "action" ? `/actions?edit=${c._parentId}` : `/controls?id=${c._parentId}`,
          })),
        });
      }

      return <ActionRequiredSection groups={groups} />;
    })(),

    "priority-actions": (() => {
      const paOrder = elementOrderForRender["priority-actions"] ?? ["card-p1", "card-p2", "card-p3"];
      const paVisible = paOrder.filter((id) => !hiddenElementsForRender.has(`priority-actions:${id}`));
      const pMap: Record<string, ActionPriority> = { "card-p1": "P1", "card-p2": "P2", "card-p3": "P3" };
      return (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(1, paVisible.length)}, minmax(0, 1fr))` }}>
          {paVisible.map((id, idx) => {
            const p = pMap[id];
            if (!p) return null;
            const config = PRIORITY_CONFIG[p];
            const items = priorityStats[p];
            return (
              <Link
                key={id}
                href={`/actions?priority=${p}`}
                className={`card-entrance card-entrance-${idx + 2} rounded-2xl border ${config.border} p-5 transition-all hover:shadow-bento-hover`}
                style={{ background: `linear-gradient(135deg, ${p === "P1" ? "#FEF2F2" : p === "P2" ? "#FFFBEB" : "#F8FAFC"} 0%, ${p === "P1" ? "#FFF5F5" : p === "P2" ? "#FEFCE8" : "#F1F5F9"} 100%)` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-bold ${config.color}`}>{config.label}</h3>
                  <AnimatedNumber value={items.length} delay={(idx + 1) * 60} className={`text-3xl font-bold font-poppins ${config.color}`} />
                </div>
                <p className="text-[11px] text-gray-500 mb-3">{config.description}</p>
                {items.length > 0 ? (
                  <div className="space-y-1.5">
                    {items.slice(0, 3).map((a) => {
                      const owner = users.find((u) => u.id === a.assignedTo);
                      return (
                        <Link
                          key={a.id}
                          href={`/actions?edit=${a.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-between text-xs hover:text-updraft-bright-purple transition-colors"
                        >
                          <span className="text-gray-700 truncate flex-1 min-w-0">{a.title}</span>
                          <span className="text-gray-400 shrink-0 ml-2">{owner?.name ?? "—"}</span>
                        </Link>
                      );
                    })}
                    {items.length > 3 && (
                      <p className="text-[10px] text-gray-400">+{items.length - 3} more</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No active actions</p>
                )}
              </Link>
            );
          })}
        </div>
      );
    })(),

    "risk-acceptances": riskAcceptances.length > 0 ? (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 card-entrance card-entrance-5">
        {/* Main RA card */}
        <Link href="/risk-acceptances" className="bento-card hover:border-updraft-light-purple transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldQuestion className="h-5 w-5 text-updraft-bright-purple" />
              <h2 className="text-lg font-bold text-updraft-deep font-poppins">Risk Acceptances</h2>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-updraft-bright-purple transition-colors" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="rounded-lg bg-surface-muted border border-[#E8E6E1] p-2 text-center">
              <p className="text-lg font-bold font-poppins text-gray-600">{raStats.expired}</p>
              <p className="text-[10px] text-text-secondary">Expired</p>
            </div>
            <div className="rounded-lg border border-amber-100 p-2 text-center" style={{ background: "linear-gradient(135deg, #FFFBEB, #FEFCE8)" }}>
              <p className="text-lg font-bold font-poppins text-amber-700">{raStats.awaiting}</p>
              <p className="text-[10px] text-text-secondary">Awaiting</p>
            </div>
            <div className="rounded-lg border border-purple-100 p-2 text-center" style={{ background: "linear-gradient(135deg, #FAF5FF, #F5F3FF)" }}>
              <p className="text-lg font-bold font-poppins text-purple-700">{raStats.ccroReview}</p>
              <p className="text-[10px] text-text-secondary">CCRO Review</p>
            </div>
            <div className="rounded-lg border border-green-100 p-2 text-center" style={{ background: "linear-gradient(135deg, #ECFDF5, #F0FDF4)" }}>
              <p className="text-lg font-bold font-poppins text-green-700">{raStats.accepted}</p>
              <p className="text-[10px] text-text-secondary">Accepted</p>
            </div>
          </div>
          {raStats.urgent.length > 0 && (
            <div className="space-y-1.5">
              {raStats.urgent.map((ra) => (
                <button key={ra.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/risk-acceptances?acceptance=${ra.id}`); }} className="w-full flex items-center justify-between text-xs py-1 hover:opacity-80 transition-opacity text-left">
                  <span className="text-gray-700 truncate flex-1 min-w-0">
                    <span className="font-mono font-bold text-updraft-deep mr-1">{ra.reference}</span>
                    {ra.title}
                  </span>
                  <span className={`shrink-0 ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    ra.status === "EXPIRED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {ra.status === "EXPIRED" ? "Expired" : "Awaiting"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Link>

        {/* Upcoming reviews card */}
        <div className="bento-card">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Upcoming Reviews</h3>
          </div>
          {raStats.overdue.length === 0 && raStats.due30.length === 0 && raStats.beyond30.length === 0 ? (
            <p className="text-xs text-gray-400">No upcoming reviews</p>
          ) : (
            <div className="space-y-1.5">
              {raStats.overdue.slice(0, 3).map((ra) => (
                <Link key={ra.id} href="/risk-acceptances" className="flex items-center justify-between p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors text-xs">
                  <span className="truncate flex-1 min-w-0"><span className="font-mono font-bold">{ra.reference}</span> {ra.title}</span>
                  <span className="shrink-0 ml-2 font-semibold text-red-700">{Math.abs(ra.daysUntil)}d overdue</span>
                </Link>
              ))}
              {raStats.due30.slice(0, 3).map((ra) => (
                <Link key={ra.id} href="/risk-acceptances" className="flex items-center justify-between p-2 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors text-xs">
                  <span className="truncate flex-1 min-w-0"><span className="font-mono font-bold">{ra.reference}</span> {ra.title}</span>
                  <span className="shrink-0 ml-2 font-semibold text-amber-700">{ra.daysUntil}d</span>
                </Link>
              ))}
              {raStats.beyond30.slice(0, 2).map((ra) => (
                <Link key={ra.id} href="/risk-acceptances" className="flex items-center justify-between p-2 rounded-lg bg-surface-muted hover:bg-surface-warm transition-colors text-xs">
                  <span className="truncate flex-1 min-w-0"><span className="font-mono font-bold">{ra.reference}</span> {ra.title}</span>
                  <span className="shrink-0 ml-2 text-gray-500">{ra.daysUntil}d</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    ) : null,

    "compliance-health": (() => {
      if (!complianceHealth) return null;
      const chOrder = elementOrderForRender["compliance-health"] ?? SECTION_ELEMENTS["compliance-health"].map((d) => d.id);
      const chVisible = chOrder.filter((id) => !hiddenElementsForRender.has(`compliance-health:${id}`));
      return (
        <Link href="/compliance" className="bento-card hover:border-updraft-light-purple transition-colors group block card-entrance card-entrance-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-updraft-bright-purple" />
              <h2 className="text-lg font-bold text-updraft-deep font-poppins">Compliance Health</h2>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-updraft-bright-purple transition-colors" />
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, chVisible.length)}, minmax(0, 1fr))` }}>
            {chVisible.map((id) => {
              switch (id) {
                case "stat-compliant": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/compliance?tab=regulatory-universe"); }} className="rounded-lg border border-green-100 p-3 text-center hover:opacity-80 transition-opacity" style={{ background: "linear-gradient(135deg, #ECFDF5, #F0FDF4)" }}>
                    <p className="text-xl font-bold font-poppins text-green-700">{complianceHealth.compliantPct}%</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Compliant</p>
                  </button>
                );
                case "stat-applicable": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/compliance?tab=regulatory-universe"); }} className="rounded-lg border border-gray-200 p-3 text-center bg-surface-warm hover:opacity-80 transition-opacity">
                    <p className="text-xl font-bold font-poppins text-updraft-deep">{complianceHealth.total}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Applicable</p>
                  </button>
                );
                case "stat-gaps": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/compliance?tab=regulatory-universe"); }} className={`rounded-lg border p-3 text-center hover:opacity-80 transition-opacity ${complianceHealth.gaps > 0 ? "border-red-100" : "border-green-100"}`} style={{ background: complianceHealth.gaps > 0 ? "linear-gradient(135deg, #FEF2F2, #FFF5F5)" : "linear-gradient(135deg, #ECFDF5, #F0FDF4)" }}>
                    <p className={`text-xl font-bold font-poppins ${complianceHealth.gaps > 0 ? "text-red-700" : "text-green-700"}`}>{complianceHealth.gaps}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Open Gaps</p>
                  </button>
                );
                case "stat-assessments": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/compliance?tab=assessment-log"); }} className={`rounded-lg border p-3 text-center hover:opacity-80 transition-opacity ${complianceHealth.overdueAssessments > 0 ? "border-amber-100" : "border-green-100"}`} style={{ background: complianceHealth.overdueAssessments > 0 ? "linear-gradient(135deg, #FFFBEB, #FEFCE8)" : "linear-gradient(135deg, #ECFDF5, #F0FDF4)" }}>
                    <p className={`text-xl font-bold font-poppins ${complianceHealth.overdueAssessments > 0 ? "text-amber-700" : "text-green-700"}`}>{complianceHealth.overdueAssessments}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Overdue Assessments</p>
                  </button>
                );
                case "stat-certs": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/compliance?tab=smcr"); }} className={`rounded-lg border p-3 text-center hover:opacity-80 transition-opacity ${complianceHealth.pendingCerts > 0 ? "border-amber-100" : "border-green-100"}`} style={{ background: complianceHealth.pendingCerts > 0 ? "linear-gradient(135deg, #FFFBEB, #FEFCE8)" : "linear-gradient(135deg, #ECFDF5, #F0FDF4)" }}>
                    <p className={`text-xl font-bold font-poppins ${complianceHealth.pendingCerts > 0 ? "text-amber-700" : "text-green-700"}`}>{complianceHealth.pendingCerts}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Pending Certs</p>
                  </button>
                );
                default: return null;
              }
            })}
          </div>
        </Link>
      );
    })(),

    "controls-library": (() => {
      if (!controlsStats) return null;
      const clOrder = elementOrderForRender["controls-library"] ?? SECTION_ELEMENTS["controls-library"].map((d) => d.id);
      const clVisible = clOrder.filter((id) => !hiddenElementsForRender.has(`controls-library:${id}`));
      return (
        <Link href="/controls" className="bento-card hover:border-updraft-light-purple transition-colors group block card-entrance card-entrance-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-updraft-bright-purple" />
              <h2 className="text-lg font-bold text-updraft-deep font-poppins">Controls Library</h2>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-updraft-bright-purple transition-colors" />
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, clVisible.length)}, minmax(0, 1fr))` }}>
            {clVisible.map((id) => {
              switch (id) {
                case "stat-total": return (
                  <div key={id} className="rounded-lg border border-updraft-pale-purple p-3 text-center overflow-hidden" style={{ background: "linear-gradient(135deg, #F3E8FF, #FAF5FF)" }}>
                    <p className="text-xl font-bold font-poppins text-updraft-deep">{controlsStats.total}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate" title="Total Controls">Total</p>
                  </div>
                );
                case "stat-preventative": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/controls?tab=library&type=PREVENTATIVE"); }} className="rounded-lg border border-green-100 p-3 text-center hover:opacity-80 transition-opacity overflow-hidden" style={{ background: "linear-gradient(135deg, #ECFDF5, #F0FDF4)" }}>
                    <p className="text-xl font-bold font-poppins text-green-700">{controlsStats.preventative}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate" title="Preventative">Prevent.</p>
                  </button>
                );
                case "stat-detective": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/controls?tab=library&type=DETECTIVE"); }} className="rounded-lg border border-blue-100 p-3 text-center hover:opacity-80 transition-opacity overflow-hidden" style={{ background: "linear-gradient(135deg, #EFF6FF, #F0F9FF)" }}>
                    <p className="text-xl font-bold font-poppins text-blue-700">{controlsStats.detective}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate" title="Detective">Detect.</p>
                  </button>
                );
                case "stat-directive": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/controls?tab=library&type=DIRECTIVE"); }} className="rounded-lg border border-amber-100 p-3 text-center hover:opacity-80 transition-opacity overflow-hidden" style={{ background: "linear-gradient(135deg, #FFFBEB, #FEFCE8)" }}>
                    <p className="text-xl font-bold font-poppins text-amber-700">{controlsStats.directive}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate" title="Directive">Directive</p>
                  </button>
                );
                case "stat-corrective": return (
                  <button key={id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/controls?tab=library&type=CORRECTIVE"); }} className="rounded-lg border border-red-100 p-3 text-center hover:opacity-80 transition-opacity overflow-hidden" style={{ background: "linear-gradient(135deg, #FEF2F2, #FFF5F5)" }}>
                    <p className="text-xl font-bold font-poppins text-red-700">{controlsStats.corrective}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate" title="Corrective">Correct.</p>
                  </button>
                );
                case "stat-policies": return (
                  <div key={id} className="rounded-lg border border-gray-200 p-3 text-center bg-surface-warm overflow-hidden">
                    <p className="text-xl font-bold font-poppins text-updraft-deep">{controlsStats.policiesWithControls}/{controlsStats.totalPolicies}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate" title="Policies Covered">Policies</p>
                  </div>
                );
                default: return null;
              }
            })}
          </div>
        </Link>
      );
    })(),

    "cross-entity": crossEntityInsights.hasData ? (
      <div className="bento-card card-entrance card-entrance-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-updraft-bright-purple" />
          <h2 className="text-lg font-bold text-updraft-deep font-poppins">Compliance Insights</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Risks with failing controls */}
          {crossEntityInsights.risksWithFailingControls.length > 0 && (
            <div className="rounded-xl border border-red-100 p-4" style={{ background: "linear-gradient(135deg, #FEF2F2, #FFF5F5)" }}>
              <h3 className="text-xs font-bold text-red-700 mb-2">Risks with Failing Controls</h3>
              <div className="space-y-2">
                {crossEntityInsights.risksWithFailingControls.map((r) => (
                  <Link key={r.riskId} href={`/risk-register?risk=${r.riskId}`} className="flex items-center justify-between text-xs hover:text-updraft-bright-purple transition-colors">
                    <span className="truncate flex-1 min-w-0 text-gray-700">
                      <span className="font-mono font-bold text-updraft-deep mr-1">{r.riskRef}</span>
                      {r.riskName}
                    </span>
                    <span className="shrink-0 ml-2 text-red-600 font-semibold">{r.failCount}/{r.totalControls}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Policies with coverage gaps */}
          {crossEntityInsights.policiesWithGaps.length > 0 && (
            <div className="rounded-xl border border-amber-100 p-4" style={{ background: "linear-gradient(135deg, #FFFBEB, #FEFCE8)" }}>
              <h3 className="text-xs font-bold text-amber-700 mb-2">Policies with Coverage Gaps</h3>
              <div className="space-y-2">
                {crossEntityInsights.policiesWithGaps.map((p) => (
                  <Link key={p.id} href={`/compliance?tab=policies&policy=${p.id}`} className="flex items-center justify-between text-xs hover:text-updraft-bright-purple transition-colors">
                    <span className="truncate flex-1 min-w-0 text-gray-700">
                      <span className="font-mono font-bold text-updraft-deep mr-1">{p.ref}</span>
                      {p.name}
                    </span>
                    <span className="shrink-0 ml-2 text-amber-600 font-semibold">{p.uncovered}/{p.total} uncovered</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Key controls */}
          {crossEntityInsights.keyControls.length > 0 && (
            <div className="rounded-xl border border-updraft-pale-purple p-4" style={{ background: "linear-gradient(135deg, #F3E8FF, #FAF5FF)" }}>
              <h3 className="text-xs font-bold text-updraft-deep mb-2">Key Controls (Multi-Policy)</h3>
              <div className="space-y-2">
                {crossEntityInsights.keyControls.map((c) => (
                  <Link key={c.ref} href={`/controls?tab=library&control=${c.id}`} className="flex items-center justify-between text-xs hover:text-updraft-bright-purple transition-colors">
                    <span className="truncate flex-1 min-w-0 text-gray-700">
                      <span className="font-mono font-bold text-updraft-deep mr-1">{c.ref}</span>
                      {c.name}
                    </span>
                    <span className="shrink-0 ml-2 text-updraft-bright-purple font-semibold">{c.policyCount} policies</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    ) : null,

    "policy-health": (() => {
      if (policies.length === 0) return null;
      const phOrder = elementOrderForRender["policy-health"] ?? SECTION_ELEMENTS["policy-health"].map((d) => d.id);
      const phVisible = phOrder.filter((id) => !hiddenElementsForRender.has(`policy-health:${id}`));
      const now = new Date();
      const overdueCount = policies.filter(
        (p) => p.status !== "ARCHIVED" && (p.status === "OVERDUE" || (!!p.nextReviewDate && new Date(p.nextReviewDate) < now))
      ).length;
      return (
        <Link href="/policies" className="bento-card hover:border-updraft-light-purple transition-colors group block card-entrance card-entrance-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-updraft-bright-purple" />
              <h2 className="text-lg font-bold text-updraft-deep font-poppins">Policy Health</h2>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-updraft-bright-purple transition-colors" />
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, phVisible.length)}, minmax(0, 1fr))` }}>
            {phVisible.map((id) => {
              switch (id) {
                case "stat-total": return (
                  <div key={id} className="rounded-lg border border-gray-200 p-3 text-center bg-surface-warm">
                    <p className="text-xl font-bold font-poppins text-updraft-deep">{policies.length}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Total Policies</p>
                  </div>
                );
                case "stat-overdue": return (
                  <div key={id} className={`rounded-lg border p-3 text-center ${overdueCount > 0 ? "border-red-100" : "border-green-100"}`} style={{ background: overdueCount > 0 ? "linear-gradient(135deg, #FEF2F2, #FFF5F5)" : "linear-gradient(135deg, #ECFDF5, #F0FDF4)" }}>
                    <p className={`text-xl font-bold font-poppins ${overdueCount > 0 ? "text-red-700" : "text-green-700"}`}>{overdueCount}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Overdue</p>
                  </div>
                );
                case "stat-requirements": return (
                  <div key={id} className="rounded-lg border border-updraft-pale-purple p-3 text-center" style={{ background: "linear-gradient(135deg, #F3E8FF, #FAF5FF)" }}>
                    <p className="text-xl font-bold font-poppins text-updraft-deep">{policies.reduce((sum, p) => sum + (p.obligations?.length ?? 0), 0)}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Requirements</p>
                  </div>
                );
                case "stat-links": return (
                  <div key={id} className="rounded-lg border border-blue-100 p-3 text-center" style={{ background: "linear-gradient(135deg, #EFF6FF, #F0F9FF)" }}>
                    <p className="text-xl font-bold font-poppins text-blue-700">{policies.reduce((sum, p) => sum + (p.controlLinks?.length ?? 0), 0)}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Control Links</p>
                  </div>
                );
                default: return null;
              }
            })}
          </div>
        </Link>
      );
    })(),

    "risks-in-focus": focusRisks.length > 0 ? (
      <div className="bento-card border-2 border-amber-200/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
            <h2 className="text-lg font-bold text-updraft-deep font-poppins">Risks in Focus</h2>
            <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold">{focusRisks.length}</span>
          </div>
          <Link href="/risk-register" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
            Risk Register <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="space-y-2">
          {focusRisks.map((r) => {
            const ownerName = r.riskOwner?.name ?? users.find((u) => u.id === r.ownerId)?.name ?? "Unknown";
            return (
              <Link
                key={r.id}
                href={`/risk-register?risk=${r.id}`}
                className="flex items-center gap-2 p-3 rounded-lg bg-amber-50/40 hover:bg-amber-50 transition-colors min-w-0"
              >
                <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                <span className="text-xs font-mono font-bold text-updraft-deep shrink-0 w-14 truncate" title={r.reference}>{r.reference}</span>
                <span className="text-sm text-gray-800 truncate flex-1 min-w-0" title={r.name}>{r.name}</span>
                <span className="shrink-0"><ScoreBadge likelihood={r.residualLikelihood} impact={r.residualImpact} size="sm" /></span>
                <span className="shrink-0"><DirectionArrow direction={r.directionOfTravel} /></span>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/risk-register?q=${encodeURIComponent(ownerName)}`); }} className="text-xs text-gray-500 shrink-0 hover:text-updraft-bright-purple transition-colors w-10 truncate text-right" title={ownerName}>{ownerName.split(" ")[0]}</button>
              </Link>
            );
          })}
        </div>
      </div>
    ) : null,

    "pending-approvals": canApproveEntities && pendingNewEntities.length > 0 ? (
      <div className="bento-card border-2 border-amber-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-updraft-deep font-poppins">Pending Approvals</h2>
            <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold">{pendingNewEntities.length}</span>
          </div>
        </div>
        <div className="space-y-2">
          {pendingNewEntities.map((item) => {
            const creatorName = users.find((u) => u.id === item.createdBy)?.name ?? "Unknown";
            const href = item.type === "risk" ? `/risk-register?risk=${item.id}` : item.type === "action" ? `/actions?edit=${item.id}` : `/controls?control=${item.id}`;
            return (
              <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50/40 border border-amber-100">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  item.type === "risk" ? "bg-red-100 text-red-700" :
                  item.type === "action" ? "bg-blue-100 text-blue-700" :
                  "bg-purple-100 text-purple-700"
                }`}>
                  {item.type === "risk" ? "Risk" : item.type === "action" ? "Action" : "Control"}
                </span>
                <span className="text-xs font-mono font-bold text-updraft-deep shrink-0">{item.reference}</span>
                <Link href={href} className="text-sm text-gray-800 truncate flex-1 min-w-0 hover:text-updraft-bright-purple transition-colors">
                  {item.name}
                </Link>
                <span className="text-xs text-gray-500 shrink-0">{creatorName}</span>
                <span className="text-xs text-gray-400 shrink-0">{formatDate(item.createdAt)}</span>
                <button
                  onClick={() => rejectEntity(item.type, item.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100 transition-colors shrink-0"
                >
                  <XCircle className="h-3 w-3" />
                  Reject
                </button>
                <button
                  onClick={() => approveEntity(item.type, item.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700 hover:bg-green-100 transition-colors shrink-0"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Approve
                </button>
              </div>
            );
          })}
        </div>
      </div>
    ) : null,

    "proposed-changes": canViewPending && allPendingChanges.length > 0 ? (
      <PendingChangesPanel
        changes={allPendingChanges}
        users={users}
        updateAction={updateAction}
        updateControl={updateControl}
        updateRisk={(id, data) => updateRisk(id, data as Partial<import("@/lib/types").Risk>)}
      />
    ) : null,

    "action-tracking": hasActionsPage ? (
      <div className="card-entrance card-entrance-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-updraft-deep font-poppins">Action Tracking</h2>
          <Link href="/actions" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/actions?status=OPEN" className="rounded-xl border border-blue-100 p-3 cursor-pointer hover:border-blue-300 hover:-translate-y-0.5 transition-all" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #F0F7FF 100%)" }}>
            <p className="text-xs text-text-secondary">Open</p>
            <AnimatedNumber value={actionStats.open} delay={300} className="text-2xl font-bold font-poppins text-blue-700" />
          </Link>
          <Link href="/actions?status=OVERDUE" className="rounded-xl border border-red-100 p-3 cursor-pointer hover:border-red-300 hover:-translate-y-0.5 transition-all" style={{ background: "linear-gradient(135deg, #FEF2F2 0%, #FFF5F5 100%)" }}>
            <p className="text-xs text-text-secondary">Overdue</p>
            <AnimatedNumber value={actionStats.overdue} delay={300} className="text-2xl font-bold font-poppins text-red-700" />
          </Link>
          <Link href="/actions?status=DUE_THIS_MONTH" className="rounded-xl border border-amber-100 p-3 cursor-pointer hover:border-amber-300 hover:-translate-y-0.5 transition-all" style={{ background: "linear-gradient(135deg, #FFFBEB 0%, #FEFCE8 100%)" }}>
            <p className="text-xs text-text-secondary">Due This Month</p>
            <AnimatedNumber value={actionStats.dueThisMonth} delay={300} className="text-2xl font-bold font-poppins text-amber-700" />
          </Link>
          <Link href="/actions?status=COMPLETED" className="rounded-xl border border-blue-100 p-3 cursor-pointer hover:border-blue-300 hover:-translate-y-0.5 transition-all" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #F0F7FF 100%)" }}>
            <p className="text-xs text-text-secondary">Completed</p>
            <AnimatedNumber value={actionStats.completed} delay={300} className="text-2xl font-bold font-poppins text-blue-700" />
          </Link>
        </div>
        <div className="mt-4">
          <ActionPipeline actions={actions} priorityStats={priorityStats} />
        </div>
      </div>
    ) : null,

    "overdue-metrics": hasConsumerDutyPage && overdueMetrics.length > 0 ? (
      <div className="bento-card border-2 border-red-200 bg-red-50/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-bold text-red-700 font-poppins">Overdue Metrics</h2>
            <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-bold">{overdueMetrics.length}</span>
          </div>
          <Link href="/consumer-duty" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="text-xs text-red-600/70 mb-3">These metrics have not been updated in over 30 days and require attention.</p>
        <div className="space-y-2">
          {overdueMetrics.slice(0, 8).map((m) => (
            <Link
              key={m.id}
              href={`/consumer-duty?measure=${m.id}`}
              className="flex items-center justify-between p-2.5 rounded-lg bg-white/80 hover:bg-white transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{m.measureId} — {m.name}</p>
                <p className="text-[10px] text-gray-400">
                  {m.lastUpdatedAt
                    ? `Last updated ${Math.floor((Date.now() - new Date(m.lastUpdatedAt).getTime()) / 86400000)}d ago`
                    : "Never updated"}
                </p>
              </div>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 shrink-0 ml-2">
                <AlertTriangle className="h-2.5 w-2.5" />
                Overdue
              </span>
            </Link>
          ))}
          {overdueMetrics.length > 8 && (
            <p className="text-[10px] text-red-500 text-center">+{overdueMetrics.length - 8} more overdue metrics</p>
          )}
        </div>
      </div>
    ) : null,

    "tasks-reviews": ((canViewPending && risksNeedingReview.length > 0) || (!canViewPending && myRisksNeedingReview.length > 0) || myOverdueActions.length > 0 || myRisks.length > 0 || myActions.length > 0 || myMetrics.length > 0) ? (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-updraft-deep font-poppins">Tasks & Reviews</h2>

        {/* Risk reviews and overdue actions grid */}
        {((canViewPending && risksNeedingReview.length > 0) || (!canViewPending && myRisksNeedingReview.length > 0) || myOverdueActions.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bento-card">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="h-4 w-4 text-updraft-bright-purple" />
                <h3 className="text-sm font-semibold text-gray-700">Risks Due for Review</h3>
              </div>
              {(() => {
                const reviewList = canViewPending ? risksNeedingReview : myRisksNeedingReview;
                return reviewList.length === 0 ? (
                  <p className="text-xs text-gray-400">No reviews due</p>
                ) : (
                  <div className="space-y-2">
                    {reviewList.slice(0, 5).map((r) => {
                      const nextReview = new Date(r.lastReviewed);
                      nextReview.setDate(nextReview.getDate() + (r.reviewFrequencyDays ?? 90));
                      const daysUntil = Math.ceil((nextReview.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <Link key={r.id} href={`/risk-register?risk=${r.id}`} className="flex items-center justify-between p-2 rounded-lg bg-surface-muted hover:bg-surface-warm transition-colors">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{r.reference}: {r.name}</p>
                            <p className="text-[10px] text-gray-400">Owner: {r.riskOwner?.name ?? users.find(u => u.id === r.ownerId)?.name ?? "Unknown"}</p>
                          </div>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ml-2 ${
                            r.reviewRequested ? "bg-updraft-pale-purple/50 text-updraft-deep" :
                            daysUntil <= 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {r.reviewRequested ? "Requested" : daysUntil <= 0 ? "Overdue" : `${daysUntil}d`}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="bento-card">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-semibold text-gray-700">My Overdue Actions</h3>
              </div>
              {myOverdueActions.length === 0 ? (
                <p className="text-xs text-gray-400">No overdue actions</p>
              ) : (
                <div className="space-y-2">
                  {myOverdueActions.slice(0, 5).map((a) => (
                    <Link key={a.id} href={`/actions?edit=${a.id}`} className="flex items-center justify-between p-2 rounded-lg bg-surface-muted hover:bg-surface-warm transition-colors">
                      <p className="text-xs font-medium text-gray-800 truncate flex-1 min-w-0">{a.title}</p>
                      <span className="text-[10px] font-semibold text-red-600 shrink-0 ml-2">
                        {a.dueDate ? `${Math.abs(daysUntilDue(a.dueDate) ?? 0)}d overdue` : "Overdue"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Risks */}
        {myRisks.length > 0 && (
          <div className="bento-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-updraft-bright-purple" />
                <h2 className="text-lg font-bold text-updraft-deep font-poppins">My Risks</h2>
                <span className="rounded-full bg-updraft-pale-purple/40 text-updraft-deep px-2 py-0.5 text-xs font-bold">{myRisks.length}</span>
              </div>
              <Link href="/risk-register" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                Risk Register <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {myRisks.map((r) => {
                const nextReview = new Date(r.lastReviewed);
                nextReview.setDate(nextReview.getDate() + (r.reviewFrequencyDays ?? 90));
                return (
                  <Link key={r.id} href={`/risk-register?risk=${r.id}`} className="flex items-center gap-4 p-3 rounded-lg bg-surface-muted hover:bg-surface-warm transition-colors">
                    <span className="text-xs font-mono font-bold text-updraft-deep shrink-0">{r.reference}</span>
                    <span className="text-sm text-gray-800 truncate flex-1 min-w-0">{r.name}</span>
                    <ScoreBadge likelihood={r.residualLikelihood} impact={r.residualImpact} size="sm" />
                    <DirectionArrow direction={r.directionOfTravel} />
                    <span className="text-[10px] text-gray-400 shrink-0">{nextReview.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* My Due Actions */}
        {myActions.length > 0 && (
          <div className="bento-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-updraft-bright-purple" />
                <h2 className="text-lg font-bold text-updraft-deep font-poppins">My Due Actions</h2>
                <span className="rounded-full bg-updraft-pale-purple/40 text-updraft-deep px-2 py-0.5 text-xs font-bold">{myActions.length}</span>
              </div>
              <Link href="/actions" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                All Actions <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {myActions.slice(0, 8).map((a) => {
                const days = daysUntilDue(a.dueDate);
                const isOverdue = days !== null && days <= 0;
                return (
                  <Link key={a.id} href={`/actions?edit=${a.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-surface-muted hover:bg-surface-warm transition-colors">
                    {a.priority && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        a.priority === "P1" ? "bg-red-100 text-red-700" :
                        a.priority === "P2" ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>{a.priority}</span>
                    )}
                    <span className="text-sm text-gray-800 truncate flex-1 min-w-0">{a.title}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                      a.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-700" :
                      a.status === "OVERDUE" || isOverdue ? "bg-red-100 text-red-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {a.status === "OVERDUE" || isOverdue ? "Overdue" : a.status === "IN_PROGRESS" ? "In Progress" : "Open"}
                    </span>
                    <span className={`text-xs shrink-0 ${isOverdue ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                      {a.dueDate ? new Date(a.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "No date"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* My Metrics */}
        {myMetrics.length > 0 && (
          <div className="bento-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-updraft-bright-purple" />
                <h2 className="text-lg font-bold text-updraft-deep font-poppins">My Metrics</h2>
                <span className="rounded-full bg-updraft-pale-purple/40 text-updraft-deep px-2 py-0.5 text-xs font-bold">{myMetrics.length}</span>
              </div>
              <Link href="/consumer-duty" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
                Consumer Duty <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {myMetrics.map((m) => {
                const isOverdue = !m.lastUpdatedAt || new Date(m.lastUpdatedAt) < new Date(Date.now() - 30 * 86400000);
                return (
                  <Link
                    key={m.id}
                    href={`/consumer-duty?measure=${m.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface-muted hover:bg-surface-warm transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.measureId}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {isOverdue && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Overdue
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        m.ragStatus === "GOOD" ? "bg-green-100 text-risk-green" :
                        m.ragStatus === "WARNING" ? "bg-amber-100 text-risk-amber" :
                        "bg-red-100 text-risk-red"
                      }`}>
                        {m.ragStatus === "GOOD" ? "Green" : m.ragStatus === "WARNING" ? "Amber" : "Red"}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    ) : null,

    "consumer-duty": hasConsumerDutyPage ? <CDRadialRing outcomes={outcomes} /> : null,

    "risk-summary": hasRiskRegisterPage ? (() => {
      const rsOrder = elementOrderForRender["risk-summary"] ?? SECTION_ELEMENTS["risk-summary"].map((d) => d.id);
      const rsVisible = rsOrder.filter((id) => !hiddenElementsForRender.has(`risk-summary:${id}`));
      return (
      <div className="card-entrance card-entrance-5">
        <h2 className="text-lg font-bold text-updraft-deep font-poppins mb-3">Risk Summary</h2>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, rsVisible.length)}, minmax(0, 1fr))` }}>
          {rsVisible.map((id) => {
            switch (id) {
              case "stat-total": return (
                <Link key={id} href="/risk-register" className="rounded-xl border border-[#E8E6E1] bg-surface-warm p-3 hover:-translate-y-0.5 hover:shadow-bento transition-all">
                  <p className="text-xs text-text-secondary">Total Risks</p>
                  <AnimatedNumber value={risks.length} delay={240} className="text-2xl font-bold font-poppins text-updraft-deep" />
                </Link>
              );
              case "stat-low": return (
                <Link key={id} href="/risk-register?filter=LOW" className="rounded-xl border border-green-100 p-3 hover:-translate-y-0.5 hover:shadow-bento transition-all" style={{ background: "linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)" }}>
                  <p className="text-xs text-text-secondary">Low Risk</p>
                  <AnimatedNumber value={risks.filter((r) => getRiskScore(r.residualLikelihood, r.residualImpact) <= 4).length} delay={240} className="text-2xl font-bold font-poppins text-green-700" />
                </Link>
              );
              case "stat-medium": return (
                <Link key={id} href="/risk-register?filter=MEDIUM" className="rounded-xl border border-amber-100 p-3 hover:-translate-y-0.5 hover:shadow-bento transition-all" style={{ background: "linear-gradient(135deg, #FFFBEB 0%, #FEFCE8 100%)" }}>
                  <p className="text-xs text-text-secondary">Medium Risk</p>
                  <AnimatedNumber value={risks.filter((r) => { const s = getRiskScore(r.residualLikelihood, r.residualImpact); return s > 4 && s <= 12; }).length} delay={240} className="text-2xl font-bold font-poppins text-amber-700" />
                </Link>
              );
              case "stat-high": return (
                <Link key={id} href="/risk-register?filter=HIGH" className="rounded-xl border border-red-100 p-3 hover:-translate-y-0.5 hover:shadow-bento transition-all" style={{ background: "linear-gradient(135deg, #FEF2F2 0%, #FFF5F5 100%)" }}>
                  <p className="text-xs text-text-secondary">High Risk</p>
                  <AnimatedNumber value={risks.filter((r) => getRiskScore(r.residualLikelihood, r.residualImpact) > 12).length} delay={240} className="text-2xl font-bold font-poppins text-red-700" />
                </Link>
              );
              default: return null;
            }
          })}
        </div>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bento-card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Risk Landscape</h3>
            <RiskMatrix risks={risks} onNavigate={(id) => router.push(`/risk-register?risk=${id}`)} />
          </div>
          <div className="bento-card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Portfolio Trend</h3>
            <RiskTrendChart risks={risks} />
          </div>
        </div>
      </div>
      );
    })() : null,

    "programme-health": (
      <DomainScorecardRow
        risks={risks}
        actions={actions}
        outcomes={outcomes}
        complianceHealth={complianceHealth}
      />
    ),

    "reports": hasReportsPage ? (
      <div className="bento-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-updraft-deep">{isCCRO ? "Reports" : "Published Reports"}</h2>
          <Link href="/reports" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-fca-gray">Report</th>
                <th className="text-left py-2 px-3 font-medium text-fca-gray">Period</th>
                {isCCRO && <th className="text-left py-2 px-3 font-medium text-fca-gray">Status</th>}
                <th className="text-left py-2 px-3 font-medium text-fca-gray">Updated</th>
                <th className="text-right py-2 px-3 font-medium text-fca-gray"></th>
              </tr>
            </thead>
            <tbody>
              {(isCCRO ? reports : publishedReports).map((report) => (
                <tr key={report.id} className="border-b border-[#E8E6E1]/50 hover:bg-surface-muted">
                  <td className="py-3 px-3 font-medium">{report.title}</td>
                  <td className="py-3 px-3 text-fca-gray">{report.period}</td>
                  {isCCRO && (
                    <td className="py-3 px-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        report.status === "DRAFT" ? "bg-red-100 text-red-700" :
                        report.status === "PUBLISHED" ? "bg-green-100 text-green-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {report.status === "DRAFT" ? "Draft" : report.status === "PUBLISHED" ? "Published" : "Archived"}
                      </span>
                    </td>
                  )}
                  <td className="py-3 px-3 text-fca-gray text-xs">{formatDate(report.updatedAt)}</td>
                  <td className="py-3 px-3 text-right">
                    {isCCRO && <Link href={`/reports/${report.id}/edit`} className="text-updraft-bright-purple hover:text-updraft-deep text-xs font-medium mr-3">Edit</Link>}
                    <Link href={`/reports/${report.id}`} className="text-fca-gray hover:text-fca-dark-gray text-xs font-medium">View</Link>
                  </td>
                </tr>
              ))}
              {(isCCRO ? reports : publishedReports).length === 0 && (
                <tr><td colSpan={isCCRO ? 5 : 4} className="py-6 text-center text-sm text-gray-400">No {isCCRO ? "" : "published "}reports yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    ) : null,

    "horizon-scanning": horizonItems.filter((h) => h.status !== "DISMISSED" && h.status !== "COMPLETED").length > 0 ? (
      <HorizonDashboardWidget />
    ) : null,

    "recent-activity": hasAuditPage && auditLogs.length > 0 ? (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-updraft-deep font-poppins">Recent Activity</h2>
          <Link href="/audit" className="text-sm text-updraft-bright-purple hover:text-updraft-deep flex items-center gap-1">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {auditLogs.slice(0, 20).map((log) => {
            const logUser = users.find((u) => u.id === log.userId);
            const entityUrl = getEntityUrl(log.entityType, log.entityId);
            return (
              <Link key={log.id} href={entityUrl} className="flex-shrink-0 w-64 rounded-xl border border-[#E8E6E1] bg-surface-warm p-3 hover:border-updraft-light-purple hover:-translate-y-0.5 hover:shadow-bento transition-all cursor-pointer">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-updraft-pale-purple/40 text-[10px] font-semibold text-updraft-bright-purple">
                    {(logUser?.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-gray-800 truncate">{logUser?.name || log.userId}</span>
                </div>
                <p className="text-xs text-fca-gray truncate">{getActionLabel(log.action)}</p>
                <p className="text-[10px] text-gray-400 mt-1">{formatDate(log.timestamp)}</p>
              </Link>
            );
          })}
        </div>
      </div>
    ) : null,

    "control-health": <ControlHealthTrendWidget />,

    "quarterly-summary": <QuarterlySummaryWidget />,
  };

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

