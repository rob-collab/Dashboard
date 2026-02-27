"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

const panelVariants = {
  hidden: { x: "100%" },
  show: {
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 320,
      damping: 30,
    },
  },
  exit: {
    x: "100%",
    transition: {
      type: "spring" as const,
      stiffness: 320,
      damping: 30,
    },
  },
};

interface MotionSlidePanelProps {
  open: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Spring-animated slide-in panel from the right.
 * Wraps its content in AnimatePresence so it animates out on close.
 */
export function MotionSlidePanel({ open, children, className }: MotionSlidePanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={panelVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className={className}
          style={{ willChange: "transform" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
