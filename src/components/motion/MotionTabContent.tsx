"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  /** Key that changes when the active tab changes — triggers fade out/in */
  tabKey: string;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps tab content with a 150ms cross-fade transition whenever `tabKey` changes.
 * Falls back to instant swap when prefers-reduced-motion is set.
 */
export function MotionTabContent({ tabKey, children, className }: Props) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tabKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeInOut" }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
