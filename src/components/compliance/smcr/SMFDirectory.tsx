"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { usePermissionSet } from "@/lib/usePermission";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import {
  SMF_STATUS_LABELS,
  SMF_STATUS_COLOURS,
  type SMFRole,
  type SMFStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/utils";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Shield,
  User as UserIcon,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Scale,
  ExternalLink,
  Loader2,
} from "lucide-react";

export default function SMFDirectory() {
  const smfRoles = useAppStore((s) => s.smfRoles);
  const prescribedResponsibilities = useAppStore((s) => s.prescribedResponsibilities);
  const users = useAppStore((s) => s.users);
  const setSmfRoles = useAppStore((s) => s.setSmfRoles);
  const permissionSet = usePermissionSet();
  const canManage = permissionSet.has("manage:smcr");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHolder, setEditHolder] = useState("");
  const [editStatus, setEditStatus] = useState<SMFStatus>("ACTIVE");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const responsibilityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const pr of prescribedResponsibilities) {
      if (pr.assignedSMFId) {
        counts[pr.assignedSMFId] = (counts[pr.assignedSMFId] ?? 0) + 1;
      }
    }
    return counts;
  }, [prescribedResponsibilities]);

  const startEdit = (role: SMFRole) => {
    setEditingId(role.id);
    setEditHolder(role.currentHolderId ?? "");
    setEditStatus(role.status);
    setEditNotes(role.notes ?? "");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (roleId: string) => {
    setSaving(true);
    try {
      const updated = await api<SMFRole>(`/api/compliance/smcr/roles/${roleId}`, {
        method: "PATCH",
        body: {
          currentHolderId: editHolder || null,
          status: editStatus,
          notes: editNotes || null,
        },
      });
      setSmfRoles(smfRoles.map((r) => (r.id === roleId ? { ...r, ...updated } : r)));
      setEditingId(null);
      toast.success("Role saved");
    } catch {
      toast.error("Failed to save role — please try again");
    } finally {
      setSaving(false);
    }
  };

  const getHolderName = (role: SMFRole): string | null => {
    if (role.currentHolder) return role.currentHolder.name;
    if (role.currentHolderId) {
      const user = users.find((u) => u.id === role.currentHolderId);
      return user?.name ?? null;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bento-card p-4 text-center">
          <p className="text-2xl font-bold font-poppins text-green-600">
            <AnimatedNumber value={smfRoles.filter((r) => r.status === "ACTIVE").length} />
          </p>
          <p className="text-xs text-gray-500 mt-1">Active Roles</p>
        </div>
        <div className="bento-card p-4 text-center">
          <p className={cn("text-2xl font-bold font-poppins", smfRoles.some((r) => r.status === "VACANT") ? "text-red-600" : "text-green-600")}>
            <AnimatedNumber value={smfRoles.filter((r) => r.status === "VACANT").length} />
          </p>
          <p className="text-xs text-gray-500 mt-1">Vacant Roles</p>
        </div>
        <div className="bento-card p-4 text-center">
          <p className="text-2xl font-bold font-poppins text-amber-600">
            <AnimatedNumber value={smfRoles.filter((r) => r.status === "PENDING_APPROVAL").length} />
          </p>
          <p className="text-xs text-gray-500 mt-1">Pending Approval</p>
        </div>
        <div className="bento-card p-4 text-center">
          <p className="text-2xl font-bold font-poppins text-gray-400">
            <AnimatedNumber value={smfRoles.filter((r) => r.status === "NOT_REQUIRED").length} />
          </p>
          <p className="text-xs text-gray-500 mt-1">Not Required</p>
        </div>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {smfRoles.map((role) => {
          const holderName = getHolderName(role);
          const statusColours = SMF_STATUS_COLOURS[role.status];
          const prCount = responsibilityCounts[role.id] ?? 0;
          const isEditing = editingId === role.id;

          return (
            <div key={role.id} className="bento-card p-5 flex flex-col gap-3">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={cn("inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold", statusColours.bg, statusColours.text)}>
                    {role.smfId}
                  </span>
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", statusColours.bg, statusColours.text)}>
                    {SMF_STATUS_LABELS[role.status]}
                  </span>
                </div>
                {role.fitsUpdraft && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-updraft-bright-purple bg-updraft-pale-purple px-2 py-0.5 rounded-full font-medium">
                    <Sparkles size={10} /> Fits Updraft
                  </span>
                )}
              </div>

              {/* Title */}
              <div>
                <h3 className="text-sm font-semibold text-updraft-deep font-poppins leading-tight">{role.title}</h3>
                {role.shortTitle && (
                  <p className="text-xs text-gray-400 mt-0.5">{role.shortTitle}</p>
                )}
              </div>

              {/* Holder */}
              <div className="flex items-center gap-2">
                <UserIcon size={14} className="text-gray-400 shrink-0" />
                {holderName ? (
                  <span className="text-sm text-gray-700">{holderName}</span>
                ) : (
                  <span className="text-sm text-red-600 font-medium flex items-center gap-1">
                    <AlertTriangle size={12} /> Vacant
                  </span>
                )}
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {role.appointmentDate && (
                  <span>Appointed: {formatDateShort(role.appointmentDate)}</span>
                )}
                <span>{prCount} prescribed {prCount === 1 ? "responsibility" : "responsibilities"}</span>
              </div>

              {/* Key duties */}
              {role.keyDuties && (
                <p className="text-xs text-gray-500 line-clamp-2">{role.keyDuties}</p>
              )}

              {/* Regulatory basis */}
              {role.regulatoryBasis && (
                <div className="flex items-start gap-1.5 text-xs text-gray-500">
                  <Scale size={11} className="text-updraft-bright-purple shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{role.regulatoryBasis}</span>
                </div>
              )}

              {/* Prescribed responsibilities — inline preview */}
              {prCount > 0 && (() => {
                const rolePRs = prescribedResponsibilities
                  .filter((pr) => pr.assignedSMFId === role.id)
                  .slice(0, 2);
                return (
                  <div className="border-t border-gray-100 pt-2 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Prescribed Responsibilities</p>
                    {rolePRs.map((pr) => (
                      <div key={pr.id} className="flex items-start gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-updraft-deep bg-updraft-pale-purple/30 px-1 py-0.5 rounded shrink-0">{pr.prId}</span>
                        <span className="text-xs text-gray-600 line-clamp-1">{pr.title}</span>
                      </div>
                    ))}
                    {prCount > 2 && (
                      <Link
                        href="/compliance?tab=smcr"
                        className="inline-flex items-center gap-1 text-[10px] text-updraft-bright-purple hover:underline"
                      >
                        +{prCount - 2} more
                        <ExternalLink size={9} />
                      </Link>
                    )}
                  </div>
                );
              })()}

              {/* Edit panel */}
              {isEditing && canManage && (
                <div className="border-t border-gray-200 pt-3 mt-1 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Current Holder</label>
                    <div className="relative">
                      <select
                        value={editHolder}
                        onChange={(e) => setEditHolder(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-updraft-light-purple"
                      >
                        <option value="">-- Vacant --</option>
                        {users.filter((u) => u.isActive).map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <div className="relative">
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as SMFStatus)}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-updraft-light-purple"
                      >
                        {(Object.entries(SMF_STATUS_LABELS) as [SMFStatus, string][]).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-updraft-light-purple resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(role.id)}
                      disabled={saving}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-updraft-bright-purple hover:bg-updraft-bar rounded-lg py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {saving && <Loader2 size={12} className="animate-spin" />}
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="flex-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Edit trigger */}
              {!isEditing && canManage && (
                <button
                  onClick={() => startEdit(role)}
                  className="mt-auto text-xs text-updraft-bright-purple hover:underline self-start"
                >
                  Edit Role
                </button>
              )}
            </div>
          );
        })}
      </div>

      {smfRoles.length === 0 && (
        <div className="bento-card p-12 text-center">
          <Shield size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">No SMF roles configured yet.</p>
        </div>
      )}
    </div>
  );
}
