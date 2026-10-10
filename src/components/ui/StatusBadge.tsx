import React from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  PlayCircle,
  PauseCircle,
  FileEdit,
  Eye,
  Archive,
  Lock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "active"
  | "scheduled"
  | "ongoing"
  | "completed"
  | "draft"
  | "review"
  | "archived"
  | "featured"
  | "warning"
  | "danger"
  | "paused"
  | "locked"
  | "neutral";

interface StatusBadgeProps {
  variant?: BadgeVariant;
  label: string;
  className?: string;
  size?: "sm" | "md";
  hideIcon?: boolean;
}

const variantConfig: Record<
  BadgeVariant,
  { bg: string; text: string; border: string; icon: React.ElementType }
> = {
  active: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  ongoing: {
    bg: "bg-[#eef4ff]",
    text: "text-[#0b49d0]",
    border: "border-[#0b49d0]/30",
    icon: PlayCircle,
  },
  scheduled: {
    bg: "bg-[#fff9e6]",
    text: "text-[#151515]",
    border: "border-[#ffc63d]",
    icon: Clock,
  },
  completed: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-300",
    icon: CheckCircle2,
  },
  draft: {
    bg: "bg-neutral-100",
    text: "text-neutral-700",
    border: "border-neutral-300",
    icon: FileEdit,
  },
  review: {
    bg: "bg-amber-50",
    text: "text-amber-900",
    border: "border-amber-300",
    icon: Eye,
  },
  archived: {
    bg: "bg-neutral-100",
    text: "text-neutral-600",
    border: "border-neutral-300",
    icon: Archive,
  },
  featured: {
    bg: "bg-[#ffc63d]",
    text: "text-[#151515]",
    border: "border-[#e5ad28]",
    icon: Sparkles,
  },
  warning: {
    bg: "bg-amber-50",
    text: "text-amber-900",
    border: "border-amber-300",
    icon: AlertTriangle,
  },
  danger: {
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-200",
    icon: XCircle,
  },
  paused: {
    bg: "bg-amber-100",
    text: "text-[#151515]",
    border: "border-amber-400",
    icon: PauseCircle,
  },
  locked: {
    bg: "bg-neutral-100",
    text: "text-neutral-600",
    border: "border-neutral-300",
    icon: Lock,
  },
  neutral: {
    bg: "bg-white",
    text: "text-[#151515]",
    border: "border-neutral-300",
    icon: Clock,
  },
};

export function StatusBadge({
  variant = "neutral",
  label,
  className,
  size = "md",
  hideIcon = false,
}: StatusBadgeProps) {
  const cfg = variantConfig[variant] ?? variantConfig.neutral;
  const Icon = cfg.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border font-medium leading-none select-none",
        size === "sm" ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-xs sm:text-[13px]",
        cfg.bg,
        cfg.text,
        cfg.border,
        className
      )}
    >
      {!hideIcon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      <span>{label}</span>
    </span>
  );
}
