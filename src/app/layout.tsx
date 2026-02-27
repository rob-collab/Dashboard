"use client";

import "./globals.css";
import { useState, useCallback, useEffect, Suspense } from "react";
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
import { useAppStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { Menu, Search, Bell } from "lucide-react";
import GlobalSearch from "@/components/common/GlobalSearch";
import KeyboardShortcutsModal from "@/components/common/KeyboardShortcutsModal";
import NotificationDrawer, { useNotificationCount } from "@/components/common/NotificationDrawer";

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
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

  const switchUser = useCallback(
    (u: User) => {
      setCurrentUser(u);
    },
    [setCurrentUser]
  );

  // Auth pages — no sidebar/chrome
  const isAuthPage = pathname === "/login" || pathname === "/unauthorised";
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Still loading session or hydrating
  if (status === "loading" || !hydrated || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/loading-logo.jpeg" alt="Updraft" className="h-14 w-14 rounded-xl object-cover" />
          {hydrateError ? (
            <>
              <p className="text-sm font-medium text-red-600">Failed to load data</p>
              <p className="text-xs text-gray-500 max-w-xs text-center">{hydrateError}</p>
              <button
                onClick={() => hydrate()}
                className="mt-2 rounded-lg bg-updraft-bright-purple px-4 py-2 text-sm font-medium text-white hover:bg-updraft-deep transition-colors"
              >
                Retry
              </button>
            </>
          ) : (
            <>
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-updraft-bright-purple border-t-transparent" />
              <p className="text-sm text-gray-500">Loading...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
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
              <span className="flex-1 text-sm font-semibold text-updraft-deep font-poppins">CCRO Dashboard</span>
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
    <html lang="en">
      <head>
        <title>Updraft CCRO Dashboard</title>
        <meta name="description" content="Chief Compliance & Risk Officer Dashboard — governance, risk and controls management" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Updraft CCRO Dashboard" />
        <meta property="og:description" content="Chief Compliance & Risk Officer Dashboard" />
        <meta property="og:type" content="website" />
        <link rel="icon" href="/helloupdraft_logo.jpeg" />
        <link rel="apple-touch-icon" href="/helloupdraft_logo.jpeg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#311B92" />
      </head>
      <body className="font-inter antialiased bg-bg-light text-text-primary">
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
