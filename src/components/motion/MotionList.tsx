"use client";

import { motion } from "framer-motion";
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

/** Wrapper that staggers child MotionRow animations when the list mounts */
export function MotionList({ children, className }: MotionListProps) {
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

/** Div-based stagger container (for card lists) */
export function MotionListDiv({ children, className }: MotionListProps) {
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
