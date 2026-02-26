"use client";

import { useState, useMemo } from "react";
import { Plus, Download, Search, Radar, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useSession } from "next-auth/react";
import type { HorizonItem, HorizonCategory, HorizonUrgency, HorizonStatus } from "@/lib/types";
import { HORIZON_CATEGORY_LABELS, HORIZON_URGENCY_COLOURS } from "@/lib/types";
import { HorizonInFocusSpotlight } from "@/components/horizon/HorizonInFocusSpotlight";
import { HorizonItemCard } from "@/components/horizon/HorizonItemCard";
import { HorizonDetailPanel } from "@/components/horizon/HorizonDetailPanel";
import { HorizonFormDialog } from "@/components/horizon/HorizonFormDialog";
import { cn } from "@/lib/utils";

const URGENCY_ORDER: HorizonUrgency[] = ["HIGH", "MEDIUM", "LOW"];

const URGENCY_SECTION_STYLES: Record<HorizonUrgency, { label: string; headerBg: string; headerText: string; count: string }> = {
  HIGH:   { label: "HIGH URGENCY",   headerBg: "bg-red-50",     headerText: "text-red-700",    count: "bg-red-100 text-red-700"    },
  MEDIUM: { label: "MEDIUM URGENCY", headerBg: "bg-amber-50",   headerText: "text-amber-700",  count: "bg-amber-100 text-amber-700"  },
  LOW:    { label: "LOW URGENCY",    headerBg: "bg-emerald-50", headerText: "text-emerald-700", count: "bg-emerald-100 text-emerald-700" },
};

export default function HorizonScanningPage() {
  const { data: session } = useSession();
  const { horizonItems, risks } = useAppStore();

  const [selectedItem, setSelectedItem] = useState<HorizonItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showChangeFocus, setShowChangeFocus] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<HorizonCategory | "ALL">("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState<HorizonUrgency | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<HorizonStatus | "ALL">("ALL");
  const [showDismissed, setShowDismissed] = useState(false);
  const [search, setSearch] = useState("");

  const userRole = (session?.user as { role?: string } | undefined)?.role ?? "";
  const canManage = userRole === "CCRO_TEAM";

  const inFocusItem = useMemo(() => horizonItems.find((h) => h.inFocus), [horizonItems]);

  const filteredItems = useMemo(() => {
    return horizonItems.filter((item) => {
      if (!showDismissed && item.status === "DISMISSED") return false;
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
      if (urgencyFilter !== "ALL" && item.urgency !== urgencyFilter) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
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
  }, [horizonItems, categoryFilter, urgencyFilter, statusFilter, showDismissed, search]);

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
          canManage={canManage}
          onViewDetail={setSelectedItem}
          onChangeFocus={() => setShowChangeFocus(true)}
        />
      )}

      {/* Change focus picker */}
      {showChangeFocus && canManage && (
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Items" value={stats.total} icon={<Radar className="w-4 h-4 text-updraft-bright-purple" />} />
        <StatCard label="High Urgency" value={stats.high} icon={<AlertTriangle className="w-4 h-4 text-red-500" />} valueClass="text-red-600" />
        <StatCard label="Due Within 30 Days" value={stats.dueSoon} icon={<Clock className="w-4 h-4 text-amber-500" />} valueClass="text-amber-600" />
        <StatCard label="Completed" value={stats.completed} icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} valueClass="text-emerald-600" />
      </div>

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
        <label className="flex items-center gap-1.5 text-sm text-slate-500 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={showDismissed}
            onChange={(e) => setShowDismissed(e.target.checked)}
            className="rounded"
          />
          Show dismissed
        </label>
      </div>

      {/* Grouped item list */}
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
              <div className="space-y-2">
                {items.map((item) => (
                  <HorizonItemCard key={item.id} item={item} onClick={setSelectedItem} />
                ))}
              </div>
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

      {/* Detail panel */}
      {selectedItem && (
        <HorizonDetailPanel
          item={selectedItem}
          canManage={canManage}
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

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, valueClass }: { label: string; value: number; icon: React.ReactNode; valueClass?: string }) {
  return (
    <div className="bento-card p-4 flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div>
        <div className={cn("text-2xl font-bold font-poppins text-updraft-deep", valueClass)}>{value}</div>
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
