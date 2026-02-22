"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ShieldAlert,
  BookOpen,
  FlaskConical,
  ListChecks,
  Scale,
  Users,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  type: "risk" | "policy" | "control" | "action" | "regulation" | "user";
}

const TYPE_CONFIG: Record<SearchResult["type"], { label: string; icon: typeof Search; color: string }> = {
  risk: { label: "Risks", icon: ShieldAlert, color: "text-red-600" },
  policy: { label: "Policies", icon: BookOpen, color: "text-blue-600" },
  control: { label: "Controls", icon: FlaskConical, color: "text-purple-600" },
  action: { label: "Actions", icon: ListChecks, color: "text-amber-600" },
  regulation: { label: "Regulations", icon: Scale, color: "text-green-600" },
  user: { label: "Users", icon: Users, color: "text-gray-600" },
};

const TYPE_ORDER: SearchResult["type"][] = ["risk", "policy", "control", "action", "regulation", "user"];

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const risks = useAppStore((s) => s.risks);
  const policies = useAppStore((s) => s.policies);
  const controls = useAppStore((s) => s.controls);
  const actions = useAppStore((s) => s.actions);
  const regulations = useAppStore((s) => s.regulations);
  const users = useAppStore((s) => s.users);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setFocusIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const out: SearchResult[] = [];

    // Risks
    risks.forEach((r) => {
      if (
        r.reference.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.categoryL1 ?? "").toLowerCase().includes(q)
      ) {
        out.push({
          id: r.id,
          label: `${r.reference}: ${r.name}`,
          sublabel: r.categoryL1,
          href: `/risk-register?risk=${r.id}`,
          type: "risk",
        });
      }
    });

    // Policies
    policies.forEach((p) => {
      if (
        (p.reference ?? "").toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q)
      ) {
        out.push({
          id: p.id,
          label: p.name,
          sublabel: p.reference,
          href: `/compliance?tab=policies&policy=${p.id}`,
          type: "policy",
        });
      }
    });

    // Controls
    controls.forEach((c) => {
      if (
        c.controlRef.toLowerCase().includes(q) ||
        c.controlName.toLowerCase().includes(q) ||
        (c.businessArea?.name ?? "").toLowerCase().includes(q)
      ) {
        out.push({
          id: c.id,
          label: `${c.controlRef}: ${c.controlName}`,
          sublabel: c.businessArea?.name,
          href: `/controls?control=${c.id}`,
          type: "control",
        });
      }
    });

    // Actions
    actions.forEach((a) => {
      if (
        a.reference.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q)
      ) {
        out.push({
          id: a.id,
          label: a.title,
          sublabel: a.reference,
          href: `/actions?action=${a.id}`,
          type: "action",
        });
      }
    });

    // Regulations
    regulations.forEach((r) => {
      if (
        r.reference.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.shortName ?? "").toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q)
      ) {
        out.push({
          id: r.id,
          label: r.name,
          sublabel: `${r.reference} · ${r.body}`,
          href: `/compliance?tab=regulations`,
          type: "regulation",
        });
      }
    });

    // Users
    users.forEach((u) => {
      if (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      ) {
        out.push({
          id: u.id,
          label: u.name,
          sublabel: u.email,
          href: `/users`,
          type: "user",
        });
      }
    });

    // Sort: group by type order, cap at 5 per type
    const grouped: Record<string, SearchResult[]> = {};
    out.forEach((r) => {
      grouped[r.type] = grouped[r.type] ?? [];
      if (grouped[r.type].length < 5) grouped[r.type].push(r);
    });

    return TYPE_ORDER.flatMap((t) => grouped[t] ?? []);
  }, [query, risks, policies, controls, actions, regulations, users]);

  // Reset focus when results change
  useEffect(() => { setFocusIdx(0); }, [results.length]);

  const handleSelect = useCallback((result: SearchResult) => {
    router.push(result.href);
    onClose();
  }, [router, onClose]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[focusIdx]) {
      handleSelect(results[focusIdx]);
    }
  }

  if (!open) return null;

  // Group results for display
  const grouped: { type: SearchResult["type"]; items: SearchResult[] }[] = [];
  let lastType: string | null = null;
  results.forEach((r) => {
    if (r.type !== lastType) {
      grouped.push({ type: r.type, items: [] });
      lastType = r.type;
    }
    grouped[grouped.length - 1].items.push(r);
  });

  let globalIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search size={18} className="shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search risks, policies, controls, actions..."
            className="flex-1 text-base outline-none placeholder:text-gray-400"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="shrink-0 rounded p-0.5 hover:bg-gray-100 transition-colors">
              <X size={15} className="text-gray-400" />
            </button>
          )}
          <kbd className="shrink-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-mono text-gray-400">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim() === "" ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">Start typing to search across all records</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <span key={type} className={cn("flex items-center gap-1 text-xs font-medium", cfg.color)}>
                      <Icon size={12} />{cfg.label}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">No results for <strong>"{query}"</strong></p>
              <p className="text-xs text-gray-400 mt-1">Try a risk reference, policy name, or person's name</p>
            </div>
          ) : (
            <div className="py-2">
              {grouped.map(({ type, items }) => {
                const cfg = TYPE_CONFIG[type];
                const Icon = cfg.icon;
                return (
                  <div key={type}>
                    {/* Group label */}
                    <div className="flex items-center gap-2 px-4 py-1.5">
                      <Icon size={12} className={cn("shrink-0", cfg.color)} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{cfg.label}</span>
                    </div>
                    {items.map((result) => {
                      const idx = globalIdx++;
                      const isFocused = idx === focusIdx;
                      return (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => handleSelect(result)}
                          onMouseEnter={() => setFocusIdx(idx)}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                            isFocused ? "bg-updraft-pale-purple/20" : "hover:bg-gray-50"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{result.label}</p>
                            {result.sublabel && (
                              <p className="text-xs text-gray-400 truncate mt-0.5">{result.sublabel}</p>
                            )}
                          </div>
                          {isFocused && <ChevronRight size={14} className="shrink-0 text-gray-400" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2.5 bg-gray-50/50">
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <ArrowUp size={10} /><ArrowDown size={10} /> Navigate
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <CornerDownLeft size={10} /> Select
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <kbd className="rounded border border-gray-200 bg-gray-100 px-1 py-0.5 text-[10px] font-mono">Esc</kbd> Close
          </span>
          <span className="ml-auto flex items-center gap-1 text-[11px] text-gray-400">
            <kbd className="rounded border border-gray-200 bg-gray-100 px-1 py-0.5 text-[10px] font-mono">⌘K</kbd> to open
          </span>
        </div>
      </div>
    </div>
  );
}
