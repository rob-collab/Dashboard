export function SkeletonCard() {
  return (
    <div className="bento-card animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bento-card">
      <div className="h-6 bg-gray-200 rounded w-1/4 mb-4 animate-pulse"></div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="h-4 bg-gray-200 rounded flex-1"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex items-center justify-center p-8">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-updraft-bright-purple border-t-transparent`}
      ></div>
    </div>
  );
}

export function PageLoadingState() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <SkeletonTable />
    </div>
  );
}
