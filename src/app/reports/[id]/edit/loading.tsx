import { LoadingSpinner } from "@/components/common/LoadingState";

export default function ReportEditorLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-sm text-gray-500 font-poppins">Loading editor…</p>
    </div>
  );
}
