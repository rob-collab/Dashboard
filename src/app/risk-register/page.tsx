"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import type { Risk, RiskControl, RiskMitigation } from "@/lib/types";
import { getRiskScore, getRiskLevel } from "@/lib/risk-categories";
import RiskHeatmap from "@/components/risk-register/RiskHeatmap";
import RiskTable from "@/components/risk-register/RiskTable";
import RiskDetailPanel from "@/components/risk-register/RiskDetailPanel";
import { Grid3X3, List, Plus, Download, ShieldAlert } from "lucide-react";

type ViewTab = "heatmap" | "table";

export default function RiskRegisterPage() {
  const { risks, addRisk, updateRisk, deleteRisk, currentUser } = useAppStore();
  const [viewTab, setViewTab] = useState<ViewTab>("heatmap");
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [isNewRisk, setIsNewRisk] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const isReadOnly = currentUser?.role === "VIEWER";

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

  // Summary stats
  const totalRisks = risks.length;
  const veryHighCount = risks.filter((r) => getRiskLevel(getRiskScore(r.residualLikelihood, r.residualImpact)).level === "Very High").length;
  const highCount = risks.filter((r) => getRiskLevel(getRiskScore(r.residualLikelihood, r.residualImpact)).level === "High").length;
  const improvingCount = risks.filter((r) => r.directionOfTravel === "IMPROVING").length;

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
      <div className="grid grid-cols-4 gap-4">
        <div className="bento-card p-4">
          <div className="text-2xl font-bold text-gray-900">{totalRisks}</div>
          <div className="text-xs text-gray-500">Total Risks</div>
        </div>
        <div className="bento-card p-4">
          <div className="text-2xl font-bold text-red-600">{veryHighCount}</div>
          <div className="text-xs text-gray-500">Very High (Residual)</div>
        </div>
        <div className="bento-card p-4">
          <div className="text-2xl font-bold text-orange-600">{highCount}</div>
          <div className="text-xs text-gray-500">High (Residual)</div>
        </div>
        <div className="bento-card p-4">
          <div className="text-2xl font-bold text-green-600">{improvingCount}</div>
          <div className="text-xs text-gray-500">Improving</div>
        </div>
      </div>

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
          <RiskHeatmap risks={risks} onRiskClick={handleRiskClick} />
        ) : (
          <RiskTable risks={risks} onRiskClick={handleRiskClick} />
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
        />
      )}
    </div>
  );
}
