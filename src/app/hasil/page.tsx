"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Trophy,
  History,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Bookmark,
  Layers,
  MoreVertical,
  Download,
  Shield,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  StatusBadge,
  Button,
  EmptyState,
  LoadingState,
} from "@/components/ui";
import { ResultSummary } from "@/components/hasil/ResultSummary";
import { ScoreBreakdown } from "@/components/hasil/ScoreBreakdown";
import { QuestionReviewList } from "@/components/hasil/QuestionReviewList";
import {
  getCurrentUserClient,
  getStoredProfiles,
  syncProfilesFromSupabase,
} from "@/lib/auth";
import {
  getExams,
  getExamRuns,
  getQuestions,
  getResults,
  syncAdminStoreFromSupabase,
} from "@/lib/admin-store";
import { getSessionAnswers, getSessionQuestions } from "@/lib/exam";
import { sortOfficialLeaderboard } from "@/lib/scoring";
import { EMPTY_USER_FALLBACK } from "@/lib/mock-store";
import {
  AnswerRow,
  ExamSessionQuestionRow,
  ProfileRow,
  QuestionRow,
  ResultRow,
} from "@/types/database";
import { cn, formatDateTimeID } from "@/lib/utils";

function HasilPesertaInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySessionId =
    searchParams.get("sessionId") || searchParams.get("session");

  const [user, setUser] = useState<ProfileRow>(EMPTY_USER_FALLBACK);
  const [allResults, setAllResults] = useState<ResultRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [serverQuestions, setServerQuestions] = useState<QuestionRow[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "breakdown" | "review" | "leaderboard"
  >("breakdown");

  useEffect(() => {
    const activeUser = getCurrentUserClient();
    if (!activeUser) {
      router.replace("/login");
      return;
    }

    const loadParticipantResults = () => {
      const currentUser = getCurrentUserClient() || activeUser;
      setUser(currentUser);
      setProfiles(getStoredProfiles());
      setServerQuestions(getQuestions());

      const storedResults = getResults();
      setAllResults(storedResults);

      const mine = storedResults.filter((r) => r.user_id === currentUser.id);
      if (querySessionId) {
        const bySession = mine.find(
          (r) => r.exam_session_id === querySessionId
        );
        if (bySession) {
          setSelectedResultId((prev) => prev || bySession.id);
          return;
        }
      }

      if (mine.length > 0) {
        setSelectedResultId((prev) => prev || mine[0].id);
      }
    };

    const syncRemote = async () => {
      await Promise.all([
        syncAdminStoreFromSupabase(),
        syncProfilesFromSupabase(),
      ]);
      loadParticipantResults();
    };

    loadParticipantResults();
    void syncRemote();

    const interval = window.setInterval(() => {
      void syncRemote();
    }, 6000);

    const handleFocus = () => {
      void syncRemote();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", loadParticipantResults);
    window.addEventListener("prima-store-synced", loadParticipantResults);
    window.addEventListener("prima-profiles-synced", loadParticipantResults);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", loadParticipantResults);
      window.removeEventListener("prima-store-synced", loadParticipantResults);
      window.removeEventListener("prima-profiles-synced", loadParticipantResults);
    };
  }, [querySessionId, router]);

  const displayList = allResults.filter((r) => r.user_id === user.id);
  const activeResult =
    displayList.find((r) => r.id === selectedResultId) || displayList[0];

  function handleDownloadTranscript(res: ResultRow) {
    const snap = (res.result_snapshot || {}) as {
      exam_title?: string;
      run_name?: string;
    };
    const twk =
      res.section_scores.find((s) => s.section_key === "TWK")?.score ?? 0;
    const tiu =
      res.section_scores.find((s) => s.section_key === "TIU")?.score ?? 0;
    const tkp =
      res.section_scores.find((s) => s.section_key === "TKP")?.score ?? 0;

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Transkripsi Nilai Simulasi CAT - ${user.full_name}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 36px; color: #1e1b4b; max-width: 720px; margin: 0 auto; }
  .header { border-bottom: 3px solid #4338ca; padding-bottom: 16px; margin-bottom: 24px; }
  .title { font-size: 22px; font-weight: 800; color: #4338ca; margin: 0; }
  .sub { font-size: 13px; color: #64748b; margin-top: 4px; }
  .card { background: #f6f7ff; border: 1px solid #e0e7ff; border-radius: 14px; padding: 18px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; font-size: 13px; }
  th { background: #4338ca; color: #fff; }
  .badge { display: inline-block; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 12px; background: ${
    res.thresholds_met ? "#dcfce7" : "#fee2e2"
  }; color: ${res.thresholds_met ? "#166534" : "#991b1b"}; }
</style>
</head>
<body>
  <div class="header">
    <h1 class="title">TRANSKRIPSI NILAI SIMULASI CAT PRIMA RIB</h1>
    <p class="sub">Dokumen Evaluasi Resmi Hasil Pengerjaan Peserta</p>
  </div>
  <div class="card">
    <p><strong>Nama Peserta:</strong> ${user.full_name}</p>
    <p><strong>Email:</strong> ${user.email}</p>
    <p><strong>Target Seleksi:</strong> ${user.target_selection || "CPNS"}</p>
    <p><strong>Sesi Ujian:</strong> ${snap.run_name || "Sesi Simulasi CAT"} (${
      snap.exam_title || "Simulasi CAT"
    })</p>
    <p><strong>Waktu Submit:</strong> ${formatDateTimeID(res.created_at)}</p>
    <p><strong>Status Akhir:</strong> <span class="badge">${
      res.thresholds_met
        ? "MEMENUHI AMBANG BATAS (LULUS PG)"
        : "BELUM MEMENUHI AMBANG BATAS"
    }</span></p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Subtes</th>
        <th>Skor Diperoleh</th>
        <th>Ambang Batas (PG)</th>
        <th>Status Subtes</th>
      </tr>
    </thead>
    <tbody>
      ${res.section_scores
        .map(
          (sec) => `<tr>
        <td><strong>${sec.section_key}</strong> - ${sec.title}</td>
        <td><strong>${sec.score}</strong> / ${sec.max_score}</td>
        <td>${sec.passing_grade}</td>
        <td>${sec.passed ? "Lulus PG" : "Belum Memenuhi"}</td>
      </tr>`
        )
        .join("")}
      <tr>
        <td><strong>TOTAL NILAI AKHIR</strong></td>
        <td colspan="3"><strong style="font-size:16px;color:#4338ca;">${
          res.total_score
        } Poin</strong> (TWK: ${twk}, TIU: ${tiu}, TKP: ${tkp})</td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Transkripsi-Nilai-CAT-${user.full_name
      .replace(/\s+/g, "-")
      .toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!activeResult) {
    return (
      <AppShell
        role="user"
        userName={user.full_name}
        userSubtitle={`Peserta • ${user.target_selection || "CPNS"}`}
      >
        {/* Mobile View ketika belum ada hasil (Tetap bergaya Screen 3) */}
        <div className="mx-auto max-w-md space-y-5 lg:hidden">
          <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-3.5 text-xs font-bold text-slate-500 shadow-[0_6px_20px_rgba(67,56,202,0.05)] flex items-center justify-between">
            <span>Belum Ada Sesi Selesai - 2026</span>
            <span>▾</span>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {[
              { label: "Skor TWK", val: "0", icon: Bookmark },
              { label: "Skor TIU", val: "0", icon: Shield },
              { label: "Skor TKP", val: "0", icon: Layers },
              { label: "Total Nilai Akhir", val: "0", icon: BookOpen },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-2xl border border-indigo-50/90 bg-white p-4 shadow-[0_8px_24px_rgba(67,56,202,0.05)] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4338ca] text-white">
                      <Icon className="h-4 w-4" />
                    </div>
                    <MoreVertical className="h-4 w-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-[#312e81] tabular-nums">
                      {card.val}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                      {card.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-3 pt-1">
            <h2 className="text-sm font-extrabold text-[#1e1b4b]">
              Transkripsi Nilai
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Anda belum menyelesaikan sesi ujian simulasi. Silakan mulai sesi
              simulasi CAT terlebih dahulu untuk mengunduh transkripsi nilai.
            </p>
            <button
              type="button"
              onClick={() => router.push("/ujian")}
              className="w-full rounded-2xl bg-[#4338ca] py-4 text-xs font-extrabold text-white shadow-[0_12px_28px_rgba(67,56,202,0.28)] transition-transform active:scale-98 cursor-pointer"
            >
              Mulai Simulasi Sekarang
            </button>
          </div>
        </div>

        <div className="hidden lg:block">
          <PageHeader
            title="Riwayat & Hasil Ujian"
            description="Laporan skor akhir, status ambang batas (passing grade), dan pembahasan soal simulasi CAT Anda."
          />
          <EmptyState
            title="Belum Ada Riwayat Hasil Ujian"
            description="Anda belum menyelesaikan sesi ujian simulasi. Silakan mulai ujian yang aktif di Dashboard."
            actionLabel="Ke Daftar Ujian"
            onAction={() => {
              router.push("/ujian");
            }}
          />
        </div>
      </AppShell>
    );
  }

  // Hitung peringkat peserta pada sesi pelaksanaan (exam_run_id) yang sama
  const runResultsSorted = sortOfficialLeaderboard(
    allResults.filter((r) => r.exam_run_id === activeResult.exam_run_id)
  );
  const rankIdx = runResultsSorted.findIndex((r) => r.id === activeResult.id);
  const rankPosition = rankIdx !== -1 ? rankIdx + 1 : 1;

  // Cek konfigurasi publikasi leaderboard pada ujian induk
  const runObj = getExamRuns().find((r) => r.id === activeResult.exam_run_id);
  const examObj = getExams().find((e) => e.id === runObj?.exam_id);
  const showLeaderboard =
    examObj?.publication_config?.show_leaderboard !== false;

  const sessionQuestions: ExamSessionQuestionRow[] = getSessionQuestions(
    activeResult.exam_session_id
  );
  const sessionAnswers: AnswerRow[] = getSessionAnswers(
    activeResult.exam_session_id
  );

  const twkScore =
    activeResult.section_scores.find((s) => s.section_key === "TWK")?.score ?? 0;
  const tiuScore =
    activeResult.section_scores.find((s) => s.section_key === "TIU")?.score ?? 0;
  const tkpScore =
    activeResult.section_scores.find((s) => s.section_key === "TKP")?.score ?? 0;
  const totalQuestionsAnswered = activeResult.section_scores.reduce(
    (sum, s) => sum + (s.answered_count || 0),
    0
  );

  return (
    <AppShell
      role="user"
      userName={user.full_name}
      userSubtitle={`Peserta • ${user.target_selection || "CPNS"}`}
    >
      {/* =====================================================================
          TAMPILAN MOBILE SCREEN 3 ("Hasil Studi & Transkripsi Nilai")
          ===================================================================== */}
      <div className="mx-auto max-w-md space-y-5 mb-6 lg:hidden">
        {/* Dropdown Pemilih Sesi Ujian */}
        <div>
          <label htmlFor="mobile-result-select" className="sr-only">
            Pilih Sesi Ujian
          </label>
          <select
            id="mobile-result-select"
            value={activeResult.id}
            onChange={(e) => setSelectedResultId(e.target.value)}
            className="w-full rounded-2xl border border-indigo-100/90 bg-white px-4 py-3.5 text-xs font-bold text-slate-600 shadow-[0_6px_20px_rgba(67,56,202,0.05)] focus:border-[#4338ca] focus:outline-none"
          >
            {displayList.map((resItem, idx) => {
              const snap = (resItem.result_snapshot || {}) as {
                run_name?: string;
              };
              return (
                <option key={resItem.id} value={resItem.id}>
                  {snap.run_name || `Sesi Simulasi #${idx + 1}`} — Skor{" "}
                  {resItem.total_score}
                </option>
              );
            })}
          </select>
        </div>

        {/* Grid 2x2 Kartu Nilai (Sesuai Referensi Gambar Kanan) */}
        <div className="grid grid-cols-2 gap-3.5">
          {[
            {
              val: `${twkScore} / ${tiuScore}`,
              label: "Skor TWK / TIU",
              icon: Bookmark,
            },
            {
              val: String(tkpScore),
              label: "Skor Subtes TKP",
              icon: Shield,
            },
            {
              val: String(totalQuestionsAnswered),
              label: "Total Soal Dijawab",
              icon: Layers,
            },
            {
              val: String(activeResult.total_score),
              label: "Total Nilai Akhir",
              icon: BookOpen,
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-2xl border border-indigo-50/90 bg-white p-4 shadow-[0_8px_24px_rgba(67,56,202,0.06)] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4338ca] text-white shadow-xs">
                    <Icon className="h-4 w-4" />
                  </div>
                  <MoreVertical className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-[#312e81] tabular-nums">
                    {card.val}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                    {card.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bagian Transkripsi Nilai + Tombol Download File */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-[#1e1b4b]">
              Transkripsi Nilai
            </h2>
            <span
              className={cn(
                "rounded-lg px-2.5 py-0.5 text-[10px] font-extrabold",
                activeResult.thresholds_met
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              )}
            >
              {activeResult.thresholds_met
                ? "✓ Lulus Passing Grade"
                : `Peringkat #${rankPosition}`}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Kamu bisa melihat transkripsi nilai dengan mendownload file laporan
            resmi di bawah ini
          </p>
          <button
            type="button"
            onClick={() => handleDownloadTranscript(activeResult)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4338ca] hover:bg-[#3730a3] py-4 text-xs font-extrabold text-white shadow-[0_12px_28px_rgba(67,56,202,0.3)] transition-transform active:scale-98 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download File</span>
          </button>
        </div>
      </div>

      {/* Header Desktop */}
      <div className="hidden lg:block">
        <PageHeader
          title="Riwayat & Hasil Ujian"
          description="Evaluasi capaian skor per subtes, status kelulusan passing grade, peringkat sesi, dan pembahasan soal."
          badge={
            <StatusBadge
              variant="active"
              label={`${displayList.length} Riwayat Sesi`}
            />
          }
          actions={
            <div className="flex flex-wrap gap-2.5">
              <Button
                variant="outline"
                onClick={() => handleDownloadTranscript(activeResult)}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Download Transkripsi Nilai
              </Button>
              <Link href="/ujian">
                <Button
                  variant="primary"
                  leftIcon={<PlayCircle className="h-4 w-4" />}
                >
                  Ikuti Simulasi Lainnya
                </Button>
              </Link>
            </div>
          }
        />
      </div>

      <div className="space-y-6 max-w-md mx-auto lg:max-w-none">
        {/* Pilihan Riwayat Sesi Ujian (Desktop) */}
        {displayList.length > 1 && (
          <div className="hidden lg:block rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#151515]">
              <History className="h-4 w-4 text-[#0b49d0]" />
              <span>Pilih Riwayat Sesi Pengerjaan:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {displayList.map((resItem) => {
                const snap = (resItem.result_snapshot || {}) as {
                  run_name?: string;
                };
                const isSelected = resItem.id === activeResult.id;
                return (
                  <button
                    key={resItem.id}
                    type="button"
                    onClick={() => setSelectedResultId(resItem.id)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer",
                      isSelected
                        ? "border-[#0b49d0] bg-[#0b49d0] text-white"
                        : "border-neutral-200 bg-[#fcfbf7] text-[#151515] hover:border-[#0b49d0]"
                    )}
                  >
                    <span>{snap.run_name || "Sesi Ujian"}</span>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                        isSelected
                          ? "bg-[#ffc63d] text-[#151515]"
                          : "bg-neutral-200 text-[#151515]"
                      )}
                    >
                      Skor: {resItem.total_score}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Ringkasan Utama Hasil Ujian (Desktop) */}
        <div className="hidden lg:block">
          <ResultSummary
            result={activeResult}
            rankPosition={rankPosition}
            totalParticipantsInRun={runResultsSorted.length}
          />
        </div>

        {/* Tab Navigasi Detail Hasil */}
        <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("breakdown")}
            className={cn(
              "inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-colors cursor-pointer",
              activeTab === "breakdown"
                ? "bg-[#0b49d0] text-white shadow-xs"
                : "bg-white border border-neutral-200 text-[#151515] hover:bg-neutral-50"
            )}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Rincian Skor Subtes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={cn(
              "inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-colors cursor-pointer",
              activeTab === "review"
                ? "bg-[#0b49d0] text-white shadow-xs"
                : "bg-white border border-neutral-200 text-[#151515] hover:bg-neutral-50"
            )}
          >
            <BookOpen className="h-4 w-4" />
            <span>Kunci Jawaban & Pembahasan</span>
          </button>

          {showLeaderboard && (
            <button
              type="button"
              onClick={() => setActiveTab("leaderboard")}
              className={cn(
                "inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-colors cursor-pointer",
                activeTab === "leaderboard"
                  ? "bg-[#0b49d0] text-white shadow-xs"
                  : "bg-white border border-neutral-200 text-[#151515] hover:bg-neutral-50"
              )}
            >
              <Trophy className="h-4 w-4" />
              <span>Peringkat Sesi ({runResultsSorted.length})</span>
            </button>
          )}
        </div>

        {/* Isi Tab 1: Rincian Skor per Subtes */}
        {activeTab === "breakdown" && (
          <ScoreBreakdown sectionScores={activeResult.section_scores} />
        )}

        {/* Isi Tab 2: Kunci Jawaban & Pembahasan */}
        {activeTab === "review" && (
          <QuestionReviewList
            result={activeResult}
            sessionQuestions={sessionQuestions}
            sessionAnswers={sessionAnswers}
            serverQuestions={serverQuestions}
          />
        )}

        {/* Isi Tab 3: Peringkat Sesi (Leaderboard Resmi) */}
        {activeTab === "leaderboard" && showLeaderboard && (
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-[#151515] flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-600" />
                <span>Peringkat Resmi Sesi Ujian (Leaderboard)</span>
              </h3>
              <p className="text-xs text-neutral-500">
                Diurutkan berdasarkan kelulusan ambang batas (Passing Grade),
                Skor Total tertinggi, lalu tie-breaker TKP → TIU → TWK.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-[#fcfbf7] text-neutral-600 font-bold">
                    <th className="py-3 px-3">Peringkat</th>
                    <th className="py-3 px-3">Nama Peserta</th>
                    <th className="py-3 px-3 text-center">TWK</th>
                    <th className="py-3 px-3 text-center">TIU</th>
                    <th className="py-3 px-3 text-center">TKP</th>
                    <th className="py-3 px-3 text-center">Total Skor</th>
                    <th className="py-3 px-3">Status Ambang Batas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {runResultsSorted.map((row, idx) => {
                    const prof = profiles.find((p) => p.id === row.user_id);
                    const isMe = row.user_id === user.id;
                    const twk =
                      row.section_scores.find((s) => s.section_key === "TWK")
                        ?.score ?? 0;
                    const tiu =
                      row.section_scores.find((s) => s.section_key === "TIU")
                        ?.score ?? 0;
                    const tkp =
                      row.section_scores.find((s) => s.section_key === "TKP")
                        ?.score ?? 0;

                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          "transition-colors",
                          isMe ? "bg-[#eef4ff]/70 font-semibold" : "hover:bg-neutral-50"
                        )}
                      >
                        <td className="py-3 px-3 tabular-nums font-extrabold text-[#151515]">
                          <span
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs",
                              idx === 0
                                ? "bg-[#ffc63d] text-[#151515]"
                                : idx === 1
                                ? "bg-neutral-200 text-[#151515]"
                                : idx === 2
                                ? "bg-amber-100 text-amber-900"
                                : "bg-neutral-100 text-neutral-700"
                            )}
                          >
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#151515]">
                              {prof?.full_name || "Peserta Simulasi"}
                            </span>
                            {isMe && (
                              <span className="rounded-md bg-[#0b49d0] px-2 py-0.5 text-[10px] font-bold text-white">
                                Anda
                              </span>
                            )}
                          </div>
                          <span className="block text-[11px] text-neutral-500">
                            Submit: {formatDateTimeID(row.created_at)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center tabular-nums font-bold">
                          {twk}
                        </td>
                        <td className="py-3 px-3 text-center tabular-nums font-bold">
                          {tiu}
                        </td>
                        <td className="py-3 px-3 text-center tabular-nums font-bold">
                          {tkp}
                        </td>
                        <td className="py-3 px-3 text-center tabular-nums text-base font-extrabold text-[#0b49d0]">
                          {row.total_score}
                        </td>
                        <td className="py-3 px-3">
                          {row.thresholds_met ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              ✓ Lulus PG
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-bold text-red-700">
                              <XCircle className="h-3.5 w-3.5" />
                              ✕ Belum Lulus
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

export default function HasilPesertaPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8">
          <LoadingState message="Memuat hasil dan analisis skor ujian..." />
        </div>
      }
    >
      <HasilPesertaInner />
    </Suspense>
  );
}
