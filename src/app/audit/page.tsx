"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import RoleGuard from "@/components/common/RoleGuard";
import { cn, formatDate } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { usePageTitle } from "@/lib/usePageTitle";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create_report: { label: "Create Report", color: "bg-green-100 text-green-700" },
  save_report: { label: "Save Report", color: "bg-blue-100 text-blue-700" },
  publish_report: { label: "Publish Report", color: "bg-purple-100 text-purple-700" },
  edit_section: { label: "Edit Section", color: "bg-blue-100 text-blue-700" },
  add_section: { label: "Add Section", color: "bg-indigo-100 text-indigo-700" },
  delete_section: { label: "Delete Section", color: "bg-red-100 text-red-700" },
  update_mi: { label: "Update MI", color: "bg-emerald-100 text-emerald-700" },
  change_rag: { label: "Change RAG", color: "bg-amber-100 text-amber-700" },
  create_template: { label: "Create Template", color: "bg-green-100 text-green-700" },
  update_template: { label: "Update Template", color: "bg-blue-100 text-blue-700" },
  delete_template: { label: "Delete Template", color: "bg-red-100 text-red-700" },
  duplicate_template: { label: "Duplicate Template", color: "bg-teal-100 text-teal-700" },
  import_component: { label: "Import Component", color: "bg-cyan-100 text-cyan-700" },
  delete_component: { label: "Delete Component", color: "bg-red-100 text-red-700" },
  duplicate_component: { label: "Duplicate Component", color: "bg-teal-100 text-teal-700" },
  add_user: { label: "Add User", color: "bg-green-100 text-green-700" },
  update_user: { label: "Update User", color: "bg-blue-100 text-blue-700" },
  toggle_user_status: { label: "Toggle User Status", color: "bg-amber-100 text-amber-700" },
};

const ROLE_LABELS: Record<Role, string> = {
  CCRO_TEAM: "CCRO Team",
  OWNER: "Owner",
  VIEWER: "Viewer",
};

function actionBadge(action: string) {
  const config = ACTION_LABELS[action] ?? { label: action.replace(/_/g, " "), color: "bg-gray-100 text-gray-600" };
  return config;
}

// Map entity types to navigable routes
function getEntityLink(entityType: string, entityId: string | null, reportId: string | null): string | null {
  if (reportId) return `/reports/${reportId}`;
  if (!entityId) return null;
  switch (entityType) {
    case "report": return `/reports/${entityId}`;
    case "action": return `/actions?highlight=${entityId}`;
    case "risk": return `/risk-register`;
    case "template": return `/settings`;
    case "component": return `/settings`;
    case "control": return `/controls`;
    case "user": return `/users`;
    default: return null;
  }
}

