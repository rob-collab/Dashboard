"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { usePermissionSet } from "@/lib/usePermission";
import type { PrescribedResponsibility } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronDown, ClipboardList } from "lucide-react";

export default function ResponsibilitiesMatrix() {
  const prescribedResponsibilities = useAppStore((s) => s.prescribedResponsibilities);
  const smfRoles = useAppStore((s) => s.smfRoles);
  const users = useAppStore((s) => s.users);
  const updatePrescribedResponsibility = useAppStore((s) => s.updatePrescribedResponsibility);
  const permissionSet = usePermissionSet();
  const canManage = permissionSet.has("manage:smcr");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSMFId, setEditSMFId] = useState("");

  const gaps = useMemo(
    () => prescribedResponsibilities.filter((pr) => !pr.assignedSMFId).length,
    [prescribedResponsibilities],
  );

  const getAssignedRole = (pr: PrescribedResponsibility) => {
    if (pr.assignedSMF) return pr.assignedSMF;
    if (pr.assignedSMFId) return smfRoles.find((r) => r.id === pr.assignedSMFId) ?? null;
    return null;
  };

  const getHolderName = (pr: PrescribedResponsibility) => {
    const role = getAssignedRole(pr);
    if (!role) return null;
    if (role.currentHolder) return role.currentHolder.name;
    if (role.currentHolderId) {
      const user = users.find((u) => u.id === role.currentHolderId);
      return user?.name ?? null;
    }
    return null;
  };

  const startReassign = (pr: PrescribedResponsibility) => {
    setEditingId(pr.id);
    setEditSMFId(pr.assignedSMFId ?? "");
  };

  const saveReassign = (prId: string) => {
    updatePrescribedResponsibility(prId, {
      assignedSMFId: editSMFId || null,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Gap alert */}
      {gaps > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700">
            <span className="font-semibold">{gaps}</span> prescribed {gaps === 1 ? "responsibility has" : "responsibilities have"} no assigned SMF holder.
          </p>
        </div>
      )}

      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Mandatory For</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Assigned SMF</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Holder</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Linked Domains</th>
                {canManage && (
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider w-24">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prescribedResponsibilities.map((pr) => {
                const assignedRole = getAssignedRole(pr);
                const holderName = getHolderName(pr);
                const isGap = !pr.assignedSMFId;
                const isEditing = editingId === pr.id;

                return (
                  <tr
                    key={pr.id}
                    className={cn(
                      "hover:bg-gray-50 transition-colors",
                      isGap && "bg-amber-50/60",
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-updraft-pale-purple text-updraft-deep text-xs font-mono font-semibold">
                        {pr.reference}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs">
                      <p className="font-medium text-updraft-deep">{pr.title}</p>
                      {pr.description && (
                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{pr.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {pr.mandatoryFor ?? <span className="text-gray-300">--</span>}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing && canManage ? (
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <select
                              value={editSMFId}
                              onChange={(e) => setEditSMFId(e.target.value)}
                              className="text-xs border border-gray-200 rounded-md px-2 py-1.5 pr-6 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-updraft-light-purple"
                            >
                              <option value="">-- None --</option>
                              {smfRoles.map((r) => (
                                <option key={r.id} value={r.id}>{r.smfId} - {r.shortTitle || r.title}</option>
                              ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                          <button
                            onClick={() => saveReassign(pr.id)}
                            className="text-[10px] font-medium text-white bg-updraft-bright-purple hover:bg-updraft-bar rounded px-2 py-1 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-[10px] font-medium text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : assignedRole ? (
                        <span className="text-gray-700 font-medium">{assignedRole.smfId}</span>
                      ) : (
                        <span className="text-amber-600 font-medium flex items-center gap-1">
                          <AlertTriangle size={12} /> Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {holderName ?? <span className="text-gray-300">--</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {pr.linkedDomains && pr.linkedDomains.length > 0 ? (
                          pr.linkedDomains.map((domain) => (
                            <span key={domain} className="inline-block bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded">
                              {domain}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-300 text-xs">--</span>
                        )}
                      </div>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        {!isEditing && (
                          <button
                            onClick={() => startReassign(pr)}
                            className="text-xs text-updraft-bright-purple hover:underline"
                          >
                            Reassign
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {prescribedResponsibilities.length === 0 && (
          <div className="p-12 text-center">
            <ClipboardList size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">No prescribed responsibilities configured yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
