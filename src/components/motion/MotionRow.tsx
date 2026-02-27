"use client";

import { motion } from "framer-motion";
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

/** Spring-animated table row — use inside MotionList */
export function MotionTr({ children, className, onClick }: MotionRowProps) {
  return (
    <motion.tr variants={rowVariants} className={className} onClick={onClick}>
      {children}
    </motion.tr>
  );
}

/** Spring-animated div row — use inside MotionListDiv */
export function MotionDiv({ children, className, onClick }: MotionRowProps) {
  return (
    <motion.div variants={rowVariants} className={className} onClick={onClick}>
      {children}
    </motion.div>
  );
}
