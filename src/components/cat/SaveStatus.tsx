"use client";

import React from "react";
import {
  CheckCircle2,
  Loader2,
  WifiOff,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SyncSaveState = "saved" | "saving" | "offline" | "failed" | "error";
export type SaveState = SyncSaveState;

interface SaveStatusProps {
  state: SyncSaveState;
  revision?: number;
  lastSavedAt?: string | null;
  pendingCount?: number;
  onRetry?: () => void;
  className?: string;
}

/**
 * Indikator Status Penyimpanan Jujur (Bab 8.5 PRD & Bab 12 UI/UX):
 * - Menyimpan...
 * - Tersimpan (Hanya setelah server mengonfirmasi)
 * - Koneksi terputus
 * - Sinkronisasi gagal (disertai tombol Retry)
 */
export function SaveStatus({
  state,
  revision,
  pendingCount = 0,
  onRetry,
  className,
}: SaveStatusProps) {
  if (state === "saving") {
    return (
      <div
        role="status"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-semibold text-white",
          className
        )}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#ffc63d]" />
        <span>Menyimpan...</span>
      </div>
    );
  }

  if (state === "offline") {
    return (
      <div
        role="alert"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg bg-[#ffc63d] px-2.5 py-1.5 text-xs font-bold text-[#151515]",
          className
        )}
      >
        <WifiOff className="h-3.5 w-3.5 shrink-0" />
        <span>
          Offline{pendingCount > 0 ? ` (${pendingCount} antrean)` : ""}
        </span>
      </div>
    );
  }

  if (state === "failed" || state === "error") {
    return (
      <div
        role="alert"
        className={cn(
          "inline-flex items-center gap-2 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white",
          className
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>Sinkronisasi gagal</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[11px] font-bold text-red-700 hover:bg-neutral-100 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" /> Ulangi
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-300/30 px-2.5 py-1.5 text-xs font-semibold text-white",
        className
      )}
    >
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
      <span>
        Tersimpan{revision && revision > 0 ? ` (Rev #${revision})` : ""}
      </span>
    </div>
  );
}
