"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Scale,
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
  BookOpen,
  BadgeCheck,
  Search,
  ArrowLeftRight,
  Layers,
  Building2,
  Download,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePermissionSet } from "@/lib/usePermission";
import type { PermissionCode } from "@/lib/permissions";
import { isDarkBackground, sidebarGradient, DEFAULT_SIDEBAR_COLOUR } from "@/lib/colour-utils";

interface SidebarProps {
  currentUser: User;
  collapsed?: boolean;
  onToggle?: () => void;
  onSwitchUser?: (user: User) => void;
  onSearch?: () => void;
}

const ROB_EMAIL = "rob@updraft.com";

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard; permission: PermissionCode; badgeKey?: string };
type NavGroup = { groupLabel: string | null; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    groupLabel: null,
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard, permission: "page:dashboard" },
    ],
  },
  {
    groupLabel: "Risk Management",
    items: [
      { label: "Risk Register", href: "/risk-register", icon: ShieldAlert, permission: "page:risk-register" },
      { label: "Risk Acceptances", href: "/risk-acceptances", icon: ShieldQuestion, permission: "page:risk-acceptances", badgeKey: "riskAcceptance" },
      { label: "Consumer Duty", href: "/consumer-duty", icon: ShieldCheck, permission: "page:consumer-duty" },
    ],
  },
  {
    groupLabel: "Compliance & Controls",
    items: [
      { label: "Compliance", href: "/compliance", icon: Scale, permission: "page:compliance", badgeKey: "compliance" },
      { label: "Policies", href: "/compliance?tab=policies", icon: BookOpen, permission: "page:compliance" },
      { label: "SM&CR", href: "/compliance?tab=smcr", icon: BadgeCheck, permission: "page:compliance" },
      { label: "Controls", href: "/controls", icon: FlaskConical, permission: "page:controls", badgeKey: "controls" },
      { label: "Process Library", href: "/processes", icon: Layers, permission: "page:compliance" },
      { label: "Operational Resilience", href: "/operational-resilience", icon: Building2, permission: "page:operational-resilience", badgeKey: "operationalResilience" },
    ],
  },
  {
    groupLabel: "Execution",
    items: [
      { label: "Actions", href: "/actions", icon: ListChecks, permission: "page:actions", badgeKey: "actions" },
      { label: "Change Requests", href: "/change-requests", icon: ArrowLeftRight, permission: "page:actions", badgeKey: "changeRequests" },
    ],
  },
  {
    groupLabel: "Administration",
    items: [
      { label: "Reports", href: "/reports", icon: FileText, permission: "page:reports" },
      { label: "Export Centre", href: "/exports", icon: Download, permission: "page:dashboard" },
      { label: "Audit Trail", href: "/audit", icon: ClipboardList, permission: "page:audit" },
      { label: "Settings", href: "/settings", icon: Settings, permission: "page:settings", badgeKey: "settings" },
      { label: "Users", href: "/users", icon: Users, permission: "page:users" },
    ],
  },
];


