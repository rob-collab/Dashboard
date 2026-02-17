"use client";

import "./globals.css";
import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { SessionProvider, useSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useAppStore } from "@/lib/store";
import type { User } from "@/lib/types";

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const setAuthUser = useAppStore((s) => s.setAuthUser);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const currentUser = useAppStore((s) => s.currentUser);
  const storeUsers = useAppStore((s) => s.users);
  const hydrated = useAppStore((s) => s._hydrated);
  const hydrateError = useAppStore((s) => s._hydrateError);
  const hydrate = useAppStore((s) => s.hydrate);

  // Hydrate store from API on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

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
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-updraft-deep to-updraft-bright-purple">
            <span className="font-poppins text-xl font-bold text-white">U</span>
          </div>
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
      <Toaster position="top-right" richColors closeButton />
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          currentUser={currentUser}
          collapsed={!sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onSwitchUser={switchUser}
        />
        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarOpen ? "ml-64" : "ml-16"
          }`}
        >
          <ErrorBoundary>
            <div className="p-6 max-w-[1400px] mx-auto">{children}</div>
          </ErrorBoundary>
        </main>
      </div>
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
        <meta name="description" content="CCRO Report Management System" />
      </head>
      <body className="font-inter antialiased bg-bg-light text-fca-dark-gray">
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
