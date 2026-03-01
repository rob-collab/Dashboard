"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, Download, Search, Radar, AlertTriangle, CheckCircle2, Clock, LayoutGrid, List } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useSession } from "next-auth/react";
import type { HorizonItem, HorizonCategory, HorizonUrgency, HorizonImpact, HorizonStatus } from "@/lib/types";
import { HORIZON_CATEGORY_LABELS, HORIZON_URGENCY_COLOURS } from "@/lib/types";
import { HorizonInFocusSpotlight } from "@/components/horizon/HorizonInFocusSpotlight";
import { HorizonItemCard } from "@/components/horizon/HorizonItemCard";
import { HorizonDetailPanel } from "@/components/horizon/HorizonDetailPanel";
import { HorizonFormDialog } from "@/components/horizon/HorizonFormDialog";
import { cn } from "@/lib/utils";
import { MotionListDiv } from "@/components/motion/MotionList";
import { MotionDiv } from "@/components/motion/MotionRow";
import { SkeletonCard } from "@/components/common/SkeletonLoader";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import ScrollReveal from "@/components/common/ScrollReveal";

const URGENCY_ORDER: HorizonUrgency[] = ["HIGH", "MEDIUM", "LOW"];

const URGENCY_SECTION_STYLES: Record<HorizonUrgency, { label: string; headerBg: string; headerText: string; count: string }> = {
  HIGH:   { label: "HIGH URGENCY",   headerBg: "bg-red-50",     headerText: "text-red-700",    count: "bg-red-100 text-red-700"    },
  MEDIUM: { label: "MEDIUM URGENCY", headerBg: "bg-amber-50",   headerText: "text-amber-700",  count: "bg-amber-100 text-amber-700"  },
  LOW:    { label: "LOW URGENCY",    headerBg: "bg-emerald-50", headerText: "text-emerald-700", count: "bg-emerald-100 text-emerald-700" },
};

export default function HorizonScanningPage() {
  return (
    <Suspense>
      <HorizonScanningPageInner />
    </Suspense>
  );
}

function HorizonScanningPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { horizonItems, risks } = useAppStore();
  const hydrated = useAppStore((s) => s._hydrated);

  const [selectedItem, setSelectedItem] = useState<HorizonItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showChangeFocus, setShowChangeFocus] = useState(false);

  // Initialise filters from URL (run once on mount)
  const [categoryFilter, setCategoryFilter] = useState<HorizonCategory | "ALL">(() =>
    (searchParams.get("category") as HorizonCategory) || "ALL"
  );
  const [urgencyFilter, setUrgencyFilter] = useState<HorizonUrgency | "ALL">(() =>
    (searchParams.get("urgency") as HorizonUrgency) || "ALL"
  );
  const [statusFilter, setStatusFilter] = useState<HorizonStatus | "ALL">(() =>
    (searchParams.get("status") as HorizonStatus) || "ALL"
  );
  const [showDismissed, setShowDismissed] = useState(() => searchParams.get("dismissed") === "1");
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [viewMode, setViewMode] = useState<"list" | "matrix">("list");
  const [statCardFilter, setStatCardFilter] = useState<"all" | "high" | "due-soon" | "completed">("all");

  // Sync filter state → URL (replaces current history entry, no scroll)
  useEffect(() => {
    const params = new URLSearchParams();
    if (categoryFilter !== "ALL") params.set("category", categoryFilter);
    if (urgencyFilter !== "ALL") params.set("urgency", urgencyFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (showDismissed) params.set("dismissed", "1");
    if (search.trim()) params.set("q", search.trim());
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, urgencyFilter, statusFilter, showDismissed, search]);

  const userRole = (session?.user as { role?: string } | undefined)?.role ?? "";
  const canManage = userRole === "CCRO_TEAM";
  const canChangeFocus = userRole === "CCRO_TEAM" || userRole === "CEO";
  const canCreateAction = userRole === "CCRO_TEAM" || userRole === "OWNER";

  const inFocusItem = useMemo(() => horizonItems.find((h) => h.inFocus), [horizonItems]);

  const lastAddedDate = useMemo(() => {
    if (horizonItems.length === 0) return null;
    const sorted = [...horizonItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted[0].createdAt;
  }, [horizonItems]);

  const filteredItems = useMemo(() => {
    const now = Date.now();
    return horizonItems.filter((item) => {
      // Stat card filters (applied first as primary intent)
      if (statCardFilter === "high") {
        if (item.urgency !== "HIGH" || item.status === "DISMISSED" || item.status === "COMPLETED") return false;
      } else if (statCardFilter === "due-soon") {
        if (item.status === "DISMISSED" || item.status === "COMPLETED") return false;
        if (!item.deadline) return false;
        const deadline = new Date(item.deadline).getTime();
        if (deadline <= now || deadline - now >= 30 * 24 * 60 * 60 * 1000) return false;
      } else if (statCardFilter === "completed") {
        if (item.status !== "COMPLETED") return false;
      } else {
        // "all" stat filter — apply the existing filter controls as normal
        if (!showDismissed && item.status === "DISMISSED") return false;
        if (urgencyFilter !== "ALL" && item.urgency !== urgencyFilter) return false;
        if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      }
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.reference.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [horizonItems, categoryFilter, urgencyFilter, statusFilter, showDismissed, search, statCardFilter]);

  const groupedItems = useMemo(() => {
    const groups: Record<HorizonUrgency, HorizonItem[]> = { HIGH: [], MEDIUM: [], LOW: [] };
    for (const item of filteredItems) {
      groups[item.urgency].push(item);
    }
    // Sort each group: deadline asc (nulls last), then createdAt desc
    for (const urgency of URGENCY_ORDER) {
      groups[urgency].sort((a, b) => {
        if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return groups;
  }, [filteredItems]);

  // Stats
  const stats = useMemo(() => {
    const active = horizonItems.filter((h) => h.status !== "DISMISSED" && h.status !== "COMPLETED");
    const high = active.filter((h) => h.urgency === "HIGH").length;
    const actionRequired = active.filter((h) => h.status === "ACTION_REQUIRED").length;
    const now = Date.now();
    const dueSoon = active.filter((h) => h.deadline && new Date(h.deadline).getTime() - now < 30 * 24 * 60 * 60 * 1000 && new Date(h.deadline).getTime() > now).length;
    const completed = horizonItems.filter((h) => h.status === "COMPLETED").length;
    return { total: active.length, high, actionRequired, dueSoon, completed };
  }, [horizonItems]);

  function handleExport() {
    window.location.href = "/api/horizon-items/export";
  }

  if (!hydrated) return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={4} />)}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radar className="w-6 h-6 text-updraft-bright-purple" />
            <h1 className="font-poppins text-2xl font-bold text-updraft-deep">Horizon Scanning</h1>
          </div>
          <p className="text-sm text-slate-500">Regulatory &amp; Business Environment Monitor — updated monthly</p>
          {lastAddedDate && (
            <p className="text-xs text-slate-400 mt-0.5">
              Last item added: {new Date(lastAddedDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          {canManage && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-updraft-bright-purple text-white text-sm font-semibold rounded-lg hover:bg-updraft-light-purple transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          )}
        </div>
      </div>

      {/* In Focus spotlight */}
      {inFocusItem && !showChangeFocus && (
        <HorizonInFocusSpotlight
          item={inFocusItem}
          canChangeFocus={canChangeFocus}
          onViewDetail={setSelectedItem}
          onChangeFocus={() => setShowChangeFocus(true)}
        />
      )}

      {/* Change focus picker */}
      {showChangeFocus && canChangeFocus && (
        <ChangeFocusPicker
          items={horizonItems}
          current={inFocusItem}
          onSelect={async (item) => {
            const res = await fetch(`/api/horizon-items/${item.id}/set-focus`, { method: "POST" });
            if (res.ok) {
              // Update store: clear all inFocus, set the new one
              useAppStore.getState().setHorizonItems(
                horizonItems.map((h) => ({ ...h, inFocus: h.id === item.id }))
              );
            }
            setShowChangeFocus(false);
          }}
          onCancel={() => setShowChangeFocus(false)}
        />
      )}

      {/* Stats row */}
      <ScrollReveal>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Active Items"
          value={stats.total}
          icon={<Radar className="w-4 h-4 text-updraft-bright-purple" />}
          isActive={statCardFilter === "all"}
          onClick={() => setStatCardFilter("all")}
        />
        <StatCard
          label="High Urgency"
          value={stats.high}
          icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
          valueClass="text-red-600"
          isActive={statCardFilter === "high"}
          onClick={() => setStatCardFilter(statCardFilter === "high" ? "all" : "high")}
        />
        <StatCard
          label="Due Within 30 Days"
          value={stats.dueSoon}
          icon={<Clock className="w-4 h-4 text-amber-500" />}
          valueClass="text-amber-600"
          isActive={statCardFilter === "due-soon"}
          onClick={() => setStatCardFilter(statCardFilter === "due-soon" ? "all" : "due-soon")}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          valueClass="text-emerald-600"
          isActive={statCardFilter === "completed"}
          onClick={() => setStatCardFilter(statCardFilter === "completed" ? "all" : "completed")}
        />
      </div>
      </ScrollReveal>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30 w-56"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as HorizonCategory | "ALL")}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30 bg-white"
        >
          <option value="ALL">All Categories</option>
          {(Object.keys(HORIZON_CATEGORY_LABELS) as HorizonCategory[]).map((c) => (
            <option key={c} value={c}>{HORIZON_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value as HorizonUrgency | "ALL")}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30 bg-white"
        >
          <option value="ALL">All Urgency</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as HorizonStatus | "ALL")}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30 bg-white"
        >
          <option value="ALL">All Statuses</option>
          <option value="MONITORING">Monitoring</option>
          <option value="ACTION_REQUIRED">Action Required</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showDismissed}
            onChange={(e) => setShowDismissed(e.target.checked)}
            className="rounded"
          />
          Show dismissed
        </label>
        {/* View toggle */}
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
          <button
            onClick={() => setViewMode("list")}
            className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              viewMode === "list" ? "bg-updraft-pale-purple/40 text-updraft-deep" : "text-slate-500 hover:text-slate-700")}
          >
            <List size={13} /> List
          </button>
          <button
            onClick={() => setViewMode("matrix")}
            className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              viewMode === "matrix" ? "bg-updraft-pale-purple/40 text-updraft-deep" : "text-slate-500 hover:text-slate-700")}
          >
            <LayoutGrid size={13} /> Matrix
          </button>
        </div>
      </div>

      {/* Urgency × Impact matrix view */}
      {viewMode === "matrix" && (
        <HorizonMatrix items={filteredItems} onItemClick={setSelectedItem} />
      )}

      {/* Grouped item list */}
      {viewMode === "list" && (
      <ScrollReveal delay={80}>
      <div className="space-y-6">
        {URGENCY_ORDER.map((urgency) => {
          const items = groupedItems[urgency];
          if (items.length === 0) return null;
          const styles = URGENCY_SECTION_STYLES[urgency];
          return (
            <div key={urgency}>
              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg mb-3", styles.headerBg)}>
                <span className={cn("w-2 h-2 rounded-full", HORIZON_URGENCY_COLOURS[urgency].dot)} />
                <span className={cn("text-xs font-bold tracking-wider uppercase", styles.headerText)}>
                  {styles.label}
                </span>
                <span className={cn("ml-auto text-xs font-bold px-2 py-0.5 rounded-full", styles.count)}>
                  {items.length}
                </span>
              </div>
              <MotionListDiv className="space-y-2">
                {items.map((item) => (
                  <MotionDiv key={item.id}>
                    <HorizonItemCard item={item} onClick={setSelectedItem} />
                  </MotionDiv>
                ))}
              </MotionListDiv>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Radar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No items match your filters</p>
            <p className="text-sm mt-1">Try adjusting the filters or search term</p>
          </div>
        )}
      </div>
      </ScrollReveal>
      )}

      {/* Detail panel */}
      {selectedItem && (
        <HorizonDetailPanel
          item={selectedItem}
          canManage={canManage}
          canCreateAction={canCreateAction}
          risks={risks}
          onClose={() => setSelectedItem(null)}
          onUpdated={(updated) => {
            useAppStore.getState().updateHorizonItem(updated.id, updated);
            setSelectedItem(updated);
          }}
          onDeleted={(id) => {
            useAppStore.getState().removeHorizonItem(id);
            setSelectedItem(null);
          }}
        />
      )}

      {/* Create dialog */}
      {showCreate && (
        <HorizonFormDialog
          onClose={() => setShowCreate(false)}
          onCreated={(item) => {
            useAppStore.getState().addHorizonItem(item);
            setSelectedItem(item);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

// ── Horizon Urgency × Impact Matrix ──────────────────────────────────────────

const IMPACT_ORDER: HorizonImpact[] = ["HIGH", "MEDIUM", "LOW"];
const MATRIX_URGENCY_ORDER: HorizonUrgency[] = ["HIGH", "MEDIUM", "LOW"];

const MATRIX_CELL_STYLES: Record<HorizonUrgency, Record<HorizonImpact, string>> = {
  HIGH:   { HIGH: "bg-red-50 border-red-200",    MEDIUM: "bg-orange-50 border-orange-200",  LOW: "bg-amber-50 border-amber-200"  },
  MEDIUM: { HIGH: "bg-amber-50 border-amber-200", MEDIUM: "bg-gray-50 border-gray-200",     LOW: "bg-emerald-50 border-emerald-200" },
  LOW:    { HIGH: "bg-sky-50 border-sky-200",     MEDIUM: "bg-emerald-50 border-emerald-200", LOW: "bg-green-50 border-green-200" },
};

const MATRIX_CELL_LABEL: Record<HorizonUrgency, Record<HorizonImpact, string>> = {
  HIGH:   { HIGH: "Act Now",     MEDIUM: "Escalate",   LOW: "Manage" },
  MEDIUM: { HIGH: "Plan Ahead",  MEDIUM: "Monitor",    LOW: "Review" },
  LOW:    { HIGH: "Watch",       MEDIUM: "Track",      LOW: "Background" },
};

function HorizonMatrix({ items, onItemClick }: { items: HorizonItem[]; onItemClick: (item: HorizonItem) => void }) {
  return (
    <div className="bento-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <LayoutGrid className="w-4 h-4 text-updraft-bar" />
        <span className="text-sm font-semibold text-updraft-deep font-poppins">Urgency × Impact Matrix</span>
        <span className="text-xs text-gray-400 ml-1">— {items.length} items plotted</span>
      </div>

      {/* Column headers (Impact axis) */}
      <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-1">
        <div />
        {IMPACT_ORDER.map((impact) => (
          <div key={impact} className="text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 pb-1">
            Impact: {impact}
          </div>
        ))}

        {/* Matrix rows (Urgency axis) */}
        {MATRIX_URGENCY_ORDER.map((urgency) => (
          <>
            <div key={`u-${urgency}`} className="flex items-center justify-end pr-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              {urgency}
            </div>
            {IMPACT_ORDER.map((impact) => {
              const cell = items.filter((h) => h.urgency === urgency && (h.impact ?? "MEDIUM") === impact);
              return (
                <div
                  key={`${urgency}-${impact}`}
                  className={cn("min-h-[80px] rounded-lg border p-2", MATRIX_CELL_STYLES[urgency][impact])}
                >
                  <div className="text-[9px] font-bold uppercase text-gray-400 mb-1">
                    {MATRIX_CELL_LABEL[urgency][impact]}
                    {cell.length > 0 && (
                      <span className="ml-1 rounded-full bg-gray-200 px-1 text-gray-600">{cell.length}</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {cell.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onItemClick(item)}
                        className="w-full text-left rounded px-1.5 py-0.5 text-[10px] text-gray-700 hover:bg-white/70 transition-colors leading-tight"
                        title={item.title}
                      >
                        <span className="font-mono text-gray-400 mr-1">{item.reference}</span>
                        <span className="line-clamp-2">{item.title}</span>
                      </button>
                    ))}
                    {cell.length === 0 && (
                      <div className="text-[9px] text-gray-300 text-center pt-2">—</div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-400">
        <span>↕ Y-axis = Urgency (how soon action is needed)</span>
        <span>↔ X-axis = Impact (magnitude of effect on Updraft)</span>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, valueClass, isActive, onClick }: { label: string; value: number; icon: React.ReactNode; valueClass?: string; isActive?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bento-card p-4 flex items-center gap-3 transition-all",
        onClick && "cursor-pointer hover:shadow-bento-hover hover:-translate-y-0.5",
        isActive && "ring-2 ring-updraft-bright-purple/40 shadow-bento-hover",
      )}
    >
      <div className="shrink-0">{icon}</div>
      <div>
        <AnimatedNumber value={value} className={cn("text-2xl font-bold font-poppins text-updraft-deep", valueClass)} />
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function ChangeFocusPicker({
  items,
  current,
  onSelect,
  onCancel,
}: {
  items: HorizonItem[];
  current: HorizonItem | undefined;
  onSelect: (item: HorizonItem) => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = items.filter(
    (h) =>
      h.status !== "DISMISSED" &&
      h.status !== "COMPLETED" &&
      (h.title.toLowerCase().includes(search.toLowerCase()) || h.reference.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="bento-card p-4 border-2 border-updraft-bright-purple/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-poppins font-semibold text-sm text-updraft-deep">Select item to put in focus</h3>
        <button onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
      </div>
      <input
        type="text"
        placeholder="Search…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-updraft-bright-purple/30"
        autoFocus
      />
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {filtered.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-updraft-pale-purple transition-colors flex items-center gap-2",
              current?.id === item.id && "bg-updraft-pale-purple font-medium"
            )}
          >
            <span className="font-mono text-xs text-slate-400 w-14 shrink-0">{item.reference}</span>
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded shrink-0",
              HORIZON_URGENCY_COLOURS[item.urgency].bg,
              HORIZON_URGENCY_COLOURS[item.urgency].text
            )}>
              {item.urgency}
            </span>
            <span className="truncate text-slate-700">{item.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
