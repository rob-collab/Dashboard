"use client";

import { navigateToEntity, ENTITY_BADGE_STYLES, type NavigableEntity } from "@/lib/navigation";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface EntityLinkProps {
  type: NavigableEntity;
  id: string;
  /** Short reference code (e.g. "CTRL-042") */
  reference?: string;
  /** Longer label (e.g. control name) — shown after the reference */
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Clickable badge that navigates to any entity's detail view.
 * Pushes the current URL onto the navigation back-stack so the
 * floating Back button appears after click-through.
 */
export default function EntityLink({
  type,
  id,
  reference,
  label,
  size = "sm",
  className,
}: EntityLinkProps) {
  const pushNavigationStack = useAppStore((s) => s.pushNavigationStack);
  const styles = ENTITY_BADGE_STYLES[type];

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigateToEntity(type, id, pushNavigationStack);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono transition-colors cursor-pointer text-left",
        styles.bg,
        styles.text,
        styles.hoverBg,
        size === "sm" ? "text-[10px]" : "text-xs",
        className,
      )}
    >
      {reference && <span className="font-bold shrink-0">{reference}</span>}
      {label && (
        <span className="truncate max-w-[180px] font-sans font-normal">
          {label}
        </span>
      )}
      {!reference && !label && (
        <span className="font-bold">{id.slice(0, 8)}...</span>
      )}
    </button>
  );
}
