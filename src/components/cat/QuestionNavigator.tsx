"use client";

import React, { useState } from "react";
import { Check, Flag, Grid, X } from "lucide-react";
import { ExamSessionQuestionRow, OptionKey } from "@/types/database";
import { cn } from "@/lib/utils";

interface QuestionNavigatorProps {
  questions: ExamSessionQuestionRow[];
  currentNumber: number;
  answersMap: Record<string, OptionKey | null>;
  onSelectNumber: (displayNumber: number) => void;
  mobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
}

/**
 * Navigasi Kotak-Kotak Nomor Soal (Bab 8.2 PRD & Bab 12 UI/UX):
 * Membedakan 4 status dengan warna + simbol/bentuk + label:
 * 1. Belum dijawab (Putih, border netral, tanda '-')
 * 2. Sudah dijawab (Biru #0b49d0, teks putih + huruf jawaban & centang '✓')
 * 3. Ditandai ragu-ragu (Kuning #ffc63d, teks #151515 + ikon bendera '!')
 * 4. Nomor aktif (Ring tebal #151515)
 */
export function QuestionNavigator({
  questions,
  currentNumber,
  answersMap,
  onSelectNumber,
  mobileDrawerOpen = false,
  onCloseMobileDrawer,
}: QuestionNavigatorProps) {
  const [sectionTab, setSectionTab] = useState<string>("ALL");

  const sectionKeys = Array.from(
    new Set(questions.map((q) => q.section_key))
  );

  const visibleQuestions =
    sectionTab === "ALL"
      ? questions
      : questions.filter((q) => q.section_key === sectionTab);

  function renderNavContent(isModal: boolean) {
    return (
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
          <div className="flex items-center gap-2">
            <Grid className="h-4 w-4 text-[#0b49d0]" />
            <h2 className="text-sm font-bold text-[#151515]">
              Navigasi Nomor Soal
            </h2>
          </div>
          {isModal && onCloseMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobileDrawer}
              aria-label="Tutup panel nomor soal"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Filter Blok Subtes (TWK / TIU / TKP) */}
        {sectionKeys.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSectionTab("ALL")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer",
                sectionTab === "ALL"
                  ? "bg-[#0b49d0] text-white"
                  : "bg-neutral-100 text-[#151515] hover:bg-neutral-200"
              )}
            >
              Semua ({questions.length})
            </button>
            {sectionKeys.map((sk) => (
              <button
                key={sk}
                type="button"
                onClick={() => setSectionTab(sk)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer",
                  sectionTab === sk
                    ? "bg-[#0b49d0] text-white"
                    : "bg-neutral-100 text-[#151515] hover:bg-neutral-200"
                )}
              >
                {sk}
              </button>
            ))}
          </div>
        )}

        {/* Kotak-kotak Nomor Soal */}
        <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2 max-h-[340px] overflow-y-auto p-1">
          {visibleQuestions.map((sq) => {
            const ans = answersMap[sq.id] ?? null;
            const isAnswered = Boolean(ans);
            const isFlagged = sq.is_flagged;
            const isCurrent = sq.display_number === currentNumber;

            return (
              <button
                key={sq.id}
                type="button"
                onClick={() => {
                  onSelectNumber(sq.display_number);
                  if (isModal && onCloseMobileDrawer) onCloseMobileDrawer();
                }}
                aria-label={`Soal nomor ${sq.display_number}, subtes ${
                  sq.section_key
                }, status ${
                  isFlagged
                    ? "ditandai ragu-ragu"
                    : isAnswered
                    ? `terjawab ${ans}`
                    : "belum dijawab"
                }`}
                className={cn(
                  "relative flex h-11 w-full flex-col items-center justify-center rounded-xl border text-xs font-bold tabular-nums transition-all cursor-pointer select-none",
                  isFlagged
                    ? "border-[#d89c14] bg-[#ffc63d] text-[#151515]"
                    : isAnswered
                    ? "border-[#0b49d0] bg-[#0b49d0] text-white"
                    : "border-neutral-300 bg-white text-[#151515] hover:border-[#0b49d0]",
                  isCurrent && "ring-2 ring-[#151515] ring-offset-2"
                )}
              >
                <span>{sq.display_number}</span>
                {/* Indikator Non-Warna Tambahan: Huruf Jawaban / Simbol */}
                <span className="text-[9px] leading-none opacity-90 flex items-center gap-0.5">
                  {isFlagged ? (
                    <>
                      <Flag className="h-2.5 w-2.5 inline" />
                      {ans ? ans : "!"}
                    </>
                  ) : isAnswered ? (
                    <>
                      <Check className="h-2.5 w-2.5 inline" />
                      {ans}
                    </>
                  ) : (
                    "-"
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Legenda Status Soal (Warna + Simbol + Teks) */}
        <div className="border-t border-neutral-200 pt-3 grid grid-cols-2 gap-2 text-[11px] text-neutral-700">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#0b49d0] text-[10px] font-bold text-white">
              ✓
            </span>
            <span>Sudah Dijawab</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#ffc63d] text-[10px] font-bold text-[#151515]">
              !
            </span>
            <span>Ragu-ragu</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md border border-neutral-300 bg-white text-[10px] font-bold text-[#151515]">
              -
            </span>
            <span>Belum Dijawab</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-[#151515] bg-white text-[10px] font-bold text-[#151515]">
              #
            </span>
            <span>Nomor Aktif</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Tampil Langsung di Bawah Soal (Mobile/Tablet) & Panel Samping (Desktop) */}
      <aside className="block rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-xs">
        {renderNavContent(false)}
      </aside>

      {/* Opsional Drawer Modal jika tombol pintas di Header diklik */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Daftar Nomor Soal"
        >
          <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
