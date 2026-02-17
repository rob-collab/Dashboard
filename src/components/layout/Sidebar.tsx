"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  ShieldAlert,
  LayoutTemplate,
  Puzzle,
  ClipboardList,
  ListChecks,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { User, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentUser: User;
  collapsed?: boolean;
  onToggle?: () => void;
  onSwitchUser?: (user: User) => void;
}

const NAV_ITEMS: { label: string; href: string; icon: typeof LayoutDashboard; roles: Role[] }[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["CCRO_TEAM", "METRIC_OWNER", "VIEWER"] },
  { label: "Reports", href: "/reports", icon: FileText, roles: ["CCRO_TEAM", "METRIC_OWNER", "VIEWER"] },
  { label: "Consumer Duty", href: "/consumer-duty", icon: ShieldCheck, roles: ["CCRO_TEAM", "METRIC_OWNER", "VIEWER"] },
  { label: "Actions", href: "/actions", icon: ListChecks, roles: ["CCRO_TEAM", "METRIC_OWNER", "VIEWER"] },
  { label: "Risk Register", href: "/risk-register", icon: ShieldAlert, roles: ["CCRO_TEAM", "METRIC_OWNER", "VIEWER"] },
  { label: "Templates", href: "/templates", icon: LayoutTemplate, roles: ["CCRO_TEAM"] },
  { label: "Components", href: "/components-lib", icon: Puzzle, roles: ["CCRO_TEAM"] },
  { label: "Audit Trail", href: "/audit", icon: ClipboardList, roles: ["CCRO_TEAM"] },
  { label: "Users", href: "/users", icon: Users, roles: ["CCRO_TEAM"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["CCRO_TEAM"] },
];

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

export function Sidebar({ currentUser, collapsed: collapsedProp, onToggle, onSwitchUser }: SidebarProps) {
  const [collapsedInternal, setCollapsedInternal] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const collapsed = collapsedProp ?? collapsedInternal;
  const pathname = usePathname();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const storeUsers = useAppStore((s) => s.users);

  // Close user menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

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
        {NAV_ITEMS.filter((item) => item.roles.includes(currentUser.role)).map((item) => {
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

      {/* User Switcher */}
      <div
        ref={userMenuRef}
        className={cn(
          "relative border-t border-gray-100 px-3 py-3",
          collapsed ? "flex justify-center" : ""
        )}
      >
        {collapsed ? (
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-updraft-bar text-xs font-semibold text-white hover:ring-2 hover:ring-updraft-light-purple transition-all"
            title={`${currentUser.name} (${ROLE_LABELS[currentUser.role]}) — Click to switch`}
          >
            {currentUser.name.charAt(0).toUpperCase()}
          </button>
        ) : (
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50 transition-colors"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-updraft-bar text-xs font-semibold text-white">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
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
            <ChevronDown
              size={14}
              className={cn(
                "shrink-0 text-gray-400 transition-transform",
                userMenuOpen && "rotate-180"
              )}
            />
          </button>
        )}

        {/* Dropdown */}
        {userMenuOpen && (
          <div className={cn(
            "absolute bottom-full mb-2 rounded-lg border border-gray-200 bg-white shadow-lg animate-fade-in z-50",
            collapsed ? "left-full ml-2 bottom-0 mb-0 w-64" : "left-2 right-2"
          )}>
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Switch Demo User
              </p>
            </div>
            <div className="py-1 max-h-72 overflow-y-auto">
              {storeUsers.map((u) => {
                const isSelected = u.id === currentUser.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSwitchUser?.(u);
                      setUserMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-updraft-pale-purple/30 text-updraft-deep"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
                        isSelected ? "bg-updraft-deep" : "bg-updraft-bar"
                      )}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-xs">{u.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {ROLE_LABELS[u.role]}
                      </p>
                    </div>
                    {isSelected && (
                      <Check size={14} className="shrink-0 text-updraft-bright-purple" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
