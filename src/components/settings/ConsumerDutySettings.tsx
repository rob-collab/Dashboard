"use client";

import { useAppStore } from "@/lib/store";
import AdminRAGPanel from "@/components/consumer-duty/AdminRAGPanel";
import { Shield } from "lucide-react";

/**
 * ConsumerDutySettings — CCRO RAG override configuration in the Settings area.
 * Moved from Consumer Duty page to Settings so it doesn't clutter the operational view.
 */
export default function ConsumerDutySettings() {
  const outcomes = useAppStore((s) => s.outcomes);
  const updateOutcome = useAppStore((s) => s.updateOutcome);
  const updateMeasure = useAppStore((s) => s.updateMeasure);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-updraft-pale-purple/40 bg-updraft-pale-purple/10 px-4 py-3 flex items-start gap-3">
        <Shield size={16} className="text-updraft-bright-purple shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-updraft-deep">CCRO RAG Override</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Override the computed RAG status for any outcome or measure. Overrides are visibly flagged
            to users with a purple "Override" badge so the distinction from auto-calculated status is clear.
            Changes are logged in the Audit Trail.
          </p>
        </div>
      </div>

      <AdminRAGPanel
        outcomes={outcomes}
        onUpdateOutcomeRAG={(id, rag) => updateOutcome(id, { ragStatus: rag })}
        onUpdateMeasureRAG={(id, rag) => updateMeasure(id, { ragStatus: rag })}
      />
    </div>
  );
}
