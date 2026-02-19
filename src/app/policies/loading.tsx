import { SkeletonCard, SkeletonTable } from "@/components/common/LoadingState";

export default function PoliciesLoading() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 rounded w-40 animate-pulse"></div>
        <div className="flex gap-2">
          <div className="h-10 bg-gray-200 rounded w-28 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-28 animate-pulse"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <SkeletonTable rows={8} />
    </div>
  );
}
