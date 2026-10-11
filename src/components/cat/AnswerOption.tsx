"use client";

import React from "react";
import { Check } from "lucide-react";
import { OptionKey, QuestionOptionItem } from "@/types/database";
import { cn } from "@/lib/utils";

interface AnswerOptionProps {
  option: QuestionOptionItem;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: (key: OptionKey) => void;
  onOpenImageZoom?: (url: string, alt: string) => void;
}

export function AnswerOption({
  option,
  isSelected,
  disabled = false,
  onSelect,
  onOpenImageZoom,
}: AnswerOptionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(option.key)}
      aria-pressed={isSelected}
      className={cn(
        "group flex w-full min-h-[54px] items-start gap-3.5 rounded-xl border p-3.5 sm:p-4 text-left transition-all cursor-pointer select-none",
        isSelected
          ? "border-[#494ae2] bg-[#f5f8ff] ring-2 ring-[#494ae2]/20"
          : "border-neutral-300 bg-white hover:border-[#494ae2]/60 hover:bg-neutral-50/70",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      {/* Huruf Pilihan A-E */}
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold transition-colors",
          isSelected
            ? "bg-gradient-to-br from-[#494ae2] to-[#7854ec] text-white"
            : "border border-neutral-300 bg-[#f5f8ff] text-[#0c0c13] group-hover:border-[#494ae2]"
        )}
      >
        {option.key}
      </span>

      {/* Konten Teks & Gambar Opsi */}
      <div className="flex-1 min-w-0 space-y-2 pt-0.5">
        <p
          className={cn(
            "text-sm sm:text-base leading-relaxed break-words",
            isSelected ? "font-bold text-[#0c0c13]" : "font-normal text-[#0c0c13]"
          )}
        >
          {option.text}
        </p>

        {option.asset_url && (
          <div className="pt-1">
            <img
              src={option.asset_url}
              alt={`Gambar pilihan ${option.key}`}
              onClick={(e) => {
                if (onOpenImageZoom && option.asset_url) {
                  e.stopPropagation();
                  onOpenImageZoom(
                    option.asset_url,
                    `Gambar pilihan ${option.key}`
                  );
                }
              }}
              className="max-h-44 w-auto rounded-lg border border-neutral-200 object-contain bg-white p-1"
            />
          </div>
        )}
      </div>

      {/* Indikator Terpilih */}
      {isSelected && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#494ae2] to-[#7854ec] text-white mt-1">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      )}
    </button>
  );
}
