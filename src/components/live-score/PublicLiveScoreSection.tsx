"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Radio,
  Trophy,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import {
  getSanitizedPublicLiveScoreBoard,
  LIVE_SCORE_PUBLIC_CHANNEL_PREFIX,
  PublicLiveScoreResponse,
  PublicLiveScoreRow,
  syncLiveScoreSnapshotToServer,
} from "@/lib/live-score";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

interface PublicLiveScoreSectionProps {
  isAuthenticatedUser: boolean;
}

export function PublicLiveScoreSection({
  isAuthenticatedUser,
}: PublicLiveScoreSectionProps) {
  const [payload, setPayload] = useState<PublicLiveScoreResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [connState, setConnState] = useState<
    "connected" | "reconnecting" | "offline"
  >("connected");

  const loadPublicLiveScore = useCallback(async () => {
    // Sinkronkan dan evaluasi izin dari sumber otoritatif
    syncLiveScoreSnapshotToServer();
    const localEvaluated = getSanitizedPublicLiveScoreBoard({
      isAuthenticatedUser,
    });

    if (!localEvaluated.enabled) {
      setPayload(localEvaluated);
      return;
    }

    // Validasi juga terhadap endpoint server /api/live-score/public
    try {
      const res = await fetch("/api/live-score/public", {
        method: "GET",
        cache: "no-store",
      });
      if (res.status === 403) {
        // Jika server menyatakan OFF, paksa sembunyikan
        const serverDisabled = (await res.json()) as PublicLiveScoreResponse;
        if (!serverDisabled.enabled && !localEvaluated.enabled) {
          setPayload(serverDisabled);
          return;
        }
      }
      if (res.ok) {
        const serverData = (await res.json()) as PublicLiveScoreResponse;
        // Gunakan data yang paling mutakhir (jika server sudah tersinkronisasi dan memiliki baris)
        if (serverData.rows.length > 0 || localEvaluated.rows.length === 0) {
          setPayload(serverData);
          return;
        }
      }
    } catch {
      // Fallback ke evaluasi lokal yang tetap menegakkan aturan keamanan & sanitasi
    }

    setPayload(localEvaluated);
  }, [isAuthenticatedUser]);

  useEffect(() => {
    void loadPublicLiveScore();
  }, [loadPublicLiveScore]);

  // Langganan Realtime (otomatis menghentikan/menyembunyikan jika Admin mematikan publikasi)
  useEffect(() => {
    const handleSignal = () => {
      void loadPublicLiveScore();
    };

    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("prima_cat_")) {
        void loadPublicLiveScore();
      }
    };

    const handleOnline = () => {
      setConnState("reconnecting");
      setTimeout(() => {
        void loadPublicLiveScore();
        setConnState("connected");
      }, 300);
    };

    const handleOffline = () => {
      setConnState("offline");
    };

    window.addEventListener("prima-live-score-event", handleSignal);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel("prima_cat_live_score_bc");
        bc.onmessage = () => {
          void loadPublicLiveScore();
        };
      } catch {
        // ignore
      }
    }

    let cleanupSupabase: (() => void) | undefined;
    const activeRunId = payload?.runId;
    if (isSupabaseConfigured() && payload?.enabled && activeRunId) {
      try {
        const supabase = createSupabaseBrowserClient();
        if (supabase) {
          const channel = supabase
            .channel(`${LIVE_SCORE_PUBLIC_CHANNEL_PREFIX}${activeRunId}`)
            .on("broadcast", { event: "public_score_update" }, () => {
              void loadPublicLiveScore();
            })
            .subscribe((status) => {
              if (status === "SUBSCRIBED") {
                setConnState("connected");
              } else if (
                status === "CHANNEL_ERROR" ||
                status === "TIMED_OUT"
              ) {
                setConnState("reconnecting");
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
      window.removeEventListener("prima-live-score-event", handleSignal);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (bc) bc.close();
      if (cleanupSupabase) cleanupSupabase();
    };
  }, [loadPublicLiveScore, payload?.enabled, payload?.runId]);

  const filteredRows = useMemo(() => {
    const rows = payload?.rows || [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.displayIdentity} ${r.participantCode}`.toLowerCase().includes(q)
    );
  }, [payload?.rows, searchQuery]);

  // Jika Admin menonaktifkan Live Score Homepage (Default: OFF), jangan tampilkan section sama sekali
  if (!payload || !payload.enabled) {
    return null;
  }

  const cols = payload.settings?.publishedColumns || {
    showSubtestScores: true,
    showTotalScore: true,
    showPassingGrade: true,
    showExamStatus: true,
    showProgress: true,
  };

  return (
    <section
      id="live-score-homepage"
      className="border-t border-slate-200/80 bg-[#fcfbf7] py-14 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0b49d0]/20 bg-[#0b49d0]/10 px-3.5 py-1.5 text-xs font-bold text-[#0b49d0]">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              <span>LIVE SCORE REAL-TIME PRIMA RIB</span>
            </div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#151515] sm:text-3xl">
              {payload.settings?.sectionTitle ||
                "Live Score Real-Time Simulasi CAT"}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
              {payload.settings?.sectionSubtitle ||
                "Pantauan skor sementara dan hasil akhir peserta secara langsung dari server penilaian resmi."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {payload.examTitle && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-[#151515] shadow-2xs">
                <Trophy className="h-4 w-4 text-[#ffc63d]" />
                <span>
                  {payload.examTitle}
                  {payload.runName ? ` • ${payload.runName}` : ""}
                </span>
              </span>
            )}

            <div
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${
                connState === "connected"
                  ? "border-[#0b49d0]/25 bg-[#0b49d0]/10 text-[#0b49d0]"
                  : connState === "reconnecting"
                  ? "border-[#ffc63d] bg-[#ffc63d]/20 text-[#151515]"
                  : "border-slate-300 bg-slate-100 text-slate-700"
              }`}
            >
              {connState === "connected" ? (
                <>
                  <Wifi className="h-3.5 w-3.5" />
                  <span>Realtime Terhubung</span>
                </>
              ) : connState === "reconnecting" ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Menyinkronkan...</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span>Offline</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Jika Audiens Dibatasi Hanya untuk Pengguna Login dan Pengunjung Belum Login */}
        {!payload.authorized ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b49d0]/10 text-[#0b49d0]">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#151515]">
              Live Score Khusus Peserta Terautentikasi
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">
              {payload.reason ||
                "Silakan masuk menggunakan akun peserta Anda untuk memantau peringkat Live Score pada sesi ujian ini."}
            </p>
            <div className="mt-5">
              <Link
                href="/login"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#0b49d0] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#093bb0] transition-colors"
              >
                Masuk Akun Peserta
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Bar Pencarian & Legenda Warna Baris */}
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nomor / identitas peserta..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs font-medium text-[#151515] placeholder:text-slate-400 focus:border-[#0b49d0] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 font-bold text-emerald-900">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Hijau Lembut = Memenuhi Passing Grade
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2.5 py-1 font-bold text-rose-900">
                  <XCircle className="h-3.5 w-3.5" /> Merah Lembut = Belum Memenuhi
                </span>
              </div>
            </div>

            {filteredRows.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-bold text-[#151515]">
                  Belum Ada Data Peserta pada Sesi Ini
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Skor sementara akan tampil secara otomatis begitu peserta memulai dan menyimpan jawaban ujian.
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#0b49d0] text-xs font-bold uppercase tracking-wider text-white">
                      <th className="py-3.5 pl-4 pr-2 text-center">
                        Peringkat
                      </th>
                      <th className="px-3 py-3.5">Identitas Peserta</th>
                      {cols.showExamStatus && (
                        <th className="px-3 py-3.5">Status Ujian</th>
                      )}
                      {cols.showSubtestScores && (
                        <>
                          <th className="px-3 py-3.5 text-center">TWK</th>
                          <th className="px-3 py-3.5 text-center">TIU</th>
                          <th className="px-3 py-3.5 text-center">TKP</th>
                        </>
                      )}
                      {cols.showTotalScore && (
                        <th className="px-3 py-3.5 text-center">Total Skor</th>
                      )}
                      {cols.showPassingGrade && (
                        <th className="px-3 py-3.5">Passing Grade</th>
                      )}
                      {cols.showProgress && (
                        <th className="py-3.5 pl-3 pr-4 text-center">
                          Soal Dijawab
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80">
                    {filteredRows.map((row: PublicLiveScoreRow) => {
                      const rowClass =
                        row.passingGradeStatus === "passed"
                          ? "bg-emerald-50/90 hover:bg-emerald-100/80 border-l-4 border-l-emerald-600 text-[#151515]"
                          : row.passingGradeStatus === "failed"
                          ? "bg-rose-50/90 hover:bg-rose-100/80 border-l-4 border-l-rose-500 text-[#151515]"
                          : "bg-amber-50/50 hover:bg-amber-50/90 border-l-4 border-l-amber-400 text-[#151515]";

                      return (
                        <tr
                          key={`${row.rank}-${row.participantCode}`}
                          className={`transition-colors ${rowClass}`}
                        >
                          <td className="py-3.5 pl-4 pr-2 text-center font-bold">
                            <span
                              className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-lg px-2 text-xs font-extrabold ${
                                row.rank === 1
                                  ? "bg-[#ffc63d] text-[#151515]"
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

                          <td className="px-3 py-3.5">
                            <div className="font-bold text-[#151515]">
                              {row.displayIdentity}
                            </div>
                          </td>

                          {cols.showExamStatus && (
                            <td className="px-3 py-3.5">
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white/90 px-2.5 py-1 text-xs font-bold text-[#151515]">
                                {row.examStatus === "in_progress" && (
                                  <span className="h-2 w-2 rounded-full bg-[#0b49d0] animate-pulse" />
                                )}
                                <span>{row.examStatusLabel || "—"}</span>
                              </span>
                            </td>
                          )}

                          {cols.showSubtestScores && (
                            <>
                              <td className="px-3 py-3.5 text-center font-extrabold text-[#151515]">
                                {row.twkScore ?? 0}
                              </td>
                              <td className="px-3 py-3.5 text-center font-extrabold text-[#151515]">
                                {row.tiuScore ?? 0}
                              </td>
                              <td className="px-3 py-3.5 text-center font-extrabold text-[#151515]">
                                {row.tkpScore ?? 0}
                              </td>
                            </>
                          )}

                          {cols.showTotalScore && (
                            <td className="px-3 py-3.5 text-center">
                              <div className="text-base font-extrabold text-[#151515]">
                                {row.totalScore ?? 0}
                              </div>
                              <span className="text-[10px] font-bold uppercase text-slate-700">
                                {row.scoreType === "final"
                                  ? "Skor Final"
                                  : "Sementara"}
                              </span>
                            </td>
                          )}

                          {cols.showPassingGrade && (
                            <td className="px-3 py-3.5">
                              {row.passingGradeStatus === "passed" ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Memenuhi</span>
                                </span>
                              ) : row.passingGradeStatus === "failed" ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-rose-700 px-2.5 py-1 text-xs font-bold text-white">
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>Belum Memenuhi</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 border border-amber-500 px-2.5 py-1 text-xs font-bold text-amber-950">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  <span>Passing grade belum dikonfigurasi</span>
                                </span>
                              )}
                            </td>
                          )}

                          {cols.showProgress && (
                            <td className="py-3.5 pl-3 pr-4 text-center text-xs font-bold text-[#151515]">
                              {row.answeredCount ?? 0} /{" "}
                              {row.totalQuestions ?? 0}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-600">
              Catatan: Peringkat sementara dihitung secara real-time dari jawaban yang telah tersimpan di server dan tidak menjamin kelulusan akhir seleksi sebelum seluruh sesi resmi ditutup.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
