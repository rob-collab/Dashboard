"use client";

import { useMemo } from "react";
import { useAppStore } from "./store";
import { resolvePermission, resolveAllPermissions, type PermissionCode } from "./permissions";

/** Check if the current user has a specific permission */
export function useHasPermission(code: PermissionCode): boolean {
  const currentUser = useAppStore((s) => s.currentUser);
  const rolePermissions = useAppStore((s) => s.rolePermissions);
  const userPermissions = useAppStore((s) => s.userPermissions);

  return useMemo(() => {
    if (!currentUser) return false;
    return resolvePermission(
      code,
      currentUser.role,
      rolePermissions.filter((rp) => rp.role === currentUser.role),
      userPermissions.filter((up) => up.userId === currentUser.id),
    );
  }, [code, currentUser, rolePermissions, userPermissions]);
}

/** Check if the current user has ANY of the given permissions */
export function useHasAnyPermission(...codes: PermissionCode[]): boolean {
  const currentUser = useAppStore((s) => s.currentUser);
  const rolePermissions = useAppStore((s) => s.rolePermissions);
  const userPermissions = useAppStore((s) => s.userPermissions);

  return useMemo(() => {
    if (!currentUser) return false;
    const rp = rolePermissions.filter((r) => r.role === currentUser.role);
    const up = userPermissions.filter((u) => u.userId === currentUser.id);
    return codes.some((code) => resolvePermission(code, currentUser.role, rp, up));
  }, [codes, currentUser, rolePermissions, userPermissions]);
}

/** Get the full set of granted permissions for the current user */
export function usePermissionSet(): Set<PermissionCode> {
  const currentUser = useAppStore((s) => s.currentUser);
  const rolePermissions = useAppStore((s) => s.rolePermissions);
  const userPermissions = useAppStore((s) => s.userPermissions);

  return useMemo(() => {
    if (!currentUser) return new Set<PermissionCode>();
    return resolveAllPermissions(
      currentUser.role,
      rolePermissions.filter((rp) => rp.role === currentUser.role),
      userPermissions.filter((up) => up.userId === currentUser.id),
    );
  }, [currentUser, rolePermissions, userPermissions]);
}
