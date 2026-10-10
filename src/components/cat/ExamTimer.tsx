"use client";

import React, { useEffect, useState } from "react";
import { Clock, PauseCircle, AlertTriangle } from "lucide-react";
import { formatTimerSeconds, cn } from "@/lib/utils";

interface ExamTimerProps {
  deadlineAt?: string;
  deadlineIso?: string;
  isPaused?: boolean;
  onExpire?: () => void;
  onTimeExpired?: () => void;
  className?: string;
}

export function ExamTimer({
  deadlineAt,
  deadlineIso,
  isPaused = false,
  onExpire,
  onTimeExpired,
  className,
}: ExamTimerProps) {
  const targetIso = deadlineAt || deadlineIso || "";

  const computeRemaining = () => {
    if (!targetIso) return 6000;
    const targetMs = new Date(targetIso).getTime();
    if (Number.isNaN(targetMs)) return 6000;
    const diff = Math.floor((targetMs - Date.now()) / 1000);
    return Math.max(0, diff);
  };

  const [remainingSeconds, setRemainingSeconds] =
    useState<number>(computeRemaining);

  useEffect(() => {
    if (isPaused) return;

    const updateTimer = () => {
      const diff = computeRemaining();
      if (diff <= 0) {
        setRemainingSeconds(0);
        if (onExpire) onExpire();
        else if (onTimeExpired) onTimeExpired();
      } else {
        setRemainingSeconds(diff);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetIso, isPaused, onExpire, onTimeExpired]);

  const isCritical = remainingSeconds > 0 && remainingSeconds <= 120;
  const isWarning =
    remainingSeconds > 120 && remainingSeconds <= 600;

  return (
    <div
      role="timer"
      aria-live="off"
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 sm:px-4 sm:py-2 transition-colors",
        isPaused
          ? "border-[#ffc63d] bg-[#ffc63d] text-[#151515]"
          : isCritical
          ? "border-red-300 bg-red-600 text-white animate-pulse"
          : isWarning
          ? "border-[#ffc63d] bg-[#ffc63d] text-[#151515]"
          : "border-white/25 bg-white/15 text-white",
        className
      )}
    >
      {isPaused ? (
        <PauseCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
      ) : isCritical ? (
        <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
      ) : (
        <Clock className="h-5 w-5 shrink-0" aria-hidden="true" />
      )}
      <div className="leading-none">
        <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-85">
          {isPaused ? "Sesi Dijeda" : "Sisa Waktu"}
        </span>
        <span className="text-[20px] sm:text-[24px] font-extrabold tabular-nums tracking-tight">
          {formatTimerSeconds(remainingSeconds)}
        </span>
      </div>
    </div>
  );
}
