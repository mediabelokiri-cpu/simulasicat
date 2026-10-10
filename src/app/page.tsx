"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Clock,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  LogIn,
  LogOut,
  UserPlus,
  Award,
  BookOpen,
  Building2,
} from "lucide-react";
import { Button, StatusBadge } from "@/components/ui";
import { getCurrentUserClient, setCurrentUserClient } from "@/lib/auth";
import { ProfileRow } from "@/types/database";

export default function LandingPage() {
  const [activeUser, setActiveUser] = useState<ProfileRow | null>(null);

  useEffect(() => {
    setActiveUser(getCurrentUserClient());
  }, []);

  function handleLogout() {
    setCurrentUserClient(null);
    setActiveUser(null);
  }

  return (
    <div className="min-h-screen bg-[#fcfbf7] text-[#151515] flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-[#fcfbf7]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo1.png"
              alt="Logo Prima RIB"
              className="h-10 w-10 rounded-xl object-contain"
            />
            <div>
              <span className="block text-sm sm:text-base font-extrabold tracking-tight text-[#151515]">
                Prima RIB
              </span>
              <span className="block text-[11px] font-medium text-neutral-500">
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
                    variant="primary"
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
                    leftIcon={<LogIn className="h-4 w-4" />}
                  >
                    Masuk
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    variant="primary"
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
