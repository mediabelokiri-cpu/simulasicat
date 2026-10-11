"use client";

import React, { useState } from "react";
import { SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { Button } from "./FormField";
import { cn } from "@/lib/utils";

interface FilterPanelProps {
  children: React.ReactNode;
  activeCount?: number;
  onReset?: () => void;
  title?: string;
  className?: string;
}

export function FilterPanel({
  children,
  activeCount = 0,
  onReset,
  title = "Filter Data",
  className,
}: FilterPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile Filter Trigger */}
      <div className="flex items-center gap-2 md:hidden">
        <Button
          variant="outline"
          onClick={() => setMobileOpen((prev) => !prev)}
          leftIcon={<SlidersHorizontal className="h-4 w-4" />}
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <span>{title}</span>
            {activeCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-gradient-to-r from-[#494ae2] to-[#7854ec] px-1.5 text-xs font-bold text-white">
                {activeCount}
              </span>
            )}
          </span>
        </Button>
        {activeCount > 0 && onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            aria-label="Reset filter"
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Reset
          </Button>
        )}
      </div>

      {/* Mobile Collapsible Drawer / Panel */}
      {mobileOpen && (
        <div className="mt-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs md:hidden space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
            <span className="text-sm font-bold text-[#0c0c13]">{title}</span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
              aria-label="Tutup panel filter"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3">{children}</div>
          {onReset && activeCount > 0 && (
            <div className="pt-2 border-t border-neutral-100 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              >
                Reset Filter
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Desktop Inline Filter Grid */}
      <div className="hidden md:flex md:flex-wrap md:items-end md:gap-3">
        {children}
        {activeCount > 0 && onReset && (
          <Button
            variant="ghost"
            size="md"
            onClick={onReset}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Reset ({activeCount})
          </Button>
        )}
      </div>
    </div>
  );
}
