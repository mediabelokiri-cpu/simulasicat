import React from "react";
import {
  Inbox,
  AlertOctagon,
  CheckCircle2,
  WifiOff,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "./FormField";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white p-8 sm:p-10 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#0b49d0]">
        {icon ?? <Inbox className="h-6 w-6" aria-hidden="true" />}
      </div>
      <h3 className="mt-4 text-base sm:text-lg font-bold text-[#151515]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-neutral-600 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
  rows?: number;
  className?: string;
}

export function LoadingState({
  message = "Memuat data...",
  rows = 3,
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 space-y-4",
        className
      )}
    >
      <div className="flex items-center gap-2.5 text-sm font-medium text-[#0b49d0]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>{message}</span>
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="h-12 w-full animate-pulse rounded-xl bg-neutral-100"
          />
        ))}
      </div>
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Terjadi Kendala",
  message,
  description,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border border-red-200 bg-red-50/70 p-5 sm:p-6 text-[#151515]",
        className
      )}
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
          <AlertOctagon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-red-900">{title}</h3>
          <p className="mt-1 text-sm text-red-800 leading-relaxed">
            {message || description}
          </p>
          {onRetry && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Coba Lagi
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ToastNotificationProps {
  type?: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
  onClose?: () => void;
  className?: string;
}

export function ToastNotification({
  type = "success",
  title,
  description,
  onClose,
  className,
}: ToastNotificationProps) {
  const styles = {
    success: "border-emerald-300 bg-emerald-50 text-emerald-950",
    error: "border-red-300 bg-red-50 text-red-950",
    warning: "border-[#ffc63d] bg-[#fff9e6] text-[#151515]",
    info: "border-[#0b49d0]/30 bg-[#eef4ff] text-[#151515]",
  };

  return (
    <div
      role="status"
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border p-4 shadow-xs",
        styles[type],
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0b49d0]" />
        <div>
          <p className="text-sm font-bold">{title}</p>
          {description && (
            <p className="mt-0.5 text-xs opacity-90">{description}</p>
          )}
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold underline hover:opacity-80"
        >
          Tutup
        </button>
      )}
    </div>
  );
}

export function OfflineBanner({ isOffline }: { isOffline?: boolean }) {
  if (!isOffline) return null;
  return (
    <div
      role="alert"
      className="flex items-center justify-center gap-2 bg-[#ffc63d] px-4 py-2 text-xs sm:text-sm font-semibold text-[#151515]"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        Koneksi terputus. Jawaban disimpan sementara di perangkat dan akan
        disinkronkan saat koneksi kembali.
      </span>
    </div>
  );
}
