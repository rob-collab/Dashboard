"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Check, WifiOff, Loader2 } from "lucide-react";

/**
 * Global save-status pill — shows in the bottom-right of the screen.
 * Driven by _savingCount / _lastSavedAt / _saveError in the Zustand store,
 * which are updated by every sync() call in store.ts.
 *
 * States:
 *  • Saving…  — while any sync() is in flight
 *  • Saved ✓  — 3 seconds after the last sync() completes successfully, then fades
 *  • Could not save — after sync() exhausts retries (toast also fires)
 */
export default function SaveStatusIndicator() {
  const savingCount = useAppStore((s) => s._savingCount);
  const lastSavedAt = useAppStore((s) => s._lastSavedAt);
  const saveError = useAppStore((s) => s._saveError);
  const prefersReduced = useReducedMotion();

  // Show "Saved ✓" for 3 seconds after the last successful save
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!lastSavedAt || savingCount > 0 || saveError) return;
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [lastSavedAt, savingCount, saveError]);

  const isSaving = savingCount > 0;
  const hasError = !!saveError && !isSaving;
  const savedOk = showSaved && !isSaving && !hasError;
  const visible = isSaving || savedOk || hasError;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, scale: 0.88, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.88, y: 6 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "fixed bottom-5 right-4 z-[9980] flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-md",
            isSaving && "bg-white border-gray-200 text-gray-500",
            savedOk && "bg-green-50 border-green-200 text-green-700",
            hasError && "bg-red-50 border-red-200 text-red-700",
          )}
          role="status"
          aria-live="polite"
        >
          {isSaving && (
            <>
              <Loader2 size={11} className="animate-spin" />
              Saving…
            </>
          )}
          {savedOk && (
            <>
              <motion.span
                initial={prefersReduced ? false : { scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 18, delay: 0.05 }}
                className="flex"
              >
                <Check size={11} />
              </motion.span>
              Saved
            </>
          )}
          {hasError && (
            <>
              <WifiOff size={11} />
              Could not save
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
