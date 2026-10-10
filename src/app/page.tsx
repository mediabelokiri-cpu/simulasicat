"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  LogIn,
  LogOut,
  UserPlus,
  Award,
  BookOpen,
  Building2,
  Trophy,
} from "lucide-react";
import { Button, StatusBadge, inputBaseClasses } from "@/components/ui";
import {
  getCurrentUserClient,
  getStoredProfiles,
  setCurrentUserClient,
} from "@/lib/auth";
import { getExamRuns, getExams, getResults } from "@/lib/admin-store";
import { sortOfficialLeaderboard } from "@/lib/scoring";
import { ExamRow, ExamRunRow, ProfileRow, ResultRow } from "@/types/database";
import { cn, formatDateTimeID } from "@/lib/utils";

export default function LandingPage() {
  const [activeUser, setActiveUser] = useState<ProfileRow | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [runs, setRuns] = useState<ExamRunRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("all");

  useEffect(() => {
    setActiveUser(getCurrentUserClient());
    setResults(getResults());
    setRuns(getExamRuns());
    setExams(getExams());
    setProfiles(getStoredProfiles());
  }, []);

  function handleLogout() {
    setCurrentUserClient(null);
    setActiveUser(null);
  }

  // Filter hanya hasil ujian yang skornya sudah dipublikasikan dan sesuai filter sesi
  const publishedResults = results.filter((r) => Boolean(r.score_published_at));
  const filteredResults =
    selectedRunId === "all"
      ? publishedResults
      : publishedResults.filter((r) => r.exam_run_id === selectedRunId);
  const leaderboardRows = sortOfficialLeaderboard(filteredResults).slice(0, 15);

  return (
    <div className="min-h-screen bg-[#fcfbf7] text-[#151515] flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-[#093db0] bg-[#0b49d0] text-white shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo1.png"
              alt="Logo Prima RIB"
              className="h-10 w-10 rounded-xl object-contain"
            />
            <div>
              <span className="block text-sm sm:text-base font-extrabold tracking-tight text-white">
                Prima RIB
              </span>
              <span className="block text-[11px] font-medium text-white/80">
                Portal Resmi Simulasi CAT
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {activeUser ? (
              <>
                <Link
                  href={activeUser.role === "admin" ? "/admin" : "/dashboard"}
                >
                  <Button
                    variant="accent"
                    size="sm"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Buka Dashboard ({activeUser.full_name.split(" ")[0]})
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="bg-white text-[#0b49d0] border-white hover:bg-neutral-100 font-bold"
                  leftIcon={<LogOut className="h-4 w-4" />}
                >
                  Keluar
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white text-[#0b49d0] border-white hover:bg-neutral-100 font-bold"
                    leftIcon={<LogIn className="h-4 w-4" />}
                  >
                    Masuk
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    variant="accent"
                    size="sm"
                    leftIcon={<UserPlus className="h-4 w-4" />}
                  >
                    Daftar Peserta
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-neutral-200/80 bg-gradient-to-b from-[#eef4ff]/70 to-[#fcfbf7] py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#0b49d0]/20 bg-white px-3.5 py-1.5 shadow-2xs">
                  <StatusBadge variant="featured" label="Standar CAT Resmi" size="sm" />
                  <span className="text-xs font-semibold text-[#0b49d0]">
                    CPNS • Sekolah Kedinasan • Polri
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#151515] leading-[1.15]">
                  Sistem Simulasi{" "}
                  <span className="text-[#0b49d0]">
                    Computer Assisted Test (CAT)
                  </span>{" "}
                  Prima RIB
                </h1>

                <p className="text-sm sm:text-base text-neutral-600 leading-relaxed max-w-2xl">
                  Latih kesiapan menghadapi ujian seleksi sesungguhnya dengan
                  pengalaman ruang ujian CAT yang akurat, timer tersinkronisasi
                  server, pengacakan soal per subtes, serta evaluasi ambang
                  batas (Passing Grade) dan pembahasan komprehensif.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {activeUser ? (
                    <Link
                      href={
                        activeUser.role === "admin" ? "/admin" : "/dashboard"
                      }
                    >
                      <Button
                        variant="primary"
                        size="lg"
                        rightIcon={<ArrowRight className="h-4 w-4" />}
                      >
                        Masuk ke Portal Ujian
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link href="/login">
                        <Button
                          variant="primary"
                          size="lg"
                          leftIcon={<LogIn className="h-4 w-4" />}
                        >
                          Masuk Ruang Ujian
                        </Button>
                      </Link>
                      <Link href="/register">
                        <Button
                          variant="accent"
                          size="lg"
                          leftIcon={<UserPlus className="h-4 w-4" />}
                        >
                          Registrasi Akun Peserta
                        </Button>
                      </Link>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-200/80 max-w-lg text-xs">
                  <div>
                    <p className="font-extrabold text-base sm:text-lg text-[#0b49d0] tabular-nums">
                      Server-Side
                    </p>
                    <p className="text-neutral-600">Penilaian &amp; Timer</p>
                  </div>
                  <div>
                    <p className="font-extrabold text-base sm:text-lg text-[#0b49d0] tabular-nums">
                      Autosave
                    </p>
                    <p className="text-neutral-600">Sinkronisasi Jawaban</p>
                  </div>
                  <div>
                    <p className="font-extrabold text-base sm:text-lg text-[#0b49d0] tabular-nums">
                      Realtime
                    </p>
                    <p className="text-neutral-600">Analitik &amp; Ranking</p>
                  </div>
                </div>
              </div>

              {/* Right Feature Preview Card */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-md space-y-5">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b49d0] text-white">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-base font-extrabold text-[#151515]">
                          Standar Keamanan &amp; Integritas
                        </h2>
                        <p className="text-xs text-neutral-500">
                          Arsitektur CAT Terproteksi
                        </p>
                      </div>
                    </div>
                    <span className="rounded-lg bg-[#ffc63d] px-2.5 py-1 text-xs font-extrabold text-[#151515]">
                      Aktif
                    </span>
                  </div>

                  <ul className="space-y-3 text-xs sm:text-sm text-neutral-700">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Pengacakan Terkunci per Subtes:</strong> Soal
                        TWK, TIU, dan TKP diacak di dalam bloknya masing-masing
                        dan tidak berubah saat halaman dimuat ulang.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Autosave &amp; Antrean Rekoneksi:</strong>{" "}
                        Setiap jawaban langsung tersimpan ke server dan aman
                        saat jaringan sempat terputus.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Evaluasi Passing Grade &amp; Pembahasan:</strong>{" "}
                        Rincian nilai per subtes, bobot TKP 1–5, dan pembahasan
                        resmi sesuai jadwal publikasi.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Kategori Seleksi Utama */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#151515]">
              Kategori Simulasi Seleksi Prima RIB
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600">
              Mendukung berbagai skema penilaian dan ambang batas kelulusan
              sesuai standar seleksi nasional.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef4ff] text-[#0b49d0]">
                <Award className="h-5 w-5" />
              </div>
              <h3 className="text-base font-extrabold text-[#151515]">
                1. Seleksi CPNS (SKD)
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Simulasi Seleksi Kompetensi Dasar meliputi Tes Wawasan
                Kebangsaan (TWK), Tes Intelegensia Umum (TIU), dan Tes
                Karakteristik Pribadi (TKP).
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff9e6] text-[#151515]">
                <Building2 className="h-5 w-5 text-[#0b49d0]" />
              </div>
              <h3 className="text-base font-extrabold text-[#151515]">
                2. Sekolah Kedinasan (Sekdin)
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Simulasi terfokus sesuai instansi tujuan seperti IPDN, PKN STAN,
                Politeknik STIS, STMKG, dan sekolah kedinasan lainnya.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef4ff] text-[#0b49d0]">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="text-base font-extrabold text-[#151515]">
                3. Seleksi Penerimaan Polri
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Simulasi ujian akademik dan psikotes terstruktur dengan
                konfigurasi subtes, bobot penilaian, dan durasi yang fleksibel.
              </p>
            </div>
          </div>
        </section>

        {/* Leaderboard Hasil Ujian */}
        <section
          id="leaderboard"
          className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 space-y-5"
        >
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffc63d] text-[#151515]">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-[#151515]">
                      Leaderboard Hasil Ujian Simulasi CAT
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Peringkat resmi peserta berdasarkan pemenuhan Passing
                      Grade, Total Skor tertinggi, dan tie-breaker TKP → TIU →
                      TWK.
                    </p>
                  </div>
                </div>
              </div>

              {runs.length > 0 && (
                <div className="w-full sm:w-64">
                  <select
                    aria-label="Filter Sesi Ujian"
                    value={selectedRunId}
                    onChange={(e) => setSelectedRunId(e.target.value)}
                    className={inputBaseClasses}
                  >
                    <option value="all">Semua Sesi Ujian</option>
                    {runs.map((r) => {
                      const ex = exams.find((e) => e.id === r.exam_id);
                      return (
                        <option key={r.id} value={r.id}>
                          {ex ? `${ex.title} — ${r.name}` : r.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-[#fcfbf7] text-neutral-600 font-bold">
                    <th className="py-3 px-3">Peringkat</th>
                    <th className="py-3 px-3">Nama Peserta</th>
                    <th className="py-3 px-3">Sesi Ujian</th>
                    <th className="py-3 px-3 text-center">TWK</th>
                    <th className="py-3 px-3 text-center">TIU</th>
                    <th className="py-3 px-3 text-center">TKP</th>
                    <th className="py-3 px-3 text-center">Total Skor</th>
                    <th className="py-3 px-3">Status Ambang Batas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {leaderboardRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-10 px-4 text-center text-neutral-500"
                      >
                        <div className="mx-auto max-w-md space-y-1.5">
                          <p className="text-sm font-bold text-[#151515]">
                            Belum Ada Hasil Ujian yang Dipublikasikan
                          </p>
                          <p className="text-xs text-neutral-500">
                            Peringkat nilai peserta akan otomatis tampil secara
                            realtime di tabel ini setelah peserta menyelesaikan
                            sesi ujian simulasi CAT.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    leaderboardRows.map((row, idx) => {
                      const prof = profiles.find((p) => p.id === row.user_id);
                      const isMe = activeUser?.id === row.user_id;
                      const runObj = runs.find(
                        (r) => r.id === row.exam_run_id
                      );
                      const examObj = exams.find(
                        (e) => e.id === runObj?.exam_id
                      );
                      const snapshotTitle =
                        (row.result_snapshot?.exam_title as string) ||
                        examObj?.title ||
                        "Simulasi CAT Prima RIB";
                      const snapshotRunName =
                        (row.result_snapshot?.run_name as string) ||
                        runObj?.name ||
                        "Sesi Ujian";

                      const twk =
                        row.section_scores.find(
                          (s) => s.section_key.toUpperCase() === "TWK"
                        )?.score ?? 0;
                      const tiu =
                        row.section_scores.find(
                          (s) => s.section_key.toUpperCase() === "TIU"
                        )?.score ?? 0;
                      const tkp =
                        row.section_scores.find(
                          (s) => s.section_key.toUpperCase() === "TKP"
                        )?.score ?? 0;

                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            "transition-colors",
                            isMe
                              ? "bg-[#eef4ff]/70 font-semibold"
                              : "hover:bg-neutral-50"
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
                              {formatDateTimeID(row.created_at)}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="block font-semibold text-[#151515]">
                              {snapshotTitle}
                            </span>
                            <span className="block text-[11px] text-neutral-500">
                              {snapshotRunName}
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <img
              src="/logo1.png"
              alt="Logo Prima RIB"
              className="h-6 w-6 rounded-md object-contain"
            />
            <span className="font-bold text-[#151515]">
              Simulasi CAT Prima RIB
            </span>
          </div>
          <p>© {new Date().getFullYear()} Prima RIB. Seluruh hak cipta dilindungi.</p>
        </div>
      </footer>
    </div>
  );
}
