"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { ConfirmDialog } from "@/components/ui";

interface SubmitConfirmationProps {
  open: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
  totalQuestions: number;
  answeredCount: number;
  flaggedCount: number;
  isSubmitting?: boolean;
}

export function SubmitConfirmation({
  open,
  onClose,
  onConfirmSubmit,
  totalQuestions,
  answeredCount,
  flaggedCount,
  isSubmitting = false,
}: SubmitConfirmationProps) {
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirmSubmit}
      isLoading={isSubmitting}
      variant="primary"
      title="Konfirmasi Selesai & Kirim Ujian"
      description="Periksa ringkasan pengerjaan Anda di bawah ini sebelum mengunci jawaban dan menghitung nilai akhir di server."
      confirmLabel="Ya, Kunci & Kirim Ujian"
      cancelLabel="Kembali ke Ruang Ujian"
    >
      <div className="space-y-3">
        <div className="rounded-xl border border-neutral-200 bg-[#fcfbf7] p-4 text-xs sm:text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-neutral-600 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Sudah Dijawab:
            </span>
            <span className="font-bold text-emerald-700 tabular-nums">
              {answeredCount} dari {totalQuestions} Soal
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-600">Belum Dijawab (Kosong):</span>
            <span
              className={`font-bold tabular-nums ${
                unansweredCount > 0 ? "text-red-600" : "text-[#151515]"
              }`}
            >
              {unansweredCount} Soal
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-600">Ditandai Ragu-ragu:</span>
            <span
              className={`font-bold tabular-nums ${
                flaggedCount > 0 ? "text-amber-700" : "text-[#151515]"
              }`}
            >
              {flaggedCount} Soal
            </span>
          </div>
        </div>

        {(unansweredCount > 0 || flaggedCount > 0) && (
          <div className="flex items-start gap-2 rounded-xl border border-[#ffc63d] bg-[#fff9e6] p-3 text-xs text-[#151515]">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
            <span>
              Anda masih memiliki{" "}
              {unansweredCount > 0 && (
                <strong>{unansweredCount} soal belum dijawab</strong>
              )}
              {unansweredCount > 0 && flaggedCount > 0 && " dan "}
              {flaggedCount > 0 && (
                <strong>{flaggedCount} soal ditandai ragu-ragu</strong>
              )}
              . Jawaban pada soal ragu-ragu yang telah terisi tetap akan ikut
              dinilai.
            </span>
          </div>
        )}

        <p className="text-[11px] text-neutral-500 flex items-center gap-1.5">
          <Send className="h-3.5 w-3.5 text-[#0b49d0]" />
          <span>
            Setelah dikirim, sesi ujian akan dikunci oleh server dan tidak dapat
            diubah kembali.
          </span>
        </p>
      </div>
    </ConfirmDialog>
  );
}
