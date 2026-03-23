"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FileQuestion } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  heading: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, heading, description, action }: EmptyStateProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <motion.div
        initial={prefersReduced ? false : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.06, type: "spring", stiffness: 300, damping: 22 }}
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400"
      >
        {icon ?? <FileQuestion className="h-7 w-7" />}
      </motion.div>
      <motion.h3
        initial={prefersReduced ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="font-poppins text-base font-semibold text-gray-600"
      >
        {heading}
      </motion.h3>
      {description && (
        <motion.p
          initial={prefersReduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-1 max-w-sm text-sm text-gray-400"
        >
          {description}
        </motion.p>
      )}
      {action && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4"
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}
