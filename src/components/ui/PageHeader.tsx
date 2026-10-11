import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  backLink?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  backLink,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200/80 pb-5",
        className
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        {backLink && <div className="mb-1">{backLink}</div>}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[22px] sm:text-[28px] font-bold tracking-tight text-[#0c0c13] leading-tight">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-sm sm:text-[15px] text-neutral-600 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
