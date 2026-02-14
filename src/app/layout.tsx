"use client";

import "./globals.css";
import { useState, useCallback, useEffect } from "react";
import { AuthContext, DEMO_USERS } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
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

  // Keep Zustand store in sync with local user state
  useEffect(() => {
    setStoreUser(user);
  }, [user, setStoreUser]);

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
              <div className="p-6 max-w-[1400px] mx-auto">{children}</div>
            </main>
          </div>
        </AuthContext.Provider>
      </body>
    </html>
  );
}
