"use client";

import React, { useEffect, useState } from "react";
import {
  Award,
  BarChart3,
  CheckCircle2,
  Download,
  Eye,
  Globe,
  Lock,
  Trash2,
  Trophy,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  StatCard,
  StatusBadge,
  Button,
  SearchInput,
  FormField,
  selectBaseClasses,
  ConfirmDialog,
  ToastNotification,
} from "@/components/ui";
import { ScoreBreakdown } from "@/components/hasil/ScoreBreakdown";
import { getStoredProfiles, syncProfilesFromSupabase } from "@/lib/auth";
import {
  appendAuditLog,
  deleteSingleExamSessionAndResult,
  getExamRuns,
  getExamSessions,
  getExams,
  getResults,
  resetAllMonitoringAndResults,
  saveExams,
  saveResults,
  syncAdminStoreFromSupabase,
} from "@/lib/admin-store";
import {
  finalizeAndScoreExamSession,
  sortOfficialLeaderboard,
} from "@/lib/scoring";
import {
  ExamRow,
  ExamRunRow,
  ProfileRow,
  ResultRow,
} from "@/types/database";
import { cn, formatDateTimeID } from "@/lib/utils";

export default function AdminHasilAnalitikPage() {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [runs, setRuns] = useState<ExamRunRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  const [selectedRunId, setSelectedRunId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [inspectResult, setInspectResult] = useState<ResultRow | null>(null);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [deleteResultTarget, setDeleteResultTarget] =
    useState<ResultRow | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "info";
    title: string;
    desc: string;
  } | null>(null);

  const loadAnalyticsData = () => {
    // Pastikan semua sesi selesai (submitted/timed_out) sudah terhitung skornya di results
    const allSessions = getExamSessions();
    const currentResults = getResults();
    const scoredSessionIds = new Set(currentResults.map((r) => r.exam_session_id));
    for (const s of allSessions) {
      if (
        (s.status === "submitted" || s.status === "timed_out") &&
        !scoredSessionIds.has(s.id)
      ) {
        finalizeAndScoreExamSession(
          s.id,
          s.status === "timed_out" ? "timeout_auto_submit" : "manual_submit"
        );
      }
    }

    setExams(getExams());
    setRuns(getExamRuns());
    setProfiles(getStoredProfiles());
    setResults(getResults());
  };

  useEffect(() => {
    const syncRemote = async () => {
      await Promise.all([
        syncAdminStoreFromSupabase(),
        syncProfilesFromSupabase(),
      ]);
      loadAnalyticsData();
    };

    loadAnalyticsData();
    void syncRemote();

    const interval = window.setInterval(() => {
      void syncRemote();
    }, 5000);

    const handleFocus = () => {
      void syncRemote();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", loadAnalyticsData);
    window.addEventListener("prima-store-synced", loadAnalyticsData);
    window.addEventListener("prima-profiles-synced", loadAnalyticsData);
    window.addEventListener("prima-live-score-event", loadAnalyticsData);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", loadAnalyticsData);
      window.removeEventListener("prima-store-synced", loadAnalyticsData);
      window.removeEventListener("prima-profiles-synced", loadAnalyticsData);
      window.removeEventListener("prima-live-score-event", loadAnalyticsData);
    };
  }, []);

  const filteredByRun =
    selectedRunId === "ALL"
      ? results
      : results.filter((r) => r.exam_run_id === selectedRunId);

  const rankedResults = sortOfficialLeaderboard(filteredByRun);

  const visibleResults = rankedResults.filter((r) => {
    const prof = profiles.find((p) => p.id === r.user_id);
    const matchesSearch =
      !search.trim() ||
      (prof?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (prof?.email || "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PASSED" && r.thresholds_met) ||
      (statusFilter === "FAILED" && !r.thresholds_met);

    return matchesSearch && matchesStatus;
  });

  // Statistik Analitik Sesi
  const totalCount = rankedResults.length;
  const passedCount = rankedResults.filter((r) => r.thresholds_met).length;
  const passRatePct =
    totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  const avgTotalScore =
    totalCount > 0
      ? Math.round(
          rankedResults.reduce((sum, r) => sum + r.total_score, 0) / totalCount
        )
      : 0;
  const maxScore =
    totalCount > 0 ? Math.max(...rankedResults.map((r) => r.total_score)) : 0;
  const minScore =
    totalCount > 0 ? Math.min(...rankedResults.map((r) => r.total_score)) : 0;

  // Analitik Rata-rata per Subtes (TWK, TIU, TKP)
  const subtestKeys = ["TWK", "TIU", "TKP"];
  const subtestAnalytics = subtestKeys.map((key) => {
    const scores = rankedResults
      .map(
        (r) =>
          r.section_scores.find(
            (s) => s.section_key.toUpperCase() === key
          ) || null
      )
      .filter(Boolean);

    const count = scores.length;
    const avg =
      count > 0
        ? Math.round(scores.reduce((s, item) => s + (item?.score || 0), 0) / count)
        : 0;
    const passSubCount = scores.filter((item) => item?.passed).length;
    const passSubPct =
      count > 0 ? Math.round((passSubCount / count) * 100) : 0;
    const pg = scores[0]?.passing_grade ?? (key === "TWK" ? 65 : key === "TIU" ? 80 : 166);
    const maxPossible = scores[0]?.max_score ?? (key === "TWK" ? 150 : key === "TIU" ? 175 : 225);

    return {
      key,
      avg,
      pg,
      maxPossible,
      passSubCount,
      passSubPct,
    };
  });

  // Ujian aktif untuk kontrol publikasi
  const activeRunObj =
    runs.find((r) => r.id === selectedRunId) || runs[0] || null;
  const activeExamObj =
    exams.find((e) => e.id === activeRunObj?.exam_id) || exams[0] || null;

  function handleTogglePublication(
    field:
      | "publish_score_immediately"
      | "publish_answer_key"
      | "publish_explanations"
      | "show_leaderboard"
  ) {
    if (!activeExamObj) return;

    const currentVal = activeExamObj.publication_config[field];
    const nextVal = !currentVal;
    const nowIso = new Date().toISOString();

    const updatedExams = exams.map((ex) =>
      ex.id === activeExamObj.id
        ? {
            ...ex,
            publication_config: {
              ...ex.publication_config,
              [field]: nextVal,
            },
            updated_at: nowIso,
          }
        : ex
    );
    saveExams(updatedExams);
    setExams(updatedExams);

    // Sinkronkan timestamp publikasi pada baris ResultRow terkait
    const targetRunIds = runs
      .filter((r) => r.exam_id === activeExamObj.id)
      .map((r) => r.id);

    const updatedResults = results.map((resRow) => {
      if (!targetRunIds.includes(resRow.exam_run_id)) return resRow;
      if (field === "publish_score_immediately") {
        return { ...resRow, score_published_at: nextVal ? nowIso : null };
      }
      if (field === "publish_answer_key") {
        return { ...resRow, answer_key_published_at: nextVal ? nowIso : null };
      }
      if (field === "publish_explanations") {
        return {
          ...resRow,
          explanations_published_at: nextVal ? nowIso : null,
        };
      }
      return resRow;
    });

    saveResults(updatedResults);
    setResults(updatedResults);

    appendAuditLog({
      action: "UPDATE_RESULT_PUBLICATION",
      entity_type: "exams",
      entity_id: activeExamObj.id,
      reason: `Mengubah pengaturan publikasi ${field} menjadi ${
        nextVal ? "AKTIF" : "NONAKTIF"
      }`,
      details: { field, enabled: nextVal },
    });

    setToast({
      type: "success",
      title: "Pengaturan Publikasi Diperbarui",
      desc: `Status publikasi hasil pada "${activeExamObj.title}" berhasil disimpan dan dicatat ke Audit Log.`,
    });
  }

  function handleExportCsv() {
    const headers = [
      "Peringkat",
      "Nama Peserta",
      "Email",
      "Sesi Ujian",
      "Skor TWK",
      "Skor TIU",
      "Skor TKP",
      "Total Skor",
      "Status Passing Grade",
      "Waktu Submit",
    ];

    const rows = rankedResults.map((r, index) => {
      const prof = profiles.find((p) => p.id === r.user_id);
      const snap = (r.result_snapshot || {}) as { run_name?: string };
      const twk =
        r.section_scores.find((s) => s.section_key === "TWK")?.score ?? 0;
      const tiu =
        r.section_scores.find((s) => s.section_key === "TIU")?.score ?? 0;
      const tkp =
        r.section_scores.find((s) => s.section_key === "TKP")?.score ?? 0;

      return [
        index + 1,
        `"${(prof?.full_name || "Peserta").replace(/"/g, '""')}"`,
        prof?.email || "-",
        `"${(snap.run_name || "Sesi Ujian").replace(/"/g, '""')}"`,
        twk,
        tiu,
        tkp,
        r.total_score,
        r.thresholds_met ? "LULUS AMBANG BATAS" : "BELUM MEMENUHI",
        r.created_at,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hasil-simulasi-cat-${selectedRunId.toLowerCase()}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    appendAuditLog({
      action: "EXPORT_RESULTS_CSV",
      entity_type: "results",
      entity_id: selectedRunId,
      reason: `Admin mengekspor ${rankedResults.length} baris hasil ujian ke CSV`,
      details: { count: rankedResults.length, filter_run: selectedRunId },
    });

    setToast({
      type: "info",
      title: "File CSV Berhasil Diunduh",
      desc: `${rankedResults.length} data hasil peserta telah diekspor dalam format CSV.`,
    });
  }

  async function handleResetAllResults() {
    await resetAllMonitoringAndResults(
      "usr-admin-01",
      "Admin mereset dan membersihkan seluruh data Hasil, Peringkat & Analitik Ujian"
    );
    loadAnalyticsData();
    setShowResetModal(false);
    setToast({
      type: "success",
      title: "Data Hasil & Analitik Dibersihkan",
      desc: "Seluruh data hasil ujian, peringkat, dan analitik telah direset hingga kembali kosong.",
    });
  }

  async function handleDeleteSingleResult() {
    if (!deleteResultTarget) return;
    const target = deleteResultTarget;
    const prof = profiles.find((p) => p.id === target.user_id);
    await deleteSingleExamSessionAndResult(target.exam_session_id || target.id);
    loadAnalyticsData();
    setDeleteResultTarget(null);
    setToast({
      type: "info",
      title: "Data Hasil Peserta Dihapus",
      desc: `Hasil ujian milik ${
        prof?.full_name || "Peserta"
      } berhasil dihapus dari papan peringkat dan analitik.`,
    });
  }

  return (
    <AppShell
      role="admin"
      userName="Administrator Utama"
      userSubtitle="Panel Evaluasi & Analitik"
    >
      <PageHeader
        title="Hasil, Peringkat & Analitik Ujian"
        description="Evaluasi distribusi skor peserta, persentase kelulusan ambang batas (Passing Grade), kontrol publikasi pembahasan, dan ekspor laporan CSV."
        badge={
          <StatusBadge
            variant="featured"
            label={`${rankedResults.length} Hasil Terdata`}
          />
        }
        actions={
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="danger"
              disabled={results.length === 0}
              onClick={() => setShowResetModal(true)}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Reset / Bersihkan Data
            </Button>
            <Button
              variant="primary"
              disabled={rankedResults.length === 0}
              onClick={handleExportCsv}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Ekspor CSV Hasil Sesi
            </Button>
          </div>
        }
      />

      {toast && (
        <div className="mb-6">
          <ToastNotification
            type={toast.type}
            title={toast.title}
            description={toast.desc}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* 4 Kartu Statistik Utama */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Total Peserta Selesai"
          value={totalCount}
          subtitle="Telah submit & dinilai server"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Kelulusan Passing Grade"
          value={`${passRatePct}%`}
          subtitle={`${passedCount} dari ${totalCount} peserta lulus PG`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          trend={{
            label: `${passedCount} Lulus • ${totalCount - passedCount} Belum`,
            positive: passRatePct >= 50,
          }}
        />
        <StatCard
          title="Rata-rata Skor Total"
          value={avgTotalScore}
          subtitle="Skala maksimal 550 poin (SKD)"
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <StatCard
          title="Rentang Skor (Min – Maks)"
          value={`${minScore} – ${maxScore}`}
          subtitle="Skor terendah & tertinggi sesi"
          icon={<Trophy className="h-5 w-5" />}
        />
      </div>

      {/* Analitik Per Subtes (TWK, TIU, TKP) & Kontrol Publikasi */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 mb-6">
        {/* Rincian Rata-rata Subtes (7/12) */}
        <section className="lg:col-span-7 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-[#151515] flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#0b49d0]" />
                <span>Analitik Capaian per Subtes (TWK / TIU / TKP)</span>
              </h2>
              <p className="text-xs text-neutral-500">
                Perbandingan rata-rata skor peserta terhadap ambang batas resmi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            {subtestAnalytics.map((sa) => (
              <div
                key={sa.key}
                className="rounded-xl border border-neutral-200 bg-[#fcfbf7] p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-[#0b49d0] px-2.5 py-1 text-xs font-extrabold text-white">
                    {sa.key}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 tabular-nums">
                    {sa.passSubPct}% Lulus PG
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-neutral-500">
                    Rata-rata Skor
                  </span>
                  <span className="text-2xl font-extrabold text-[#151515] tabular-nums">
                    {sa.avg}
                  </span>
                  <span className="ml-1 text-xs text-neutral-500 tabular-nums">
                    / {sa.maxPossible}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-600 border-t border-neutral-200/80 pt-2 flex justify-between">
                  <span>Ambang Batas:</span>
                  <strong className="text-[#151515] tabular-nums">
                    Min. {sa.pg}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Kontrol Publikasi Hasil & Pembahasan (5/12) */}
        <section className="lg:col-span-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-neutral-100 pb-3">
            <h2 className="text-base font-extrabold text-[#151515] flex items-center gap-2">
              <Globe className="h-5 w-5 text-[#0b49d0]" />
              <span>Kontrol Publikasi ke Peserta</span>
            </h2>
            <p className="text-xs text-neutral-500">
              Atur visibilitas skor akhir, kunci jawaban, pembahasan, dan
              leaderboard untuk peserta.
            </p>
          </div>

          {activeExamObj && (
            <div className="space-y-2.5 text-xs">
              {[
                {
                  key: "publish_score_immediately" as const,
                  label: "Publikasikan Skor Akhir & Passing Grade",
                  desc: "Peserta langsung melihat total nilai setelah submit",
                },
                {
                  key: "publish_answer_key" as const,
                  label: "Publikasikan Kunci Jawaban & Bobot TKP",
                  desc: "Tampilkan kunci jawaban A–E dan bobot poin 1–5 TKP",
                },
                {
                  key: "publish_explanations" as const,
                  label: "Publikasikan Pembahasan Soal Resmi",
                  desc: "Buka akses baca pembahasan lengkap per butir soal",
                },
                {
                  key: "show_leaderboard" as const,
                  label: "Tampilkan Tabel Peringkat (Leaderboard)",
                  desc: "Peserta dapat melihat urutan ranking pada sesi ujian",
                },
              ].map((item) => {
                const isOn = activeExamObj.publication_config[item.key];
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-[#fcfbf7] px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[#151515]">{item.label}</p>
                      <p className="text-[11px] text-neutral-500 truncate">
                        {item.desc}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTogglePublication(item.key)}
                      className={cn(
                        "inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-extrabold transition-colors cursor-pointer",
                        isOn
                          ? "bg-emerald-600 text-white"
                          : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                      )}
                    >
                      {isOn ? (
                        <>
                          <Globe className="h-3.5 w-3.5" /> Dibuka
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5" /> Dikunci
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Filter & Tabel Peringkat Resmi (Leaderboard) */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12 items-end">
          <div className="md:col-span-5">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Cari nama peserta atau email..."
            />
          </div>
          <div className="md:col-span-4">
            <FormField id="filter-run" label="Filter Sesi Pelaksanaan">
              <select
                id="filter-run"
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
                className={selectBaseClasses}
              >
                <option value="ALL">Semua Sesi Pelaksanaan</option>
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="md:col-span-3">
            <FormField id="filter-pg" label="Status Passing Grade">
              <select
                id="filter-pg"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={selectBaseClasses}
              >
                <option value="ALL">Semua Status</option>
                <option value="PASSED">✓ Lulus Ambang Batas</option>
                <option value="FAILED">✕ Belum Memenuhi</option>
              </select>
            </FormField>
          </div>
        </div>

        {/* Tabel Desktop */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-[#fcfbf7] text-neutral-600 font-bold">
                <th className="py-3 px-3">Peringkat</th>
                <th className="py-3 px-3">Peserta</th>
                <th className="py-3 px-3">Sesi Ujian</th>
                <th className="py-3 px-3 text-center">TWK</th>
                <th className="py-3 px-3 text-center">TIU</th>
                <th className="py-3 px-3 text-center">TKP</th>
                <th className="py-3 px-3 text-center">Total Skor</th>
                <th className="py-3 px-3">Passing Grade</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visibleResults.map((row) => {
                const officialRank =
                  rankedResults.findIndex((r) => r.id === row.id) + 1;
                const prof = profiles.find((p) => p.id === row.user_id);
                const snap = (row.result_snapshot || {}) as {
                  run_name?: string;
                };
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
                  <tr key={row.id} className="hover:bg-neutral-50">
                    <td className="py-3.5 px-3 tabular-nums font-extrabold">
                      <span
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs",
                          officialRank === 1
                            ? "bg-[#ffc63d] text-[#151515]"
                            : officialRank === 2
                            ? "bg-neutral-200 text-[#151515]"
                            : officialRank === 3
                            ? "bg-amber-100 text-amber-900"
                            : "bg-neutral-100 text-neutral-700"
                        )}
                      >
                        #{officialRank}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-[#151515]">
                        {prof?.full_name || "Peserta Simulasi"}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {prof?.email || "-"}
                      </p>
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="font-semibold text-[#151515]">
                        {snap.run_name || "Sesi Ujian"}
                      </p>
                      <p className="text-[11px] text-neutral-500 tabular-nums">
                        {formatDateTimeID(row.created_at)}
                      </p>
                    </td>
                    <td className="py-3.5 px-3 text-center tabular-nums font-bold">
                      {twk}
                    </td>
                    <td className="py-3.5 px-3 text-center tabular-nums font-bold">
                      {tiu}
                    </td>
                    <td className="py-3.5 px-3 text-center tabular-nums font-bold">
                      {tkp}
                    </td>
                    <td className="py-3.5 px-3 text-center tabular-nums text-base font-extrabold text-[#0b49d0]">
                      {row.total_score}
                    </td>
                    <td className="py-3.5 px-3">
                      {row.thresholds_met ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />✓ Lulus PG
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-bold text-red-700">
                          <XCircle className="h-3.5 w-3.5" />✕ Belum Lulus
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInspectResult(row)}
                          leftIcon={<Eye className="h-3.5 w-3.5" />}
                        >
                          Rincian
                        </Button>
                        <button
                          type="button"
                          onClick={() => setDeleteResultTarget(row)}
                          title="Hapus hasil peserta ini"
                          aria-label="Hapus hasil peserta ini"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50/70 text-red-600 transition-colors hover:bg-red-600 hover:text-white cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleResults.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="py-10 px-4 text-center text-neutral-500"
                  >
                    <Trophy className="mx-auto h-8 w-8 text-neutral-300 mb-2" />
                    <p className="text-sm font-bold text-[#151515]">
                      Belum Ada Data Hasil &amp; Peringkat Ujian
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Hasil ujian dan peringkat peserta akan muncul secara otomatis setelah peserta menyelesaikan sesi ujian.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dialog Konfirmasi Reset / Bersihkan Semua Data Hasil & Analitik */}
      <ConfirmDialog
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={() => void handleResetAllResults()}
        variant="danger"
        title="Reset & Bersihkan Seluruh Data Hasil & Analitik?"
        description={`Tindakan ini akan menghapus seluruh ${results.length} data hasil ujian, papan peringkat (leaderboard), dan sesi pengerjaan terkait hingga kembali kosong (0 data).`}
        confirmLabel="Ya, Bersihkan Semua Data"
      />

      {/* Dialog Konfirmasi Hapus 1 Hasil Peserta */}
      <ConfirmDialog
        open={Boolean(deleteResultTarget)}
        onClose={() => setDeleteResultTarget(null)}
        onConfirm={() => void handleDeleteSingleResult()}
        variant="danger"
        title="Hapus Data Hasil Peserta?"
        description="Data hasil ujian peserta ini akan dihapus secara permanen dari Peringkat, Analitik, dan Leaderboard Homepage."
        confirmLabel="Ya, Hapus Hasil"
      />

      {/* Modal Detail Hasil Peserta */}
      {inspectResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b49d0] text-white">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#151515]">
                    Rincian Hasil Peserta:{" "}
                    {profiles.find((p) => p.id === inspectResult.user_id)
                      ?.full_name || "Peserta"}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Total Skor:{" "}
                    <strong className="text-[#0b49d0]">
                      {inspectResult.total_score} Poin
                    </strong>{" "}
                    • Submit: {formatDateTimeID(inspectResult.created_at)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectResult(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ScoreBreakdown sectionScores={inspectResult.section_scores} />

            <div className="flex justify-end border-t border-neutral-200 pt-4">
              <Button
                variant="primary"
                onClick={() => setInspectResult(null)}
              >
                Tutup Rincian
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
