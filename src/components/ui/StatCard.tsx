import React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: "blue" | "yellow" | "green" | "red" | "neutral";
  badge?: React.ReactNode;
  trend?: { label: string; positive?: boolean };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent = "blue",
  badge,
   className,
}: StatCardProps) {
  const accentStyles = {
    blue: "border-l-4 border-l-[#494ae2]",
    yellow: "border-l-4 border-l-[#7854ec]",
    green: "border-l-4 border-l-emerald-600",
    red: "border-l-4 border-l-red-600",
    neutral: "border-l-4 border-l-neutral-400",
  };

  const iconContainerStyles = {
    blue: "bg-[#f5f8ff] text-[#494ae2]",
    yellow: "bg-[#f5f8ff] text-[#7854ec]",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    neutral: "bg-neutral-100 text-[#0c0c13]",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-neutral-200/90 bg-white p-4 sm:p-5 shadow-xs transition-colors",
        accentStyles[accent],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-[13px] font-medium text-neutral-600 truncate">
            {title}
          </p>
          <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#0c0c13] tabular-nums tracking-tight">
            {value}
          </p>
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              iconContainerStyles[accent]
            )}
          >
            {icon}
          </div>
        )}
      </div>
      {(subtitle || badge) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100">
          {subtitle && (
            <span className="text-xs text-neutral-600 leading-snug">
              {subtitle}
            </span>
          )}
          {badge}
        </div>
      )}
    </div>
  );
}
