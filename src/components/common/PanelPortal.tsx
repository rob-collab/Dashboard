"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Renders children into document.body via a React portal.
 * This ensures fixed-position panels/overlays are never affected
 * by parent transforms (e.g. framer-motion AnimatePresence) that
 * would otherwise break `position: fixed` positioning.
 */
export default function PanelPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
