"use client";

import {
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  Cpu,
  Layers,
  Pencil,
  RefreshCw,
  Tag,
  Timer,
  User,
  Zap,
} from "lucide-react";
import MaturityBadge, { MaturityBar } from "./MaturityBadge";
import { cn, formatDate } from "@/lib/utils";
import type { Process } from "@/lib/types";
import {
  AUTOMATION_LEVEL_LABELS,
  MATURITY_COLOURS,
  MATURITY_LABELS,
  PROCESS_CATEGORY_LABELS,
  PROCESS_CRITICALITY_COLOURS,
  PROCESS_CRITICALITY_LABELS,
  PROCESS_FREQUENCY_LABELS,
  PROCESS_STATUS_COLOURS,
  PROCESS_STATUS_LABELS,
  PROCESS_TYPE_LABELS,
} from "@/lib/types";

interface Props {
  process: Process;
  onEdit: () => void;
  onNavigateTab: (tab: string) => void;
  isCCRO: boolean;
}

interface CriterionDef {
  label: string;
  buttonLabel: string;
  kind: "edit" | "tab";
  tab?: string;
}

const MATURITY_CRITERIA: Record<number, CriterionDef[]> = {
  1: [{ label: "Assign an owner, add description and purpose", kind: "edit", buttonLabel: "Edit details" }],
  2: [
    { label: "Link to a policy", kind: "tab", tab: "policies", buttonLabel: "→ Policies" },
    { label: "Link to a regulation", kind: "tab", tab: "regulations", buttonLabel: "→ Regulations" },
  ],
  3: [
    { label: "Link controls", kind: "tab", tab: "controls", buttonLabel: "→ Controls" },
    { label: "Link risks", kind: "tab", tab: "risks", buttonLabel: "→ Risks" },
    { label: "Add process steps", kind: "tab", tab: "steps", buttonLabel: "→ Steps" },
  ],
  4: [{ label: "Link to an Important Business Service, set SLA, assign SMF", kind: "tab", tab: "ibs", buttonLabel: "→ IBS" }],
  5: [],
};

function Field({
  icon,
  label,
  value,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
        {icon}
        {label}
      </label>
      {children ?? <p className="text-sm text-gray-800 mt-0.5">{value}</p>}
    </div>
  );
}

