"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { Policy } from "@/lib/types";
import { formatDate, cn } from "@/lib/utils";

interface Props {
  policy: Policy;
}

const ACTION_COLOURS: Record<string, string> = {
  CREATED_POLICY: "bg-blue-500",
  UPDATED_FIELD: "bg-amber-500",
  LINKED_REGULATION: "bg-green-500",
  UNLINKED_REGULATION: "bg-red-400",
  LINKED_CONTROL: "bg-green-500",
  UNLINKED_CONTROL: "bg-red-400",
  ADDED_OBLIGATION: "bg-purple-500",
  UPDATED_OBLIGATION: "bg-amber-400",
  REMOVED_OBLIGATION: "bg-red-400",
  BULK_IMPORT_OBLIGATIONS: "bg-indigo-500",
};

export default function PolicyAuditTab({ policy }: Props) {
  const users = useAppStore((s) => s.users);
  const [search, setSearch] = useState("");

  const entries = policy.auditTrail ?? [];
  const filtered = search
    ? entries.filter((e) =>
        e.action.toLowerCase().includes(search.toLowerCase()) ||
        (e.details ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (e.fieldChanged ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search audit log..."
          className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-1.5 text-xs focus:border-updraft-bright-purple focus:ring-1 focus:ring-updraft-bright-purple"
        />
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No audit entries found</p>
      ) : (
        <div className="relative pl-6 space-y-3">
          <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-200" />
          {filtered.map((entry) => {
            const user = users.find((u) => u.id === entry.userId);
            const dotColour = ACTION_COLOURS[entry.action] ?? "bg-gray-400";
            return (
              <div key={entry.id} className="relative">
                <div className={cn("absolute -left-[18px] top-1 h-3 w-3 rounded-full border-2 border-white", dotColour)} />
                <div className="text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-700">{entry.action.replace(/_/g, " ")}</span>
                    {entry.fieldChanged && (
                      <span className="text-gray-400">{entry.fieldChanged}</span>
                    )}
                  </div>
                  {entry.fieldChanged && entry.oldValue && entry.newValue && (
                    <p className="text-gray-400 mt-0.5">
                      <span className="line-through text-red-400">{entry.oldValue}</span>
                      {" → "}
                      <span className="text-green-600">{entry.newValue}</span>
                    </p>
                  )}
                  {entry.details && <p className="text-gray-500 mt-0.5">{entry.details}</p>}
                  <p className="text-[10px] text-gray-400 mt-0.5">{user?.name ?? "System"} · {formatDate(entry.changedAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