export default function AuditPage() {
  usePageTitle("Audit Trail");
  const router = useRouter();
  const auditLogs = useAppStore((s) => s.auditLogs);
  const reports = useAppStore((s) => s.reports);
  const users = useAppStore((s) => s.users);

  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [showFilters, setShowFilters] = useState(false);
  const [statFilter, setStatFilter] = useState<"all" | "reports">("all");

  const uniqueActions = useMemo(
    () => Array.from(new Set(auditLogs.map((l) => l.action))),
    [auditLogs]
  );

  const filteredLogs = useMemo(() => {
    let logs = auditLogs;

    if (statFilter === "reports") {
      logs = logs.filter((l) => l.reportId);
    }
    if (actionFilter !== "ALL") {
      logs = logs.filter((l) => l.action === actionFilter);
    }
    if (roleFilter !== "ALL") {
      logs = logs.filter((l) => l.userRole === roleFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      logs = logs.filter((l) => {
        const user = users.find((u) => u.id === l.userId);
        return (
          (user?.name ?? "").toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.entityType.toLowerCase().includes(q) ||
          (l.entityId ?? "").toLowerCase().includes(q)
        );
      });
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLogs, users, actionFilter, roleFilter, searchQuery, statFilter]);

  return (
    <RoleGuard allowedRoles={["CCRO_TEAM"]}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-updraft-pale-purple/40 p-2.5">
            <ClipboardList className="h-6 w-6 text-updraft-bright-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-updraft-deep font-poppins">Audit Trail</h1>
            <p className="text-sm text-fca-gray mt-0.5">Complete history of all changes for FCA compliance</p>
          </div>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setStatFilter("all")}
          className={cn(
            "bento-card cursor-pointer transition-all hover:shadow-bento-hover hover:-translate-y-0.5",
            statFilter === "all" && "ring-2 ring-updraft-bright-purple/40",
          )}
        >
          <p className="text-xs text-fca-gray">Total Events</p>
          <p className="text-2xl font-bold text-updraft-deep mt-1">{auditLogs.length}</p>
        </div>
        <div className="bento-card">
          <p className="text-xs text-fca-gray">Unique Users</p>
          <p className="text-2xl font-bold text-updraft-deep mt-1">
            {new Set(auditLogs.map((l) => l.userId)).size}
          </p>
        </div>
        <div
          onClick={() => setStatFilter(statFilter === "reports" ? "all" : "reports")}
          className={cn(
            "bento-card cursor-pointer transition-all hover:shadow-bento-hover hover:-translate-y-0.5",
            statFilter === "reports" && "ring-2 ring-updraft-bright-purple/40",
          )}
        >
          <p className="text-xs text-fca-gray">Reports Affected</p>
          <p className="text-2xl font-bold text-updraft-deep mt-1">
            {new Set(auditLogs.filter((l) => l.reportId).map((l) => l.reportId)).size}
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search audit logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            showFilters
              ? "border-updraft-light-purple bg-updraft-pale-purple/20 text-updraft-deep"
              : "border-gray-200 text-gray-700 hover:bg-gray-50"
          )}
        >
          <Filter size={14} />
          Filters
          <ChevronDown size={12} className={cn("transition-transform", showFilters && "rotate-180")} />
        </button>
      </div>

      {showFilters && (
        <div className="bento-card animate-fade-in flex items-center gap-4 flex-wrap">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-updraft-light-purple"
            >
              <option value="ALL">All Actions</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>{actionBadge(a).label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-updraft-light-purple"
            >
              <option value="ALL">All Roles</option>
              <option value="CCRO_TEAM">CCRO Team</option>
              <option value="OWNER">Owner</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
          <button
            onClick={() => {
              setActionFilter("ALL");
              setRoleFilter("ALL");
              setSearchQuery("");
            }}
            className="mt-auto text-xs text-updraft-bright-purple hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Audit log table */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                  <div className="flex items-center gap-1"><Calendar size={14} /> Timestamp</div>
                </th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                  <div className="flex items-center gap-1"><User size={14} /> User</div>
                </th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Role</th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Entity</th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Report</th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Changes</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const user = users.find((u) => u.id === log.userId);
                const report = log.reportId ? reports.find((r) => r.id === log.reportId) : null;
                const badge = actionBadge(log.action);
                return (
                  <tr
                    key={log.id}
                    className={cn(
                      "border-b border-gray-100 last:border-b-0 transition-colors",
                      getEntityLink(log.entityType, log.entityId, log.reportId)
                        ? "hover:bg-updraft-pale-purple/20 cursor-pointer"
                        : "hover:bg-gray-50/50",
                    )}
                    onClick={() => {
                      const link = getEntityLink(log.entityType, log.entityId, log.reportId);
                      if (link) router.push(link);
                    }}
                  >
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{user?.name ?? log.userId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">{ROLE_LABELS[log.userRole] ?? log.userRole}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold", badge.color)}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">{log.entityType}</span>
                        {log.entityId && <span className="text-xs text-gray-400">({log.entityId})</span>}
                        {getEntityLink(log.entityType, log.entityId, log.reportId) && (
                          <ExternalLink size={10} className="text-updraft-bright-purple shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {report ? `${report.title} — ${report.period}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {log.changes ? (
                        <div className="text-xs text-gray-500 max-w-[200px] truncate">
                          {Object.entries(log.changes).map(([k, v]) => (
                            <span key={k} className="mr-2">
                              <span className="font-medium text-gray-600">{k}:</span> {String(v)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No audit entries found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </div>
    </RoleGuard>
  );
}
