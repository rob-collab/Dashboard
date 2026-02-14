"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Users,
  Search,
  Plus,
  Shield,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Pencil,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import RoleGuard from "@/components/common/RoleGuard";
import UserFormDialog from "@/components/users/UserFormDialog";
import { cn, formatDate } from "@/lib/utils";
import type { Role, User } from "@/lib/types";
import { logAuditEvent } from "@/lib/audit";

const ROLE_CONFIG: Record<Role, { label: string; color: string; description: string }> = {
  CCRO_TEAM: {
    label: "CCRO Team",
    color: "bg-purple-100 text-purple-700",
    description: "Full access to reports, publishing, and all measures",
  },
  METRIC_OWNER: {
    label: "Metric Owner",
    color: "bg-blue-100 text-blue-700",
    description: "Can update assigned Consumer Duty metrics",
  },
  VIEWER: {
    label: "Viewer",
    color: "bg-gray-100 text-gray-600",
    description: "Read-only access to published reports",
  },
};

export default function UsersPage() {
  const users = useAppStore((s) => s.users);
  const addUser = useAppStore((s) => s.addUser);
  const updateUser = useAppStore((s) => s.updateUser);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);

  const filteredUsers = useMemo(() => {
    let filtered = users;
    if (roleFilter !== "ALL") {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [users, roleFilter, searchQuery]);

  const roleCounts = useMemo(() => ({
    CCRO_TEAM: users.filter((u) => u.role === "CCRO_TEAM").length,
    METRIC_OWNER: users.filter((u) => u.role === "METRIC_OWNER").length,
    VIEWER: users.filter((u) => u.role === "VIEWER").length,
  }), [users]);

  const handleOpenAdd = useCallback(() => {
    setEditingUser(undefined);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((user: User) => {
    setEditingUser(user);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingUser(undefined);
  }, []);

  const handleSave = useCallback(
    (saved: User) => {
      if (editingUser) {
        updateUser(saved.id, saved);
        logAuditEvent({ action: "update_user", entityType: "user", entityId: saved.id, changes: { name: saved.name, role: saved.role } });
      } else {
        addUser(saved);
        logAuditEvent({ action: "add_user", entityType: "user", entityId: saved.id, changes: { name: saved.name, role: saved.role } });
      }
    },
    [editingUser, addUser, updateUser]
  );

  const handleToggleActive = useCallback(
    (user: User) => {
      updateUser(user.id, { isActive: !user.isActive });
      logAuditEvent({ action: "toggle_user_status", entityType: "user", entityId: user.id, changes: { name: user.name, isActive: !user.isActive } });
    },
    [updateUser]
  );

  return (
    <RoleGuard allowedRoles={["CCRO_TEAM"]}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-updraft-pale-purple/40 p-2.5">
            <Users className="h-6 w-6 text-updraft-bright-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-updraft-deep font-poppins">User Management</h1>
            <p className="text-sm text-fca-gray mt-0.5">Manage team members and their roles</p>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(["CCRO_TEAM", "METRIC_OWNER", "VIEWER"] as Role[]).map((role) => {
          const config = ROLE_CONFIG[role];
          return (
            <button
              key={role}
              onClick={() => setRoleFilter(roleFilter === role ? "ALL" : role)}
              className={cn(
                "bento-card text-left transition-all",
                roleFilter === role && "ring-2 ring-updraft-bright-purple/40"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold", config.color)}>
                  {config.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-updraft-deep">{roleCounts[role]}</p>
              <p className="text-xs text-fca-gray mt-1">{config.description}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
        />
      </div>

      {/* Users table */}
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">User</th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Role</th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Assigned Measures</th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Last Login</th>
                <th className="border-b border-gray-200 px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const config = ROLE_CONFIG[user.role];
                return (
                  <tr key={user.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-updraft-pale-purple/40 text-sm font-semibold text-updraft-bright-purple">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="flex items-center gap-1 text-xs text-gray-400">
                            <Mail size={10} /> {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", config.color)}>
                        <Shield size={10} /> {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(user)}
                        title={user.isActive ? "Click to deactivate" : "Click to activate"}
                        className="group cursor-pointer"
                      >
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs text-risk-green font-medium group-hover:opacity-70 transition-opacity">
                            <CheckCircle size={12} /> Authorised
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium group-hover:opacity-70 transition-opacity">
                            <XCircle size={12} /> Inactive
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {user.assignedMeasures.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.assignedMeasures.slice(0, 5).map((m) => (
                            <span key={m} className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-600">
                              {m}
                            </span>
                          ))}
                          {user.assignedMeasures.length > 5 && (
                            <span className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400">
                              +{user.assignedMeasures.length - 5} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.lastLoginAt ? (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock size={10} /> {formatDate(user.lastLoginAt)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenEdit(user)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        title="Edit user"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No users found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search criteria</p>
          </div>
        )}
      </div>

      {/* User Form Dialog */}
      <UserFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSave}
        user={editingUser}
      />
    </div>
    </RoleGuard>
  );
}
