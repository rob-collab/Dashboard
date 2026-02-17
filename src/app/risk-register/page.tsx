"use client";

import { useState, useCallback, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import type { Risk, RiskControl, RiskMitigation } from "@/lib/types";
import { getRiskScore, getRiskLevel, L1_CATEGORY_COLOURS } from "@/lib/risk-categories";
import RiskHeatmap from "@/components/risk-register/RiskHeatmap";
import RiskTable from "@/components/risk-register/RiskTable";
import RiskDetailPanel from "@/components/risk-register/RiskDetailPanel";
import RiskHistoryChart from "@/components/risk-register/RiskHistoryChart";
import { Grid3X3, List, Plus, Download, ShieldAlert, TrendingDown, TrendingUp, FileText, Bell } from "lucide-react";
import { api } from "@/lib/api-client";

type ViewTab = "heatmap" | "table";
type ScoreMode = "inherent" | "residual" | "overlay";
type CardFilter = "ALL" | "VERY_HIGH" | "HIGH" | "WORSENING" | "IMPROVING";

function getScore(risk: Risk, mode: ScoreMode): number {
  if (mode === "inherent") return getRiskScore(risk.inherentLikelihood, risk.inherentImpact);
  return getRiskScore(risk.residualLikelihood, risk.residualImpact);
}

export default function RiskRegisterPage() {
  const { risks, addRisk, updateRisk, deleteRisk, currentUser, users } = useAppStore();
  const [viewTab, setViewTab] = useState<ViewTab>("heatmap");
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [isNewRisk, setIsNewRisk] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  // Lifted state from heatmap
  const [scoreMode, setScoreMode] = useState<ScoreMode>("residual");

  // Filter state
  const [cardFilter, setCardFilter] = useState<CardFilter>("ALL");
  const [activeCategoryL1, setActiveCategoryL1] = useState<string | null>(null);

  // History chart state
  const [historyRisk, setHistoryRisk] = useState<Risk | null>(null);

  const isCCROTeam = currentUser?.role === "CCRO_TEAM";
  const isReadOnly = currentUser?.role === "VIEWER";

  // Score helper for current mode (inherent/residual — overlay uses residual for cards)
  const effectiveMode = scoreMode === "overlay" ? "residual" : scoreMode;

  // Summary card counts
  const totalRisks = risks.length;
  const veryHighCount = useMemo(
    () => risks.filter((r) => getRiskLevel(getScore(r, effectiveMode)).level === "Very High").length,
    [risks, effectiveMode]
  );
  const highCount = useMemo(
    () => risks.filter((r) => getRiskLevel(getScore(r, effectiveMode)).level === "High").length,
    [risks, effectiveMode]
  );
  const worseningCount = useMemo(
    () => risks.filter((r) => r.directionOfTravel === "DETERIORATING").length,
    [risks]
  );
  const improvingCount = useMemo(
    () => risks.filter((r) => r.directionOfTravel === "IMPROVING").length,
    [risks]
  );

  // Filter pipeline: risks → cardFilter → categoryFilter → displayRisks
  const displayRisks = useMemo(() => {
    let result = risks;

    // Card filter
    switch (cardFilter) {
      case "VERY_HIGH":
        result = result.filter((r) => getRiskLevel(getScore(r, effectiveMode)).level === "Very High");
        break;
      case "HIGH":
        result = result.filter((r) => getRiskLevel(getScore(r, effectiveMode)).level === "High");
        break;
      case "WORSENING":
        result = result.filter((r) => r.directionOfTravel === "DETERIORATING");
        break;
      case "IMPROVING":
        result = result.filter((r) => r.directionOfTravel === "IMPROVING");
        break;
    }

    // Category filter
    if (activeCategoryL1) {
      result = result.filter((r) => r.categoryL1 === activeCategoryL1);
    }

    return result;
  }, [risks, cardFilter, activeCategoryL1, effectiveMode]);

  const handleCardClick = useCallback((filter: CardFilter) => {
    setCardFilter((prev) => (prev === filter ? "ALL" : filter));
  }, []);

  const handleCategoryClick = useCallback((category: string) => {
    setActiveCategoryL1((prev) => (prev === category ? null : category));
  }, []);

  const handleRiskClick = useCallback((risk: Risk) => {
    setSelectedRisk(risk);
    setIsNewRisk(false);
    setPanelOpen(true);
  }, []);

  const handleNewRisk = useCallback(() => {
    setSelectedRisk(null);
    setIsNewRisk(true);
    setPanelOpen(true);
  }, []);

  const handleViewHistory = useCallback((risk: Risk) => {
    setHistoryRisk(risk);
  }, []);

  const handleSave = useCallback(
    (data: Partial<Risk> & { controls?: Partial<RiskControl>[]; mitigations?: Partial<RiskMitigation>[] }) => {
      if (isNewRisk) {
        const newRisk: Risk = {
          id: `risk-${Date.now()}`,
          reference: `R${String(risks.length + 1).padStart(3, "0")}`,
          name: data.name ?? "",
          description: data.description ?? "",
          categoryL1: data.categoryL1 ?? "",
          categoryL2: data.categoryL2 ?? "",
          ownerId: data.ownerId ?? "",
          inherentLikelihood: data.inherentLikelihood ?? 3,
          inherentImpact: data.inherentImpact ?? 3,
          residualLikelihood: data.residualLikelihood ?? 2,
          residualImpact: data.residualImpact ?? 2,
          controlEffectiveness: data.controlEffectiveness ?? null,
          riskAppetite: data.riskAppetite ?? null,
          directionOfTravel: data.directionOfTravel ?? "STABLE",
          reviewFrequencyDays: data.reviewFrequencyDays ?? 90,
          reviewRequested: false,
          lastReviewed: data.lastReviewed ?? new Date().toISOString().split("T")[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: currentUser?.id ?? "",
          updatedBy: currentUser?.id ?? "",
          controls: (data.controls ?? []).map((c, i) => ({
            id: `ctrl-${Date.now()}-${i}`,
            riskId: "",
            description: c.description ?? "",
            controlOwner: c.controlOwner ?? null,
            sortOrder: i,
            createdAt: new Date().toISOString(),
          })),
          mitigations: (data.mitigations ?? []).map((m, i) => ({
            id: `mit-${Date.now()}-${i}`,
            riskId: "",
            action: m.action ?? "",
            owner: m.owner ?? null,
            deadline: m.deadline ?? null,
            status: m.status ?? "OPEN",
            actionId: null,
            createdAt: new Date().toISOString(),
          })),
        };
        addRisk(newRisk);
      } else if (selectedRisk) {
        updateRisk(selectedRisk.id, {
          ...data,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.id ?? "",
        } as Partial<Risk>);
      }
      setPanelOpen(false);
      setSelectedRisk(null);
    },
    [isNewRisk, selectedRisk, risks.length, currentUser, addRisk, updateRisk]
  );

  const handleRequestReview = useCallback(
    async (riskId: string) => {
      try {
        await api<Risk>(`/api/risks/${riskId}/review-request`, { method: "POST" });
        updateRisk(riskId, { reviewRequested: true });
      } catch (err) {
        console.error("Failed to request review:", err);
      }
    },
    [updateRisk]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteRisk(id);
      setPanelOpen(false);
      setSelectedRisk(null);
    },
    [deleteRisk]
  );

  const handleExportHTML = useCallback(() => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Risk Register - ${new Date().toLocaleDateString("en-GB")}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, system-ui, sans-serif; background: #f3f4f6; padding: 2rem; }
    .container { max-width: 1400px; margin: 0 auto; background: white; border-radius: 1rem; padding: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    h1 { font-size: 2rem; font-weight: bold; color: #111827; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
    .subtitle { color: #6b7280; font-size: 0.875rem; margin-bottom: 2rem; }
    .grid-container { display: flex; gap: 2rem; margin-top: 2rem; }
    .heatmap-wrapper { flex: 1; }
    .heatmap { display: grid; grid-template-columns: 4rem repeat(5, 1fr); grid-template-rows: repeat(5, 1fr); gap: 1px; background: #fff; }
    .axis-label { display: flex; align-items: center; justify-content: flex-end; padding-right: 0.5rem; font-size: 0.75rem; font-weight: 600; color: #374151; }
    .axis-sublabel { font-size: 0.625rem; color: #9ca3af; font-weight: normal; }
    .cell { aspect-ratio: 1; min-height: 80px; border: 1px solid rgba(255,255,255,0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; cursor: pointer; transition: transform 0.2s; }
    .cell:hover { transform: scale(1.05); z-index: 10; }
    .cell-score { font-size: 0.75rem; font-weight: bold; }
    .risk-markers { display: flex; flex-wrap: wrap; gap: 0.25rem; justify-content: center; margin-top: 0.25rem; max-width: 90%; }
    .risk-marker { width: 1.25rem; height: 1.25rem; border-radius: 50%; border: 2px solid; display: flex; align-items: center; justify-content: center; font-size: 0.5rem; font-weight: bold; color: white; position: relative; }
    .risk-marker.inherent { background: transparent !important; color: #4b5563 !important; }
    .tooltip { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #111827; color: white; padding: 0.5rem; border-radius: 0.5rem; font-size: 0.75rem; white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity 0.2s; z-index: 50; margin-bottom: 0.5rem; }
    .risk-marker:hover .tooltip { opacity: 1; }
    .legend { width: 14rem; }
    .legend-section { margin-bottom: 1.5rem; }
    .legend-title { font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
    .legend-item { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.375rem; font-size: 0.75rem; color: #4b5563; }
    .legend-swatch { width: 1rem; height: 1rem; border-radius: 0.25rem; flex-shrink: 0; }
    .legend-dot { width: 1rem; height: 1rem; border-radius: 50%; flex-shrink: 0; }
    .x-axis { display: grid; grid-template-columns: 4rem repeat(5, 1fr); gap: 1px; margin-top: 0.5rem; }
    .x-label { text-align: center; font-size: 0.75rem; font-weight: 600; color: #374151; }
    .x-sublabel { font-size: 0.625rem; color: #9ca3af; }
    .axis-title { text-align: center; margin-top: 0.5rem; font-size: 0.75rem; font-weight: 600; color: #6b7280; }
    .y-axis-title { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 0.75rem; font-weight: 600; color: #6b7280; position: absolute; left: -2rem; top: 50%; }
    .risk-list { margin-top: 2rem; }
    .risk-item { border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; cursor: pointer; transition: all 0.2s; }
    .risk-item:hover { background: #f9fafb; border-color: #7B1FA2; }
    .risk-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; }
    .risk-ref { font-weight: bold; color: #311B92; font-family: monospace; }
    .risk-name { font-weight: 600; color: #111827; flex: 1; }
    .score-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: bold; }
    .score-badge.very-high { background: #dc2626; color: white; }
    .score-badge.high { background: #ea580c; color: white; }
    .score-badge.medium { background: #eab308; color: black; }
    .score-badge.low { background: #22c55e; color: white; }
    .risk-desc { color: #6b7280; font-size: 0.875rem; line-height: 1.5; }
    .risk-meta { display: flex; gap: 1.5rem; margin-top: 0.75rem; font-size: 0.75rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <h1>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#311B92" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      Risk Register
    </h1>
    <div class="subtitle">Updraft Risk Management Framework — ${risks.length} risks tracked — Generated ${new Date().toLocaleString("en-GB")}</div>

    <div class="grid-container">
      <div class="heatmap-wrapper">
        <div style="position: relative;">
          <div class="y-axis-title">LIKELIHOOD</div>
          <div class="heatmap">
            ${[5, 4, 3, 2, 1].map((likelihood) => `
              <div class="axis-label">
                <div>
                  <div>${likelihood}</div>
                  <div class="axis-sublabel">${["Almost Certain", "Moderate", "Possible", "Unlikely", "Rare"][5 - likelihood]}</div>
                </div>
              </div>
              ${[1, 2, 3, 4, 5].map((impact) => {
                const score = likelihood * impact;
                const level = getRiskLevel(score);
                const cellRisks = risks.filter((r) =>
                  (scoreMode === "inherent" && r.inherentLikelihood === likelihood && r.inherentImpact === impact) ||
                  (scoreMode === "residual" && r.residualLikelihood === likelihood && r.residualImpact === impact) ||
                  (scoreMode === "overlay" && (
                    (r.inherentLikelihood === likelihood && r.inherentImpact === impact) ||
                    (r.residualLikelihood === likelihood && r.residualImpact === impact)
                  ))
                );
                return `
                  <div class="cell" style="background-color: ${level.colour}30;" onclick="scrollToRisk('${cellRisks[0]?.reference || ""}')">
                    <span class="cell-score" style="color: ${level.colour};">${score}</span>
                    ${cellRisks.length > 0 ? `
                      <div class="risk-markers">
                        ${cellRisks.map((risk) => {
                          const catColour = L1_CATEGORY_COLOURS[risk.categoryL1];
                          const isInherent = scoreMode === "overlay" && risk.inherentLikelihood === likelihood && risk.inherentImpact === impact &&
                                             (risk.inherentLikelihood !== risk.residualLikelihood || risk.inherentImpact !== risk.residualImpact);
                          return `
                            <div class="risk-marker ${isInherent ? 'inherent' : ''}" style="background-color: ${catColour?.fill ?? "#888"}; border-color: ${catColour?.stroke ?? "#666"};">
                              ${risk.reference.replace("R00", "").replace("R0", "")}
                              <div class="tooltip">${risk.reference}: ${risk.name}</div>
                            </div>
                          `;
                        }).join("")}
                      </div>
                    ` : ""}
                  </div>
                `;
              }).join("")}
            `).join("")}
          </div>
          <div class="x-axis">
            <div></div>
            ${[1, 2, 3, 4, 5].map((impact) => `
              <div>
                <div class="x-label">${impact}</div>
                <div class="x-sublabel">${["Negligible", "Minor", "Moderate", "Major", "Significant"][impact - 1]}</div>
              </div>
            `).join("")}
          </div>
          <div class="axis-title">IMPACT</div>
        </div>
      </div>

      <div class="legend">
        <div class="legend-section">
          <div class="legend-title">Risk Level</div>
          ${[
            { label: "Very High (20–25)", colour: "#dc2626" },
            { label: "High (10–16)", colour: "#ea580c" },
            { label: "Medium (5–9)", colour: "#eab308" },
            { label: "Low (1–4)", colour: "#22c55e" },
          ].map((item) => `
            <div class="legend-item">
              <div class="legend-swatch" style="background-color: ${item.colour}40; border: 2px solid ${item.colour};"></div>
              <span>${item.label}</span>
            </div>
          `).join("")}
        </div>

        <div class="legend-section">
          <div class="legend-title">Category</div>
          ${Object.entries(L1_CATEGORY_COLOURS).map(([, { fill, label }]) => `
            <div class="legend-item">
              <div class="legend-dot" style="background-color: ${fill};"></div>
              <span>${label}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </div>

    <div class="risk-list">
      <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Risk Details</h2>
      ${risks.map((risk) => {
        const rScore = getRiskScore(risk.residualLikelihood, risk.residualImpact);
        const rLevel = getRiskLevel(rScore);
        const iScore = getRiskScore(risk.inherentLikelihood, risk.inherentImpact);
        return `
          <div class="risk-item" id="risk-${risk.reference}">
            <div class="risk-header">
              <span class="risk-ref">${risk.reference}</span>
              <span class="risk-name">${risk.name}</span>
              <span class="score-badge ${rLevel.level.toLowerCase().replace(" ", "-")}">${rScore} ${rLevel.level}</span>
            </div>
            <div class="risk-desc">${risk.description}</div>
            <div class="risk-meta">
              <span><strong>Category:</strong> ${risk.categoryL1} / ${risk.categoryL2}</span>
              <span><strong>Owner:</strong> ${risk.riskOwner?.name ?? "Unknown"}</span>
              <span><strong>Inherent:</strong> ${iScore}</span>
              <span><strong>Residual:</strong> ${rScore}</span>
              <span><strong>Direction:</strong> ${risk.directionOfTravel}</span>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  </div>

  <script>
    function scrollToRisk(ref) {
      if (!ref) return;
      const el = document.getElementById('risk-' + ref);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.background = '#E1BEE7';
        setTimeout(() => { el.style.background = ''; }, 2000);
      }
    }
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `risk-register-${new Date().toISOString().split("T")[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [risks, scoreMode]);

  const handleExportCSV = useCallback(() => {
    const headers = ["Reference", "Name", "Description", "Category L1", "Category L2", "Owner", "Inherent L", "Inherent I", "Inherent Score", "Residual L", "Residual I", "Residual Score", "Direction", "Last Reviewed"];
    const rows = risks.map((r) => [
      r.reference, r.name, r.description, r.categoryL1, r.categoryL2, r.riskOwner?.name ?? users.find(u => u.id === r.ownerId)?.name ?? "Unknown",
      r.inherentLikelihood, r.inherentImpact, getRiskScore(r.inherentLikelihood, r.inherentImpact),
      r.residualLikelihood, r.residualImpact, getRiskScore(r.residualLikelihood, r.residualImpact),
      r.directionOfTravel, r.lastReviewed,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `risk-register-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [risks]);

  const scoreModeLabel = effectiveMode === "inherent" ? "Inherent" : "Residual";

  const cards: { key: CardFilter; value: number; label: string; colour: string }[] = [
    { key: "ALL", value: totalRisks, label: "Total Risks", colour: "text-gray-900" },
    { key: "VERY_HIGH", value: veryHighCount, label: `Very High (${scoreModeLabel})`, colour: "text-red-600" },
    { key: "HIGH", value: highCount, label: `High (${scoreModeLabel})`, colour: "text-orange-600" },
    { key: "WORSENING", value: worseningCount, label: "Worsening", colour: "text-red-500" },
    { key: "IMPROVING", value: improvingCount, label: "Improving", colour: "text-green-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-poppins font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-updraft-deep" />
            Risk Register
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Updraft Risk Management Framework — {totalRisks} risks tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportHTML}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Export as standalone HTML file"
          >
            <FileText className="w-4 h-4" />
            Export HTML
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          {!isReadOnly && (
            <button
              onClick={handleNewRisk}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-updraft-deep rounded-lg hover:bg-updraft-bar transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Risk
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        {cards.map((card) => {
          const isActive = cardFilter === card.key;
          const Icon = card.key === "WORSENING" ? TrendingDown : card.key === "IMPROVING" ? TrendingUp : null;
          return (
            <button
              key={card.key}
              onClick={() => handleCardClick(card.key)}
              className={`bento-card p-4 text-left transition-all cursor-pointer hover:shadow-bento-hover ${
                isActive ? "ring-2 ring-updraft-bright-purple/30 bg-updraft-pale-purple/10" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`text-2xl font-bold ${card.colour}`}>{card.value}</div>
                {Icon && <Icon className={`w-5 h-5 ${card.colour} opacity-60`} />}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
            </button>
          );
        })}
      </div>

      {/* Active filters indicator */}
      {(cardFilter !== "ALL" || activeCategoryL1) && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">Filters:</span>
          {cardFilter !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-updraft-pale-purple/30 text-updraft-deep rounded-full font-medium">
              {cards.find((c) => c.key === cardFilter)?.label}
              <button onClick={() => setCardFilter("ALL")} className="hover:text-red-500">&times;</button>
            </span>
          )}
          {activeCategoryL1 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-updraft-pale-purple/30 text-updraft-deep rounded-full font-medium">
              {activeCategoryL1}
              <button onClick={() => setActiveCategoryL1(null)} className="hover:text-red-500">&times;</button>
            </span>
          )}
          <button
            onClick={() => { setCardFilter("ALL"); setActiveCategoryL1(null); }}
            className="text-updraft-bright-purple hover:underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* View Tabs */}
      <div className="bento-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setViewTab("heatmap")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewTab === "heatmap"
                  ? "bg-white text-updraft-deep shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              Heatmap
            </button>
            <button
              onClick={() => setViewTab("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewTab === "table"
                  ? "bg-white text-updraft-deep shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <List className="w-4 h-4" />
              Register
            </button>
          </div>
        </div>

        {viewTab === "heatmap" ? (
          <RiskHeatmap
            risks={displayRisks}
            allRisks={risks}
            onRiskClick={handleRiskClick}
            viewMode={scoreMode}
            onViewModeChange={setScoreMode}
            activeCategoryL1={activeCategoryL1}
            onCategoryClick={handleCategoryClick}
          />
        ) : (
          <RiskTable risks={displayRisks} onRiskClick={handleRiskClick} />
        )}
      </div>

      {/* Request Review button for selected risk (CCRO Team) */}
      {selectedRisk && !isNewRisk && isCCROTeam && !selectedRisk.reviewRequested && panelOpen && (
        <div className="fixed bottom-20 right-8 z-50">
          <button
            onClick={() => handleRequestReview(selectedRisk.id)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-updraft-bright-purple rounded-lg shadow-lg hover:bg-updraft-deep transition-colors"
          >
            <Bell className="w-4 h-4" />
            Request Review
          </button>
        </div>
      )}

      {/* Detail Panel */}
      {panelOpen && (
        <RiskDetailPanel
          risk={selectedRisk}
          isNew={isNewRisk}
          onSave={handleSave}
          onClose={() => { setPanelOpen(false); setSelectedRisk(null); }}
          onDelete={isReadOnly ? undefined : handleDelete}
          onViewHistory={handleViewHistory}
        />
      )}

      {/* History Chart Modal */}
      {historyRisk && (
        <RiskHistoryChart
          risk={historyRisk}
          onClose={() => setHistoryRisk(null)}
        />
      )}
    </div>
  );
}
