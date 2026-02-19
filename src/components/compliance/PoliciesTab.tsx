"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { usePermissionSet } from "@/lib/usePermission";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { formatDateShort, cn, naturalCompare } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  FileUp,
  Plus,
  Search,
  X,
} from "lucide-react";
import type { Policy, PolicyStatus } from "@/lib/types";
import {
  POLICY_STATUS_LABELS,
  POLICY_STATUS_COLOURS,
} from "@/lib/types";
import PolicyFormDialog from "@/components/policies/PolicyFormDialog";
import PolicyDetailPanel from "@/components/policies/PolicyDetailPanel";
import CSVImportPanel from "@/components/policies/CSVImportPanel";

type StatusFilter = "all" | PolicyStatus;
type SortKey = "reference" | "name" | "version" | "status" | "owner" | "approvingBody" | "nextReviewDate" | "regulations";

export default function PoliciesTab() {
  const policies = useAppStore((s) => s.policies);
  const setPolicies = useAppStore((s) => s.setPolicies);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const permissionSet = usePermissionSet();

  const canCreate = permissionSet.has("edit:compliance") || currentUser?.role === "CCRO_TEAM";

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("reference");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Summary stats
  const stats = useMemo(() => {
    const overdue = policies.filter((p) => p.status === "OVERDUE").length;
    const dueSoon = policies.filter((p) => {
      if (p.status === "OVERDUE") return false;
      if (!p.nextReviewDate) return false;
      const days = Math.ceil(
        (new Date(p.nextReviewDate).getTime() - Date.now()) / 86400000
      );
      return days >= 0 && days <= 30;
    }).length;
    return {
      total: policies.length,
      current: policies.filter((p) => p.status === "CURRENT").length,
      overdue,
      underReview: policies.filter((p) => p.status === "UNDER_REVIEW").length,
      archived: policies.filter((p) => p.status === "ARCHIVED").length,
      dueSoon,
    };
  }, [policies]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let items = [...policies];

    // Status filter
    if (statusFilter !== "all") {
      items = items.filter((p) => p.status === statusFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (p) =>
          p.reference.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.owner?.name ?? "").toLowerCase().includes(q) ||
          (p.approvingBody ?? "").toLowerCase().includes(q)
      );
    }

    // Sort
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "reference":
          cmp = naturalCompare(a.reference, b.reference);
          break;
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "version":
          cmp = a.version.localeCompare(b.version);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "owner":
          cmp = (a.owner?.name ?? "").localeCompare(b.owner?.name ?? "");
          break;
        case "approvingBody":
          cmp = (a.approvingBody ?? "").localeCompare(b.approvingBody ?? "");
          break;
        case "nextReviewDate":
          cmp = (a.nextReviewDate ?? "").localeCompare(b.nextReviewDate ?? "");
          break;
        case "regulations":
          cmp =
            (a.regulatoryLinks?.length ?? 0) -
            (b.regulatoryLinks?.length ?? 0);
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return items;
  }, [policies, statusFilter, search, sortBy, sortDir]);

  function handleSort(key: SortKey) {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
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

  return (
    <div className="space-y-6">
      {/* Summary stats + actions */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {stats.overdue > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
              <AlertTriangle size={12} />
              {stats.overdue} overdue
            </span>
          )}
          {stats.dueSoon > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              <Clock size={12} />
              {stats.dueSoon} due within 30 days
            </span>
          )}
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
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
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard
          label="Total"
          value={stats.total}
          icon={BookOpen}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
          iconBg="bg-updraft-pale-purple/40"
          iconColour="text-updraft-bright-purple"
          valueColour="text-updraft-deep"
        />
        <SummaryCard
          label="Current"
          value={stats.current}
          icon={CheckCircle2}
          active={statusFilter === "CURRENT"}
          onClick={() => setStatusFilter("CURRENT")}
          iconBg="bg-green-100"
          iconColour="text-green-600"
          valueColour="text-green-700"
        />
        <SummaryCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          active={statusFilter === "OVERDUE"}
          onClick={() => setStatusFilter("OVERDUE")}
          iconBg="bg-red-100"
          iconColour="text-red-600"
          valueColour="text-red-700"
        />
        <SummaryCard
          label="Under Review"
          value={stats.underReview}
          icon={Clock}
          active={statusFilter === "UNDER_REVIEW"}
          onClick={() => setStatusFilter("UNDER_REVIEW")}
          iconBg="bg-amber-100"
          iconColour="text-amber-600"
          valueColour="text-amber-700"
        />
        <SummaryCard
          label="Archived"
          value={stats.archived}
          icon={BookOpen}
          active={statusFilter === "ARCHIVED"}
          onClick={() => setStatusFilter("ARCHIVED")}
          iconBg="bg-gray-100"
          iconColour="text-gray-500"
          valueColour="text-gray-600"
        />
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, name, owner, approving body..."
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400">
          {filtered.length} of {policies.length} policies
        </p>
      </div>

      {/* Table */}
      <div className="bento-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs w-6" />
              <SortHeader
                label="Reference"
                sortKey="reference"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Title"
                sortKey="name"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Version"
                sortKey="version"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Status"
                sortKey="status"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Owner"
                sortKey="owner"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Approving Body"
                sortKey="approvingBody"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Review Date"
                sortKey="nextReviewDate"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Regulations"
                sortKey="regulations"
                current={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <th className="text-right py-2 px-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="py-12 text-center text-sm text-gray-400">
                  No policies found
                </td>
              </tr>
            )}
            {filtered.map((p) => {
              const sc = POLICY_STATUS_COLOURS[p.status];
              const owner = p.owner ?? users.find((u) => u.id === p.ownerId);
              const regsCount = p.regulatoryLinks?.length ?? 0;
              const reviewDays = p.nextReviewDate
                ? Math.ceil(
                    (new Date(p.nextReviewDate).getTime() - Date.now()) /
                      86400000
                  )
                : null;

              const dotColour =
                p.status === "OVERDUE"
                  ? "bg-red-500"
                  : p.status === "CURRENT"
                  ? "bg-green-500"
                  : p.status === "UNDER_REVIEW"
                  ? "bg-amber-500"
                  : "bg-gray-400";

              return (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPolicy(p)}
                  className="border-b border-gray-100 hover:bg-updraft-pale-purple/20 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "inline-block w-2.5 h-2.5 rounded-full",
                        dotColour
                      )}
                    />
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center rounded bg-updraft-pale-purple/30 px-1.5 py-0.5 font-mono text-xs font-bold text-updraft-deep">
                      {p.reference}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-800 max-w-[200px] truncate">
                    {p.name}
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-500 font-mono">
                    {p.version}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        sc.bg,
                        sc.text
                      )}
                    >
                      {POLICY_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-600">
                    {owner?.name ?? "\u2014"}
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-600">
                    {p.approvingBody ?? "\u2014"}
                  </td>
                  <td className="py-3 px-3">
                    {p.nextReviewDate ? (
                      <span
                        className={cn(
                          "text-xs",
                          reviewDays !== null && reviewDays < 0
                            ? "text-red-600 font-bold"
                            : reviewDays !== null && reviewDays <= 30
                            ? "text-amber-600 font-semibold"
                            : "text-gray-500 font-medium"
                        )}
                      >
                        {formatDateShort(p.nextReviewDate)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">{"\u2014"}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={cn(
                        "text-xs",
                        regsCount > 0
                          ? "text-gray-700 font-medium"
                          : "text-gray-300"
                      )}
                    >
                      {regsCount}
                    </span>
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

// ── Summary Card ──────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon: Icon,
  active,
  onClick,
  iconBg,
  iconColour,
  valueColour,
}: {
  label: string;
  value: number;
  icon: typeof BookOpen;
  active: boolean;
  onClick: () => void;
  iconBg: string;
  iconColour: string;
  valueColour: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "bento-card p-4 text-left transition-all",
        active && "ring-2 ring-updraft-bright-purple"
      )}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className={cn("rounded-lg p-2", iconBg)}>
          <Icon size={16} className={iconColour} />
        </div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className={cn("text-2xl font-bold font-poppins", valueColour)}>
        {value}
      </p>
    </button>
  );
}

// ── Sort Header ───────────────────────────────────────────────────

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  return (
    <th className="text-left py-2 px-3">
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 font-medium text-gray-500 text-xs hover:text-gray-700"
      >
        {label}
        {current === sortKey && (
          <span className="text-updraft-bright-purple">
            {dir === "asc" ? "\u2191" : "\u2193"}
          </span>
        )}
      </button>
    </th>
  );
}
