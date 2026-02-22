"use client";

import { useEffect } from "react";
import { X, Keyboard } from "lucide-react";

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  heading: string;
  shortcuts: ShortcutEntry[];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    heading: "Navigation",
    shortcuts: [
      { keys: ["⌘K", "Ctrl K"], description: "Open global search" },
      { keys: ["Esc"], description: "Close modal / panel / search" },
      { keys: ["Alt ←"], description: "Go back" },
    ],
  },
  {
    heading: "Global",
    shortcuts: [
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["⌘K", "Ctrl K"], description: "Global search" },
    ],
  },
  {
    heading: "Tables & Lists",
    shortcuts: [
      { keys: ["↑ ↓"], description: "Move focus in search results" },
      { keys: ["Enter"], description: "Select focused item" },
    ],
  },
  {
    heading: "Risk Register",
    shortcuts: [
      { keys: ["T"], description: "Switch to table view (when not in input)" },
      { keys: ["H"], description: "Switch to heatmap view (when not in input)" },
    ],
  },
];

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[11px] font-mono text-gray-600">
      {children}
    </kbd>
  );
}

export default function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
          <Keyboard size={18} className="text-updraft-bright-purple" />
          <h2 className="flex-1 text-base font-semibold text-gray-900 font-poppins">Keyboard Shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Shortcut groups */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
          {SHORTCUTS.map((group) => (
            <div key={group.heading} className="px-5 py-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {group.heading}
              </p>
              <div className="space-y-2.5">
                {group.shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-700">{s.description}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {s.keys.map((k, ki) => (
                        <span key={ki} className="flex items-center gap-1">
                          {ki > 0 && <span className="text-[10px] text-gray-400">or</span>}
                          <Kbd>{k}</Kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-3">
          <p className="text-[11px] text-gray-400 text-center">
            Press <Kbd>?</Kbd> anywhere to toggle this panel (outside of text inputs)
          </p>
        </div>
      </div>
    </div>
  );
}
