"use client";

import React, { useState } from "react";
import { Flag, RotateCcw, ZoomIn, X } from "lucide-react";
import { ExamSessionQuestionRow, OptionKey } from "@/types/database";
import { AnswerOption } from "./AnswerOption";
import { StatusBadge } from "@/components/ui";

interface QuestionCardProps {
  sessionQuestion: ExamSessionQuestionRow;
  totalQuestions: number;
  selectedOption: OptionKey | null;
  disabled?: boolean;
  onSelectOption: (key: OptionKey | null) => void;
  onToggleFlag: () => void;
}

export function QuestionCard({
  sessionQuestion,
  totalQuestions,
  selectedOption,
  disabled = false,
  onSelectOption,
  onToggleFlag,
}: QuestionCardProps) {
  const [zoomedImage, setZoomedImage] = useState<{
    url: string;
    alt: string;
  } | null>(null);

  const { display_number, section_key, question_snapshot, is_flagged } =
    sessionQuestion;
  const promptAsset = question_snapshot.assets?.find(
    (a) => a.placement === "prompt"
  );

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-xs space-y-5">
      {/* Header Nomor Soal & Badge Subtes */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-xl bg-gradient-to-r from-[#494ae2] to-[#7854ec] px-3 py-1.5 text-sm sm:text-base font-extrabold text-white tabular-nums">
            Soal No. {display_number}
          </span>
          <span className="rounded-lg bg-[#f5f8ff] px-2.5 py-1 text-xs font-bold text-[#494ae2] border border-[#494ae2]/15">
            Subtes: {section_key}
          </span>
          <span className="text-xs text-neutral-500 tabular-nums">
            dari {totalQuestions} soal
          </span>
        </div>

        <div className="flex items-center gap-2">
          {is_flagged && (
            <StatusBadge
              variant="featured"
              label="Ditandai Ragu-ragu"
              size="sm"
            />
          )}
          <button
            type="button"
            onClick={onToggleFlag}
            disabled={disabled}
            className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              is_flagged
                ? "border-[#7854ec] bg-[#7854ec] text-white"
                : "border-neutral-300 bg-[#f5f8ff] text-[#0c0c13] hover:border-[#7854ec]"
            }`}
          >
            <Flag className="h-3.5 w-3.5" />
            <span>{is_flagged ? "Hapus Tanda Ragu" : "Tandai Ragu-ragu"}</span>
          </button>
        </div>
      </div>

      {/* Teks & Gambar Pertanyaan */}
      <div className="space-y-4">
        <div className="text-base sm:text-[17px] text-[#0c0c13] leading-relaxed font-medium whitespace-pre-line">
          {question_snapshot.prompt.replace(/^\[Simulasi[^\]]*\]\s*/i, "")}
        </div>

        {promptAsset && (
          <div className="rounded-xl border border-neutral-200 bg-[#f5f8ff] p-3 space-y-2">
            <img
              src={promptAsset.storage_path}
              alt={promptAsset.alt_text || "Gambar pertanyaan"}
              className="max-h-72 w-auto rounded-lg object-contain mx-auto"
            />
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() =>
                  setZoomedImage({
                    url: promptAsset.storage_path,
                    alt: promptAsset.alt_text || "Gambar pertanyaan",
                  })
                }
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#494ae2] hover:underline"
              >
                <ZoomIn className="h-3.5 w-3.5" />
                <span>Perbesar Gambar</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pilihan Jawaban A-E */}
      <div className="space-y-2.5 pt-1" role="radiogroup" aria-label={`Pilihan jawaban soal nomor ${display_number}`}>
        {question_snapshot.options.map((opt) => (
          <AnswerOption
            key={opt.key}
            option={opt}
            isSelected={selectedOption === opt.key}
            disabled={disabled}
            onSelect={(key) => onSelectOption(key)}
            onOpenImageZoom={(url, alt) => setZoomedImage({ url, alt })}
          />
        ))}
      </div>

      {/* Tombol Batal Pilih Jawaban */}
      {selectedOption && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelectOption(null)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-red-700 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Batalkan Pilihan Jawaban ({selectedOption})</span>
          </button>
        </div>
      )}

      {/* Modal Perbesar Gambar (Bebas Cropping di Layar HP) */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl rounded-2xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#0c0c13] text-white"
              aria-label="Tutup perbesaran gambar"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={zoomedImage.url}
              alt={zoomedImage.alt}
              className="max-h-[80vh] w-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