export function Sidebar({ currentUser, collapsed: collapsedProp, onToggle, onSwitchUser, onSearch }: SidebarProps) {
  const [collapsedInternal, setCollapsedInternal] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const collapsed = collapsedProp ?? collapsedInternal;
  const pathname = usePathname();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const storeUsers = useAppStore((s) => s.users);
  const authUser = useAppStore((s) => s.authUser);
  const hydrate = useAppStore((s) => s.hydrate);
  const hydratedAt = useAppStore((s) => s._hydratedAt);
  const actions = useAppStore((s) => s.actions);
  const controls = useAppStore((s) => s.controls);
  const risks = useAppStore((s) => s.risks);
  const riskAcceptances = useAppStore((s) => s.riskAcceptances);
  const regulations = useAppStore((s) => s.regulations);
  const scenarios = useAppStore((s) => s.scenarios);
  const ibs = useAppStore((s) => s.ibs);
  const selfAssessments = useAppStore((s) => s.selfAssessments);
  const accessRequests = useAppStore((s) => s.accessRequests);
  const siteSettings = useAppStore((s) => s.siteSettings);
  const permissionSet = usePermissionSet();
  const searchParams = useSearchParams();

  // Dynamic sidebar colour from site settings
  const sidebarColour = siteSettings?.primaryColour || DEFAULT_SIDEBAR_COLOUR;
  const dark = useMemo(() => isDarkBackground(sidebarColour), [sidebarColour]);
  const gradient = useMemo(() => sidebarGradient(sidebarColour), [sidebarColour]);

  // Adaptive colour tokens based on background luminance
  const t = useMemo(() => {
    if (dark) {
      return {
        border: "rgba(255,255,255,0.06)",
        textPrimary: "text-white",
        textSecondary: "text-white/90",
        textMuted: "text-white/50",
        textFaint: "text-white/30",
        activeBg: "bg-white/10",
        hoverBg: "hover:bg-white/[0.06]",
        hoverText: "hover:text-white/80",
        hoverTextStrong: "hover:text-white/60",
        borderBtn: "border-white/10",
        logoFilter: "brightness-0 invert",
        // View-As banner
        bannerBg: "bg-amber-500/10",
        bannerBorder: "border-amber-500/20",
        bannerIcon: "text-amber-400",
        bannerLabel: "text-amber-400/80",
        bannerName: "text-amber-200",
        bannerHover: "hover:bg-amber-500/20",
      };
    }
    return {
      border: "rgba(0,0,0,0.08)",
      textPrimary: "text-gray-900",
      textSecondary: "text-gray-800",
      textMuted: "text-gray-500",
      textFaint: "text-gray-400",
      activeBg: "bg-black/[0.08]",
      hoverBg: "hover:bg-black/[0.04]",
      hoverText: "hover:text-gray-700",
      hoverTextStrong: "hover:text-gray-600",
      borderBtn: "border-black/10",
      logoFilter: "",
      // View-As banner
      bannerBg: "bg-amber-500/15",
      bannerBorder: "border-amber-600/25",
      bannerIcon: "text-amber-600",
      bannerLabel: "text-amber-700/80",
      bannerName: "text-amber-800",
      bannerHover: "hover:bg-amber-500/25",
    };
  }, [dark]);

  // Badge counts — permission-aware
  const badges: Record<string, number> = useMemo(() => {
    const canViewPending = permissionSet.has("can:view-pending");
    const isOwner = currentUser.role === "OWNER";

    const overdueActions = actions.filter((a) => {
      if (a.status === "COMPLETED") return false;
      if (!a.dueDate) return false;
      if (isOwner && a.assignedTo !== currentUser.id) return false;
      return new Date(a.dueDate) < new Date();
    }).length;

    const pendingControlChanges = canViewPending
      ? controls.reduce((n, c) => n + (c.changes ?? []).filter((ch) => ch.status === "PENDING").length, 0)
      : 0;

    const riskAcceptance = riskAcceptances.filter((ra) =>
      ["PROPOSED", "CCRO_REVIEW", "AWAITING_APPROVAL", "EXPIRED"].includes(ra.status)
    ).length;

    const pendingRiskChanges = canViewPending
      ? risks.reduce((n, r) => n + (r.changes ?? []).filter((ch) => ch.status === "PENDING").length, 0)
      : 0;

    const pendingActionChanges = canViewPending
      ? actions.reduce((n, a) => n + (a.changes ?? []).filter((ch) => ch.status === "PENDING").length, 0)
      : 0;

    // CCRO sees all pending changes; non-CCRO proposers see their own pending changes
    const changeRequests = canViewPending
      ? pendingControlChanges + pendingRiskChanges + pendingActionChanges
      : controls.reduce((n, c) => n + (c.changes ?? []).filter((ch) => ch.proposedBy === currentUser.id && ch.status === "PENDING").length, 0) +
        risks.reduce((n, r) => n + (r.changes ?? []).filter((ch) => ch.proposedBy === currentUser.id && ch.status === "PENDING").length, 0) +
        actions.reduce((n, a) => n + (a.changes ?? []).filter((ch) => ch.proposedBy === currentUser.id && ch.status === "PENDING").length, 0);

    const complianceGaps = canViewPending
      ? regulations.filter((r) => r.isApplicable && (r.complianceStatus === "NON_COMPLIANT" || r.complianceStatus === "GAP_IDENTIFIED")).length
      : 0;

    // OR badge (CCRO only): overdue scenarios + IBS gaps + self-assessment not submitted
    let operationalResilience = 0;
    if (canViewPending) {
      const overdueScenarios = scenarios.filter(
        (s) => s.nextTestDate && new Date(s.nextTestDate) < new Date() && s.status !== "COMPLETE"
      ).length;
      const ibsGaps = ibs.filter((i) => (i.categoriesFilled ?? 0) < 3).length;
      const currentYear = new Date().getFullYear();
      const june = new Date(currentYear, 5, 1);
      const selfAssessmentMissing = new Date() >= june &&
        !selfAssessments.some((sa) => sa.year === currentYear && (sa.status === "SUBMITTED" || sa.status === "APPROVED"))
        ? 1 : 0;
      operationalResilience = overdueScenarios + ibsGaps + selfAssessmentMissing;
    }

    // Settings badge: pending access requests (CCRO only)
    const settings = canViewPending
      ? accessRequests.filter((r) => r.status === "PENDING").length
      : 0;

    if (canViewPending) {
      const total = overdueActions + pendingControlChanges + riskAcceptance + pendingRiskChanges + pendingActionChanges;
      return { dashboard: total, compliance: complianceGaps, changeRequests, operationalResilience, settings } as Record<string, number>;
    }

    return { actions: overdueActions, riskAcceptance, operationalResilience, changeRequests } as Record<string, number>;
  }, [actions, controls, risks, riskAcceptances, regulations, scenarios, ibs, selfAssessments, accessRequests, currentUser, permissionSet]);

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
    if (href.includes("?")) {
      const [basePath, query] = href.split("?");
      const params = new URLSearchParams(query);
      const tabParam = params.get("tab");
      if (tabParam) {
        return pathname.startsWith(basePath) && searchParams.get("tab") === tabParam;
      }
    }
    if (href === "/compliance") {
      const tab = searchParams.get("tab");
      return pathname.startsWith("/compliance") && tab !== "policies" && tab !== "smcr";
    }
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-screen fixed top-0 left-0 transition-all duration-300 ease-in-out z-40",
        collapsed ? "w-16" : "w-64"
      )}
      style={{
        background: gradient,
        borderRight: `1px solid ${t.border}`,
      }}
    >
      {/* Branding Header */}
      <Link href="/" className="relative flex items-center justify-center overflow-hidden transition-all duration-300 ease-in-out p-3" style={{ borderBottom: `1px solid ${t.border}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Updraft CCRO Dashboard"
          className={cn(
            "w-full object-contain transition-all duration-300 ease-in-out",
            t.logoFilter,
            collapsed ? "h-0 opacity-0 absolute" : "opacity-90"
          )}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-mark.png"
          alt="Updraft"
          className={cn(
            "object-contain transition-all duration-300 ease-in-out",
            t.logoFilter,
            collapsed ? "w-full p-1 opacity-90" : "h-0 w-0 opacity-0 absolute"
          )}
        />
      </Link>

      {/* View-As Banner */}
      {isViewingAsOther && !collapsed && (
        <div className={cn("mx-2 mt-2 flex items-center gap-2 rounded-lg px-3 py-2", t.bannerBg, t.bannerBorder, "border")}>
          <Eye size={14} className={cn("shrink-0", t.bannerIcon)} />
          <div className="flex-1 min-w-0">
            <p className={cn("text-[10px] font-semibold uppercase tracking-wider", t.bannerLabel)}>Viewing as</p>
            <p className={cn("text-xs font-medium truncate", t.bannerName)}>{currentUser.name}</p>
          </div>
          <button
            onClick={() => authUser && onSwitchUser?.(authUser)}
            className={cn("shrink-0 rounded p-1 transition-colors", t.bannerIcon, t.bannerHover)}
            title="Back to my account"
          >
            <ArrowLeft size={14} />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_GROUPS.map((group, gi) => {
          const visibleItems = group.items.filter((item) => permissionSet.has(item.permission));
          if (visibleItems.length === 0) return null;
          return (
            <div key={gi}>
              {/* Group divider + label (hidden when collapsed) */}
              {gi > 0 && (
                <div className={cn("mt-3 mb-1", collapsed ? "px-1" : "px-1")}>
                  <div style={{ borderTop: `1px solid ${t.border}` }} className="mb-2" />
                  {!collapsed && group.groupLabel && (
                    <p className={cn("px-2 text-[10px] font-semibold uppercase tracking-wider", t.textFaint)}>
                      {group.groupLabel}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
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
                          ? cn(t.activeBg, t.textPrimary)
                          : cn(t.textMuted, t.hoverBg, t.hoverText)
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
                            : cn(t.textFaint, "group-hover:" + (dark ? "text-white/60" : "text-gray-600"))
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && item.badgeKey && (badges[item.badgeKey] ?? 0) > 0 && (
                        <span className="ml-auto rounded-full bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {badges[item.badgeKey]}
                        </span>
                      )}
                      {active && !collapsed && !(item.badgeKey && (badges[item.badgeKey] ?? 0) > 0) && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-updraft-light-purple" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Refresh & Collapse */}
      <div className="px-2 pb-2 space-y-1">
        {onSearch && (
          <button
            onClick={onSearch}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border py-2 text-xs transition-colors",
              t.borderBtn, t.textMuted, t.hoverBg, t.hoverTextStrong
            )}
            aria-label="Search"
            title="Search (⌘K)"
          >
            <Search size={14} className={cn("shrink-0", collapsed && "mx-auto")} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Search</span>
                <kbd className={cn("text-[10px] font-mono opacity-50 mr-1", t.textMuted)}>⌘K</kbd>
              </>
            )}
          </button>
        )}
        {/* Data freshness indicator */}
        {!collapsed && hydratedAt && (
          <p className={cn("text-center text-[9px] px-1 mb-0.5", t.textFaint)} title={hydratedAt.toLocaleString()}>
            Data current as of {hydratedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        <button
          onClick={async () => {
            setRefreshing(true);
            await hydrate();
            setRefreshing(false);
          }}
          disabled={refreshing}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-xs transition-colors disabled:opacity-50",
            t.borderBtn, t.textMuted, t.hoverBg, t.hoverTextStrong
          )}
          aria-label="Refresh data"
          title="Refresh data from database"
        >
          <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
          {!collapsed && <span>{refreshing ? "Refreshing..." : "Refresh"}</span>}
        </button>
        <button
          onClick={() => onToggle ? onToggle() : setCollapsedInternal((prev) => !prev)}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-xs transition-colors",
            t.borderBtn, t.textMuted, t.hoverBg, t.hoverTextStrong
          )}
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
        style={{ borderTop: `1px solid ${t.border}` }}
      >
        {/* Signed-in identity (compact, always visible) */}
        {!collapsed && authUser && (
          <div className={cn("mb-2 flex items-center gap-2 text-[10px]", t.textFaint)}>
            <span className="truncate">Signed in as {authUser.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className={cn("shrink-0 rounded p-0.5 transition-colors", t.hoverBg, t.hoverTextStrong)}
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
            className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors", t.hoverBg)}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-updraft-bar to-updraft-bright-purple text-xs font-semibold text-white">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className={cn("text-sm font-medium truncate", t.textSecondary)}>
                {currentUser.name}
              </p>
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider mt-0.5", dark ? "text-white/40" : "text-gray-400")}>
                {currentUser.role === "CCRO_TEAM" ? "CCRO" : currentUser.role === "OWNER" ? "Risk Owner" : "Reviewer"}
              </p>
            </div>
            <ChevronDown
              size={14}
              className={cn(
                "shrink-0 transition-transform",
                t.textFaint,
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
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {u.role === "CCRO_TEAM" ? "CCRO" : u.role === "OWNER" ? "Risk Owner" : "Reviewer"}
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
