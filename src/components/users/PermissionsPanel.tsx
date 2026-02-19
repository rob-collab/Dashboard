"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { ALL_PERMISSIONS, PERMISSION_CODES, PERMISSION_CATEGORIES, resolvePermission, type PermissionCode } from "@/lib/permissions";
import type { Role, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Shield, UserCog, ChevronDown } from "lucide-react";

const ALL_ROLES: Role[] = ["CCRO_TEAM", "CEO", "OWNER", "VIEWER"];

const ROLE_LABELS: Record<Role, string> = {
  CCRO_TEAM: "CCRO Team",
  CEO: "CEO",
  OWNER: "Owner",
  VIEWER: "Viewer",
};

export default function PermissionsPanel() {
  const users = useAppStore((s) => s.users);
  const rolePermissions = useAppStore((s) => s.rolePermissions);
  const userPermissions = useAppStore((s) => s.userPermissions);
  const updateRolePermissions = useAppStore((s) => s.updateRolePermissions);
  const updateUserPermissions = useAppStore((s) => s.updateUserPermissions);

  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const selectedUser = useMemo(() => users.find((u) => u.id === selectedUserId), [users, selectedUserId]);

  // Group permissions by category
  const grouped = useMemo(() => {
    const groups: Record<string, { code: PermissionCode; label: string }[]> = {};
    for (const cat of PERMISSION_CATEGORIES) {
      groups[cat] = [];
    }
    for (const code of PERMISSION_CODES) {
      const info = ALL_PERMISSIONS[code];
      const cat = info.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ code, label: info.label });
    }
    return groups;
  }, []);

  function isRoleGranted(role: Role, code: PermissionCode): boolean {
    const rp = rolePermissions.filter((r) => r.role === role);
    return resolvePermission(code, role, rp, []);
  }

  function toggleRolePermission(role: Role, code: PermissionCode) {
    const current = isRoleGranted(role, code);
    updateRolePermissions(role, { [code]: !current });
  }

  // User override: null = inherit, true = grant, false = deny
  function getUserOverride(userId: string, code: PermissionCode): boolean | null {
    const up = userPermissions.find((p) => p.userId === userId && p.permission === code);
    if (!up) return null;
    return up.granted;
  }

  function cycleUserOverride(userId: string, code: PermissionCode) {
    const current = getUserOverride(userId, code);
    if (current === null) {
      // Inherit → Grant
      updateUserPermissions(userId, { [code]: true });
    } else if (current === true) {
      // Grant → Deny
      updateUserPermissions(userId, { [code]: false });
    } else {
      // Deny → Inherit (remove override)
      updateUserPermissions(userId, { [code]: null });
    }
  }

  function getEffective(user: User, code: PermissionCode): boolean {
    const rp = rolePermissions.filter((r) => r.role === user.role);
    const up = userPermissions.filter((p) => p.userId === user.id);
    return resolvePermission(code, user.role, rp, up);
  }

  return (
    <div className="space-y-8">
      {/* Role Permissions Matrix */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-updraft-bright-purple" />
          <h2 className="text-lg font-bold text-updraft-deep font-poppins">Role Permissions</h2>
        </div>
        <p className="text-sm text-fca-gray mb-4">
          Configure default permissions for each role. CCRO Team always has full access.
        </p>

        <div className="bento-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700 min-w-[200px]">Permission</th>
                {ALL_ROLES.map((role) => (
                  <th key={role} className="border-b border-gray-200 px-3 py-3 text-center font-semibold text-gray-700 min-w-[100px]">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_CATEGORIES.map((cat) => (
                <>
                  <tr key={`cat-${cat}`}>
                    <td colSpan={ALL_ROLES.length + 1} className="bg-gray-50/80 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      {cat}
                    </td>
                  </tr>
                  {grouped[cat]?.map(({ code, label }) => (
                    <tr key={code} className="border-b border-gray-50 hover:bg-gray-50/30">
                      <td className="px-4 py-2 text-gray-700">{label}</td>
                      {ALL_ROLES.map((role) => {
                        const granted = isRoleGranted(role, code);
                        const isCCRO = role === "CCRO_TEAM";
                        return (
                          <td key={role} className="px-3 py-2 text-center">
                            <button
                              onClick={() => !isCCRO && toggleRolePermission(role, code)}
                              disabled={isCCRO}
                              className={cn(
                                "inline-flex h-6 w-10 items-center rounded-full transition-colors",
                                granted ? "bg-updraft-bright-purple" : "bg-gray-200",
                                isCCRO && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <span className={cn(
                                "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                                granted ? "translate-x-5" : "translate-x-1"
                              )} />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* User Override Panel */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <UserCog size={18} className="text-updraft-bright-purple" />
          <h2 className="text-lg font-bold text-updraft-deep font-poppins">User Overrides</h2>
        </div>
        <p className="text-sm text-fca-gray mb-4">
          Override individual permissions for a specific user. Overrides take precedence over role defaults.
        </p>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative min-w-[240px]">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
            >
              <option value="">Select a user...</option>
              {users.filter((u) => u.isActive).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({ROLE_LABELS[u.role]})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {selectedUser && (
          <div className="bento-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Permission</th>
                  <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700 w-28">Override</th>
                  <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700 w-28">Effective</th>
                </tr>
              </thead>
              <tbody>
                {PERMISSION_CATEGORIES.map((cat) => (
                  <>
                    <tr key={`ucat-${cat}`}>
                      <td colSpan={3} className="bg-gray-50/80 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                        {cat}
                      </td>
                    </tr>
                    {grouped[cat]?.map(({ code, label }) => {
                      const override = getUserOverride(selectedUser.id, code);
                      const effective = getEffective(selectedUser, code);
                      return (
                        <tr key={code} className="border-b border-gray-50 hover:bg-gray-50/30">
                          <td className="px-4 py-2 text-gray-700">{label}</td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => cycleUserOverride(selectedUser.id, code)}
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
                                override === null && "bg-gray-100 text-gray-500",
                                override === true && "bg-green-100 text-green-700",
                                override === false && "bg-red-100 text-red-700",
                              )}
                            >
                              {override === null ? "Inherit" : override ? "Grant" : "Deny"}
                            </button>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={cn(
                              "inline-flex h-2 w-2 rounded-full",
                              effective ? "bg-green-500" : "bg-gray-300"
                            )} />
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
