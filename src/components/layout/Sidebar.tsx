"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  LayoutTemplate,
  Puzzle,
  ClipboardList,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentUser: User;
  collapsed?: boolean;
  onToggle?: () => void;
  onSwitchUser?: (user: User) => void;
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Consumer Duty", href: "/consumer-duty", icon: ShieldCheck },
  { label: "Templates", href: "/templates", icon: LayoutTemplate },
  { label: "Components", href: "/components-lib", icon: Puzzle },
  { label: "Audit Trail", href: "/audit", icon: ClipboardList },
  { label: "Users", href: "/users", icon: Users },
] as const;

const ROLE_LABELS: Record<string, string> = {
  CCRO_TEAM: "CCRO Team",
  METRIC_OWNER: "Metric Owner",
  VIEWER: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  CCRO_TEAM: "bg-updraft-bright-purple text-white",
  METRIC_OWNER: "bg-updraft-pale-purple text-updraft-deep",
  VIEWER: "bg-gray-200 text-gray-700",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function Sidebar({ currentUser, collapsed: collapsedProp, onToggle, onSwitchUser }: SidebarProps) {
  const [collapsedInternal, setCollapsedInternal] = useState(false);
  const collapsed = collapsedProp ?? collapsedInternal;
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-screen fixed top-0 left-0 border-r border-updraft-pale-purple/30 bg-white transition-all duration-300 ease-in-out z-40",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Branding Header */}
      <div className="relative flex items-center gap-3 px-4 py-5 bg-gradient-to-br from-updraft-deep via-updraft-bar to-updraft-bright-purple">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20 font-poppins text-sm font-bold text-white">
          U
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-poppins text-base font-semibold leading-tight text-white truncate">
              Updraft
            </h1>
            <p className="text-[11px] leading-tight text-updraft-pale-purple/80 truncate">
              CCRO Dashboard
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-updraft-pale-purple/40 text-updraft-deep"
                  : "text-gray-600 hover:bg-updraft-pale-purple/20 hover:text-updraft-bar"
              )}
            >
              <Icon
                size={20}
                className={cn(
                  "shrink-0 transition-colors",
                  active
                    ? "text-updraft-bright-purple"
                    : "text-gray-400 group-hover:text-updraft-bar"
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {active && !collapsed && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-updraft-bright-purple" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-2 pb-2">
        <button
          onClick={() => onToggle ? onToggle() : setCollapsedInternal((prev) => !prev)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* User Info */}
      <div
        className={cn(
          "border-t border-gray-100 px-3 py-3",
          collapsed ? "flex justify-center" : ""
        )}
      >
        {collapsed ? (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-updraft-bar text-xs font-semibold text-white"
            title={`${currentUser.name} (${ROLE_LABELS[currentUser.role]})`}
          >
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-updraft-bar text-xs font-semibold text-white">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {currentUser.name}
              </p>
              <span
                className={cn(
                  "inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight",
                  ROLE_COLORS[currentUser.role]
                )}
              >
                {ROLE_LABELS[currentUser.role]}
              </span>
            </div>
            <button
              className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
