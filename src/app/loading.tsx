import { PageLoadingState } from "@/components/common/LoadingState";

export default function Loading() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageLoadingState />
    </div>
  );
}
