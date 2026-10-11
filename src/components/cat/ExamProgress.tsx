import React from "react";
import { CheckCircle2, Circle, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamProgressProps {
  answeredCount: number;
  totalCount: number;
  flaggedCount: number;
  className?: string;
}

export function ExamProgress({
  answeredCount,
  totalCount,
  flaggedCount,
  className,
}: ExamProgressProps) {
  const unansweredCount = Math.max(0, totalCount - answeredCount);
  const pct =
    totalCount > 0
      ? Math.min(100, Math.round((answeredCount / totalCount) * 100))
      : 0;

  return (
    <div
      className={cn(
        "rounded-2xl border border-neutral-200 bg-white p-3.5 sm:p-4 shadow-xs space-y-2.5",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-[#0c0c13] tabular-nums">
          Progres Pengerjaan:{" "}
          <span className="text-[#494ae2]">
            {answeredCount} dari {totalCount} Soal
          </span>{" "}
          ({pct}%)
        </span>

        <div className="flex flex-wrap items-center gap-2 tabular-nums">
          <span className="inline-flex items-center gap-1 rounded-lg bg-[#f5f8ff] px-2 py-0.5 text-[11px] font-bold text-[#494ae2]">
            <CheckCircle2 className="h-3 w-3" />
            Dijawab: {answeredCount}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700">
            <Circle className="h-3 w-3" />
            Belum: {unansweredCount}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold",
              flaggedCount > 0
                ? "bg-[#7854ec] text-white"
                : "bg-neutral-100 text-neutral-500"
            )}
          >
            <Flag className="h-3 w-3" />
            Ragu: {flaggedCount}
          </span>
        </div>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 border border-neutral-200/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#494ae2] to-[#7854ec] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
