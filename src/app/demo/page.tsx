"use client";

import { cn } from "@/lib/utils";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";

function MockDashboard() {
  return (
    <div className="w-full max-w-5xl px-8 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-updraft-deep font-poppins">Risk Overview</h2>
          <p className="text-sm text-gray-500 mt-0.5">Q2 2025 · Updated today</p>
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded-lg bg-updraft-bright-purple/10 border border-updraft-bright-purple/20" />
          <div className="h-8 w-24 rounded-lg bg-updraft-bright-purple text-white text-xs flex items-center justify-center font-medium">+ Add Risk</div>
        </div>
      </div>

      {/* Bento stat row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Risks", value: "42", sub: "↑ 3 this week", color: "border-gray-200" },
          { label: "High / Critical", value: "9", sub: "Requires review", color: "border-red-200 bg-red-50/50" },
          { label: "Controls Active", value: "87", sub: "94% coverage", color: "border-green-200 bg-green-50/50" },
          { label: "Overdue Actions", value: "6", sub: "Assigned to you", color: "border-amber-200 bg-amber-50/50" },
        ].map((card) => (
          <div key={card.label} className={cn("rounded-xl border p-4 bg-white/70 backdrop-blur-sm shadow-sm", card.color)}>
            <p className="text-xs text-gray-500 font-medium">{card.label}</p>
            <p className="text-3xl font-bold text-updraft-deep font-poppins mt-1">{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Table mock */}
      <div className="rounded-xl border border-gray-200 bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-updraft-deep">Top Risks</span>
          <span className="text-xs text-updraft-bright-purple cursor-pointer">View all →</span>
        </div>
        {[
          { id: "R-001", name: "Third-party data breach", owner: "J. Smith", rag: "bg-red-500", status: "Open" },
          { id: "R-004", name: "Regulatory reporting delay", owner: "A. Patel", rag: "bg-amber-400", status: "In Progress" },
          { id: "R-007", name: "Model risk — credit scoring", owner: "L. Chen", rag: "bg-amber-400", status: "In Progress" },
          { id: "R-012", name: "DSAR response SLA breach", owner: "M. Torres", rag: "bg-green-500", status: "Mitigated" },
        ].map((row) => (
          <div key={row.id} className="flex items-center gap-4 px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-white/80 transition-colors">
            <span className="text-xs font-mono text-gray-400 w-12">{row.id}</span>
            <span className="flex-1 text-sm text-gray-700 truncate">{row.name}</span>
            <span className="text-xs text-gray-400 w-20 truncate">{row.owner}</span>
            <span className={cn("h-2 w-2 rounded-full flex-shrink-0", row.rag)} />
            <span className="text-xs text-gray-500 w-20 text-right">{row.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* ── Option A: Aurora ─────────────────────────────────────── */}
      <div className="aurora-bg relative flex flex-col items-center border-b border-gray-200 overflow-hidden min-h-[600px]">
        <div className="w-full max-w-5xl px-8 pt-8 pb-2">
          <span className="inline-block rounded-full bg-updraft-bright-purple/10 border border-updraft-bright-purple/20 px-3 py-1 text-xs font-semibold text-updraft-bright-purple tracking-wide uppercase">
            Option A — Aurora
          </span>
        </div>
        <MockDashboard />
      </div>

      {/* ── Option B: Animated Grid ──────────────────────────────── */}
      <div className="relative flex flex-col items-center overflow-hidden min-h-[600px] bg-background">
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.12}
          duration={4}
          repeatDelay={1}
          style={{
            fill: "rgba(103,58,183,0.04)",
            stroke: "rgba(103,58,183,0.07)",
            color: "#9575CD",
          }}
          className={cn(
            "[mask-image:radial-gradient(900px_circle_at_50%_20%,white,transparent)]",
            "inset-0 h-full",
          )}
        />
        <div className="relative z-10 w-full max-w-5xl px-8 pt-8 pb-2">
          <span className="inline-block rounded-full bg-updraft-bright-purple/10 border border-updraft-bright-purple/20 px-3 py-1 text-xs font-semibold text-updraft-bright-purple tracking-wide uppercase">
            Option B — Animated Grid
          </span>
        </div>
        <div className="relative z-10 w-full flex flex-col items-center">
          <MockDashboard />
        </div>
      </div>

    </div>
  );
}
