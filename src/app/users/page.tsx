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
  Trash2,
  Send,
  Loader2,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import RoleGuard from "@/components/common/RoleGuard";
import UserFormDialog from "@/components/users/UserFormDialog";
import UserDeleteDialog from "@/components/users/UserDeleteDialog";
import PermissionsPanel from "@/components/users/PermissionsPanel";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";
import type { Role, User } from "@/lib/types";
import { EmptyState } from "@/components/common/EmptyState";
import { logAuditEvent } from "@/lib/audit";
import { usePageTitle } from "@/lib/usePageTitle";
import { useHasPermission } from "@/lib/usePermission";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { AnimatedNumber } from "@/components/common/AnimatedNumber";
import ScrollReveal from "@/components/common/ScrollReveal";

function useOwnedRiskCounts() {
  const risks = useAppStore((s) => s.risks);
  const counts = new Map<string, number>();
  risks.forEach((r) => {
    counts.set(r.ownerId, (counts.get(r.ownerId) ?? 0) + 1);
  });
  return counts;
}

const ROLE_CONFIG: Record<Role, { label: string; color: string; description: string }> = {
  CCRO_TEAM: {
    label: "CCRO Team",
    color: "bg-purple-100 text-purple-700",
    description: "Full access to reports, publishing, and all measures",
  },
  CEO: {
    label: "CEO",
    color: "bg-amber-100 text-amber-700",
    description: "Executive view with read access and Risk in Focus toggle",
  },
  OWNER: {
    label: "Owner",
    color: "bg-blue-100 text-blue-700",
    description: "Manages assigned risks, actions, and Consumer Duty metrics",
  },
  VIEWER: {
    label: "Viewer",
    color: "bg-gray-100 text-gray-600",
    description: "Read-only access to published reports and assigned items",
  },
};

