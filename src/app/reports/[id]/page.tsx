"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Download,
  History,
  Calendar,
  User,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Shield,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Users,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { demoSections, demoReports, demoOutcomes, demoVersions } from "@/lib/demo-data";
import VersionList from "@/components/reports/VersionList";
import OutcomeCard from "@/components/consumer-duty/OutcomeCard";
import MeasurePanel from "@/components/consumer-duty/MeasurePanel";
import MIModal from "@/components/consumer-duty/MIModal";
import { cn, formatDate, statusColor, statusLabel } from "@/lib/utils";
import type { ConsumerDutyMeasure, Section } from "@/lib/types";

const ICON_MAP: Record<string, LucideIcon> = {
  TrendingUp, Shield, CheckCircle, AlertTriangle, BarChart3, Users, FileText,
};

function ragCellColor(value: string): string {
  const lower = value.toLowerCase();
  if (lower === "good") return "text-risk-green font-semibold";
  if (lower === "warning" || lower === "amber") return "text-risk-amber font-semibold";
  if (lower === "harm" || lower === "red") return "text-risk-red font-semibold";
  return "";
}

function buildSectionStyle(sc: Section["styleConfig"]): React.CSSProperties {
  const style: React.CSSProperties = {};
  if (sc?.backgroundColor) style.backgroundColor = sc.backgroundColor;
  if (sc?.borderStyle && sc.borderStyle !== "none") {
    const w = `${sc.borderWidth ?? 1}px`;
    const s = sc.borderStyle;
    const c = sc.borderColor ?? "#E5E7EB";
    const borderVal = `${w} ${s} ${c}`;
    if (!sc.borderPosition || sc.borderPosition === "all") {
      style.border = borderVal;
    } else {
      const key = `border${sc.borderPosition.charAt(0).toUpperCase()}${sc.borderPosition.slice(1)}` as "borderLeft" | "borderTop" | "borderBottom";
      style[key] = borderVal;
    }
  }
  if (sc?.borderRadius) style.borderRadius = sc.borderRadius;
  if (sc?.padding) style.padding = `${sc.padding.top}px ${sc.padding.right}px ${sc.padding.bottom}px ${sc.padding.left}px`;
  if (sc?.margin) style.margin = `${sc.margin.top}px ${sc.margin.right}px ${sc.margin.bottom}px ${sc.margin.left}px`;
  return style;
}

