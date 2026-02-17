"use client";

import { createContext, useContext } from "react";
import type { User } from "./types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Demo user for development - replace with Supabase auth in production
export const DEMO_USERS: User[] = [
  {
    id: "user-rob",
    email: "rob@updraft.com",
    name: "Rob",
    role: "CCRO_TEAM",
    assignedMeasures: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: "user-cath",
    email: "cath@updraft.com",
    name: "Cath",
    role: "CCRO_TEAM",
    assignedMeasures: ["1.9", "4.1", "5.1", "5.2", "5.5", "5.8"],
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: "user-ash",
    email: "ash@updraft.com",
    name: "Ash",
    role: "METRIC_OWNER",
    assignedMeasures: ["1.1", "1.3", "1.4", "3.1", "3.6", "3.7"],
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  },
  {
    id: "user-chris",
    email: "chris@updraft.com",
    name: "Chris",
    role: "METRIC_OWNER",
    assignedMeasures: ["1.5", "1.8", "3.3", "3.4", "3.5", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9", "4.10"],
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  },
  {
    id: "user-micha",
    email: "micha@updraft.com",
    name: "Micha",
    role: "METRIC_OWNER",
    assignedMeasures: ["1.2", "1.6", "1.7", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7"],
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  },
  {
    id: "user-david",
    email: "david@updraft.com",
    name: "David",
    role: "METRIC_OWNER",
    assignedMeasures: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  },
  {
    id: "user-ceo",
    email: "ceo@updraft.com",
    name: "CEO",
    role: "VIEWER",
    assignedMeasures: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  },
];
