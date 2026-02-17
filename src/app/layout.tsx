"use client";

import "./globals.css";
import { useState, useCallback, useEffect } from "react";
import { Toaster } from "sonner";
import { DEFAULT_USER_ID } from "@/lib/auth";
import { AuthContext } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useAppStore } from "@/lib/store";
import type { User } from "@/lib/types";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const setStoreUser = useAppStore((s) => s.setCurrentUser);
  const storeUsers = useAppStore((s) => s.users);
  const hydrated = useAppStore((s) => s._hydrated);
  const hydrateError = useAppStore((s) => s._hydrateError);

  const hydrate = useAppStore((s) => s.hydrate);

  // Keep Zustand store in sync with local user state
  useEffect(() => {
    if (user) setStoreUser(user);
  }, [user, setStoreUser]);

  // Hydrate store from API on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // After hydration, pick user from store
  useEffect(() => {
    if (!hydrated || storeUsers.length === 0) return;
    if (!user) {
      // First-time pick: use DEFAULT_USER_ID or first user
      const match = storeUsers.find((u) => u.id === DEFAULT_USER_ID) ?? storeUsers[0];
      setUser(match);
    } else {
      // Sync existing user with hydrated data
      const match = storeUsers.find((u) => u.id === user.id);
      if (match && (match.name !== user.name || match.role !== user.role)) {
        setUser(match);
      }
    }
  }, [hydrated, storeUsers, user]);

  const signIn = useCallback(async () => {
    setLoading(true);
    const first = storeUsers.find((u) => u.id === DEFAULT_USER_ID) ?? storeUsers[0];
    if (first) setUser(first);
    setLoading(false);
  }, [storeUsers]);

  const signOut = useCallback(async () => {
    setLoading(true);
    const first = storeUsers.find((u) => u.id === DEFAULT_USER_ID) ?? storeUsers[0];
    if (first) setUser(first);
    setLoading(false);
  }, [storeUsers]);

  const switchUser = useCallback((u: User) => {
    setUser(u);
  }, []);

  // Loading state while hydrating or no user resolved yet
  if (!hydrated || !user) {
    return (
      <html lang="en">
        <head>
          <title>Updraft CCRO Dashboard</title>
          <meta name="description" content="CCRO Report Management System" />
        </head>
        <body className="font-inter antialiased bg-bg-light text-fca-dark-gray">
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
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <title>Updraft CCRO Dashboard</title>
        <meta name="description" content="CCRO Report Management System" />
      </head>
      <body className="font-inter antialiased bg-bg-light text-fca-dark-gray">
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
          <Toaster position="top-right" richColors closeButton />
          <div className="flex h-screen overflow-hidden">
            <Sidebar
              currentUser={user}
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
        </AuthContext.Provider>
      </body>
    </html>
  );
}
