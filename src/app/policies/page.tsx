"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { formatDate, cn } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  FileUp,
  Plus,
  Search,
} from "lucide-react";
import type { Policy } from "@/lib/types";
import { POLICY_STATUS_LABELS, POLICY_STATUS_COLOURS } from "@/lib/types";
import PolicyFormDialog from "@/components/policies/PolicyFormDialog";
import PolicyDetailPanel from "@/components/policies/PolicyDetailPanel";
import CSVImportPanel from "@/components/policies/CSVImportPanel";
import PolicyComplianceCharts from "@/components/policies/PolicyComplianceCharts";

type TabKey = "all" | "CURRENT" | "OVERDUE" | "UNDER_REVIEW" | "ARCHIVED";

type SortKey = "reference" | "name" | "owner" | "status" | "nextReviewDate";

export default function PoliciesPage() {
  const hydrated = useAppStore((s) => s._hydrated);
  const currentUser = useAppStore((s) => s.currentUser);
  const policies = useAppStore((s) => s.policies);
  const setPolicies = useAppStore((s) => s.setPolicies);
  const users = useAppStore((s) => s.users);

  const isCCRO = currentUser?.role === "CCRO_TEAM";

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("reference");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Summary stats
  const stats = useMemo(() => {
    const overdue = policies.filter((p) => p.status === "OVERDUE").length;
    const dueSoon = policies.filter((p) => {
      if (p.status === "OVERDUE") return false;
      if (!p.nextReviewDate) return false;
      const days = Math.ceil((new Date(p.nextReviewDate).getTime() - Date.now()) / 86400000);
      return days >= 0 && days <= 30;
    }).length;
    return {
      total: policies.length,
      current: policies.filter((p) => p.status === "CURRENT").length,
      overdue,
      underReview: policies.filter((p) => p.status === "UNDER_REVIEW").length,
      dueSoon,
    };
  }, [policies]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let items = [...policies];

    // Tab filter
    if (tab !== "all") items = items.filter((p) => p.status === tab);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((p) =>
        p.reference.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.owner?.name ?? "").toLowerCase().includes(q)
      );
    }

    // Sort
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "reference": cmp = a.reference.localeCompare(b.reference); break;
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "owner": cmp = (a.owner?.name ?? "").localeCompare(b.owner?.name ?? ""); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "nextReviewDate": cmp = (a.nextReviewDate ?? "").localeCompare(b.nextReviewDate ?? ""); break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return items;
  }, [policies, tab, search, sortBy, sortDir]);

  function handleSort(key: SortKey) {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("asc"); }
  }

  function getControlsPassRate(policy: Policy): { pass: number; total: number } | null {
    const links = policy.controlLinks ?? [];
    if (links.length === 0) return null;
    let pass = 0;
    for (const link of links) {
      const ctrl = link.control;
      if (!ctrl) continue;
      const schedule = ctrl.testingSchedule;
      const results = schedule?.testResults ?? [];
      if (results.length > 0 && results[results.length - 1].result === "PASS") pass++;
    }
    return { pass, total: links.length };
  }

  async function handleCreatePolicy(policy: Policy) {
    try {
      const created = await api<Policy>("/api/policies", {
        method: "POST",
        body: {
          name: policy.name,
          description: policy.description,
          status: policy.status,
          version: policy.version,
          ownerId: policy.ownerId,
          approvedBy: policy.approvedBy,
          classification: policy.classification,
          reviewFrequencyDays: policy.reviewFrequencyDays,
          lastReviewedDate: policy.lastReviewedDate,
          nextReviewDate: policy.nextReviewDate,
          effectiveDate: policy.effectiveDate,
          scope: policy.scope,
          applicability: policy.applicability,
          exceptions: policy.exceptions,
          relatedPolicies: policy.relatedPolicies,
          storageUrl: policy.storageUrl,
        },
      });
      setPolicies([created, ...policies]);
      toast.success(`Policy ${created.reference} created`);
    } catch {
      toast.error("Failed to create policy");
    }
  }

  function handlePolicyPanelUpdate(updated: Policy) {
    setPolicies(policies.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedPolicy(updated);
  }

  async function handleImported() {
    try {
      const fresh = await api<Policy[]>("/api/policies");
      setPolicies(fresh);
    } catch {
      toast.error("Failed to refresh policies after import");
    }
  }

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-updraft-bright-purple border-t-transparent" />
          <p className="text-sm text-gray-500">Loading policies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gradient Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-updraft-deep to-updraft-bar p-8 text-white">
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 opacity-10">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="80" stroke="white" strokeWidth="2" />
            <circle cx="100" cy="100" r="50" stroke="white" strokeWidth="2" />
            <circle cx="100" cy="100" r="20" stroke="white" strokeWidth="2" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-1/3 opacity-5">
          <svg width="160" height="80" viewBox="0 0 160 80" fill="none">
            <circle cx="40" cy="40" r="40" fill="white" />
            <circle cx="120" cy="40" r="40" fill="white" />
          </svg>
        </div>

        <div className="relative flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold font-poppins">Policy Review</h1>
            <p className="text-white/70 text-sm mt-1">Manage policies, regulatory mappings, and obligations</p>
            {/* Notification pills */}
            <div className="flex items-center gap-2 mt-3">
              {stats.overdue > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <AlertTriangle size={12} />
                  {stats.overdue} overdue
                </span>
              )}
              {stats.dueSoon > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <Clock size={12} />
                  {stats.dueSoon} due within 30 days
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCCRO && (
              <>
                <button
                  onClick={() => setShowImport(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                >
                  <FileUp size={14} />
                  Import CSV
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-white text-updraft-deep px-4 py-2 text-sm font-medium hover:bg-white/90 transition-colors"
                >
                  <Plus size={14} />
                  New Policy
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button onClick={() => setTab("all")} className={cn(
          "bento-card p-4 text-left transition-all",
          tab === "all" && "ring-2 ring-updraft-bright-purple"
        )}>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="rounded-lg bg-updraft-pale-purple/40 p-2">
              <BookOpen size={16} className="text-updraft-bright-purple" />
            </div>
            <p className="text-xs font-medium text-gray-500">Total Policies</p>
          </div>
          <p className="text-3xl font-bold font-poppins text-updraft-deep">{stats.total}</p>
        </button>

        <button onClick={() => setTab("CURRENT")} className={cn(
          "bento-card p-4 text-left transition-all",
          tab === "CURRENT" && "ring-2 ring-green-400"
        )}>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle2 size={16} className="text-green-600" />
            </div>
            <p className="text-xs font-medium text-gray-500">Current</p>
          </div>
          <p className="text-3xl font-bold font-poppins text-green-700">{stats.current}</p>
          {stats.total > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">{Math.round((stats.current / stats.total) * 100)}% of total</p>
          )}
        </button>

        <button onClick={() => setTab("OVERDUE")} className={cn(
          "bento-card p-4 text-left transition-all",
          tab === "OVERDUE" && "ring-2 ring-red-400"
        )}>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="rounded-lg bg-red-100 p-2">
              <AlertTriangle size={16} className="text-red-600" />
            </div>
            <p className="text-xs font-medium text-gray-500">Overdue</p>
          </div>
          <p className="text-3xl font-bold font-poppins text-red-700">{stats.overdue}</p>
          {stats.total > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">{Math.round((stats.overdue / stats.total) * 100)}% of total</p>
          )}
        </button>

        <button onClick={() => setTab("UNDER_REVIEW")} className={cn(
          "bento-card p-4 text-left transition-all",
          tab === "UNDER_REVIEW" && "ring-2 ring-amber-400"
        )}>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="rounded-lg bg-amber-100 p-2">
              <Clock size={16} className="text-amber-600" />
            </div>
            <p className="text-xs font-medium text-gray-500">Under Review</p>
          </div>
          <p className="text-3xl font-bold font-poppins text-amber-700">{stats.underReview}</p>
          {stats.total > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">{Math.round((stats.underReview / stats.total) * 100)}% of total</p>
          )}
        </button>
      </div>

      {/* Compliance Charts */}
      <PolicyComplianceCharts policies={policies} />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {([
          { key: "all" as TabKey, label: "All" },
          { key: "CURRENT" as TabKey, label: "Current" },
          { key: "OVERDUE" as TabKey, label: "Overdue" },
          { key: "UNDER_REVIEW" as TabKey, label: "Under Review" },
          { key: "ARCHIVED" as TabKey, label: "Archived" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.key ? "border-updraft-bright-purple text-updraft-deep" : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reference, name, owner..."
          className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
        />
      </div>

      {/* Table */}
      <div className="bento-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs w-6"></th>
              <SortHeader label="Reference" sortKey="reference" current={sortBy} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Name" sortKey="name" current={sortBy} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Owner" sortKey="owner" current={sortBy} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Status" sortKey="status" current={sortBy} dir={sortDir} onSort={handleSort} />
              <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs">Controls</th>
              <SortHeader label="Next Review" sortKey="nextReviewDate" current={sortBy} dir={sortDir} onSort={handleSort} />
              <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs">Last Reviewed</th>
              <th className="text-right py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="py-12 text-center text-sm text-gray-400">No policies found</td></tr>
            )}
            {filtered.map((p) => {
              const sc = POLICY_STATUS_COLOURS[p.status];
              const owner = p.owner ?? users.find((u) => u.id === p.ownerId);
              const passRate = getControlsPassRate(p);
              const reviewDays = p.nextReviewDate ? Math.ceil((new Date(p.nextReviewDate).getTime() - Date.now()) / 86400000) : null;

              // Status dot colour
              const dotColour = p.status === "OVERDUE" ? "bg-red-500" :
                p.status === "CURRENT" ? "bg-green-500" :
                p.status === "UNDER_REVIEW" ? "bg-amber-500" :
                "bg-gray-400";

              return (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPolicy(p)}
                  className="border-b border-gray-100 hover:bg-updraft-pale-purple/20 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3">
                    <span className={cn("inline-block w-2.5 h-2.5 rounded-full", dotColour)} />
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center rounded bg-updraft-pale-purple/30 px-1.5 py-0.5 font-mono text-xs font-bold text-updraft-deep">{p.reference}</span>
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-800 max-w-[200px] truncate">{p.name}</td>
                  <td className="py-3 px-3 text-xs text-gray-600">{owner?.name ?? "—"}</td>
                  <td className="py-3 px-3">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", sc.bg, sc.text)}>
                      {POLICY_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {passRate ? (
                      <span className="text-xs text-gray-600">{passRate.pass}/{passRate.total} pass</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {p.nextReviewDate ? (
                      <span className={cn("text-xs",
                        reviewDays !== null && reviewDays < 0 ? "text-red-600 font-bold" :
                        reviewDays !== null && reviewDays <= 30 ? "text-amber-600 font-semibold" :
                        "text-gray-500 font-medium"
                      )}>
                        {new Date(p.nextReviewDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-500">
                    {p.lastReviewedDate ? formatDate(p.lastReviewedDate) : "—"}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <ChevronRight size={14} className="text-gray-400" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Form Dialog */}
      <PolicyFormDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleCreatePolicy}
      />

      {/* Import Panel */}
      <CSVImportPanel
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={handleImported}
      />

      {/* Detail Panel */}
      {selectedPolicy && (
        <PolicyDetailPanel
          policy={selectedPolicy}
          onClose={() => setSelectedPolicy(null)}
          onUpdate={handlePolicyPanelUpdate}
        />
      )}
    </div>
  );
}

function SortHeader({ label, sortKey, current, dir, onSort }: { label: string; sortKey: SortKey; current: SortKey; dir: "asc" | "desc"; onSort: (key: SortKey) => void }) {
  return (
    <th className="text-left py-2 px-3">
      <button onClick={() => onSort(sortKey)} className="flex items-center gap-1 font-medium text-gray-500 text-xs hover:text-gray-700">
        {label}
        {current === sortKey && <span className="text-updraft-bright-purple">{dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}
