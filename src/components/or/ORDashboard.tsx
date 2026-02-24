"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { ShieldCheck, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import RegulatoryCalendarWidget from "./RegulatoryCalendarWidget";

interface IBSStat {
  id: string;
  reference: string;
  name: string;
  smfAccountable: string | null;
  maxTolerableDisruptionHours: number | null;
  processCount: number;
  avgMaturity: number;
  categoriesFilled: number;
  lastTestedAt: string | null;
  lastOutcome: "WITHIN_TOLERANCE" | "BREACH" | "NOT_TESTED";
  openRemediations: number;
  readiness: "GREEN" | "AMBER" | "RED";
}

interface UpcomingTest {
  id: string;
  reference: string;
  name: string;
  nextTestDate: string;
  ibs: { reference: string; name: string };
}

interface DashboardData {
  ibs: IBSStat[];
  openRemediationsTotal: number;
  upcomingTests: UpcomingTest[];
  currentAssessment: { id: string; year: number; status: string } | null;
  currentYear: number;
  assessmentReadiness: number | null;
}

const READINESS_COLOURS = {
  GREEN: { dot: "bg-green-500", badge: "bg-green-100 text-green-700", label: "Ready" },
  AMBER: { dot: "bg-amber-400", badge: "bg-amber-100 text-amber-700", label: "Partial" },
  RED:   { dot: "bg-red-500",   badge: "bg-red-100 text-red-700",   label: "Gaps" },
};

export default function ORDashboard({ onSelectIbs }: { onSelectIbs?: (id: string) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<DashboardData>("/api/or/dashboard")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading dashboard…</div>;
  if (!data) return <div className="p-8 text-sm text-red-500">Failed to load dashboard data.</div>;

  const greenCount = data.ibs.filter((i) => i.readiness === "GREEN").length;
  const amberCount = data.ibs.filter((i) => i.readiness === "AMBER").length;
  const redCount   = data.ibs.filter((i) => i.readiness === "RED").length;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<ShieldCheck size={18} className="text-green-600" />} label="IBS Ready" value={`${greenCount}/${data.ibs.length}`} colour="green" />
        <StatCard icon={<AlertTriangle size={18} className="text-red-600" />} label="Open Remediations" value={data.openRemediationsTotal} colour={data.openRemediationsTotal > 0 ? "red" : "green"} />
        <StatCard icon={<Clock size={18} className="text-amber-600" />} label="Tests Due" value={data.upcomingTests.length} colour="amber" />
        <StatCard
          icon={<TrendingUp size={18} className="text-updraft-bright-purple" />}
          label={`${data.currentYear} Assessment`}
          value={data.currentAssessment ? `${data.assessmentReadiness ?? 0}%` : "Not started"}
          colour="purple"
        />
      </div>

      {/* IBS readiness grid */}
      <div>
        <h2 className="font-poppins font-semibold text-gray-900 text-sm mb-3">Important Business Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.ibs.map((ibs) => {
            const col = READINESS_COLOURS[ibs.readiness];
            return (
              <button
                key={ibs.id}
                onClick={() => onSelectIbs?.(ibs.id)}
                className="bento-card text-left hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs text-gray-400 font-mono">{ibs.reference}</span>
                    <p className="font-medium text-gray-900 text-sm leading-tight mt-0.5">{ibs.name}</p>
                    {ibs.smfAccountable && <p className="text-xs text-gray-500 mt-0.5">{ibs.smfAccountable}</p>}
                  </div>
                  <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", col.badge)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", col.dot)} />
                    {col.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-2 border-t border-gray-100 pt-3">
                  <Metric label="Processes" value={ibs.processCount} />
                  <Metric label="Avg Maturity" value={ibs.avgMaturity || "—"} />
                  <Metric label="Categories" value={`${ibs.categoriesFilled}/5`} />
                </div>
                {ibs.maxTolerableDisruptionHours != null && (
                  <p className="text-xs text-gray-400 mt-2 border-t border-gray-100 pt-2">
                    MTD: <span className="font-medium text-gray-600">{ibs.maxTolerableDisruptionHours}h</span>
                    {ibs.lastTestedAt && (
                      <span className="ml-3">Last tested: {new Date(ibs.lastTestedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    )}
                  </p>
                )}
                {ibs.openRemediations > 0 && (
                  <p className="text-xs text-red-600 mt-1 font-medium">{ibs.openRemediations} open remediation{ibs.openRemediations !== 1 ? "s" : ""}</p>
                )}
              </button>
            );
          })}
          {data.ibs.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-400 text-sm">No active IBS records yet.</div>
          )}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming tests */}
        <div className="bento-card">
          <h3 className="font-poppins font-semibold text-gray-900 text-sm mb-3">Upcoming Tests</h3>
          {data.upcomingTests.length === 0 ? (
            <p className="text-sm text-gray-400">No tests scheduled.</p>
          ) : (
            <div className="space-y-2">
              {data.upcomingTests.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-gray-800">{t.name}</span>
                    <span className="text-gray-400 ml-2 text-xs">{t.ibs.reference}</span>
                  </div>
                  <span className="text-xs text-amber-600 font-medium">
                    {new Date(t.nextTestDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Readiness summary */}
        <div className="bento-card">
          <h3 className="font-poppins font-semibold text-gray-900 text-sm mb-3">IBS Readiness Summary</h3>
          <div className="space-y-2">
            {([["GREEN","Ready",greenCount],["AMBER","Partial gaps",amberCount],["RED","Significant gaps",redCount]] as const).map(([key, label, count]) => (
              <div key={key} className="flex items-center gap-2">
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", READINESS_COLOURS[key].dot)} />
                <span className="text-sm text-gray-600 flex-1">{label}</span>
                <span className="text-sm font-semibold text-gray-900">{count}</span>
                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", READINESS_COLOURS[key].dot)}
                    style={{ width: data.ibs.length > 0 ? `${(count / data.ibs.length) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Regulatory Calendar */}
      <RegulatoryCalendarWidget />
    </div>
  );
}

function StatCard({ icon, label, value, colour }: { icon: React.ReactNode; label: string; value: string | number; colour: "green" | "red" | "amber" | "purple" }) {
  const colours = {
    green:  "bg-green-50  border-green-100",
    red:    "bg-red-50    border-red-100",
    amber:  "bg-amber-50  border-amber-100",
    purple: "bg-purple-50 border-purple-100",
  };
  return (
    <div className={cn("bento-card flex items-center gap-3", colours[colour])}>
      <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-poppins font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
