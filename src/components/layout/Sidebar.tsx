"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  BookOpen,
  ClipboardList,
  ListChecks,
  FlaskConical,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  RefreshCw,
  LogOut,
  Eye,
  ArrowLeft,
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

const ROB_EMAIL = "rob@updraft.com";

const NAV_ITEMS: { label: string; href: string; icon: typeof LayoutDashboard; roles: Role[]; badgeKey?: string }[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["CCRO_TEAM", "OWNER", "VIEWER"] },
  { label: "Actions", href: "/actions", icon: ListChecks, roles: ["CCRO_TEAM", "OWNER", "VIEWER"] },
  { label: "Audit Trail", href: "/audit", icon: ClipboardList, roles: ["CCRO_TEAM"] },
  { label: "Consumer Duty", href: "/consumer-duty", icon: ShieldCheck, roles: ["CCRO_TEAM", "OWNER", "VIEWER"] },
  { label: "Controls Testing", href: "/controls", icon: FlaskConical, roles: ["CCRO_TEAM", "OWNER"] },
  { label: "Policies", href: "/policies", icon: BookOpen, roles: ["CCRO_TEAM", "OWNER", "VIEWER"] },
  { label: "Reports", href: "/reports", icon: FileText, roles: ["CCRO_TEAM", "OWNER", "VIEWER"] },
  { label: "Risk Acceptance", href: "/risk-acceptances", icon: ShieldQuestion, roles: ["CCRO_TEAM", "OWNER", "VIEWER"], badgeKey: "riskAcceptance" },
  { label: "Risk Register", href: "/risk-register", icon: ShieldAlert, roles: ["CCRO_TEAM", "OWNER", "VIEWER"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["CCRO_TEAM"] },
  { label: "Users", href: "/users", icon: Users, roles: ["CCRO_TEAM"] },
];


