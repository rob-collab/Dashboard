"use client";

import "./globals.css";
import { useState, useCallback, useEffect } from "react";
import { Toaster } from "sonner";
import { DEMO_USERS } from "@/lib/auth";
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
  const [user, setUser] = useState<User>(DEMO_USERS[0]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const setStoreUser = useAppStore((s) => s.setCurrentUser);
  const storeUsers = useAppStore((s) => s.users);
  const hydrated = useAppStore((s) => s._hydrated);

  const hydrate = useAppStore((s) => s.hydrate);

  // Keep Zustand store in sync with local user state
  useEffect(() => {
    setStoreUser(user);
  }, [user, setStoreUser]);

  // Hydrate store from API on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // After hydration, sync local user state with hydrated store data
  // This fixes the CEO name persistence bug — if user was edited in DB,
  // the local state will update to reflect the hydrated name/role.
  useEffect(() => {
    if (!hydrated) return;
    const match = storeUsers.find((u) => u.id === user.id);
    if (match && (match.name !== user.name || match.role !== user.role)) {
      setUser(match);
    }
  }, [hydrated, storeUsers, user.id, user.name, user.role]);

  const signIn = useCallback(async () => {
    setLoading(true);
    setUser(DEMO_USERS[0]);
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    setUser(DEMO_USERS[0]);
    setLoading(false);
  }, []);

  const switchUser = useCallback((u: User) => {
    setUser(u);
  }, []);

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