export default function ProcessOverviewTab({ process, onEdit, onNavigateTab, isCCRO }: Props) {
  const score = Math.min(5, Math.max(1, process.maturityScore));
  const colours = MATURITY_COLOURS[score];
  const nextCriteria = MATURITY_CRITERIA[score] ?? [];
  const ibsLinks = process.ibsLinks ?? [];

  return (
    <div className="space-y-6">
      {/* Edit button */}
      <div className="flex justify-end">
        {isCCRO && (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Pencil size={12} /> Edit Process
          </button>
        )}
      </div>

      {/* Metadata grid */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Process Details
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4">
          <Field
            icon={<User size={12} className="text-updraft-bright-purple" />}
            label="Owner"
            value={process.owner?.name ?? "—"}
          />
          <Field
            icon={<Layers size={12} className="text-updraft-bright-purple" />}
            label="Category"
            value={PROCESS_CATEGORY_LABELS[process.category]}
          />
          <Field
            icon={<Tag size={12} className="text-updraft-bright-purple" />}
            label="Process Type"
            value={PROCESS_TYPE_LABELS[process.processType]}
          />
          <Field
            icon={<AlertTriangle size={12} className="text-updraft-bright-purple" />}
            label="Criticality"
          >
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mt-0.5",
                PROCESS_CRITICALITY_COLOURS[process.criticality].bg,
                PROCESS_CRITICALITY_COLOURS[process.criticality].text,
              )}
            >
              {PROCESS_CRITICALITY_LABELS[process.criticality]}
            </span>
          </Field>
          <Field
            icon={<Tag size={12} className="text-updraft-bright-purple" />}
            label="Status"
          >
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mt-0.5",
                PROCESS_STATUS_COLOURS[process.status].bg,
                PROCESS_STATUS_COLOURS[process.status].text,
              )}
            >
              {PROCESS_STATUS_LABELS[process.status]}
            </span>
          </Field>
          <Field
            icon={<RefreshCw size={12} className="text-updraft-bright-purple" />}
            label="Frequency"
            value={PROCESS_FREQUENCY_LABELS[process.frequency]}
          />
          <Field
            icon={<Cpu size={12} className="text-updraft-bright-purple" />}
            label="Automation Level"
            value={AUTOMATION_LEVEL_LABELS[process.automationLevel]}
          />
          <Field
            icon={<Tag size={12} className="text-updraft-bright-purple" />}
            label="Version"
            value={process.version}
          />
          <Field
            icon={<Calendar size={12} className="text-updraft-bright-purple" />}
            label="Effective Date"
            value={process.effectiveDate ? formatDate(process.effectiveDate) : "—"}
          />
          <Field
            icon={<Calendar size={12} className="text-updraft-bright-purple" />}
            label="Next Review"
            value={process.nextReviewDate ? formatDate(process.nextReviewDate) : "—"}
          />
          <Field
            icon={<Timer size={12} className="text-updraft-bright-purple" />}
            label="End-to-End SLA"
            value={
              process.endToEndSlaDays != null
                ? `${process.endToEndSlaDays} day${process.endToEndSlaDays !== 1 ? "s" : ""}`
                : "—"
            }
          />
          <Field
            icon={<Building2 size={12} className="text-updraft-bright-purple" />}
            label="SMF Function"
            value={process.smfFunction ?? "—"}
          />
        </div>
      </div>

      {/* Prescribed Responsibilities */}
      {process.prescribedResponsibilities.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Prescribed Responsibilities
          </label>
          <div className="flex flex-wrap gap-1.5">
            {process.prescribedResponsibilities.map((r) => (
              <span
                key={r}
                className="rounded-full bg-updraft-pale-purple/40 text-updraft-deep px-2.5 py-0.5 text-xs font-medium"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* IBS section */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Important Business Services
        </label>
        {ibsLinks.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {ibsLinks.map((link) => {
              const ibs = link.ibs;
              if (!ibs) return null;
              return (
                <span
                  key={link.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-updraft-pale-purple/40 text-updraft-deep px-3 py-1 text-xs font-medium"
                >
                  <span className="font-mono font-bold">{ibs.reference}</span>
                  <span>{ibs.name}</span>
                  {ibs.maxTolerableDisruptionHours != null && (
                    <span className="rounded-full bg-updraft-deep/10 px-1.5 py-0.5 text-[10px] font-semibold">
                      MTD: {ibs.maxTolerableDisruptionHours}h
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800 leading-relaxed">
              Not mapped to any Important Business Service — FCA PS21/3 may require this.
            </p>
          </div>
        )}
      </div>

      {/* Maturity card */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Process Maturity
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl font-bold",
                colours.bg,
                colours.text,
              )}
            >
              {score}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-bold", colours.text)}>
                L{score} — {MATURITY_LABELS[score]}
              </p>
              <div className="mt-1.5">
                <MaturityBar score={score} />
              </div>
              <div className="mt-1.5">
                <MaturityBadge score={score} size="sm" />
              </div>
            </div>
          </div>
          {score < 5 ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-1.5">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                To reach L{score + 1}
              </p>
              <ul className="space-y-1.5">
                {nextCriteria.map((c) => (
                  <li key={c.label} className="flex items-center justify-between gap-2">
                    <div className="flex items-start gap-2 text-xs text-gray-700">
                      <Clock size={11} className="mt-0.5 shrink-0 text-gray-400" />
                      {c.label}
                    </div>
                    <button
                      onClick={() => c.kind === "edit" ? onEdit() : onNavigateTab(c.tab!)}
                      className="shrink-0 text-[10px] font-medium text-updraft-deep border border-updraft-pale-purple/50 bg-updraft-pale-purple/10 hover:bg-updraft-pale-purple/20 rounded px-2 py-0.5 transition-colors whitespace-nowrap"
                    >
                      {c.buttonLabel}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2">
              <Zap size={13} className="text-green-600 shrink-0" />
              <p className="text-xs text-green-700 font-medium">
                Fully optimised — all criteria met
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Text fields — shown only if non-null */}
      {process.scope && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Scope
          </label>
          <p className="text-sm text-gray-700 whitespace-pre-line">{process.scope}</p>
        </div>
      )}
      {process.purpose && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Purpose
          </label>
          <p className="text-sm text-gray-700 whitespace-pre-line">{process.purpose}</p>
        </div>
      )}
      {process.description && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Description
          </label>
          <p className="text-sm text-gray-700 whitespace-pre-line">{process.description}</p>
        </div>
      )}
      {process.triggerDescription && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Trigger Description
          </label>
          <p className="text-sm text-gray-700 whitespace-pre-line">{process.triggerDescription}</p>
        </div>
      )}
      {process.inputs && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Inputs
          </label>
          <p className="text-sm text-gray-700 whitespace-pre-line">{process.inputs}</p>
        </div>
      )}
      {process.outputs && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Outputs
          </label>
          <p className="text-sm text-gray-700 whitespace-pre-line">{process.outputs}</p>
        </div>
      )}
      {process.escalationPath && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Escalation Path
          </label>
          <p className="text-sm text-gray-700 whitespace-pre-line">{process.escalationPath}</p>
        </div>
      )}
      {process.exceptions && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Exceptions
          </label>
          <p className="text-sm text-gray-700 whitespace-pre-line">{process.exceptions}</p>
        </div>
      )}
    </div>
  );
}
