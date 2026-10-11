"use client";

import React from "react";
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarCheck,
  ShieldCheck,
  Lock,
  Trophy,
} from "lucide-react";
import { ResultRow } from "@/types/database";
import { formatDateTimeID } from "@/lib/utils";

interface ResultSummaryProps {
  result: ResultRow;
  rankPosition?: number;
  totalParticipantsInRun?: number;
}

export function ResultSummary({
  result,
  rankPosition,
  totalParticipantsInRun,
}: ResultSummaryProps) {
  const snap = (result.result_snapshot || {}) as {
    exam_title?: string;
    run_name?: string;
    scoring_preset?: string;
    submit_trigger?: string;
    started_at?: string;
    submitted_at?: string;
  };

  const maxTotalScore = result.section_scores.reduce(
    (sum, s) => sum + (s.max_score || 0),
    0
  );

  const isScorePublished = Boolean(result.score_published_at);

  if (!isScorePublished) {
    return (
      <div className="rounded-2xl border border-[#7854ec]/30 bg-[#f5f8ff] p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#494ae2] to-[#7854ec] text-white">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#0c0c13]">
              Jawaban Berhasil Dikirim — Menunggu Publikasi Skor Resmi
            </h2>
            <p className="text-xs sm:text-sm text-neutral-700">
              {snap.exam_title || "Simulasi CAT"} • {snap.run_name || "Sesi Ujian"}
            </p>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
          Seluruh jawaban Anda telah dikunci dan dinilai di server pada{" "}
          <strong>{formatDateTimeID(result.created_at)}</strong>. Skor akhir dan
          status kelulusan ambang batas akan ditampilkan segera setelah
          Administrator membuka publikasi hasil sesi ini.
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
      {/* Top Banner Gradient */}
      <div className="bg-gradient-to-r from-[#494ae2] to-[#7854ec] px-5 py-5 sm:px-7 sm:py-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-bold text-white border border-white/20">
                <ShieldCheck className="h-3.5 w-3.5" />
                HASIL RESMI SERVER
              </span>
              {snap.scoring_preset && (
                <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/90">
                  {snap.scoring_preset}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight text-white">
              {snap.exam_title || "Simulasi SKD CPNS CATARA"}
            </h2>
            <p className="text-xs sm:text-sm text-white/80">
              {snap.run_name || "Sesi Pelaksanaan Ujian"}
            </p>
          </div>

          {/* Status Kelulusan Ambang Batas (Warna + Simbol + Teks) */}
          <div className="flex items-center gap-3 self-start md:self-center">
            {result.thresholds_met ? (
              <div className="inline-flex items-center gap-2.5 rounded-2xl bg-emerald-500 px-4 py-3 text-white shadow-sm border border-emerald-300/40">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                    Status Passing Grade
                  </span>
                  <span className="text-sm sm:text-base font-extrabold">
                    ✓ LULUS AMBANG BATAS
                  </span>
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 text-[#0c0c13] shadow-sm border border-white/40">
                <XCircle className="h-6 w-6 shrink-0 text-red-600" />
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                    Status Passing Grade
                  </span>
                  <span className="text-sm sm:text-base font-extrabold">
                    ✕ BELUM MEMENUHI AMBANG BATAS
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Metrics Row */}
      <div className="grid grid-cols-1 divide-y divide-neutral-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 bg-[#f5f8ff]">
        {/* Skor Total */}
        <div className="p-4 sm:p-5 flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white border border-[#494ae2]/15 text-[#494ae2]">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500">
              Skor Total Akhir
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#0c0c13] tabular-nums">
              {result.total_score}
              {maxTotalScore > 0 && (
                <span className="ml-1.5 text-sm font-semibold text-neutral-500">
                  / {maxTotalScore}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Peringkat Sesi */}
        <div className="p-4 sm:p-5 flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#7854ec] border border-[#7854ec]/20">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500">
              Peringkat pada Sesi Ini
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#0c0c13] tabular-nums">
              {rankPosition ? (
                <>
                  #{rankPosition}{" "}
                  <span className="text-xs font-semibold text-neutral-500">
                    dari {totalParticipantsInRun || 1} Peserta
                  </span>
                </>
              ) : (
                "Terdata"
              )}
            </p>
          </div>
        </div>

        {/* Waktu & Metode Submit */}
        <div className="p-4 sm:p-5 flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white border border-neutral-200 text-neutral-700">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-neutral-500">
              Waktu Pengiriman
            </p>
            <p className="text-sm font-bold text-[#0c0c13] tabular-nums truncate">
              {formatDateTimeID(snap.submitted_at || result.created_at)}
            </p>
            <p className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />
              <span>
                {snap.submit_trigger === "timeout_auto_submit"
                  ? "Otomatis saat waktu habis"
                  : "Dikirim mandiri oleh peserta"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
