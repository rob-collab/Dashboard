"use client";

import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/**
 * Renders children into document.body via a React portal.
 * This ensures fixed-position panels/overlays are never affected
 * by parent transforms (e.g. framer-motion AnimatePresence) that
 * would otherwise break `position: fixed` positioning.
 *
 * No hydration guard needed — all pages are "use client" and this
 * component only mounts in the browser where document.body exists.
 */
export default function PanelPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
