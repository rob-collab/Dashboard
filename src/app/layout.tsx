"use client";

import "./globals.css";
import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Toaster } from "sonner";
import { SessionProvider, useSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import NavigationBackButton from "@/components/common/NavigationBackButton";
import SaveStatusIndicator from "@/components/common/SaveStatusIndicator";
import Breadcrumb from "@/components/common/Breadcrumb";
import { ThemeProvider } from "next-themes";
import { useAppStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { Menu, Search, Bell } from "lucide-react";
import GlobalSearch from "@/components/common/GlobalSearch";
import KeyboardShortcutsModal from "@/components/common/KeyboardShortcutsModal";
import NotificationDrawer, { useNotificationCount } from "@/components/common/NotificationDrawer";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { cn } from "@/lib/utils";

const LOADING_MESSAGES = [
  "Connecting to your workspace...",
  "Loading your data...",
  "Almost ready...",
] as const;

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const notifCount = useNotificationCount();

  // Detect mobile breakpoint (< 768px = md)
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close sidebar overlay when navigating on mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile]);

  // Cmd+K / Ctrl+K global search shortcut; ? for keyboard shortcuts help
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
        return;
      }
      // ? shortcut — only when not inside a text input
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        const el = e.target as HTMLElement;
        if (el.isContentEditable) return;
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const pushNavigationStack = useAppStore((s) => s.pushNavigationStack);
  const _suppressNavPush = useAppStore((s) => s._suppressNavPush);
  const setSuppressNavPush = useAppStore((s) => s.setSuppressNavPush);

  // Ref attached to <main> — used for scroll save/restore
  const mainRef = useRef<HTMLElement>(null);

  // Track all route changes and push previous path to navigation stack so the
  // Back button appears after any navigation (not just EntityLink click-throughs).
  const prevPathnameRef = useRef<string | null>(null);

  // Save scroll position when leaving a page; restore when returning to it.
  // Must run BEFORE the navStack effect so prevPathnameRef still holds the old path.
  useEffect(() => {
    const prev = prevPathnameRef.current;
    const curr = pathname;

    // Save the scroll position of the page we're leaving
    if (prev && prev !== curr && mainRef.current) {
      sessionStorage.setItem(`scroll:${prev}`, String(mainRef.current.scrollTop));
    }

    // Restore saved scroll position for the page we're entering.
    // Delay slightly to let the 150ms page-transition + first render settle.
    const saved = sessionStorage.getItem(`scroll:${curr}`);
    if (saved && Number(saved) > 0) {
      const timer = setTimeout(() => {
        if (mainRef.current) mainRef.current.scrollTop = Number(saved);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const prev = prevPathnameRef.current;
    const curr = pathname;
    prevPathnameRef.current = curr;

    if (!prev || prev === curr) return;

    if (_suppressNavPush) {
      // We're navigating back — don't push this change to the stack
      setSuppressNavPush(false);
      return;
    }

    // Avoid duplicating a push that EntityLink already made:
    // EntityLink pushes the full URL (path + query); prev is path-only.
    // If the last stack item's path component matches prev, EntityLink already handled it.
    const lastItem = useAppStore.getState().navigationStack.at(-1) ?? "";
    const lastPath = lastItem.split("?")[0];
    if (lastPath !== prev) {
      pushNavigationStack(prev);
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const setAuthUser = useAppStore((s) => s.setAuthUser);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const currentUser = useAppStore((s) => s.currentUser);
  const storeUsers = useAppStore((s) => s.users);
  const hydrated = useAppStore((s) => s._hydrated);
  const hydrateError = useAppStore((s) => s._hydrateError);
  const hydrate = useAppStore((s) => s.hydrate);

  // Hydrate store from API once session is authenticated.
  // Waiting for auth ensures the signIn callback (which updates lastLoginAt)
  // has committed before we fetch users.
  useEffect(() => {
    if (status === "authenticated") {
      hydrate();
    }
  }, [hydrate, status]);

  // After hydration + session, match session email to store user
  useEffect(() => {
    if (!hydrated || storeUsers.length === 0 || status !== "authenticated" || !session?.user?.email) return;

    const authMatch = storeUsers.find((u) => u.email === session.user.email);
    if (authMatch) {
      setAuthUser(authMatch);
      // Only set currentUser on first load (don't override view-as selection)
      if (!currentUser) {
        setCurrentUser(authMatch);
      }
    }
  }, [hydrated, storeUsers, session, status, setAuthUser, setCurrentUser, currentUser]);

  // Keep currentUser synced with store data after hydration refreshes
  useEffect(() => {
    if (!hydrated || storeUsers.length === 0 || !currentUser) return;
    const match = storeUsers.find((u) => u.id === currentUser.id);
    if (match && (match.name !== currentUser.name || match.role !== currentUser.role)) {
      setCurrentUser(match);
    }
  }, [hydrated, storeUsers, currentUser, setCurrentUser]);

  // Cycle loading messages while the app is initialising
  useEffect(() => {
    const isLoading = status === "loading" || !hydrated || !currentUser;
    if (!isLoading) return;
    const t = setInterval(
      () => setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length),
      2000
    );
    return () => clearInterval(t);
  }, [status, hydrated, currentUser]);

  const switchUser = useCallback(
    (u: User) => {
      setCurrentUser(u);
    },
    [setCurrentUser]
  );

  // Auth pages — no sidebar/chrome
  const isAuthPage = pathname === "/login" || pathname === "/unauthorised" || pathname.startsWith("/demo");
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Still loading session or hydrating
  if (status === "loading" || !hydrated || !currentUser) {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-updraft-deep via-updraft-bar to-updraft-bright-purple">
        {/* Depth orbs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-updraft-bright-purple/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-purple-950/40 blur-3xl" />
        </div>

        <div className="relative flex flex-col items-center gap-5 animate-entrance">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/loading-logo.jpeg"
            alt="Updraft"
            className="h-14 w-14 rounded-2xl ring-2 ring-white/25 shadow-lg object-cover animate-pulse"
            style={{ animationDuration: "2s" }}
          />
          {hydrateError ? (
            <>
              <p className="text-sm font-medium text-red-200">Failed to load data</p>
              <p className="text-xs text-white/75 max-w-xs text-center">{hydrateError}</p>
              <button
                onClick={() => hydrate()}
                className="mt-2 rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-sm font-medium text-white hover:bg-white/20 transition-colors"
              >
                Retry
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <p className="text-sm text-white/75 transition-opacity duration-500">
                {LOADING_MESSAGES[loadingMsgIdx]}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Global animated grid background — fixed, behind all content */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.12}
          duration={4}
          repeatDelay={1}
          style={{
            fill: "rgba(103,58,183,0.04)",
            stroke: "rgba(103,58,183,0.07)",
            color: "#9575CD",
          }}
          className={cn(
            "[mask-image:radial-gradient(900px_circle_at_50%_20%,white,transparent)]",
            "inset-0 h-full",
          )}
        />
      </div>
      <div className="flex h-screen overflow-hidden">
        {/* Mobile backdrop — closes sidebar on tap outside */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <Sidebar
          currentUser={currentUser}
          collapsed={isMobile ? false : !sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          onSwitchUser={switchUser}
          onSearch={() => setSearchOpen(true)}
        />
        <main
          ref={mainRef}
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            isMobile ? "ml-0" : sidebarOpen ? "ml-64" : "ml-16"
          }`}
        >
          {/* Mobile hamburger header */}
          {isMobile && (
            <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white/90 backdrop-blur-sm px-4 py-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
                aria-label="Open navigation menu"
              >
                <Menu size={20} className="text-gray-600" />
              </button>
              <span className="flex-1 text-sm font-semibold text-updraft-deep font-poppins">Meridian</span>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
                aria-label="Search"
              >
                <Search size={18} className="text-gray-600" />
              </button>
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                className="relative rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell size={18} className="text-gray-600" />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </button>
            </div>
          )}
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-updraft-bright-purple border-t-transparent" />
              </div>
            }>
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={prefersReduced ? false : { opacity: 0 }}
                  animate={prefersReduced ? false : { opacity: 1 }}
                  exit={prefersReduced ? undefined : { opacity: 0 }}
                  transition={{ duration: prefersReduced ? 0 : 0.15 }}
                  className="p-6 max-w-[1400px] mx-auto"
                >
                  <Breadcrumb />
                  {children}
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </main>
        <ScrollToTop />
        <NavigationBackButton sidebarOpen={sidebarOpen} />
        <SaveStatusIndicator />
      </div>
      {/* Desktop notification bell — fixed top-right */}
      {!isMobile && (
        <button
          type="button"
          onClick={() => setNotifOpen((v) => !v)}
          className="fixed top-3 right-4 z-[9990] flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white/90 shadow-sm hover:bg-gray-50 transition-colors backdrop-blur-sm"
          aria-label="Notifications"
        >
          <Bell size={16} className="text-gray-600" />
          {notifCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {notifCount > 9 ? "9+" : notifCount}
            </span>
          )}
        </button>
      )}
      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <Toaster position="top-right" richColors closeButton toastOptions={{ style: { zIndex: 99999 } }} style={{ zIndex: 99999 }} />
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Meridian</title>
        <meta name="description" content="Chief Compliance & Risk Officer Dashboard — governance, risk and controls management" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Meridian" />
        <meta property="og:description" content="Chief Compliance & Risk Officer Dashboard" />
        <meta property="og:type" content="website" />
        <link rel="icon" href="/helloupdraft_logo.jpeg" />
        <link rel="apple-touch-icon" href="/helloupdraft_logo.jpeg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#311B92" />
      </head>
      <body className="font-inter antialiased bg-bg-light text-text-primary">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SessionProvider>
            <AppShell>{children}</AppShell>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
