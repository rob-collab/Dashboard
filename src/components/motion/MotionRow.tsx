"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 20,
    },
  },
};

interface MotionRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/** Spring-animated table row — use inside MotionList.
 *  Falls back to a plain <tr> when prefers-reduced-motion is set. */
export function MotionTr({ children, className, onClick }: MotionRowProps) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) {
    return <tr className={className} onClick={onClick}>{children}</tr>;
  }
  return (
    <motion.tr variants={rowVariants} className={className} onClick={onClick}>
      {children}
    </motion.tr>
  );
}

/** Spring-animated div row — use inside MotionListDiv.
 *  Falls back to a plain <div> when prefers-reduced-motion is set. */
export function MotionDiv({ children, className, onClick }: MotionRowProps) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) {
    return <div className={className} onClick={onClick}>{children}</div>;
  }
  return (
    <motion.div variants={rowVariants} className={className} onClick={onClick}>
      {children}
    </motion.div>
  );
}