export default function ReportViewPage() {
  const params = useParams();
  const reportId = params.id as string;
  const report = useMemo(() => demoReports.find((r) => r.id === reportId) ?? demoReports[0], [reportId]);
  const sections = useMemo(() => demoSections.filter((s) => s.reportId === report.id).sort((a, b) => a.position - b.position), [report.id]);
  const versions = useMemo(() => demoVersions.filter((v) => v.reportId === report.id), [report.id]);
  const outcomes = useMemo(() => demoOutcomes.filter((o) => o.reportId === report.id), [report.id]);

  const [showHistory, setShowHistory] = useState(false);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);
  const [selectedMeasure, setSelectedMeasure] = useState<ConsumerDutyMeasure | null>(null);
  const [openAccordions, setOpenAccordions] = useState<Record<string, number | null>>({});

  const selectedOutcome = outcomes.find((o) => o.id === selectedOutcomeId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link href="/reports" className="rounded-lg p-2 hover:bg-gray-100 transition-colors mt-0.5">
            <ArrowLeft size={18} className="text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-updraft-deep font-poppins">{report.title}</h1>
              <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", statusColor(report.status as "DRAFT" | "PUBLISHED" | "ARCHIVED"))}>
                {statusLabel(report.status as "DRAFT" | "PUBLISHED" | "ARCHIVED")}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-fca-gray">
              <span className="flex items-center gap-1"><Calendar size={14} /> {report.period}</span>
              <span className="flex items-center gap-1"><User size={14} /> {report.createdBy}</span>
              <span>Last updated {formatDate(report.updatedAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/reports/${reportId}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Pencil size={14} /> Edit
          </Link>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Download size={14} /> Export HTML
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              showHistory ? "border-updraft-light-purple bg-updraft-pale-purple/20 text-updraft-deep" : "border-gray-200 text-gray-700 hover:bg-gray-50"
            )}
          >
            <History size={14} /> History
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 space-y-4">
          {sections.map((section) => (
            <div key={section.id} className="bento-card" style={buildSectionStyle(section.styleConfig)}>
              {section.title && (
                <h2 className="text-lg font-bold text-updraft-deep font-poppins mb-4">{section.title}</h2>
              )}

              {/* TEXT_BLOCK */}
              {section.type === "TEXT_BLOCK" && (
                <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-600 prose-a:text-updraft-bright-purple" dangerouslySetInnerHTML={{ __html: (section.content?.html as string) ?? "" }} />
              )}

              {/* DATA_TABLE */}
              {section.type === "DATA_TABLE" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {((section.content?.headers as string[]) ?? []).map((h, i) => (
                          <th key={i} className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {((section.content?.rows as string[][]) ?? []).map((row, ri) => (
                        <tr key={ri} className="hover:bg-gray-50/50">
                          {row.map((cell, ci) => {
                            const headers = (section.content?.headers as string[]) ?? [];
                            const isRagCol = headers[ci]?.toLowerCase().includes("rag") || headers[ci]?.toLowerCase().includes("status");
                            return (
                              <td key={ci} className={cn("border border-gray-200 px-3 py-2", isRagCol && ragCellColor(cell))}>{cell}</td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* CARD_GRID */}
              {section.type === "CARD_GRID" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {((section.content?.cards as Array<{ icon: string; title: string; value: string; subtitle: string }>) ?? []).map((card, i) => {
                    const Icon = ICON_MAP[card.icon] ?? BarChart3;
                    return (
                      <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-updraft-pale-purple/40 p-2">
                            <Icon className="h-5 w-5 text-updraft-bright-purple" />
                          </div>
                          <div>
                            <p className="text-xs text-fca-gray">{card.title}</p>
                            <p className="text-xl font-bold text-updraft-deep">{card.value}</p>
                            <p className="text-xs text-fca-gray">{card.subtitle}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CONSUMER_DUTY_DASHBOARD */}
              {section.type === "CONSUMER_DUTY_DASHBOARD" && (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {outcomes.map((outcome) => (
                      <OutcomeCard
                        key={outcome.id}
                        outcome={outcome}
                        selected={outcome.id === selectedOutcomeId}
                        onClick={() => setSelectedOutcomeId(outcome.id === selectedOutcomeId ? null : outcome.id)}
                      />
                    ))}
                  </div>
                  {selectedOutcome && selectedOutcome.measures && (
                    <div className="animate-slide-up">
                      <MeasurePanel measures={selectedOutcome.measures} onMeasureClick={(m) => setSelectedMeasure(m)} />
                    </div>
                  )}
                </div>
              )}

              {/* ACCORDION */}
              {section.type === "ACCORDION" && (
                <div className="space-y-2">
                  {((section.content?.items as Array<{ title: string; content: string }>) ?? []).map((item, i) => {
                    const isOpen = (openAccordions[section.id] ?? 0) === i;
                    return (
                      <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenAccordions((prev) => ({ ...prev, [section.id]: isOpen ? null : i }))}
                          className={cn(
                            "flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors",
                            isOpen ? "bg-updraft-pale-purple/20 text-updraft-deep" : "bg-white text-gray-700 hover:bg-gray-50"
                          )}
                        >
                          <span>{item.title}</span>
                          {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                        </button>
                        {isOpen && (
                          <div className="border-t border-gray-100 px-4 py-3">
                            <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: item.content }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CHART placeholder */}
              {section.type === "CHART" && (
                <div className="flex items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                  <BarChart3 size={24} className="mr-2" /> Chart visualization
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Version history sidebar */}
        {showHistory && (
          <div className="w-80 shrink-0">
            <div className="bento-card">
              <VersionList
                versions={versions}
                currentVersionId={versions[0]?.id ?? ""}
                onView={() => {}}
                onDownload={() => {}}
                onCompare={() => {}}
              />
            </div>
          </div>
        )}
      </div>

      {/* MI Modal */}
      <MIModal
        measure={selectedMeasure}
        open={!!selectedMeasure}
        onClose={() => setSelectedMeasure(null)}
        editable={false}
      />
    </div>
  );
}
