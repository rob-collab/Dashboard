import { cn } from "@/lib/utils";

export type WaffleResult = "pass" | "fail" | "partial" | "untested";

interface WaffleCellProps {
  result: WaffleResult;
  title?: string;
}

const cellColour: Record<WaffleResult, string> = {
  pass:     "bg-[#22c55e]/85",
  fail:     "bg-[#ef4444]/85",
  partial:  "bg-[#f59e0b]/75",
  untested: "bg-[#e2e8f0]",
};

interface WaffleGridProps {
  cells: WaffleCellProps[];
  className?: string;
}

export function WaffleGrid({ cells, className }: WaffleGridProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: "repeat(10, 1fr)" }}
        role="img"
        aria-label={`Control test results: ${cells.filter(c => c.result === "pass").length} passing, ${cells.filter(c => c.result === "fail").length} failing`}
      >
        {cells.map((cell, i) => (
          <div
            key={i}
            title={cell.title}
            className={cn(
              "rounded-[2px]",
              cellColour[cell.result]
            )}
            style={{ width: 8, height: 8 }}
            aria-hidden="true"
          />
        ))}
      </div>
      <p style={{ fontSize: 9, color: "#94a3b8" }}>
        Each square = 1 control · coloured by last test result
      </p>
    </div>
  );
}
