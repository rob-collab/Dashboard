"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { formatDate, cn } from "@/lib/utils";
import { BookOpen, ChevronRight, FileUp, Plus, Search } from "lucide-react";
import type { Policy } from "@/lib/types";
import { POLICY_STATUS_LABELS, POLICY_STATUS_COLOURS } from "@/lib/types";
import PolicyFormDialog from "@/components/policies/PolicyFormDialog";
import PolicyDetailPanel from "@/components/policies/PolicyDetailPanel";
import CSVImportPanel from "@/components/policies/CSVImportPanel";

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
  const stats = useMemo(() => ({
    total: policies.length,
    current: policies.filter((p) => p.status === "CURRENT").length,
    overdue: policies.filter((p) => p.status === "OVERDUE").length,
    underReview: policies.filter((p) => p.status === "UNDER_REVIEW").length,
  }), [policies]);

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
    } catch { /* ignore */ }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-updraft-deep font-poppins">Policy Review</h1>
          <p className="text-sm text-gray-500 mt-1">Manage policies, regulatory mappings, and obligations</p>
        </div>
        <div className="flex items-center gap-2">
          {isCCRO && (
            <>
              <button
                onClick={() => setShowImport(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FileUp size={14} />
                Import CSV
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-updraft-deep text-white px-4 py-2 text-sm font-medium hover:bg-updraft-bar transition-colors"
              >
                <Plus size={14} />
                New Policy
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button onClick={() => setTab("all")} className="rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-updraft-bright-purple transition-colors">
          <div className="flex items-center gap-2 mb-1"><BookOpen size={14} className="text-updraft-bright-purple" /><p className="text-xs text-gray-500">Total Policies</p></div>
          <p className="text-2xl font-bold font-poppins text-updraft-deep">{stats.total}</p>
        </button>
        <button onClick={() => setTab("CURRENT")} className="rounded-xl border border-green-200 bg-green-50 p-3 text-left hover:border-green-400 transition-colors">
          <p className="text-xs text-gray-500">Current</p>
          <p className="text-2xl font-bold font-poppins text-green-700">{stats.current}</p>
        </button>
        <button onClick={() => setTab("OVERDUE")} className="rounded-xl border border-red-200 bg-red-50 p-3 text-left hover:border-red-400 transition-colors">
          <p className="text-xs text-gray-500">Overdue</p>
          <p className="text-2xl font-bold font-poppins text-red-700">{stats.overdue}</p>
        </button>
        <button onClick={() => setTab("UNDER_REVIEW")} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-left hover:border-amber-400 transition-colors">
          <p className="text-xs text-gray-500">Under Review</p>
          <p className="text-2xl font-bold font-poppins text-amber-700">{stats.underReview}</p>
        </button>
      </div>

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
              <tr><td colSpan={8} className="py-12 text-center text-sm text-gray-400">No policies found</td></tr>
            )}
            {filtered.map((p) => {
              const sc = POLICY_STATUS_COLOURS[p.status];
              const owner = p.owner ?? users.find((u) => u.id === p.ownerId);
              const passRate = getControlsPassRate(p);
              const reviewDays = p.nextReviewDate ? Math.ceil((new Date(p.nextReviewDate).getTime() - Date.now()) / 86400000) : null;

              return (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPolicy(p)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3 font-mono text-xs font-bold text-updraft-deep">{p.reference}</td>
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
                      <span className={cn("text-xs font-medium",
                        reviewDays !== null && reviewDays < 0 ? "text-red-600" :
                        reviewDays !== null && reviewDays <= 30 ? "text-amber-600" :
                        "text-gray-500"
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
