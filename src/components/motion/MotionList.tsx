"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const listVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

interface MotionListProps {
  children: ReactNode;
  className?: string;
}

/** Wrapper that staggers child MotionRow animations when the list mounts.
 *  Falls back to a plain <tbody> when prefers-reduced-motion is set. */
export function MotionList({ children, className }: MotionListProps) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) {
    return <tbody className={className}>{children}</tbody>;
  }
  return (
    <motion.tbody
      variants={listVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.tbody>
  );
}

/** Div-based stagger container (for card lists).
 *  Falls back to a plain <div> when prefers-reduced-motion is set. */
export function MotionListDiv({ children, className }: MotionListProps) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      variants={listVariants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}
