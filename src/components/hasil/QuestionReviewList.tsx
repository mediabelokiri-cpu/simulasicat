"use client";

import React, { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Lock,
  Sparkles,
} from "lucide-react";
import {
  AnswerRow,
  ExamSessionQuestionRow,
  OptionKey,
  QuestionRow,
  ResultRow,
} from "@/types/database";
import { cn } from "@/lib/utils";

interface QuestionReviewListProps {
  result: ResultRow;
  sessionQuestions: ExamSessionQuestionRow[];
  sessionAnswers: AnswerRow[];
  serverQuestions: QuestionRow[];
}

export function QuestionReviewList({
  result,
  sessionQuestions,
  sessionAnswers,
  serverQuestions,
}: QuestionReviewListProps) {
  const [subtestFilter, setSubtestFilter] = useState<string>("ALL");

  const isAnswerKeyPublished = Boolean(result.answer_key_published_at);
  const isExplanationsPublished = Boolean(result.explanations_published_at);

  const answerMap = new Map<string, OptionKey | null>();
  sessionAnswers.forEach((a) => {
    answerMap.set(a.session_question_id, a.selected_option);
  });

  const itemsToRender = sessionQuestions.map((sq) => {
    const serverQ = serverQuestions.find(
      (q) => q.id === sq.question_snapshot.question_id
    );
    return {
      displayNumber: sq.display_number,
      sectionKey: sq.section_key,
      prompt: sq.question_snapshot.prompt,
      questionType: sq.question_snapshot.question_type,
      options: sq.question_snapshot.options,
      selectedOption: answerMap.get(sq.id) ?? null,
      correctOption: serverQ?.correct_option ?? "C",
      tkpScores: serverQ?.tkp_scores ?? {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        E: 0,
      },
      explanation: serverQ?.explanation || null,
    };
  });

  const sectionKeys = Array.from(
    new Set(itemsToRender.map((i) => i.sectionKey))
  );

  const filteredItems =
    subtestFilter === "ALL"
      ? itemsToRender
      : itemsToRender.filter((i) => i.sectionKey === subtestFilter);

  if (!isAnswerKeyPublished && !isExplanationsPublished) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
          <Lock className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-bold text-[#151515]">
            Kunci Jawaban & Pembahasan Belum Dipublikasikan
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
            Demi menjaga integritas soal pada sesi ujian yang masih berlangsung,
            kunci jawaban dan pembahasan soal akan dibuka sesuai jadwal publikasi
            yang ditetapkan oleh Administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-[#151515] flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#0b49d0]" />
            <span>Kunci Jawaban & Pembahasan Soal</span>
          </h3>
          <p className="text-xs text-neutral-500">
            Menampilkan perbandingan jawaban Anda dengan kunci jawaban resmi server.
          </p>
        </div>

        {/* Filter Subtes */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSubtestFilter("ALL")}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer",
              subtestFilter === "ALL"
                ? "bg-[#0b49d0] text-white"
                : "bg-white border border-neutral-200 text-[#151515] hover:bg-neutral-50"
            )}
          >
            Semua ({itemsToRender.length})
          </button>
          {sectionKeys.map((sk) => (
            <button
              key={sk}
              type="button"
              onClick={() => setSubtestFilter(sk)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer",
                subtestFilter === sk
                  ? "bg-[#0b49d0] text-white"
                  : "bg-white border border-neutral-200 text-[#151515] hover:bg-neutral-50"
              )}
            >
              {sk}
            </button>
          ))}
        </div>
      </div>

      {/* Daftar Butir Soal & Pembahasan */}
      <div className="space-y-4">
        {filteredItems.map((item) => {
          const isTkp = item.questionType === "tkp";
          const earnedPoints = !item.selectedOption
            ? 0
            : isTkp
            ? Number(item.tkpScores[item.selectedOption] ?? 0)
            : item.selectedOption === item.correctOption
            ? 5
            : 0;

          const isCorrectOrMax = isTkp
            ? earnedPoints === 5
            : item.selectedOption === item.correctOption;

          return (
            <article
              key={item.displayNumber}
              className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-xs space-y-4"
            >
              {/* Header Butir Soal */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-[#0b49d0] px-3 py-1 text-xs font-extrabold text-white tabular-nums">
                    Soal No. {item.displayNumber}
                  </span>
                  <span className="rounded-lg bg-[#eef4ff] px-2.5 py-1 text-xs font-bold text-[#0b49d0]">
                    {item.sectionKey}
                  </span>
                </div>

                {isAnswerKeyPublished && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-neutral-600">
                      Jawaban Anda:{" "}
                      <strong className="text-[#151515]">
                        {item.selectedOption || "Kosong (-)"}
                      </strong>
                    </span>
                    {isCorrectOrMax ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800 tabular-nums">
                        <CheckCircle2 className="h-3.5 w-3.5" />+{earnedPoints}{" "}
                        Poin ({isTkp ? "Skor Maksimal" : "Benar"})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-900 tabular-nums">
                        <XCircle className="h-3.5 w-3.5 text-red-600" />+
                        {earnedPoints} Poin (
                        {isTkp
                          ? `Opsi 5 Poin: ${
                              Object.entries(item.tkpScores).find(
                                ([, v]) => v === 5
                              )?.[0] || "-"
                            }`
                          : `Kunci: ${item.correctOption}`}
                        )
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Teks Soal */}
              <p className="text-sm sm:text-base font-medium text-[#151515] leading-relaxed whitespace-pre-line">
                {item.prompt}
              </p>

              {/* Opsi A-E dengan Penanda Kunci & Jawaban Peserta */}
              <div className="grid grid-cols-1 gap-2">
                {item.options.map((opt) => {
                  const isUserChoice = item.selectedOption === opt.key;
                  const isKeyChoice = isTkp
                    ? Number(item.tkpScores[opt.key]) === 5
                    : item.correctOption === opt.key;
                  const tkpPt = isTkp ? Number(item.tkpScores[opt.key] ?? 0) : null;

                  return (
                    <div
                      key={opt.key}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm",
                        isAnswerKeyPublished && isKeyChoice
                          ? "border-emerald-300 bg-emerald-50/70 text-[#151515] font-semibold"
                          : isUserChoice
                          ? "border-[#0b49d0] bg-[#eef4ff]/60 text-[#151515] font-semibold"
                          : "border-neutral-200 bg-[#fcfbf7] text-neutral-700"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold",
                            isAnswerKeyPublished && isKeyChoice
                              ? "bg-emerald-600 text-white"
                              : isUserChoice
                              ? "bg-[#0b49d0] text-white"
                              : "bg-white border border-neutral-300 text-[#151515]"
                          )}
                        >
                          {opt.key}
                        </span>
                        <span className="leading-snug">{opt.text}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isUserChoice && (
                          <span className="rounded-md bg-[#0b49d0] px-2 py-0.5 text-[10px] font-bold text-white">
                            Pilihan Anda
                          </span>
                        )}
                        {isAnswerKeyPublished && isTkp && tkpPt !== null && (
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums",
                              tkpPt === 5
                                ? "bg-emerald-600 text-white"
                                : "bg-neutral-200 text-[#151515]"
                            )}
                          >
                            Bobot: {tkpPt}
                          </span>
                        )}
                        {isAnswerKeyPublished && !isTkp && isKeyChoice && (
                          <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            ✓ Kunci
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pembahasan Soal */}
              {isExplanationsPublished && item.explanation && (
                <div className="rounded-xl border border-[#0b49d0]/20 bg-[#eef4ff]/60 p-3.5 sm:p-4 text-xs sm:text-sm space-y-1">
                  <div className="flex items-center gap-1.5 font-extrabold text-[#0b49d0]">
                    <Sparkles className="h-4 w-4" />
                    <span>Pembahasan Resmi:</span>
                  </div>
                  <p className="text-neutral-800 leading-relaxed whitespace-pre-line">
                    {item.explanation}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
