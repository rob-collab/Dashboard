"use client";

import { useState, useCallback, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import type { Risk, RiskControl, RiskMitigation } from "@/lib/types";
import { getRiskScore, getRiskLevel } from "@/lib/risk-categories";
import RiskHeatmap from "@/components/risk-register/RiskHeatmap";
import RiskTable from "@/components/risk-register/RiskTable";
import RiskDetailPanel from "@/components/risk-register/RiskDetailPanel";
import RiskHistoryChart from "@/components/risk-register/RiskHistoryChart";
import { Grid3X3, List, Plus, Download, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";

type ViewTab = "heatmap" | "table";
type ScoreMode = "inherent" | "residual" | "overlay";
type CardFilter = "ALL" | "VERY_HIGH" | "HIGH" | "WORSENING" | "IMPROVING";

function getScore(risk: Risk, mode: ScoreMode): number {
  if (mode === "inherent") return getRiskScore(risk.inherentLikelihood, risk.inherentImpact);
  return getRiskScore(risk.residualLikelihood, risk.residualImpact);
}

export default function RiskRegisterPage() {
  const { risks, addRisk, updateRisk, deleteRisk, currentUser } = useAppStore();
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
          owner: data.owner ?? "",
          inherentLikelihood: data.inherentLikelihood ?? 3,
          inherentImpact: data.inherentImpact ?? 3,
          residualLikelihood: data.residualLikelihood ?? 2,
          residualImpact: data.residualImpact ?? 2,
          controlEffectiveness: data.controlEffectiveness ?? null,
          riskAppetite: data.riskAppetite ?? null,
          directionOfTravel: data.directionOfTravel ?? "STABLE",
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

  const handleDelete = useCallback(
    (id: string) => {
      deleteRisk(id);
      setPanelOpen(false);
      setSelectedRisk(null);
    },
    [deleteRisk]
  );

  const handleExportCSV = useCallback(() => {
    const headers = ["Reference", "Name", "Category L1", "Category L2", "Owner", "Inherent L", "Inherent I", "Inherent Score", "Residual L", "Residual I", "Residual Score", "Direction", "Last Reviewed"];
    const rows = risks.map((r) => [
      r.reference, r.name, r.categoryL1, r.categoryL2, r.owner,
      r.inherentLikelihood, r.inherentImpact, getRiskScore(r.inherentLikelihood, r.inherentImpact),
      r.residualLikelihood, r.residualImpact, getRiskScore(r.residualLikelihood, r.residualImpact),
      r.directionOfTravel, r.lastReviewed,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
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
