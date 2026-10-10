"use client";

import React from "react";
import { CheckCircle2, XCircle, BarChart3 } from "lucide-react";
import { SectionScoreResult } from "@/types/database";

interface ScoreBreakdownProps {
  sectionScores: SectionScoreResult[];
}

export function ScoreBreakdown({ sectionScores }: ScoreBreakdownProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-extrabold text-[#151515] flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#0b49d0]" />
          <span>Rincian Skor & Ambang Batas per Subtes</span>
        </h3>
        <span className="text-xs text-neutral-500">
          Wajib memenuhi seluruh ambang batas subtes
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {sectionScores.map((sec) => {
          const scorePct =
            sec.max_score > 0
              ? Math.min(100, Math.round((sec.score / sec.max_score) * 100))
              : 0;
          const thresholdPct =
            sec.max_score > 0
              ? Math.min(
                  100,
                  Math.round((sec.passing_grade / sec.max_score) * 100)
                )
              : 0;

          return (
            <div
              key={sec.section_key}
              className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-xl bg-[#0b49d0] px-3 py-1 text-xs font-extrabold text-white">
                    {sec.section_key}
                  </span>
                  {sec.passed ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      ✓ Memenuhi
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-bold text-red-700">
                      <XCircle className="h-3.5 w-3.5" />
                      ✕ Belum Memenuhi
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-[#151515]">
                  {sec.title}
                </h4>
              </div>

              {/* Angka Skor & Ambang Batas */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-extrabold text-[#151515] tabular-nums">
                      {sec.score}
                    </span>
                    <span className="ml-1 text-xs font-semibold text-neutral-500 tabular-nums">
                      / {sec.max_score} poin
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[11px] text-neutral-500">
                      Passing Grade
                    </span>
                    <span className="text-xs font-extrabold text-[#0b49d0] tabular-nums">
                      Min. {sec.passing_grade}
                    </span>
                  </div>
                </div>

                {/* Progress Bar dengan Penanda Passing Grade */}
                <div className="relative pt-1">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100 border border-neutral-200">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        sec.passed ? "bg-[#0b49d0]" : "bg-[#ffc63d]"
                      }`}
                      style={{ width: `${scorePct}%` }}
                    />
                  </div>
                  {thresholdPct > 0 && thresholdPct < 100 && (
                    <div
                      className="absolute top-0 h-5 w-0.5 bg-[#151515]"
                      style={{ left: `${thresholdPct}%` }}
                      title={`Ambang Batas: ${sec.passing_grade}`}
                    />
                  )}
                </div>
              </div>

              {/* Statistik Jawaban Subtes */}
              <dl className="grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3 text-xs">
                <div className="rounded-xl bg-[#fcfbf7] p-2.5 border border-neutral-100">
                  <dt className="text-neutral-500">Terjawab</dt>
                  <dd className="font-bold text-[#151515] tabular-nums mt-0.5">
                    {sec.answered_count} / {sec.question_count} Soal
                  </dd>
                </div>
                <div className="rounded-xl bg-[#fcfbf7] p-2.5 border border-neutral-100">
                  <dt className="text-neutral-500">
                    {sec.section_key.toUpperCase() === "TKP"
                      ? "Skor Maks (5 Poin)"
                      : "Jawaban Benar"}
                  </dt>
                  <dd className="font-bold text-emerald-700 tabular-nums mt-0.5">
                    {sec.correct_count} Butir
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}
