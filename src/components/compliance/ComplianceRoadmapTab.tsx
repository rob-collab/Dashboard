"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import {
  COMPLIANCE_STATUS_COLOURS,
  COMPLIANCE_STATUS_LABELS,
  POLICY_STATUS_COLOURS,
  POLICY_STATUS_LABELS,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Scale,
  BookOpen,
  FlaskConical,
  AlertTriangle,
  Clock,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

interface RoadmapItem {
  id: string;
  type: "regulation" | "policy" | "control";
  label: string;
  sublabel: string;
  dueDate: Date;
  status: string;
  statusLabel: string;
  statusColour: { bg: string; text: string };
  href: string;
  priority: "overdue" | "this_month" | "next_3_months" | "later";
}

const BUCKET_CONFIG = {
  overdue: {
    label: "Overdue",
    description: "Review dates in the past",
    icon: AlertTriangle,
    colour: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    headerBg: "bg-red-100",
  },
  this_month: {
    label: "This Month",
    description: "Due within 30 days",
    icon: Clock,
    colour: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    headerBg: "bg-amber-100",
  },
  next_3_months: {
    label: "Next 3 Months",
    description: "Due in 1–3 months",
    icon: CalendarCheck,
    colour: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    headerBg: "bg-blue-100",
  },
  later: {
    label: "Later",
    description: "Due in more than 3 months",
    icon: CalendarRange,
    colour: "text-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-200",
    headerBg: "bg-gray-100",
  },
} as const;

function classifyDate(date: Date, today: Date): RoadmapItem["priority"] {
  const diffMs = date.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 30) return "this_month";
  if (diffDays <= 90) return "next_3_months";
  return "later";
}

const TYPE_ICON = {
  regulation: Scale,
  policy: BookOpen,
  control: FlaskConical,
};

const TYPE_COLOUR = {
  regulation: "text-indigo-500",
  policy: "text-blue-500",
  control: "text-purple-500",
};

