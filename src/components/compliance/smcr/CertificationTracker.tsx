"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import {
  CERTIFICATION_STATUS_LABELS,
  CERTIFICATION_STATUS_COLOURS,
  type CertifiedPerson,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Award,
  Clock,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
} from "lucide-react";

export default function CertificationTracker() {
  const certificationFunctions = useAppStore((s) => s.certificationFunctions);
  const certifiedPersons = useAppStore((s) => s.certifiedPersons);
  const users = useAppStore((s) => s.users);
  const [expandedFunctions, setExpandedFunctions] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedFunctions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedFunctions(new Set(certificationFunctions.map((cf) => cf.id)));
  const collapseAll = () => setExpandedFunctions(new Set());

  // Summary metrics
  const metrics = useMemo(() => {
    const total = certifiedPersons.length;
    const current = certifiedPersons.filter((cp) => cp.status === "CURRENT").length;
    const due = certifiedPersons.filter((cp) => cp.status === "DUE").length;
    const overdue = certifiedPersons.filter((cp) => cp.status === "OVERDUE").length;
    return { total, current, due, overdue };
  }, [certifiedPersons]);

  // Group certified persons by function
  const personsByFunction = useMemo(() => {
    const map: Record<string, CertifiedPerson[]> = {};
    for (const cp of certifiedPersons) {
      const key = cp.certificationFunctionId;
      if (!map[key]) map[key] = [];
      map[key].push(cp);
    }
    return map;
  }, [certifiedPersons]);

  const getUserName = (cp: CertifiedPerson): string => {
    if (cp.user) return cp.user.name;
    const user = users.find((u) => u.id === cp.userId);
    return user?.name ?? "Unknown User";
  };

  const getDaysToExpiry = (cp: CertifiedPerson): number | null => {
    if (!cp.expiryDate) return null;
    const now = new Date();
    const expiry = new Date(cp.expiryDate);
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bento-card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <UserCheck size={16} className="text-updraft-deep" />
          </div>
          <p className="text-2xl font-bold font-poppins text-updraft-deep">{metrics.total}</p>
          <p className="text-xs text-gray-500 mt-1">Total Certified</p>
        </div>
        <div className="bento-card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle2 size={16} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold font-poppins text-green-600">{metrics.current}</p>
          <p className="text-xs text-gray-500 mt-1">Current</p>
        </div>
        <div className="bento-card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock size={16} className="text-amber-600" />
          </div>
          <p className={cn("text-2xl font-bold font-poppins", metrics.due > 0 ? "text-amber-600" : "text-gray-400")}>{metrics.due}</p>
          <p className="text-xs text-gray-500 mt-1">Due</p>
        </div>
        <div className="bento-card p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-red-600" />
          </div>
          <p className={cn("text-2xl font-bold font-poppins", metrics.overdue > 0 ? "text-red-600" : "text-gray-400")}>{metrics.overdue}</p>
          <p className="text-xs text-gray-500 mt-1">Overdue</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button onClick={expandAll} className="text-xs text-updraft-bright-purple hover:underline">
          Expand All
        </button>
        <span className="text-gray-300">|</span>
        <button onClick={collapseAll} className="text-xs text-updraft-bright-purple hover:underline">
          Collapse All
        </button>
      </div>

      {/* Function cards */}
      <div className="space-y-3">
        {certificationFunctions.map((cf) => {
          const isExpanded = expandedFunctions.has(cf.id);
          const persons = personsByFunction[cf.id] ?? [];

          return (
            <div key={cf.id} className="bento-card overflow-hidden">
              {/* Header */}
              <button
                onClick={() => toggleExpand(cf.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown size={16} className="text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight size={16} className="text-gray-400 shrink-0" />
                )}
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-updraft-pale-purple text-updraft-deep text-xs font-bold font-mono shrink-0">
                  {cf.cfId}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-updraft-deep font-poppins truncate">{cf.title}</h3>
                  <p className="text-xs text-gray-400 truncate">{cf.description}</p>
                </div>
                {cf.assessmentFrequency && (
                  <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                    {cf.assessmentFrequency}
                  </span>
                )}
                <span className="text-xs text-gray-400 shrink-0">
                  {persons.length} {persons.length === 1 ? "person" : "persons"}
                </span>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  {persons.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50/50">
                            <th className="text-left px-5 py-2 font-medium text-gray-500 text-xs uppercase tracking-wider">Name</th>
                            <th className="text-left px-5 py-2 font-medium text-gray-500 text-xs uppercase tracking-wider">Certified Date</th>
                            <th className="text-left px-5 py-2 font-medium text-gray-500 text-xs uppercase tracking-wider">Expiry Date</th>
                            <th className="text-left px-5 py-2 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                            <th className="text-left px-5 py-2 font-medium text-gray-500 text-xs uppercase tracking-wider">Days to Expiry</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {persons.map((cp) => {
                            const daysToExpiry = getDaysToExpiry(cp);
                            const statusColours = CERTIFICATION_STATUS_COLOURS[cp.status];

                            return (
                              <tr key={cp.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-5 py-3 text-gray-700 font-medium">{getUserName(cp)}</td>
                                <td className="px-5 py-3 text-gray-600">
                                  {cp.certifiedDate ? formatDateShort(cp.certifiedDate) : <span className="text-gray-300">--</span>}
                                </td>
                                <td className="px-5 py-3 text-gray-600">
                                  {cp.expiryDate ? formatDateShort(cp.expiryDate) : <span className="text-gray-300">--</span>}
                                </td>
                                <td className="px-5 py-3">
                                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", statusColours.bg, statusColours.text)}>
                                    {CERTIFICATION_STATUS_LABELS[cp.status]}
                                  </span>
                                </td>
                                <td className="px-5 py-3">
                                  {daysToExpiry !== null ? (
                                    <span className={cn(
                                      "text-sm font-medium",
                                      daysToExpiry < 0 ? "text-red-600" :
                                      daysToExpiry <= 30 ? "text-amber-600" :
                                      "text-gray-600",
                                    )}>
                                      {daysToExpiry < 0 ? `${Math.abs(daysToExpiry)}d overdue` : `${daysToExpiry}d`}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">--</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-5 py-6 text-center">
                      <p className="text-xs text-gray-400">No certified persons for this function.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {certificationFunctions.length === 0 && (
        <div className="bento-card p-12 text-center">
          <Award size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">No certification functions configured yet.</p>
        </div>
      )}
    </div>
  );
}
