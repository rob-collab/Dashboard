"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { ArrowLeft } from "lucide-react";

interface Props {
  sidebarOpen: boolean;
}

/**
 * Floating "Back" pill that appears whenever the browser has navigable history.
 * - If the custom navigation stack has items: uses popNavigationStack() for exact URL
 * - Otherwise: falls back to router.back() (standard browser back)
 */
export default function NavigationBackButton({ sidebarOpen }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const stackLength = useAppStore((s) => s.navigationStack.length);
  const popNavigationStack = useAppStore((s) => s.popNavigationStack);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Re-check on every navigation — history grows as the user moves around
    setCanGoBack(window.history.length > 1);
  }, [pathname]);

  const visible = stackLength > 0 || canGoBack;
  if (!visible) return null;

  function handleBack() {
    if (stackLength > 0) {
      const prev = popNavigationStack();
      if (prev) {
        window.location.href = prev;
        return;
      }
    }
    router.back();
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
