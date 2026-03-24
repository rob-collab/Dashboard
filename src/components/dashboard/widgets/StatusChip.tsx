import { cn } from "@/lib/utils";

type ChipVariant = "red" | "amber" | "green" | "purple" | "gray";

const styles: Record<ChipVariant, string> = {
  red:    "bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]",
  amber:  "bg-[#fffbeb] text-[#d97706] border border-[#fde68a]",
  green:  "bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]",
  purple: "bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe]",
  gray:   "bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0]",
};

interface StatusChipProps {
  variant: ChipVariant;
  children: React.ReactNode;
  className?: string;
}

export function StatusChip({ variant, children, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-[9px] py-[3px]",
        "text-[11px] font-semibold leading-none",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Derive chip variant from RAG string */
export function ragToChip(rag: string | null | undefined): ChipVariant {
  if (!rag) return "gray";
  const r = rag.toUpperCase();
  if (r === "RED" || r === "HARM") return "red";
  if (r === "AMBER" || r === "WARNING") return "amber";
  if (r === "GREEN" || r === "GOOD") return "green";
  return "gray";
}
