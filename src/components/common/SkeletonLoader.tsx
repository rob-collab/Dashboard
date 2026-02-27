"use client";

/**
 * Skeleton loading components — replace PageLoadingState while Zustand hydrates.
 * Uses the `.skeleton-shimmer` animation from globals.css.
 */

interface SkeletonBlockProps {
  className?: string;
}

function SkeletonBlock({ className = "" }: SkeletonBlockProps) {
  return <div className={`skeleton-shimmer ${className}`} />;
}

/** A card skeleton with N shimmer lines */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bento-card space-y-3">
      <SkeletonBlock className="h-4 w-2/3" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <SkeletonBlock key={i} className={`h-3 ${i === lines - 2 ? "w-1/2" : "w-full"}`} />
      ))}
    </div>
  );
}

/** A table skeleton with shimmer rows and column cells */
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Header row */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} className={`h-3 ${i === 0 ? "w-16" : i === 1 ? "flex-1" : "w-20"}`} />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="px-4 py-3 flex gap-4 border-b border-gray-100 last:border-0">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <SkeletonBlock
              key={colIdx}
              className={`h-4 ${colIdx === 0 ? "w-14" : colIdx === 1 ? "flex-1" : "w-20"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A row of N stat card skeletons */
export function SkeletonStatRow({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-4 ${count <= 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bento-card space-y-2">
          <SkeletonBlock className="h-3 w-1/2" />
          <SkeletonBlock className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
