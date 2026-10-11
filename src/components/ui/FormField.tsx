import React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidthMobile?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidthMobile = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const variantClasses = {
    primary:
      "bg-gradient-to-r from-[#494ae2] to-[#7854ec] text-white hover:opacity-95 active:opacity-90 border border-transparent shadow-[0_6px_20px_rgba(73,74,226,0.22)]",
    accent:
      "bg-gradient-to-r from-[#7854ec] to-[#494ae2] text-white hover:opacity-95 active:opacity-90 border border-white/20 font-semibold shadow-[0_6px_18px_rgba(120,84,236,0.25)]",
    outline:
      "bg-white text-[#0c0c13] border border-neutral-300 hover:bg-[#f5f8ff] hover:border-[#494ae2]",
    danger:
      "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border border-transparent",
    ghost:
      "bg-transparent text-[#0c0c13] hover:bg-[#494ae2]/10 border border-transparent",
  };

  const sizeClasses = {
    sm: "min-h-[40px] px-3.5 py-2 text-xs sm:text-sm rounded-lg",
    md: "min-h-[46px] px-4 py-2.5 text-sm sm:text-[15px] rounded-xl",
    lg: "min-h-[50px] px-5 py-3 text-base rounded-xl",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all cursor-pointer select-none",
        "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        fullWidthMobile && "w-full sm:w-auto",
        className
      )}
      {...props}
    >
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  id,
  label,
  required,
  hint,
  error,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-[#0c0c13]"
      >
        {label}
        {required && (
          <span className="ml-1 text-red-600" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-neutral-600">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-center gap-1.5 text-xs font-medium text-red-700"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export const inputBaseClasses =
  "w-full min-h-[46px] rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm sm:text-[15px] text-[#0c0c13] placeholder:text-neutral-400 transition-colors focus:border-[#494ae2] focus:outline-none focus:ring-2 focus:ring-[#494ae2]/20 disabled:bg-neutral-100 disabled:text-neutral-500";

export const selectBaseClasses =
  "w-full min-h-[46px] rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm sm:text-[15px] text-[#0c0c13] transition-colors focus:border-[#494ae2] focus:outline-none focus:ring-2 focus:ring-[#494ae2]/20 disabled:bg-neutral-100 disabled:text-neutral-500";

export const textareaBaseClasses =
  "w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm sm:text-[15px] text-[#0c0c13] placeholder:text-neutral-400 transition-colors focus:border-[#494ae2] focus:outline-none focus:ring-2 focus:ring-[#494ae2]/20 disabled:bg-neutral-100 disabled:text-neutral-500";
