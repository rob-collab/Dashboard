/**
 * Shared utilities for action display logic.
 * Single source of truth for STATUS_CONFIG, PRIORITY_CONFIG, dueDateColor,
 * daysUntilDue, and rowBorderColor — used by actions/page.tsx and
 * ActionDetailPanel.tsx to prevent definition drift.
 */

import { AlertTriangle, Circle, Clock, CheckCircle2 } from "lucide-react";
import type { Action, ActionStatus, ActionPriority } from "@/lib/types";

export const ACTION_STATUS_CONFIG: Record<
  ActionStatus,
  { label: string; color: string; bgColor: string; icon: typeof Circle }
> = {
  OPEN: {
    label: "Open",
    color: "text-blue-600",
    bgColor: "bg-blue-100 text-blue-700",
    icon: Circle,
  },
  IN_PROGRESS: {
    label: "In Progress",
    color: "text-amber-600",
    bgColor: "bg-amber-100 text-amber-700",
    icon: Clock,
  },
  COMPLETED: {
    label: "Completed",
    color: "text-green-600",
    bgColor: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  OVERDUE: {
    label: "Overdue",
    color: "text-red-600",
    bgColor: "bg-red-100 text-red-700",
    icon: AlertTriangle,
  },
  PROPOSED_CLOSED: {
    label: "Proposed Closed",
    color: "text-purple-600",
    bgColor: "bg-purple-100 text-purple-700",
    icon: CheckCircle2,
  },
};

export const ACTION_PRIORITY_CONFIG: Record<
  ActionPriority,
  { label: string; color: string; bgColor: string }
> = {
  P1: { label: "P1", color: "text-red-700", bgColor: "bg-red-100 text-red-700" },
  P2: { label: "P2", color: "text-amber-700", bgColor: "bg-amber-100 text-amber-700" },
  P3: { label: "P3", color: "text-slate-600", bgColor: "bg-slate-100 text-slate-600" },
};

/** Days until due date (negative = overdue). Returns null if no due date. */
export function daysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Tailwind text colour class for a due date.
 * - Completed: muted grey
 * - Overdue / 0 days: red
 * - ≤7 days: amber (aligns with "Due this week" dashboard stat)
 * - Otherwise: grey
 */
export function dueDateColor(action: Action): string {
  if (action.status === "COMPLETED") return "text-gray-400";
  if (action.status === "OVERDUE") return "text-red-600 font-semibold";
  const days = daysUntilDue(action.dueDate);
  if (days === null) return "text-gray-400";
  if (days <= 0) return "text-red-600 font-semibold";
  if (days <= 7) return "text-amber-600 font-medium";
  return "text-gray-600";
}

/** Left border accent colour by action priority. */
export function rowBorderColor(action: Action): string {
  if (action.priority === "P1") return "border-l-red-500";
  if (action.priority === "P2") return "border-l-amber-400";
  if (action.priority === "P3") return "border-l-green-400";
  return "border-l-gray-200";
}