export default function ComplianceRoadmapTab() {
  const regulations = useAppStore((s) => s.regulations);
  const policies = useAppStore((s) => s.policies);
  const controls = useAppStore((s) => s.controls);

  const today = useMemo(() => new Date(), []);

  const items = useMemo((): RoadmapItem[] => {
    const out: RoadmapItem[] = [];

    // Regulations with nextReviewDate
    for (const reg of regulations) {
      if (!reg.isApplicable || !reg.isActive) continue;
      if (!reg.nextReviewDate) continue;
      const due = new Date(reg.nextReviewDate);
      const cfg = COMPLIANCE_STATUS_COLOURS[reg.complianceStatus];
      out.push({
        id: reg.id,
        type: "regulation",
        label: reg.name,
        sublabel: reg.reference,
        dueDate: due,
        status: reg.complianceStatus,
        statusLabel: COMPLIANCE_STATUS_LABELS[reg.complianceStatus],
        statusColour: cfg ?? { bg: "bg-gray-100", text: "text-gray-600" },
        href: `/compliance?tab=regulatory-universe&regulation=${reg.id}`,
        priority: classifyDate(due, today),
      });
    }

    // Policies with nextReviewDate
    for (const pol of policies) {
      if (pol.status === "ARCHIVED") continue;
      if (!pol.nextReviewDate) continue;
      const due = new Date(pol.nextReviewDate);
      const cfg = POLICY_STATUS_COLOURS[pol.status];
      out.push({
        id: pol.id,
        type: "policy",
        label: pol.name,
        sublabel: pol.reference,
        dueDate: due,
        status: pol.status,
        statusLabel: POLICY_STATUS_LABELS[pol.status],
        statusColour: cfg,
        href: `/compliance?tab=policies&policy=${pol.id}`,
        priority: classifyDate(due, today),
      });
    }

    // Controls — compute next test date from last test result + frequency
    const FREQ_MONTHS: Record<string, number> = {
      MONTHLY: 1, QUARTERLY: 3, BI_ANNUAL: 6, ANNUAL: 12,
    };
    for (const ctrl of controls) {
      if (!ctrl.isActive) continue;
      const sched = ctrl.testingSchedule;
      if (!sched) continue;
      const testResults = (sched.testResults ?? []).sort((a, b) => b.testedDate.localeCompare(a.testedDate));
      const baseDate = testResults.length > 0 ? new Date(testResults[0].testedDate) : new Date(sched.addedAt);
      const monthsAhead = FREQ_MONTHS[sched.testingFrequency] ?? 3;
      const due = new Date(baseDate);
      due.setMonth(due.getMonth() + monthsAhead);
      // Determine status from most recent attestation
      const latestAtt = (ctrl.attestations ?? []).sort((a, b) => b.attestedAt.localeCompare(a.attestedAt))[0];
      const status = latestAtt
        ? (latestAtt.issuesFlagged ? "ISSUES_FLAGGED" : "CLEAR")
        : "NOT_TESTED";
      const colour =
        status === "CLEAR"
          ? { bg: "bg-green-100", text: "text-green-700" }
          : status === "ISSUES_FLAGGED"
          ? { bg: "bg-amber-100", text: "text-amber-700" }
          : { bg: "bg-gray-100", text: "text-gray-600" };
      const statusLabel = status === "CLEAR" ? "Clear" : status === "ISSUES_FLAGGED" ? "Issues flagged" : "Not tested";
      out.push({
        id: ctrl.id,
        type: "control",
        label: ctrl.controlName,
        sublabel: ctrl.controlRef,
        dueDate: due,
        status,
        statusLabel,
        statusColour: colour,
        href: `/controls?control=${ctrl.id}`,
        priority: classifyDate(due, today),
      });
    }

    // Sort within each bucket: by due date ascending
    return out.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [regulations, policies, controls, today]);

  const buckets = useMemo(() => {
    const b: Record<RoadmapItem["priority"], RoadmapItem[]> = {
      overdue: [],
      this_month: [],
      next_3_months: [],
      later: [],
    };
    for (const item of items) b[item.priority].push(item);
    return b;
  }, [items]);

  const order: RoadmapItem["priority"][] = ["overdue", "this_month", "next_3_months", "later"];
  const total = items.length;
  const overdueCount = buckets.overdue.length;

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Compliance Roadmap</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Upcoming review and assessment deadlines across regulations, policies, and controls.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {overdueCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
              <AlertTriangle size={13} />
              {overdueCount} overdue
            </span>
          )}
          <span className="text-xs text-gray-400">{total} item{total !== 1 ? "s" : ""} total</span>
        </div>
      </div>

      {total === 0 ? (
        <div className="py-16 text-center">
          <CalendarCheck size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">No review dates set.</p>
          <p className="text-xs text-gray-400 mt-1">
            Add <code className="text-[11px] bg-gray-100 px-1 rounded">nextReviewDate</code> to regulations and policies to populate the roadmap.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {order.map((bucket) => {
            const bItems = buckets[bucket];
            if (bItems.length === 0) return null;
            const cfg = BUCKET_CONFIG[bucket];
            const BucketIcon = cfg.icon;
            return (
              <div key={bucket} className={cn("rounded-xl border overflow-hidden", cfg.border)}>
                {/* Bucket header */}
                <div className={cn("flex items-center gap-3 px-4 py-3", cfg.headerBg)}>
                  <BucketIcon size={16} className={cfg.colour} />
                  <div className="flex-1">
                    <span className={cn("text-sm font-semibold", cfg.colour)}>{cfg.label}</span>
                    <span className="ml-2 text-xs text-gray-500">{cfg.description}</span>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", cfg.bg, cfg.colour)}>
                    {bItems.length}
                  </span>
                </div>

                {/* Items */}
                <div className={cn("divide-y", cfg.border)}>
                  {bItems.map((item) => {
                    const Icon = TYPE_ICON[item.type];
                    const typeColour = TYPE_COLOUR[item.type];
                    const daysAway = Math.round((item.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const dueDateStr = item.dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="flex items-center gap-3 bg-white px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <Icon size={16} className={cn("shrink-0", typeColour)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.label}</p>
                          <p className="text-xs text-gray-400">{item.sublabel}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", item.statusColour.bg, item.statusColour.text)}>
                            {item.statusLabel}
                          </span>
                          <div className="text-right">
                            <p className="text-xs font-medium text-gray-700">{dueDateStr}</p>
                            <p className={cn("text-[10px]", daysAway < 0 ? "text-red-600 font-semibold" : "text-gray-400")}>
                              {daysAway < 0
                                ? `${Math.abs(daysAway)}d overdue`
                                : daysAway === 0
                                ? "Due today"
                                : `${daysAway}d to go`}
                            </p>
                          </div>
                          <ChevronRightIcon />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-gray-300 shrink-0">
      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
