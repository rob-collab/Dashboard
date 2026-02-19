import { LoadingSpinner } from "@/components/common/LoadingState";

export default function ReportLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-sm text-gray-500 font-poppins">Loading report…</p>
    </div>
  );
}
