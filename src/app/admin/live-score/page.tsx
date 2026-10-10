"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Radio,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  Trophy,
  Eye,
  Globe,
  Lock,
  ShieldAlert,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  StatCard,
  EmptyState,
  LoadingState,
  ErrorState,
  ConfirmDialog,
} from "@/components/ui";
import { getExamRuns, getExams } from "@/lib/admin-store";
import { getCurrentUserClient } from "@/lib/auth";
import {
  AdminLiveScoreRow,
  broadcastLiveScoreEvent,
  computeRunLiveScoreBoard,
  DEFAULT_LIVE_SCORE_SETTINGS,
  getLiveScoreSettings,
  LIVE_SCORE_ADMIN_CHANNEL,
  LIVE_SCORE_TIE_BREAKER_DOC,
  LiveScoreAudienceMode,
  LiveScoreExamStatus,
  LiveScoreIdentityMode,
  LiveScorePublicationSettings,
  PassingGradeEvaluationStatus,
  RunLiveScoreBoardResult,
   sanitizeRowForPublic,
  saveLiveScoreSettings,
  syncLiveScoreSnapshotToServer,
} from "@/lib/live-score";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { ExamRow, ExamRunRow } from "@/types/database";

type SortMode = "rank" | "score_desc" | "name_asc" | "progress_desc";
type ConnectionStatus = "connected" | "reconnecting" | "offline";

