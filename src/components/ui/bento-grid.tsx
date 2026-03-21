"use client";

import * as React from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 14,
    },
  },
};

interface BentoGridProps {
  /** Tall card — spans all 3 rows on desktop (col 1) */
  overview: React.ReactNode;
  /** Top-middle card */
  actions: React.ReactNode;
  /** Top-right card */
  health: React.ReactNode;
  /** Middle-middle card */
  priorities: React.ReactNode;
  /** Middle-right card */
  controls: React.ReactNode;
  /** Wide bottom card (col 2 + 3) */
  focus: React.ReactNode;
  className?: string;
}

export function BentoGrid({
  overview,
  actions,
  health,
  priorities,
  controls,
  focus,
  className,
}: BentoGridProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "grid w-full grid-cols-1 gap-4 md:grid-cols-3",
        "md:grid-rows-3",
        "auto-rows-[minmax(160px,auto)]",
        className
      )}
    >
      {/* Overview — spans all 3 rows */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-3">
        {overview}
      </motion.div>

      {/* Actions — top middle */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1">
        {actions}
      </motion.div>

      {/* Health — top right */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1">
        {health}
      </motion.div>

      {/* Priorities — middle middle */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1">
        {priorities}
      </motion.div>

      {/* Controls — middle right */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1">
        {controls}
      </motion.div>

      {/* Focus — wide bottom (spans 2 cols) */}
      <motion.div variants={itemVariants} className="md:col-span-2 md:row-span-1">
        {focus}
      </motion.div>
    </motion.div>
  );
}