export default function UsersPage() {
  usePageTitle("Users");
  const users = useAppStore((s) => s.users);
  const setUsers = useAppStore((s) => s.setUsers);
  const currentUser = useAppStore((s) => s.currentUser);
  const updateUser = useAppStore((s) => s.updateUser);
  const deleteUser = useAppStore((s) => s.deleteUser);
  const ownedRiskCounts = useOwnedRiskCounts();
  const canManageUsers = useHasPermission("can:manage-users");

  const [activeTab, setActiveTab] = useState<"users" | "permissions">("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [showInactive, setShowInactive] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    let filtered = users;
    if (!showInactive) {
      filtered = filtered.filter((u) => u.isActive);
    }
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
  }, [users, roleFilter, searchQuery, showInactive]);

  const roleCounts = useMemo(() => ({
    CCRO_TEAM: users.filter((u) => u.role === "CCRO_TEAM").length,
    CEO: users.filter((u) => u.role === "CEO").length,
    OWNER: users.filter((u) => u.role === "OWNER").length,
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
        // API already persisted — just update local state
        setUsers(users.map((u) => (u.id === saved.id ? { ...u, ...saved } : u)));
        logAuditEvent({ action: "update_user", entityType: "user", entityId: saved.id, changes: { name: saved.name, role: saved.role } });
      } else {
        // API already persisted — just add to local state
        setUsers([...users, saved]);
        logAuditEvent({ action: "add_user", entityType: "user", entityId: saved.id, changes: { name: saved.name, role: saved.role } });
      }
    },
    [editingUser, setUsers, users]
  );

  const handleSendInvite = useCallback(async (user: User) => {
    setSendingInviteId(user.id);
    try {
      await api(`/api/users/${user.id}/invite`, { method: "POST" });
      toast.success("Invitation sent", {
        description: `An invitation email has been sent to ${user.email}.`,
      });
    } catch {
      toast.error("Failed to send invitation", {
        description: "Please check your email configuration and try again.",
      });
    } finally {
      setSendingInviteId(null);
    }
  }, []);

  const handleToggleActive = useCallback(
    (user: User) => {
      updateUser(user.id, { isActive: !user.isActive });
      logAuditEvent({ action: "toggle_user_status", entityType: "user", entityId: user.id, changes: { name: user.name, isActive: !user.isActive } });
    },
    [updateUser]
  );

  return (
    <RoleGuard permission="page:users">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-updraft-pale-purple/40 p-2.5">
            <Users className="h-6 w-6 text-updraft-bright-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-updraft-deep font-poppins">User Management</h1>
            <p className="text-sm text-fca-gray mt-0.5">Manage team members, roles, and permissions</p>
          </div>
        </div>
        {activeTab === "users" && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors"
          >
            <Plus size={16} /> Add User
          </button>
        )}
      </div>

      {/* Tab bar */}
      {canManageUsers && (
        <div className="flex gap-1 border-b border-gray-200">
          {[
            { id: "users" as const, label: "Users" },
            { id: "permissions" as const, label: "Permissions" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab.id
                  ? "border-updraft-bright-purple text-updraft-deep"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "permissions" && canManageUsers ? (
        <PermissionsPanel />
      ) : (
      <>
      {/* Role summary cards */}
      <ScrollReveal>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {(["CCRO_TEAM", "CEO", "OWNER", "VIEWER"] as Role[]).map((role) => {
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
              <AnimatedNumber value={roleCounts[role]} delay={0} duration={800} className="text-2xl font-bold text-updraft-deep" />
              <p className="text-xs text-fca-gray mt-1">{config.description}</p>
            </button>
          );
        })}
      </div>
      </ScrollReveal>

      {/* Search and filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-updraft-light-purple focus:ring-1 focus:ring-updraft-light-purple transition-colors"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-updraft-bright-purple focus:ring-updraft-bar"
          />
          Show inactive users
        </label>
      </div>

      {/* Users table */}
      <ScrollReveal delay={80}>
      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">User</th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Role</th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Assigned Measures</th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Owned Risks</th>
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
                      {(ownedRiskCounts.get(user.id) ?? 0) > 0 ? (
                        <Link
                          href={`/risk-register?q=${encodeURIComponent(user.name)}`}
                          className="inline-flex items-center justify-center rounded-full bg-updraft-pale-purple/40 px-2.5 py-0.5 text-xs font-semibold text-updraft-deep hover:bg-updraft-light-purple/30 transition-colors"
                        >
                          {ownedRiskCounts.get(user.id)}
                        </Link>
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
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSendInvite(user)}
                          disabled={sendingInviteId === user.id}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-updraft-pale-purple/60 hover:text-updraft-bright-purple transition-colors disabled:opacity-50"
                          title="Send invitation email"
                        >
                          {sendingInviteId === user.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Send size={14} />}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                          title="Edit user"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeletingUser(user)}
                          disabled={user.id === currentUser?.id}
                          className={cn(
                            "rounded-lg p-1.5 transition-colors",
                            user.id === currentUser?.id
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-gray-400 hover:bg-red-50 hover:text-red-600"
                          )}
                          title={user.id === currentUser?.id ? "Cannot delete yourself" : "Delete user"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            heading={users.length === 0 ? "No team members yet" : "No users match these filters"}
            description={
              users.length === 0
                ? "Add your first team member to grant access to the dashboard."
                : "Try broadening your search or clearing the role or status filter."
            }
            action={
              users.length === 0 && canManageUsers ? (
                <button
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-updraft-deep text-white px-4 py-2 text-sm font-medium hover:bg-updraft-bar transition-colors"
                >
                  <Plus size={14} /> Add Team Member
                </button>
              ) : undefined
            }
          />
        )}
      </div>
      </ScrollReveal>

      {/* User Form Dialog */}
      <UserFormDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSave}
        user={editingUser}
      />

      {/* User Delete Dialog */}
      <UserDeleteDialog
        open={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        user={deletingUser}
        users={users}
        onDeleted={(userId) => {
          deleteUser(userId);
          logAuditEvent({ action: "delete_user", entityType: "user", entityId: userId, changes: { name: deletingUser?.name } });
        }}
      />
      </>
      )}
    </div>
    </RoleGuard>
  );
}