function formatClock(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatCountdown(deadlineIso: string | null, nowMs: number): string {
  if (!deadlineIso) return "—";
  const diffSec = Math.max(
    0,
    Math.floor((new Date(deadlineIso).getTime() - nowMs) / 1000)
  );
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  return [hrs, mins, secs].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function AdminLiveScorePage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [exams, setExams] = useState<ExamRow[]>([]);
  const [runs, setRuns] = useState<ExamRunRow[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedRunId, setSelectedRunId] = useState<string>("");

  const [board, setBoard] = useState<RunLiveScoreBoardResult | null>(null);
  const [pubSettings, setPubSettings] = useState<LiveScorePublicationSettings>(
    DEFAULT_LIVE_SCORE_SETTINGS
  );

  // Filter, Search, Sort & Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | LiveScoreExamStatus>(
    "all"
  );
  const [pgFilter, setPgFilter] = useState<
    "all" | PassingGradeEvaluationStatus
  >("all");
  const [sortBy, setSortBy] = useState<SortMode>("rank");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Realtime & Clock state
  const [connStatus, setConnStatus] = useState<ConnectionStatus>("connected");
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("");
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Modals & Drawers
  const [showPubPanel, setShowPubPanel] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Draft untuk form pengaturan publikasi Homepage
  const [draftPub, setDraftPub] = useState<LiveScorePublicationSettings>(
    DEFAULT_LIVE_SCORE_SETTINGS
  );

  const refreshLiveScoreData = useCallback(
    (overrideRunId?: string, overrideExamId?: string) => {
      try {
        setErrorMsg(null);
        const allExams = getExams();
        const allRuns = getExamRuns();
        const settings = getLiveScoreSettings();

        setExams(allExams);
        setRuns(allRuns);
        setPubSettings(settings);

        let targetExamId = overrideExamId ?? selectedExamId;
        if (!targetExamId || !allExams.some((e) => e.id === targetExamId)) {
          const activeRun =
            allRuns.find((r) => r.status === "active") || allRuns[0];
          targetExamId =
            activeRun?.exam_id || allExams[0]?.id || "";
        }

        const examRuns = allRuns.filter((r) => r.exam_id === targetExamId);
        let targetRunId = overrideRunId ?? selectedRunId;
        if (!targetRunId || !examRuns.some((r) => r.id === targetRunId)) {
          const activeInExam =
            examRuns.find((r) => r.status === "active") || examRuns[0];
          targetRunId = activeInExam?.id || "";
        }

        setSelectedExamId(targetExamId);
        setSelectedRunId(targetRunId);

        const computed = computeRunLiveScoreBoard(targetRunId || null);
        setBoard(computed);
        setLastSyncedAt(new Date().toISOString());
        syncLiveScoreSnapshotToServer(targetRunId || null);
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Gagal memuat data Live Score. Silakan coba lagi."
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedExamId, selectedRunId]
  );

  useEffect(() => {
    const initialSettings = getLiveScoreSettings();
    setPubSettings(initialSettings);
    setDraftPub(initialSettings);
    refreshLiveScoreData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer lokal 1 detik khusus untuk hitung mundur sisa waktu (tanpa mengirim event jaringan tiap detik)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Langganan Realtime (Supabase Broadcast + BroadcastChannel + CustomEvent + Online/Offline Resync)
  useEffect(() => {
    const handleRealtimeSignal = () => {
      refreshLiveScoreData();
    };

    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("prima_cat_")) {
        refreshLiveScoreData();
      }
    };

    const handleOnline = () => {
      setConnStatus("reconnecting");
      setTimeout(() => {
        refreshLiveScoreData();
        setConnStatus("connected");
      }, 350);
    };

    const handleOffline = () => {
      setConnStatus("offline");
    };

    window.addEventListener("prima-live-score-event", handleRealtimeSignal);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel("prima_cat_live_score_bc");
        bc.onmessage = () => {
          refreshLiveScoreData();
        };
      } catch {
        // ignore
      }
    }

    let cleanupSupabase: (() => void) | undefined;
    if (isSupabaseConfigured()) {
      try {
        const supabase = createSupabaseBrowserClient();
        if (supabase) {
          const channel = supabase
            .channel(LIVE_SCORE_ADMIN_CHANNEL)
            .on("broadcast", { event: "live_score_update" }, () => {
              refreshLiveScoreData();
            })
            .subscribe((status) => {
              if (status === "SUBSCRIBED") {
                setConnStatus("connected");
              } else if (
                status === "CHANNEL_ERROR" ||
                status === "TIMED_OUT"
              ) {
                setConnStatus("reconnecting");
              }
            });

          cleanupSupabase = () => {
            void supabase.removeChannel(channel);
          };
        }
      } catch {
        // ignore
      }
    }

    return () => {
      window.removeEventListener(
        "prima-live-score-event",
        handleRealtimeSignal
      );
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (bc) bc.close();
      if (cleanupSupabase) cleanupSupabase();
    };
  }, [refreshLiveScoreData]);

  const handleManualResync = () => {
    setConnStatus("reconnecting");
    refreshLiveScoreData();
    broadcastLiveScoreEvent({
      type: "MANUAL_RESYNC",
      runId: selectedRunId || null,
      examId: selectedExamId || null,
    });
    setTimeout(() => {
      setConnStatus(navigator.onLine ? "connected" : "offline");
    }, 300);
  };

  const handleExamChange = (newExamId: string) => {
    setSelectedExamId(newExamId);
    const matchingRuns = runs.filter((r) => r.exam_id === newExamId);
    const defaultRun =
      matchingRuns.find((r) => r.status === "active") || matchingRuns[0];
    const nextRunId = defaultRun?.id || "";
    setSelectedRunId(nextRunId);
    setCurrentPage(1);
    refreshLiveScoreData(nextRunId, newExamId);
  };

  const handleRunChange = (newRunId: string) => {
    setSelectedRunId(newRunId);
    setCurrentPage(1);
    refreshLiveScoreData(newRunId, selectedExamId);
  };

  // Toggle cepat ON/OFF publikasi Homepage
  const handleQuickToggleHomepage = () => {
    const admin = getCurrentUserClient();
    const nextState = !pubSettings.homepageEnabled;
    const targetRunId =
      pubSettings.publishedRunId || selectedRunId || runs[0]?.id || null;
    const targetExamId =
      pubSettings.publishedExamId || selectedExamId || exams[0]?.id || null;

    const updated = saveLiveScoreSettings(
      {
        homepageEnabled: nextState,
        publishedExamId: targetExamId,
        publishedRunId: targetRunId,
      },
      admin?.id || "usr-admin-01",
      nextState
        ? "Mengaktifkan tampilan Live Score di Homepage"
        : "Menonaktifkan tampilan Live Score di Homepage"
    );

    setPubSettings(updated);
    setDraftPub(updated);
    setSaveNotice(
      nextState
        ? "Live Score Homepage berhasil DIAKTIFKAN (ON). Pengunjung yang diizinkan kini dapat melihat Live Score."
        : "Live Score Homepage berhasil DINONAKTIFKAN (OFF). Section Live Score disembunyikan & akses publik ditutup."
    );
    setTimeout(() => setSaveNotice(null), 5000);
  };

  const handleSavePublicationSettings = () => {
    const admin = getCurrentUserClient();
    const updated = saveLiveScoreSettings(
      draftPub,
      admin?.id || "usr-admin-01",
      "Menyimpan konfigurasi lengkap publikasi Live Score Homepage"
    );
    setPubSettings(updated);
    setDraftPub(updated);
    setShowPubPanel(false);
    setSaveNotice(
      "Pengaturan publikasi Live Score Homepage berhasil disimpan dan tercatat di Audit Log."
    );
    setTimeout(() => setSaveNotice(null), 5000);
  };

  // Filter & Sort baris
  const filteredAndSortedRows = useMemo(() => {
    const sourceRows = board?.rows || [];
    const q = searchQuery.trim().toLowerCase();

    const filtered = sourceRows.filter((row) => {
      if (statusFilter !== "all" && row.examStatus !== statusFilter) {
        return false;
      }
      if (pgFilter !== "all" && row.passingGradeStatus !== pgFilter) {
        return false;
      }
      if (q) {
        const hay =
          `${row.fullName} ${row.participantCode} ${row.institution || ""} ${row.targetSelection || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...filtered];
    if (sortBy === "score_desc") {
      sorted.sort((a, b) => b.totalScore - a.totalScore || a.rank - b.rank);
    } else if (sortBy === "name_asc") {
      sorted.sort((a, b) => a.fullName.localeCompare(b.fullName, "id"));
    } else if (sortBy === "progress_desc") {
      sorted.sort(
        (a, b) => b.answeredCount - a.answeredCount || a.rank - b.rank
      );
    } else {
      sorted.sort((a, b) => a.rank - b.rank);
    }

    return sorted;
  }, [board?.rows, searchQuery, statusFilter, pgFilter, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedRows.length / pageSize)
  );
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSortedRows.slice(start, start + pageSize);
  }, [filteredAndSortedRows, safePage, pageSize]);

  // Baris pratinjau publik sesuai draft/pengaturan
  const previewRows = useMemo(() => {
    const previewRunId = draftPub.publishedRunId || selectedRunId;
    const previewBoard = computeRunLiveScoreBoard(previewRunId || null);
    return previewBoard.rows
      .slice(0, draftPub.maxRows)
      .map((r) => sanitizeRowForPublic(r, draftPub));
  }, [draftPub, selectedRunId, board]);

  if (loading) {
    return (
      <AppShell
        role="admin"
        userName="Administrator Utama"
        userSubtitle="Live Score Real-Time"
      >
        <LoadingState message="Memuat Papan Live Score Real-Time & menyinkronkan kanal penilaian server..." />
      </AppShell>
    );
  }

  if (errorMsg) {
    return (
      <AppShell
        role="admin"
        userName="Administrator Utama"
        userSubtitle="Live Score Real-Time"
      >
        <ErrorState
          title="Gagal Memuat Live Score"
          message={errorMsg}
          onRetry={() => refreshLiveScoreData()}
        />
      </AppShell>
    );
  }

  const runsForSelectedExam = runs.filter(
    (r) => r.exam_id === selectedExamId
  );

  // Label header subtes dinamis (mendukung CPNS TWK/TIU/TKP maupun Sekdin/Polri)
  const secHeaders = board?.scoringConfig?.sections || [];
  const col1Title = secHeaders[0]?.section_key || "TWK";
  const col2Title = secHeaders[1]?.section_key || "TIU";
  const col3Title = secHeaders[2]?.section_key || "TKP";

  return (
    <AppShell
      role="admin"
      userName="Administrator Utama"
      userSubtitle="Live Score Real-Time"
    >
      <div className="space-y-6">
        <PageHeader
        title="Live Score Real-Time"
        description="Pantau skor sementara, peringkat, dan status Passing Grade peserta secara langsung tanpa refresh halaman."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Indikator Koneksi Realtime Terpisah (Biru/Kuning/Abu-abu agar tidak bentrok dengan Merah/Hijau Passing Grade) */}
            <div
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold ${
                connStatus === "connected"
                  ? "border-[#0b49d0]/25 bg-[#0b49d0]/10 text-[#0b49d0]"
                  : connStatus === "reconnecting"
                  ? "border-[#ffc63d] bg-[#ffc63d]/20 text-[#151515]"
                  : "border-slate-300 bg-slate-100 text-slate-700"
              }`}
              role="status"
              aria-live="polite"
            >
              {connStatus === "connected" ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0b49d0] opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#0b49d0]" />
                  </span>
                  <Wifi className="h-3.5 w-3.5" />
                  <span>Realtime Aktif</span>
                </>
              ) : connStatus === "reconnecting" ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Menyinkronkan...</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span>Offline (Menunggu Jaringan)</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleManualResync}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#151515] hover:bg-slate-50 transition-colors"
              title="Sinkronkan ulang skor & peringkat dari server"
            >
              <RefreshCw className="h-4 w-4 text-[#0b49d0]" />
              <span>Resync Server</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDraftPub({
                  ...pubSettings,
                  publishedExamId:
                    pubSettings.publishedExamId || selectedExamId || null,
                  publishedRunId:
                    pubSettings.publishedRunId || selectedRunId || null,
                });
                setShowPreviewModal(true);
              }}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[#0b49d0]/30 bg-white px-3.5 py-2 text-xs font-semibold text-[#0b49d0] hover:bg-blue-50/60 transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span>Pratinjau Publik</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDraftPub({
                  ...pubSettings,
                  publishedExamId:
                    pubSettings.publishedExamId || selectedExamId || null,
                  publishedRunId:
                    pubSettings.publishedRunId || selectedRunId || null,
                });
                setShowPubPanel((prev) => !prev);
              }}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#0b49d0] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#093bb0] transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Pengaturan Publikasi Homepage</span>
            </button>
          </div>
        }
      />

      {saveNotice && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#0b49d0]/25 bg-blue-50/90 px-4 py-3 text-sm font-medium text-[#0b49d0]">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{saveNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveNotice(null)}
            className="text-xs font-bold underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* BAR KONTROL CEPAT PUBLIKASI HOMEPAGE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                pubSettings.homepageEnabled
                  ? "bg-[#0b49d0] text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {pubSettings.homepageEnabled ? (
                <Globe className="h-5 w-5" />
              ) : (
                <Lock className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-[#151515]">
                  Tampilkan Live Score di Homepage
                </h2>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    pubSettings.homepageEnabled
                      ? "bg-[#ffc63d] text-[#151515]"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {pubSettings.homepageEnabled ? "AKTIF (ON)" : "NONAKTIF (OFF)"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600">
                {pubSettings.homepageEnabled ? (
                  <>
                    Dipublikasikan untuk{" "}
                    <strong className="text-[#151515]">
                      {pubSettings.allowedAudience === "all"
                        ? "Semua Pengunjung"
                        : "Hanya Pengguna Login"}
                    </strong>{" "}
                    • Identitas:{" "}
                    <strong className="text-[#151515]">
                      {pubSettings.publicIdentityMode === "masked_code"
                        ? "Nama Samaran / Nomor Peserta"
                        : "Nama Asli Peserta"}
                    </strong>
                  </>
                ) : (
                  "Section Live Score di Homepage sedang disembunyikan dan endpoint publik menolak akses data. Tab Live Score Admin ini tetap aktif."
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={pubSettings.homepageEnabled}
              onClick={handleQuickToggleHomepage}
              className={`inline-flex min-h-[42px] items-center gap-2.5 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                pubSettings.homepageEnabled
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-[#ffc63d] text-[#151515] hover:bg-[#f2b829]"
              }`}
            >
              <span>
                {pubSettings.homepageEnabled
                  ? "Matikan Publikasi Homepage (OFF)"
                  : "Aktifkan di Homepage (ON)"}
              </span>
            </button>

            <Link
              href="/"
              target="_blank"
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <span>Lihat Homepage</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* PANEL PENGATURAN DETAIL PUBLIKASI HOMEPAGE */}
        {showPubPanel && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. Status Publikasi Homepage
                </label>
                <select
                  value={draftPub.homepageEnabled ? "on" : "off"}
                  onChange={(e) =>
                    setDraftPub((prev) => ({
                      ...prev,
                      homepageEnabled: e.target.value === "on",
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-[#151515]"
                >
                  <option value="off">OFF — Sembunyikan dari Homepage (Default)</option>
                  <option value="on">ON — Tampilkan Live Score di Homepage</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  2. Ujian yang Dipublikasikan
                </label>
                <select
                  value={draftPub.publishedExamId || ""}
                  onChange={(e) => {
                    const nextExamId = e.target.value || null;
                    const firstRun = runs.find((r) => r.exam_id === nextExamId);
                    setDraftPub((prev) => ({
                      ...prev,
                      publishedExamId: nextExamId,
                      publishedRunId: firstRun?.id || null,
                    }));
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-[#151515]"
                >
                  <option value="">-- Pilih Ujian --</option>
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  3. Sesi Pelaksanaan (Tidak Dicampur)
                </label>
                <select
                  value={draftPub.publishedRunId || ""}
                  onChange={(e) =>
                    setDraftPub((prev) => ({
                      ...prev,
                      publishedRunId: e.target.value || null,
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-[#151515]"
                >
                  <option value="">-- Pilih Sesi Ujian --</option>
                  {runs
                    .filter(
                      (r) =>
                        !draftPub.publishedExamId ||
                        r.exam_id === draftPub.publishedExamId
                    )
                    .map((rn) => (
                      <option key={rn.id} value={rn.id}>
                        {rn.name} ({rn.status.toUpperCase()})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  4. Audiens yang Diizinkan
                </label>
                <select
                  value={draftPub.allowedAudience}
                  onChange={(e) =>
                    setDraftPub((prev) => ({
                      ...prev,
                      allowedAudience: e.target.value as LiveScoreAudienceMode,
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-[#151515]"
                >
                  <option value="all">Semua Pengunjung Homepage</option>
                  <option value="authenticated">
                    Hanya Pengguna yang Sudah Login
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  5. Mode Identitas Publik
                </label>
                <select
                  value={draftPub.publicIdentityMode}
                  onChange={(e) =>
                    setDraftPub((prev) => ({
                      ...prev,
                      publicIdentityMode: e.target
                        .value as LiveScoreIdentityMode,
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-[#151515]"
                >
                  <option value="masked_code">
                    Nama Samaran & Nomor Peserta (Disarankan / Default)
                  </option>
                  <option value="full_name">
                    Nama Asli & Nomor Peserta (Tanpa Email/No. HP)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  6. Batas Baris Ditampilkan di Homepage
                </label>
                <input
                  type="number"
                  min={5}
                  max={200}
                  value={draftPub.maxRows}
                  onChange={(e) =>
                    setDraftPub((prev) => ({
                      ...prev,
                      maxRows: Number(e.target.value) || 25,
                    }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-[#151515]"
                />
              </div>
            </div>

            <div className="mt-4">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                7. Kolom yang Dipublikasikan ke Homepage
              </span>
              <div className="mt-2 flex flex-wrap gap-3">
                {[
                  {
                    key: "showExamStatus" as const,
                    label: "Status Ujian",
                  },
                  {
                    key: "showSubtestScores" as const,
                    label: "Skor Subtes (TWK/TIU/TKP)",
                  },
                  {
                    key: "showTotalScore" as const,
                    label: "Total Skor",
                  },
                  {
                    key: "showPassingGrade" as const,
                    label: "Status Passing Grade",
                  },
                  {
                    key: "showProgress" as const,
                    label: "Progres Soal Dijawab",
                  },
                ].map((col) => (
                  <label
                    key={col.key}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-[#151515]"
                  >
                    <input
                      type="checkbox"
                      checked={draftPub.publishedColumns[col.key]}
                      onChange={(e) =>
                        setDraftPub((prev) => ({
                          ...prev,
                          publishedColumns: {
                            ...prev.publishedColumns,
                            [col.key]: e.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[#0b49d0]"
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowPubPanel(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePublicationSettings}
                className="rounded-xl bg-[#0b49d0] px-5 py-2 text-xs font-bold text-white hover:bg-[#093bb0]"
              >
                Simpan Pengaturan Publikasi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PERINGATAN JIKA PASSING GRADE BELUM DIKONFIGURASI PADA UJIAN INI */}
      {board?.exam && !board.passingGradeConfigured && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                Passing Grade Belum Dikonfigurasi pada Ujian Ini
              </h3>
              <p className="mt-0.5 text-xs text-amber-900">
                Ujian <strong>{board.exam.title}</strong> belum memiliki ambang batas (passing grade) subtes maupun total. Sistem menampilkan status jujur{" "}
                <strong>&ldquo;Passing grade belum dikonfigurasi&rdquo;</strong> dan tidak memberikan status lulus semu.
              </p>
            </div>
          </div>
          <Link
            href="/admin/ujian"
            className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-xl bg-amber-900 px-4 py-2 text-xs font-bold text-white hover:bg-amber-800"
          >
            Lengkapi di Manajemen Ujian
          </Link>
        </div>
      )}

      {/* RINGKASAN JUMLAH PESERTA SEDANG UJIAN, SELESAI, DAN PASSING GRADE */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Sedang Ujian"
          value={board?.summary.inProgressCount ?? 0}
          icon={<Clock className="h-5 w-5" />}
          subtitle={`${board?.summary.notStartedCount ?? 0} peserta belum mulai`}
        />
        <StatCard
          title="Selesai / Waktu Habis"
          value={
            (board?.summary.completedCount ?? 0) +
            (board?.summary.timedOutCount ?? 0)
          }
          icon={<Users className="h-5 w-5" />}
          subtitle={`${board?.summary.completedCount ?? 0} selesai • ${board?.summary.timedOutCount ?? 0} waktu habis`}
        />
        <StatCard
          title="Memenuhi Passing Grade"
          value={board?.summary.passedCount ?? 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
          subtitle={
            board?.passingGradeConfigured
              ? "Baris hijau lembut (Lulus PG)"
              : "Passing grade belum diatur"
          }
        />
        <StatCard
          title="Belum Memenuhi PG"
          value={board?.summary.failedCount ?? 0}
          icon={<XCircle className="h-5 w-5" />}
          subtitle={
            (board?.summary.syncIssueCount ?? 0) > 0
              ? `${board?.summary.syncIssueCount} sesi mengalami kendala sinkronisasi`
              : "Baris merah lembut (Belum memenuhi)"
          }
        />
      </div>

      {/* FILTER UJIAN, SESI, STATUS, PASSING GRADE, PENCARIAN & SORTING */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {/* Filter Ujian */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Ujian Simulasi
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => handleExamChange(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#151515] focus:border-[#0b49d0] focus:outline-none"
            >
              {exams.length === 0 ? (
                <option value="">Belum ada ujian</option>
              ) : (
                exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Filter Sesi / Run (Tidak mencampur sesi berbeda dalam satu peringkat) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Sesi Pelaksanaan (Peringkat Terpisah)
            </label>
            <select
              value={selectedRunId}
              onChange={(e) => handleRunChange(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#151515] focus:border-[#0b49d0] focus:outline-none"
            >
              {runsForSelectedExam.length === 0 ? (
                <option value="">Belum ada sesi pada ujian ini</option>
              ) : (
                runsForSelectedExam.map((rn) => (
                  <option key={rn.id} value={rn.id}>
                    {rn.name} ({rn.status.toUpperCase()})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Filter Status Ujian */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Filter Status Ujian
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "all" | LiveScoreExamStatus);
                setCurrentPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-[#151515] focus:border-[#0b49d0] focus:outline-none"
            >
              <option value="all">Semua Status Ujian</option>
              <option value="not_started">Belum mulai</option>
              <option value="in_progress">Sedang ujian</option>
              <option value="submitting">Menyelesaikan ujian</option>
              <option value="submitted">Selesai</option>
              <option value="timed_out">Waktu habis</option>
              <option value="sync_issue">Gangguan / Sinkronisasi bermasalah</option>
            </select>
          </div>

          {/* Filter Passing Grade */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Filter Passing Grade
            </label>
            <select
              value={pgFilter}
              onChange={(e) => {
                setPgFilter(
                  e.target.value as "all" | PassingGradeEvaluationStatus
                );
                setCurrentPage(1);
              }}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-[#151515] focus:border-[#0b49d0] focus:outline-none"
            >
              <option value="all">Semua Status Passing Grade</option>
              <option value="passed">Memenuhi (Baris Hijau)</option>
              <option value="failed">Belum Memenuhi (Baris Merah)</option>
              <option value="unconfigured">Passing grade belum dikonfigurasi</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          {/* Pencarian Peserta */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama peserta, nomor peserta (PST-XXXX), atau instansi..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-[#151515] placeholder:text-slate-400 focus:border-[#0b49d0] focus:outline-none"
            />
          </div>

          {/* Sorting & Page Size */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600">
                Urutkan:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortMode)}
                className="bg-transparent text-xs font-bold text-[#151515] focus:outline-none"
              >
                <option value="rank">Peringkat Resmi (Default)</option>
                <option value="score_desc">Total Skor Tertinggi</option>
                <option value="name_asc">Nama Peserta (A–Z)</option>
                <option value="progress_desc">Progres Soal Dijawab</option>
              </select>
            </div>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Jumlah baris per halaman"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-[#151515]"
            >
              <option value={10}>10 / hal</option>
              <option value={25}>25 / hal</option>
              <option value={50}>50 / hal</option>
              <option value={100}>100 / hal</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABEL UTAMA LIVE SCORE — 12 KOLOM (Scroll horizontal khusus di dalam kontainer tabel pada mobile) */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-[#151515]">
              {board?.exam?.title || "Pilih Ujian"} —{" "}
              <span className="text-[#0b49d0]">
                {board?.run?.name || "Pilih Sesi"}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-900">
              <CheckCircle2 className="h-3 w-3" /> Hijau Lembut = Memenuhi Seluruh PG
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-900">
              <XCircle className="h-3 w-3" /> Merah Lembut = Belum Memenuhi PG
            </span>
          </div>
          <div>
            Sinkronisasi server terakhir:{" "}
            <strong className="text-[#151515]">
              {formatClock(lastSyncedAt)}
            </strong>
          </div>
        </div>

        {paginatedRows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Radio className="h-6 w-6" />}
              title="Belum Ada Data Peserta pada Filter Ini"
              description={
                runs.length === 0
                  ? "Belum ada jadwal sesi ujian yang dibuat. Silakan buat ujian dan jadwalkan sesi terlebih dahulu."
                  : "Tidak ada peserta yang cocok dengan filter atau pencarian saat ini. Skor sementara akan otomatis muncul begitu peserta memulai ujian."
              }
            />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-[#151515] text-[11px] font-bold uppercase tracking-wider text-white">
                  <th className="py-3.5 pl-4 pr-2 text-center">1. Peringkat</th>
                  <th className="px-3 py-3.5">2. Nama / Identitas Peserta</th>
                  <th className="px-3 py-3.5">3. Status Ujian</th>
                  <th className="px-3 py-3.5 text-center">4. {col1Title}</th>
                  <th className="px-3 py-3.5 text-center">5. {col2Title}</th>
                  <th className="px-3 py-3.5 text-center">6. {col3Title}</th>
                  <th className="px-3 py-3.5 text-center">
                    7. Total Skor Sementara
                  </th>
                  <th className="px-3 py-3.5">8. Passing Grade</th>
                  <th className="px-3 py-3.5 text-center">
                    9. Soal Dijawab
                  </th>
                  <th className="px-3 py-3.5 text-center">10. Waktu Mulai</th>
                  <th className="px-3 py-3.5 text-center">
                    11. Sisa / Selesai
                  </th>
                  <th className="py-3.5 pl-3 pr-4 text-center">
                    12. Pembaruan Terakhir
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {paginatedRows.map((row: AdminLiveScoreRow) => {
                  // ATURAN WARNA BARIS WAJIB:
                  // - Hijau lembut untuk peserta yang memenuhi seluruh passing grade
                  // - Merah lembut untuk peserta yang belum memenuhi passing grade (meskipun total skor tinggi)
                  // - Amber lembut jika ujian belum memiliki passing grade yang dikonfigurasi
                  const rowColorClass =
                    row.passingGradeStatus === "passed"
                      ? "bg-emerald-50/90 hover:bg-emerald-100/80 border-l-4 border-l-emerald-600 text-[#151515]"
                      : row.passingGradeStatus === "failed"
                      ? "bg-rose-50/90 hover:bg-rose-100/80 border-l-4 border-l-rose-500 text-[#151515]"
                      : "bg-amber-50/50 hover:bg-amber-50/90 border-l-4 border-l-amber-400 text-[#151515]";

                  const isFinished =
                    row.examStatus === "submitted" ||
                    row.examStatus === "timed_out";

                  return (
                    <tr
                      key={row.sessionId}
                      className={`transition-colors ${rowColorClass}`}
                    >
                      {/* 1. Peringkat */}
                      <td className="py-3.5 pl-4 pr-2 text-center font-bold">
                        <span
                          className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-lg px-2 text-xs font-extrabold ${
                            row.rank === 1
                              ? "bg-[#ffc63d] text-[#151515] shadow-xs"
                              : row.rank === 2
                              ? "bg-slate-300 text-[#151515]"
                              : row.rank === 3
                              ? "bg-amber-700 text-white"
                              : "bg-white/80 text-slate-800 border border-slate-300"
                          }`}
                        >
                          #{row.rank}
                        </span>
                      </td>

                      {/* 2. Nama / Identitas Peserta */}
                      <td className="px-3 py-3.5">
                        <div className="font-bold text-[#151515]">
                          {row.fullName}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-700">
                          <span className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-800 border border-slate-300/80">
                            {row.participantCode}
                          </span>
                          {row.institution && (
                            <span className="truncate max-w-[160px]">
                              • {row.institution}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Status Ujian (Warna indikator sistem terpisah agar tidak membingungkan dengan merah/hijau PG) */}
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${
                            row.examStatus === "in_progress"
                              ? "border-[#0b49d0]/30 bg-blue-100/90 text-[#0b49d0]"
                              : row.examStatus === "submitting"
                              ? "border-indigo-300 bg-indigo-100 text-indigo-900"
                              : row.examStatus === "submitted"
                              ? "border-slate-400 bg-slate-800 text-white"
                              : row.examStatus === "timed_out"
                              ? "border-slate-400 bg-slate-200 text-slate-900"
                              : row.examStatus === "sync_issue"
                              ? "border-amber-500 bg-[#ffc63d] text-[#151515]"
                              : "border-slate-300 bg-white/90 text-slate-700"
                          }`}
                        >
                          {row.examStatus === "in_progress" && (
                            <span className="h-2 w-2 rounded-full bg-[#0b49d0] animate-pulse" />
                          )}
                          {row.examStatus === "sync_issue" && (
                            <ShieldAlert className="h-3.5 w-3.5" />
                          )}
                          <span>{row.examStatusLabel}</span>
                        </span>
                        {row.hasSyncIssue && row.syncIssueNote && (
                          <div className="mt-1 text-[11px] font-medium text-slate-800">
                            {row.syncIssueNote}
                          </div>
                        )}
                      </td>

                      {/* 4. TWK */}
                      <td className="px-3 py-3.5 text-center">
                        <div className="text-sm font-extrabold text-[#151515]">
                          {row.twkScore}
                        </div>
                        {row.twkPassingGrade > 0 && (
                          <div
                            className={`text-[10px] font-bold ${
                              row.twkPassed
                                ? "text-emerald-800"
                                : "text-rose-800"
                            }`}
                          >
                            PG {row.twkPassingGrade}
                          </div>
                        )}
                      </td>

                      {/* 5. TIU */}
                      <td className="px-3 py-3.5 text-center">
                        <div className="text-sm font-extrabold text-[#151515]">
                          {row.tiuScore}
                        </div>
                        {row.tiuPassingGrade > 0 && (
                          <div
                            className={`text-[10px] font-bold ${
                              row.tiuPassed
                                ? "text-emerald-800"
                                : "text-rose-800"
                            }`}
                          >
                            PG {row.tiuPassingGrade}
                          </div>
                        )}
                      </td>

                      {/* 6. TKP */}
                      <td className="px-3 py-3.5 text-center">
                        <div className="text-sm font-extrabold text-[#151515]">
                          {row.tkpScore}
                        </div>
                        {row.tkpPassingGrade > 0 && (
                          <div
                            className={`text-[10px] font-bold ${
                              row.tkpPassed
                                ? "text-emerald-800"
                                : "text-rose-800"
                            }`}
                          >
                            PG {row.tkpPassingGrade}
                          </div>
                        )}
                      </td>

                      {/* 7. Total Skor Sementara / Final */}
                      <td className="px-3 py-3.5 text-center">
                        <div className="text-base font-extrabold text-[#151515]">
                          {row.totalScore}
                        </div>
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            row.scoreType === "final"
                              ? "bg-slate-900 text-white"
                              : "bg-white/90 text-[#0b49d0] border border-[#0b49d0]/30"
                          }`}
                        >
                          {row.scoreType === "final"
                            ? "Skor Final"
                            : "Sementara"}
                        </span>
                      </td>

                      {/* 8. Passing Grade (Wajib menyertakan label teks & ikon, bukan hanya warna) */}
                      <td className="px-3 py-3.5">
                        {row.passingGradeStatus === "passed" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700/30 bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white shadow-2xs">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>Memenuhi</span>
                          </span>
                        ) : row.passingGradeStatus === "failed" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-700/30 bg-rose-700 px-2.5 py-1 text-xs font-bold text-white shadow-2xs">
                            <XCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>Belum Memenuhi</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-600 bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-950">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>Passing grade belum dikonfigurasi</span>
                          </span>
                        )}
                      </td>

                      {/* 9. Jumlah Soal Dijawab */}
                      <td className="px-3 py-3.5 text-center">
                        <div className="text-xs font-bold text-[#151515]">
                          {row.answeredCount} / {row.totalQuestions}
                        </div>
                        <div className="mx-auto mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-white/90 border border-slate-300">
                          <div
                            className="h-full bg-[#0b49d0] transition-all"
                            style={{ width: `${row.progressPercent}%` }}
                          />
                        </div>
                      </td>

                      {/* 10. Waktu Mulai */}
                      <td className="px-3 py-3.5 text-center font-mono text-xs font-semibold text-[#151515]">
                        {formatClock(row.startedAt)}
                      </td>

                      {/* 11. Sisa Waktu atau Waktu Selesai */}
                      <td className="px-3 py-3.5 text-center">
                        {row.examStatus === "not_started" ? (
                          <span className="text-xs text-slate-600">—</span>
                        ) : isFinished ? (
                          <div>
                            <span className="block text-[10px] font-bold uppercase text-slate-700">
                              Selesai
                            </span>
                            <span className="font-mono text-xs font-bold text-[#151515]">
                              {formatClock(row.submittedAt)}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="block text-[10px] font-bold uppercase text-[#0b49d0]">
                              Sisa Waktu
                            </span>
                            <span className="font-mono text-xs font-extrabold text-[#151515]">
                              {formatCountdown(row.deadlineAt, nowMs)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 12. Pembaruan Terakhir */}
                      <td className="py-3.5 pl-3 pr-4 text-center font-mono text-xs font-semibold text-slate-800">
                        {formatClock(row.lastUpdatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* FOOTER PAGINATION & DOKUMENTASI TIE-BREAKER */}
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Menampilkan{" "}
            <strong className="text-[#151515]">{paginatedRows.length}</strong>{" "}
            dari{" "}
            <strong className="text-[#151515]">
              {filteredAndSortedRows.length}
            </strong>{" "}
            peserta • Aturan Peringkat: {LIVE_SCORE_TIE_BREAKER_DOC}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 font-semibold text-[#151515] disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Sebelumnya</span>
            </button>
            <span className="font-bold text-[#151515]">
              Hal {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 font-semibold text-[#151515] disabled:opacity-40"
            >
              <span>Berikutnya</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL PRATINJAU TAMPILAN PUBLIK (PUBLIC PREVIEW) */}
      <ConfirmDialog
        open={showPreviewModal}
        title="Pratinjau Live Score Publik (Homepage)"
        description={`Menampilkan simulasi data yang telah disanitasi (Tanpa Email, Tanpa No. HP, Mode Identitas: ${
          draftPub.publicIdentityMode === "masked_code"
            ? "Nama Samaran / Nomor Peserta"
            : "Nama Asli"
        }).`}
        confirmLabel="Tutup Pratinjau"
        cancelLabel="Batal"
        onConfirm={() => setShowPreviewModal(false)}
        onClose={() => setShowPreviewModal(false)}
      >
        <div className="mt-3 max-h-[380px] overflow-auto rounded-xl border border-slate-200">
          {previewRows.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-600">
              Belum ada baris peserta pada sesi yang dipilih.
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#0b49d0] text-white">
                  <th className="p-2.5 text-center">#</th>
                  <th className="p-2.5">Identitas Publik</th>
                  {draftPub.publishedColumns.showExamStatus && (
                    <th className="p-2.5">Status</th>
                  )}
                  {draftPub.publishedColumns.showSubtestScores && (
                    <>
                      <th className="p-2.5 text-center">TWK</th>
                      <th className="p-2.5 text-center">TIU</th>
                      <th className="p-2.5 text-center">TKP</th>
                    </>
                  )}
                  {draftPub.publishedColumns.showTotalScore && (
                    <th className="p-2.5 text-center">Total</th>
                  )}
                  {draftPub.publishedColumns.showPassingGrade && (
                    <th className="p-2.5">Passing Grade</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {previewRows.map((pRow) => (
                  <tr
                    key={`${pRow.rank}-${pRow.participantCode}`}
                    className={
                      pRow.passingGradeStatus === "passed"
                        ? "bg-emerald-50/90"
                        : pRow.passingGradeStatus === "failed"
                        ? "bg-rose-50/90"
                        : "bg-white"
                    }
                  >
                    <td className="p-2.5 text-center font-bold">
                      #{pRow.rank}
                    </td>
                    <td className="p-2.5 font-semibold text-[#151515]">
                      {pRow.displayIdentity}
                    </td>
                    {draftPub.publishedColumns.showExamStatus && (
                      <td className="p-2.5">{pRow.examStatusLabel}</td>
                    )}
                    {draftPub.publishedColumns.showSubtestScores && (
                      <>
                        <td className="p-2.5 text-center font-bold">
                          {pRow.twkScore ?? 0}
                        </td>
                        <td className="p-2.5 text-center font-bold">
                          {pRow.tiuScore ?? 0}
                        </td>
                        <td className="p-2.5 text-center font-bold">
                          {pRow.tkpScore ?? 0}
                        </td>
                      </>
                    )}
                    {draftPub.publishedColumns.showTotalScore && (
                      <td className="p-2.5 text-center font-extrabold">
                        {pRow.totalScore ?? 0}
                      </td>
                    )}
                    {draftPub.publishedColumns.showPassingGrade && (
                      <td className="p-2.5 font-bold">
                        {pRow.passingGradeLabel}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </ConfirmDialog>
      </div>
    </AppShell>
  );
}