export function Sidebar({ currentUser, collapsed: collapsedProp, onToggle, onSwitchUser }: SidebarProps) {
  const [collapsedInternal, setCollapsedInternal] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const collapsed = collapsedProp ?? collapsedInternal;
  const pathname = usePathname();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const storeUsers = useAppStore((s) => s.users);
  const authUser = useAppStore((s) => s.authUser);
  const hydrate = useAppStore((s) => s.hydrate);
  const riskAcceptanceBadge = useAppStore((s) =>
    s.riskAcceptances.filter((ra) => ["PROPOSED", "CCRO_REVIEW", "AWAITING_APPROVAL", "EXPIRED"].includes(ra.status)).length
  );
  const [refreshing, setRefreshing] = useState(false);

  const isViewingAsOther = authUser && currentUser.id !== authUser.id;
  const isRob = authUser?.email === ROB_EMAIL;

  // Filter user list: everyone can see all users except Rob (unless they ARE Rob)
  const viewableUsers = storeUsers.filter((u) => {
    if (isRob) return true;
    return u.email !== ROB_EMAIL;
  });

  // Sort: own account first, then alphabetical
  const sortedUsers = [...viewableUsers].sort((a, b) => {
    if (authUser) {
      if (a.id === authUser.id) return -1;
      if (b.id === authUser.id) return 1;
    }
    return a.name.localeCompare(b.name);
  });

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
        "flex flex-col h-screen fixed top-0 left-0 transition-all duration-300 ease-in-out z-40",
        collapsed ? "w-16" : "w-64"
      )}
      style={{
        background: "linear-gradient(180deg, #1C1B29 0%, #161523 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Branding Header */}
      <Link href="/" className="relative flex items-center justify-center overflow-hidden transition-all duration-300 ease-in-out p-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <img
          src="/logo.png"
          alt="Updraft CCRO Dashboard"
          className={cn(
            "w-full object-contain transition-all duration-300 ease-in-out brightness-0 invert",
            collapsed ? "h-0 opacity-0 absolute" : "opacity-90"
          )}
        />
        <img
          src="/logo-mark.png"
          alt="Updraft"
          className={cn(
            "object-contain transition-all duration-300 ease-in-out brightness-0 invert",
            collapsed ? "w-full p-1 opacity-90" : "h-0 w-0 opacity-0 absolute"
          )}
        />
      </Link>

      {/* View-As Banner */}
      {isViewingAsOther && !collapsed && (
        <div className="mx-2 mt-2 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
          <Eye size={14} className="shrink-0 text-amber-400" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider">Viewing as</p>
            <p className="text-xs font-medium text-amber-200 truncate">{currentUser.name}</p>
          </div>
          <button
            onClick={() => authUser && onSwitchUser?.(authUser)}
            className="shrink-0 rounded p-1 text-amber-400 hover:bg-amber-500/20 transition-colors"
            title="Back to my account"
          >
            <ArrowLeft size={14} />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {NAV_ITEMS.filter((item) => item.roles.includes(currentUser.role)).map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
              )}
            >
              {/* Active indicator — left accent strip */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-updraft-light-purple" />
              )}
              <Icon
                size={20}
                className={cn(
                  "shrink-0 transition-colors",
                  active
                    ? "text-updraft-light-purple"
                    : "text-white/30 group-hover:text-white/60"
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.badgeKey === "riskAcceptance" && riskAcceptanceBadge > 0 && (
                <span className="ml-auto rounded-full bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {riskAcceptanceBadge}
                </span>
              )}
              {active && !collapsed && !item.badgeKey && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-updraft-light-purple" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Refresh & Collapse */}
      <div className="px-2 pb-2 space-y-1">
        <button
          onClick={async () => {
            setRefreshing(true);
            await hydrate();
            setRefreshing(false);
          }}
          disabled={refreshing}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-xs text-white/40 hover:bg-white/[0.06] hover:text-white/60 transition-colors disabled:opacity-50"
          aria-label="Refresh data"
          title="Refresh data from database"
        >
          <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
          {!collapsed && <span>{refreshing ? "Refreshing..." : "Refresh"}</span>}
        </button>
        <button
          onClick={() => onToggle ? onToggle() : setCollapsedInternal((prev) => !prev)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-xs text-white/40 hover:bg-white/[0.06] hover:text-white/60 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* User Section */}
      <div
        ref={userMenuRef}
        className={cn(
          "relative px-3 py-3",
          collapsed ? "flex justify-center" : ""
        )}
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Signed-in identity (compact, always visible) */}
        {!collapsed && authUser && (
          <div className="mb-2 flex items-center gap-2 text-[10px] text-white/30">
            <span className="truncate">Signed in as {authUser.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="shrink-0 rounded p-0.5 hover:bg-white/10 hover:text-white/60 transition-colors"
              title="Sign out"
            >
              <LogOut size={12} />
            </button>
          </div>
        )}

        {collapsed ? (
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-updraft-bar to-updraft-bright-purple text-xs font-semibold text-white hover:ring-2 hover:ring-updraft-light-purple/40 transition-all"
            title={`${currentUser.name} — Click to switch`}
          >
            {currentUser.name.charAt(0).toUpperCase()}
          </button>
        ) : (
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.06] transition-colors"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-updraft-bar to-updraft-bright-purple text-xs font-semibold text-white">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white/90 truncate">
                {currentUser.name}
              </p>
            </div>
            <ChevronDown
              size={14}
              className={cn(
                "shrink-0 text-white/30 transition-transform",
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
                View As
              </p>
            </div>
            <div className="py-1 max-h-72 overflow-y-auto">
              {sortedUsers.map((u) => {
                const isSelected = u.id === currentUser.id;
                const isSelf = authUser && u.id === authUser.id;
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
                      <p className="font-medium truncate text-xs">
                        {u.name}
                        {isSelf && <span className="ml-1 text-[10px] text-gray-400">(My Account)</span>}
                      </p>
                    </div>
                    {isSelected && (
                      <Check size={14} className="shrink-0 text-updraft-bright-purple" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sign Out at bottom of dropdown */}
            <div className="border-t border-gray-100 px-3 py-2">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
