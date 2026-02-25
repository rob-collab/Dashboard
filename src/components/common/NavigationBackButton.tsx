"use client";

import { useAppStore } from "@/lib/store";
import { ArrowLeft } from "lucide-react";

interface Props {
  sidebarOpen: boolean;
}

/**
 * Floating "Back" pill that appears only when the custom navigationStack has entries.
 * The stack is populated exclusively by EntityLink click-throughs, so the button
 * will never appear on a fresh page load or direct URL navigation — eliminating
 * the risk of accidentally backing out of the app entirely.
 */
export default function NavigationBackButton({ sidebarOpen }: Props) {
  const stackLength = useAppStore((s) => s.navigationStack.length);
  const popNavigationStack = useAppStore((s) => s.popNavigationStack);

  if (stackLength === 0) return null;

  function handleBack() {
    const prev = popNavigationStack();
    if (prev) {
      window.location.href = prev;
    }
  }

  return (
    <button
      onClick={handleBack}
      className="fixed bottom-6 z-50 flex items-center gap-2 rounded-full bg-updraft-bright-purple px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-updraft-deep transition-all duration-200 hover:shadow-xl"
      style={{ left: sidebarOpen ? "calc(16rem + 1.5rem)" : "calc(4rem + 1.5rem)" }}
      aria-label="Go back"
    >
      <ArrowLeft size={16} />
      Back
    </button>
  );
}
