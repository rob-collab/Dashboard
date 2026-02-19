import type { RAGStatus, ReportStatus } from "./types";

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ragColor(status: RAGStatus): string {
  switch (status) {
    case "GOOD": return "text-risk-green";
    case "WARNING": return "text-risk-amber";
    case "HARM": return "text-risk-red";
  }
}

export function ragBgColor(status: RAGStatus): string {
  switch (status) {
    case "GOOD": return "bg-risk-green";
    case "WARNING": return "bg-risk-amber";
    case "HARM": return "bg-risk-red";
  }
}

export function ragLabel(status: RAGStatus): string {
  switch (status) {
    case "GOOD": return "Green — Good Customer Outcome";
    case "WARNING": return "Amber — Possible Detriment";
    case "HARM": return "Red — Harm Identified";
  }
}

export function ragLabelShort(status: RAGStatus): string {
  switch (status) {
    case "GOOD": return "Green";
    case "WARNING": return "Amber";
    case "HARM": return "Red";
  }
}

export function statusColor(status: ReportStatus): string {
  switch (status) {
    case "DRAFT": return "bg-red-100 text-red-700";
    case "PUBLISHED": return "bg-green-100 text-green-700";
    case "ARCHIVED": return "bg-gray-100 text-gray-500";
  }
}

export function statusLabel(status: ReportStatus): string {
  switch (status) {
    case "DRAFT": return "Draft";
    case "PUBLISHED": return "Published";
    case "ARCHIVED": return "Archived";
  }
}

/**
 * Natural sort comparator — sorts strings containing numbers in numeric order.
 * e.g. "CONC 2" < "CONC 10", "R1" < "R2" < "R10", "1.2" < "1.10"
 */
export function naturalCompare(a: string, b: string): number {
  const ax: (string | number)[] = [];
  const bx: (string | number)[] = [];
  a.replace(/(\d+)|(\D+)/g, (_, n, s) => { ax.push(n ? parseInt(n, 10) : s); return ""; });
  b.replace(/(\d+)|(\D+)/g, (_, n, s) => { bx.push(n ? parseInt(n, 10) : s); return ""; });
  for (let i = 0; i < Math.max(ax.length, bx.length); i++) {
    const ai = ax[i] ?? "";
    const bi = bx[i] ?? "";
    if (typeof ai === "number" && typeof bi === "number") {
      if (ai !== bi) return ai - bi;
    } else {
      const cmp = String(ai).localeCompare(String(bi));
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}

export function generateId(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function calculateChange(current: string, previous: string): string {
  const curr = parseFloat(current);
  const prev = parseFloat(previous);
  if (isNaN(curr) || isNaN(prev)) return "";
  const diff = curr - prev;
  const sign = diff > 0 ? "+" : "";
  if (Number.isInteger(diff)) return `${sign}${diff}`;
  return `${sign}${diff.toFixed(1)}`;
}

export function suggestRAG(change: string): RAGStatus {
  const val = parseFloat(change);
  if (isNaN(val)) return "GOOD";
  if (val > 0) return "GOOD";
  if (val === 0) return "GOOD";
  if (val > -5) return "WARNING";
  return "HARM";
}
