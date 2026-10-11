"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Smartphone,
  Download,
  CheckCircle2,
  PlayCircle,
  CalendarClock,
  Award,
  Trophy,
  PenTool,
  BookOpen,
  LayoutGrid,
  Bookmark,
  Shield,
  Layers,
  MoreVertical,
  Share,
  PlusSquare,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Home,
  ClipboardList,
  UserCircle,
  GraduationCap,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  StatusBadge,
  Button,
  ToastNotification,
} from "@/components/ui";
import { getCurrentUserClient, syncProfilesFromSupabase } from "@/lib/auth";
import { getResults, syncAdminStoreFromSupabase } from "@/lib/admin-store";
import { EMPTY_USER_FALLBACK } from "@/lib/mock-store";
import { ProfileRow, ResultRow } from "@/types/database";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function DownloadAppPage() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileRow>(EMPTY_USER_FALLBACK);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [selectedPlatformTab, setSelectedPlatformTab] = useState<
    "android" | "ios"
  >("android");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [appUrl, setAppUrl] = useState("https://simulasicat-primarib.id");
  const [toast, setToast] = useState<{
    type: "success" | "info";
    title: string;
    desc: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppUrl(window.location.origin);
    }

    const active = getCurrentUserClient();
    if (active) {
      setUser(active);
    }
    setResults(getResults());

    void Promise.all([
      syncAdminStoreFromSupabase(),
      syncProfilesFromSupabase(),
    ]).then(() => {
      const latest = getCurrentUserClient();
      if (latest) setUser(latest);
      setResults(getResults());
    });

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const userResults = results.filter((r) => r.user_id === user.id);
  const latestResult = userResults[0];
  const bestScore =
    userResults.length > 0
      ? Math.max(...userResults.map((r) => r.total_score))
      : 385;

  async function handleInstallAndroid() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setToast({
          type: "success",
          title: "Instalasi Aplikasi Android Dimulai",
          desc: "Aplikasi Prima RIB CAT sedang ditambahkan ke layar utama perangkat Android Anda.",
        });
      }
      setDeferredPrompt(null);
      return;
    }

    // Buat paket peluncur cepat Android (.html / WebAPK Launcher)
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://simulasicat.id";
    const launcherHtml = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>Prima RIB CAT Mobile Launcher (Android)</title>
<meta http-equiv="refresh" content="1;url=${origin}/dashboard" />
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#4338ca; color:#fff; font-family:Arial,sans-serif; text-align:center; padding:24px; }
  .box { max-width:360px; background:#5248e8; padding:28px; border-radius:28px; box-shadow:0 20px 50px rgba(0,0,0,0.25); }
  a { display:inline-block; margin-top:16px; background:#fff; color:#3730a3; text-decoration:none; font-weight:800; padding:12px 24px; border-radius:14px; }
</style>
</head>
<body>
  <div class="box">
    <h2>Prima RIB CAT Mobile</h2>
    <p>Membuka aplikasi simulasi CAT resmi...</p>
    <a href="${origin}/dashboard">Buka Sekarang</a>
  </div>
</body>
</html>`;

    const blob = new Blob([launcherHtml], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Prima-RIB-CAT-Android-Launcher.html";
    a.click();
    URL.revokeObjectURL(url);

    setSelectedPlatformTab("android");
    setToast({
      type: "success",
      title: "Paket Launcher Android Diunduh",
      desc: "Untuk pengalaman layar penuh terbaik di Android, buka menu Chrome (⋮) lalu pilih 'Tambahkan ke Layar Utama / Install Aplikasi'.",
    });
  }

  function handleInstallIOS() {
    setSelectedPlatformTab("ios");
    setToast({
      type: "info",
      title: "Panduan Instalasi iOS (iPhone & iPad) Aktif",
      desc: "Di browser Safari iPhone/iPad Anda, ketuk ikon Bagikan (Share) di bawah layar lalu pilih 'Tambah ke Layar Utama (Add to Home Screen)'.",
    });
    document
      .getElementById("panduan-instalasi-platform")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  function handleCopyAppLink() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(`${appUrl}/dashboard`);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  }

  return (
    <AppShell
      role="user"
      userName={user.full_name || "Peserta Prima RIB"}
      userSubtitle={`Peserta • ${user.target_selection || "CPNS"}`}
    >
      <div className="hidden lg:block">
        <PageHeader
          title="Download Aplikasi Mobile (Android & iOS)"
          description="Akses latihan dan simulasi CAT CPNS, Sekolah Kedinasan, dan Polri lebih praktis dengan tampilan antarmuka khusus perangkat mobile."
          badge={<StatusBadge variant="featured" label="Android & iOS Ready" />}
          actions={
            <div className="flex flex-wrap gap-2.5">
              <Button
                variant="primary"
                onClick={() => void handleInstallAndroid()}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Download untuk Android
              </Button>
              <Button
                variant="outline"
                onClick={handleInstallIOS}
                leftIcon={<Smartphone className="h-4 w-4 text-[#4338ca]" />}
              >
                Install untuk iOS (iPhone/iPad)
              </Button>
            </div>
          }
        />
      </div>

      {toast && (
        <div className="mb-6 max-w-md mx-auto lg:max-w-none">
          <ToastNotification
            type={toast.type}
            title={toast.title}
            description={toast.desc}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* =====================================================================
          BAGIAN 1: KARTU UNDUH ANDROID & iOS
          ===================================================================== */}
      <section className="mx-auto max-w-md lg:max-w-none grid grid-cols-1 gap-5 lg:grid-cols-12 mb-8">
        {/* Kartu Download Android */}
        <div className="lg:col-span-5 rounded-[28px] border border-indigo-100 bg-white p-6 shadow-[0_12px_32px_rgba(67,56,202,0.07)] flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">
                <Sparkles className="h-3.5 w-3.5" />
                ANDROID OS 8.0+
              </span>
              <span className="text-xs font-bold text-slate-400">
                v2.4.0 Resmi
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-[#1e1b4b]">
              Prima RIB CAT untuk Android
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Instal langsung di smartphone atau tablet Android Anda. Mendukung
              mode layar penuh (*standalone*), sinkronisasi jawaban otomatis,
              dan hemat kuota.
            </p>

            <ul className="space-y-2 pt-1 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Antarmuka Mobile Modern &amp; Responsif</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Notifikasi Sesi Ujian &amp; Kelompok Belajar</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Unduh Transkripsi Nilai &amp; Pembahasan Soal</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => void handleInstallAndroid()}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#4338ca] hover:bg-[#3730a3] py-4 px-5 text-xs sm:text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(67,56,202,0.28)] transition-transform active:scale-98 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>
                {deferredPrompt
                  ? "Install Aplikasi Android Sekarang"
                  : "Download & Install untuk Android"}
              </span>
            </button>
            <p className="text-center text-[11px] text-slate-400">
              Kompatibel dengan Samsung, Xiaomi, OPPO, Vivo, Realme &amp; semua
              perangkat Android
            </p>
          </div>
        </div>

        {/* Kartu Download iOS (iPhone & iPad) */}
        <div className="lg:col-span-5 rounded-[28px] border border-indigo-100 bg-white p-6 shadow-[0_12px_32px_rgba(67,56,202,0.07)] flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-100 px-3 py-1 text-xs font-extrabold text-[#4338ca]">
                <Smartphone className="h-3.5 w-3.5" />
                APPLE iOS &amp; iPadOS
              </span>
              <span className="text-xs font-bold text-slate-400">
                v2.4.0 Resmi
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-[#1e1b4b]">
              Prima RIB CAT untuk iOS (iPhone &amp; iPad)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Nikmati pengalaman aplikasi native di iPhone &amp; iPad melalui
              integrasi Web-App iOS resmi tanpa perlu kapasitas penyimpanan
              besar.
            </p>

            <ul className="space-y-2 pt-1 text-xs text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4338ca]" />
                <span>Ikon Aplikasi Langsung di Home Screen iPhone</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4338ca]" />
                <span>Bebas Address Bar (Mode Layar Penuh iOS)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4338ca]" />
                <span>Sinkronisasi Real-Time dengan Server CAT</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleInstallIOS}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-[#4338ca] bg-[#eef0ff] hover:bg-[#4338ca] hover:text-white py-4 px-5 text-xs sm:text-sm font-extrabold text-[#4338ca] transition-all active:scale-98 cursor-pointer"
            >
              <Smartphone className="h-4 w-4" />
              <span>Pasang di iPhone / iPad (iOS)</span>
            </button>
            <p className="text-center text-[11px] text-slate-400">
              Mendukung iOS 14.0 ke atas di Safari iPhone &amp; iPad
            </p>
          </div>
        </div>

        {/* Kartu Link Cepat / Akses Mobile */}
        <div className="lg:col-span-2 rounded-[28px] bg-gradient-to-br from-[#4338ca] to-[#312e81] p-5 text-white shadow-[0_12px_32px_rgba(67,56,202,0.22)] flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="inline-block rounded-lg bg-white/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider">
              Akses Cepat
            </span>
            <h3 className="text-sm font-extrabold leading-snug">
              Buka di Smartphone Anda
            </h3>
            <p className="text-[11px] text-indigo-100 leading-relaxed">
              Salin tautan aplikasi di bawah ini lalu buka di browser Chrome
              (Android) atau Safari (iPhone):
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleCopyAppLink}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 px-3 text-xs font-extrabold text-[#3730a3] shadow-sm cursor-pointer"
            >
              {copiedUrl ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Tautan Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Salin Link App</span>
                </>
              )}
            </button>
            <Link
              href="/dashboard"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 py-2.5 px-3 text-xs font-bold text-white"
            >
              <span>Ke Beranda</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================================
          BAGIAN 2: PRATINJAU 3 LAYAR TAMPILAN MOBILE RESMI (Sesuai Desain)
          ===================================================================== */}
      <section className="rounded-[32px] border border-indigo-100 bg-[#e8ecff]/70 p-5 sm:p-8 shadow-inner mb-8">
        <div className="text-center max-w-2xl mx-auto mb-7 space-y-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-xs font-extrabold text-[#4338ca] shadow-2xs">
            <Smartphone className="h-3.5 w-3.5" />
            Tampilan Antarmuka Mobile Prima RIB CAT
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#1e1b4b]">
            Desain Modern, Ringkas &amp; Nyaman di Genggaman
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Ketiga tampilan layar di bawah ini aktif secara otomatis saat Anda
            membuka Portal Peserta menggunakan perangkat Android maupun iPhone.
          </p>
        </div>

        {/* 3 Phone Mockups Grid (Persis Seperti Gambar Referensi) */}
        <div className="grid grid-cols-1 gap-7 md:grid-cols-3 max-w-5xl mx-auto items-stretch">
          {/* LAYAR 1: ONBOARDING MOBILE ("Lebih mudah untuk mengakses simulasi CAT dengan mobile") */}
          <div className="relative mx-auto w-full max-w-[320px] rounded-[36px] bg-[#4338ca] p-5 text-white shadow-[0_24px_60px_rgba(67,56,202,0.32)] flex flex-col justify-between overflow-hidden">
            {/* Wavy Top Lines */}
            <svg
              viewBox="0 0 400 100"
              fill="none"
              className="pointer-events-none absolute inset-x-0 top-0 w-full opacity-20"
              aria-hidden="true"
            >
              <path
                d="M-20 25 C 80 75, 180 -10, 280 45 C 350 80, 400 25, 440 45"
                stroke="white"
                strokeWidth="2"
              />
              <path
                d="M-20 50 C 80 100, 180 15, 280 70 C 350 105, 400 50, 440 70"
                stroke="white"
                strokeWidth="2"
              />
              <path
                d="M-20 75 C 80 125, 180 40, 280 95 C 350 130, 400 75, 440 95"
                stroke="white"
                strokeWidth="2"
              />
            </svg>

            {/* 3D Stylized Smartphone Illustration */}
            <div className="relative my-auto py-8 flex flex-col items-center justify-center">
              <div className="relative flex h-44 w-28 flex-col items-center justify-between rounded-[24px] border-4 border-rose-200 bg-white p-3 shadow-2xl">
                <div className="flex h-16 w-full items-center justify-center rounded-xl bg-rose-400 text-white shadow-inner">
                  <PlayCircle className="h-8 w-8 fill-white/20" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full bg-rose-400" />
                  <span className="h-3.5 w-3.5 rounded-full bg-indigo-950" />
                  <span className="h-3.5 w-3.5 rounded-full bg-amber-400" />
                </div>
                <div className="grid w-full grid-cols-3 gap-1.5">
                  <span className="h-4 rounded-md bg-rose-100" />
                  <span className="h-4 rounded-md bg-rose-100" />
                  <span className="h-4 rounded-md bg-rose-100" />
                </div>
              </div>
              <div className="mt-[-10px] h-7 w-32 rounded-full border-4 border-rose-400/90" />
            </div>

            {/* Bottom Frosted Card */}
            <div className="rounded-[28px] bg-[#5248e8] p-6 text-center space-y-3.5 shadow-inner">
              <div className="flex items-center justify-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                <span className="h-2 w-2 rounded-full bg-white" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
              </div>
              <h3 className="text-base font-extrabold leading-snug text-white">
                Lebih mudah untuk mengakses simulasi CAT dengan mobile
              </h3>
              <p className="text-xs text-indigo-100/90 leading-relaxed">
                Sekarang kamu bisa mengakses simulasi CAT dengan lebih mudah.
              </p>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="mt-2 w-full rounded-2xl bg-white py-3.5 text-xs font-extrabold text-[#3730a3] shadow-md transition-transform hover:scale-[1.01] active:scale-98 cursor-pointer"
              >
                Mulai
              </button>
            </div>
          </div>

          {/* LAYAR 2: BERANDA MOBILE ("Selamat datang di, Prima RIB CAT.") */}
          <div className="mx-auto w-full max-w-[320px] rounded-[36px] bg-[#f8f9ff] p-5 shadow-[0_24px_60px_rgba(67,56,202,0.16)] border border-white flex flex-col justify-between space-y-5">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-[11px] font-medium text-slate-400">
                    Selamat datang di,
                  </p>
                  <h3 className="text-lg font-extrabold tracking-tight text-[#312e81]">
                    Prima RIB CAT.
                  </h3>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef0ff] text-[#4338ca]">
                  <LayoutGrid className="h-4 w-4" />
                </div>
              </div>

              {/* Hero Profile Card */}
              <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#4338ca] via-[#493fe8] to-[#3730a3] p-4 text-white shadow-[0_14px_30px_rgba(67,56,202,0.28)]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold text-indigo-200 tabular-nums">
                      1983242342
                    </p>
                    <p className="mt-0.5 text-base font-extrabold text-white">
                      {user.full_name || "Peserta Prima RIB"}
                    </p>
                    <p className="mt-3 text-[11px] text-indigo-100">
                      {user.institution ||
                        `Seleksi ${user.target_selection || "CPNS"}`}
                    </p>
                    <p className="text-[11px] font-extrabold text-white">
                      Skor {bestScore}
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-between self-stretch">
                    <div className="flex h-12 w-14 items-center justify-center rounded-xl bg-white/10">
                      <PenTool className="h-6 w-6 text-amber-300" />
                    </div>
                    <span className="mt-3 rounded-xl bg-white px-2.5 py-1 text-[10px] font-extrabold text-[#3730a3]">
                      110 Soal
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Informasi (8 Ikon) */}
              <div className="space-y-2.5">
                <p className="text-xs font-extrabold text-[#1e1b4b]">
                  Menu Informasi
                </p>
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    {
                      label: "Jadwal",
                      icon: CalendarClock,
                      bg: "bg-indigo-100 text-[#4338ca]",
                      href: "/ujian",
                    },
                    {
                      label: "Simulasi",
                      icon: GraduationCap,
                      bg: "bg-rose-100 text-rose-500",
                      href: "/dashboard",
                    },
                    {
                      label: "Nilai",
                      icon: Award,
                      bg: "bg-amber-100 text-amber-500",
                      href: "/hasil",
                    },
                    {
                      label: "Leaderboard",
                      icon: Trophy,
                      bg: "bg-emerald-100 text-emerald-600",
                      href: "/hasil?tab=leaderboard",
                    },
                    {
                      label: "Cat PA",
                      icon: PenTool,
                      bg: "bg-purple-100 text-purple-600",
                      href: "/hasil",
                    },
                    {
                      label: "Panduan",
                      icon: BookOpen,
                      bg: "bg-cyan-100 text-cyan-600",
                      href: "/ujian",
                    },
                    {
                      label: "LPBA",
                      icon: Bookmark,
                      bg: "bg-blue-100 text-[#4338ca]",
                      href: "/hasil",
                    },
                    {
                      label: "Lainnya",
                      icon: LayoutGrid,
                      bg: "bg-pink-100 text-pink-500",
                      href: "/profil",
                    },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <Link
                        key={m.label}
                        href={m.href}
                        className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-white p-2.5 shadow-[0_6px_16px_rgba(67,56,202,0.05)]"
                      >
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl ${m.bg}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-bold text-[#1e1b4b]">
                          {m.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Notifikasi */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold text-[#1e1b4b]">
                    Notifikasi
                  </p>
                  <span className="text-[10px] font-bold text-[#4338ca]">
                    Lihat semua
                  </span>
                </div>
                <div className="flex items-start gap-2.5 rounded-2xl bg-white p-3.5 shadow-[0_6px_16px_rgba(67,56,202,0.05)]">
                  <span className="h-9 w-1 shrink-0 rounded-full bg-emerald-400" />
                  <div>
                    <p className="text-[11px] font-extrabold text-[#1e1b4b]">
                      Pendaftaran Simulasi CAT Batch Aktif
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Peserta bersertifikat seleksi CPNS, Sekdin &amp; Polri
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Tab Bar Preview */}
            <div className="grid grid-cols-5 items-center pt-3 border-t border-indigo-50 text-[#c7d2fe]">
              <div className="flex flex-col items-center gap-1 text-[#4338ca]">
                <span className="h-1 w-4 rounded-full bg-[#4338ca]" />
                <Home className="h-4 w-4" />
              </div>
              <div className="flex justify-center">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div className="flex justify-center">
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="flex justify-center">
                <Smartphone className="h-4 w-4" />
              </div>
              <div className="flex justify-center">
                <UserCircle className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* LAYAR 3: HASIL STUDI & TRANSKRIPSI NILAI */}
          <div className="mx-auto w-full max-w-[320px] rounded-[36px] bg-[#f8f9ff] p-5 shadow-[0_24px_60px_rgba(67,56,202,0.16)] border border-white flex flex-col justify-between space-y-5">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between pt-1">
                <h3 className="text-lg font-extrabold tracking-tight text-[#312e81]">
                  Hasil Studi
                </h3>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef0ff] text-[#4338ca]">
                  <LayoutGrid className="h-4 w-4" />
                </div>
              </div>

              {/* Session Selector Pill */}
              <div className="flex items-center justify-between rounded-2xl border border-indigo-50 bg-white px-3.5 py-3 text-[11px] font-bold text-slate-500 shadow-[0_4px_14px_rgba(67,56,202,0.04)]">
                <span>Simulasi SKD - 2025/2026 Genap</span>
                <span>▾</span>
              </div>

              {/* 2x2 Cards Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    val: latestResult
                      ? String(
                          latestResult.section_scores.find(
                            (s) => s.section_key === "TWK"
                          )?.score ?? 95
                        )
                      : "95",
                    label: "Skor TWK",
                    icon: Bookmark,
                  },
                  {
                    val: latestResult
                      ? String(
                          latestResult.section_scores.find(
                            (s) => s.section_key === "TIU"
                          )?.score ?? 125
                        )
                      : "125",
                    label: "Skor TIU",
                    icon: Shield,
                  },
                  {
                    val: "110",
                    label: "Total Soal",
                    icon: Layers,
                  },
                  {
                    val: latestResult
                      ? String(latestResult.total_score)
                      : String(bestScore),
                    label: "Total Nilai Akhir",
                    icon: BookOpen,
                  },
                ].map((c) => {
                  const Icon = c.icon;
                  return (
                    <div
                      key={c.label}
                      className="rounded-2xl bg-white p-3.5 shadow-[0_6px_18px_rgba(67,56,202,0.05)] space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4338ca] text-white">
                          <Icon className="h-4 w-4" />
                        </div>
                        <MoreVertical className="h-3.5 w-3.5 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-xl font-extrabold text-[#312e81] tabular-nums">
                          {c.val}
                        </p>
                        <p className="text-[10px] font-medium text-slate-400">
                          {c.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Transkripsi Nilai */}
              <div className="space-y-2.5 pt-1">
                <p className="text-xs font-extrabold text-[#1e1b4b]">
                  Transkripsi Nilai
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Kamu bisa melihat transkripsi nilai dengan mendownload file
                  laporan di bawah ini
                </p>
                <Link
                  href="/hasil"
                  className="block w-full rounded-2xl bg-[#4338ca] py-3.5 text-center text-xs font-extrabold text-white shadow-[0_10px_24px_rgba(67,56,202,0.28)]"
                >
                  Download File
                </Link>
              </div>
            </div>

            {/* Bottom Tab Bar Preview */}
            <div className="grid grid-cols-5 items-center pt-3 border-t border-indigo-50 text-[#c7d2fe]">
              <div className="flex justify-center">
                <Home className="h-4 w-4" />
              </div>
              <div className="flex justify-center">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div className="flex flex-col items-center gap-1 text-[#4338ca]">
                <span className="h-1 w-4 rounded-full bg-[#4338ca]" />
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="flex justify-center">
                <Smartphone className="h-4 w-4" />
              </div>
              <div className="flex justify-center">
                <UserCircle className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          BAGIAN 3: PANDUAN INSTALASI LANGKAH DEMI LANGKAH (ANDROID & iOS)
          ===================================================================== */}
      <section
        id="panduan-instalasi-platform"
        className="mx-auto max-w-md lg:max-w-none rounded-[28px] border border-indigo-100 bg-white p-6 shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#1e1b4b]">
              Cara Memasang Aplikasi di Layar Utama HP
            </h2>
            <p className="text-xs text-slate-500">
              Pilih sistem operasi perangkat Anda untuk melihat langkah
              instalasi cepat (kurang dari 15 detik).
            </p>
          </div>

          <div className="inline-flex rounded-2xl bg-[#f6f7ff] p-1 border border-indigo-100">
            <button
              type="button"
              onClick={() => setSelectedPlatformTab("android")}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-colors cursor-pointer ${
                selectedPlatformTab === "android"
                  ? "bg-[#4338ca] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#4338ca]"
              }`}
            >
              Android (Chrome)
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlatformTab("ios")}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-colors cursor-pointer ${
                selectedPlatformTab === "ios"
                  ? "bg-[#4338ca] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#4338ca]"
              }`}
            >
              iOS (iPhone / iPad)
            </button>
          </div>
        </div>

        {selectedPlatformTab === "android" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-indigo-50 bg-[#f8f9ff] p-4 space-y-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#4338ca] text-xs font-extrabold text-white">
                1
              </span>
              <h3 className="text-sm font-extrabold text-[#1e1b4b]">
                Tekan Tombol Install Android
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tekan tombol <strong>Download &amp; Install untuk Android</strong>{" "}
                di atas, atau ketuk ikon menu titik tiga (<strong>⋮</strong>) di
                pojok kanan atas browser Chrome Android Anda.
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-50 bg-[#f8f9ff] p-4 space-y-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#4338ca] text-xs font-extrabold text-white">
                2
              </span>
              <h3 className="text-sm font-extrabold text-[#1e1b4b]">
                Pilih &ldquo;Instal Aplikasi&rdquo;
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pilih menu{" "}
                <strong>Instal Aplikasi (Install App)</strong> atau{" "}
                <strong>Tambahkan ke Layar Utama</strong> pada pop-up yang
                muncul.
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-50 bg-[#f8f9ff] p-4 space-y-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#4338ca] text-xs font-extrabold text-white">
                3
              </span>
              <h3 className="text-sm font-extrabold text-[#1e1b4b]">
                Siap Digunakan di Home Screen
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ikon <strong>Prima RIB CAT</strong> kini tampil di daftar
                aplikasi Android Anda dan berjalan dalam mode layar penuh!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-indigo-50 bg-[#f8f9ff] p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#4338ca] text-xs font-extrabold text-white">
                  1
                </span>
                <Share className="h-4 w-4 text-[#4338ca]" />
              </div>
              <h3 className="text-sm font-extrabold text-[#1e1b4b]">
                Buka di Safari &amp; Ketuk Bagikan (Share)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Buka halaman ini di browser <strong>Safari</strong> pada iPhone
                atau iPad Anda, lalu ketuk ikon <strong>Bagikan (Share)</strong>{" "}
                di bilah navigasi bawah.
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-50 bg-[#f8f9ff] p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#4338ca] text-xs font-extrabold text-white">
                  2
                </span>
                <PlusSquare className="h-4 w-4 text-[#4338ca]" />
              </div>
              <h3 className="text-sm font-extrabold text-[#1e1b4b]">
                Pilih &ldquo;Tambah ke Layar Utama&rdquo;
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gulir menu ke bawah lalu ketuk{" "}
                <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-50 bg-[#f8f9ff] p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#4338ca] text-xs font-extrabold text-white">
                  3
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-extrabold text-[#1e1b4b]">
                Ketuk &ldquo;Tambah (Add)&rdquo;
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ketuk <strong>Tambah</strong> di pojok kanan atas. Aplikasi{" "}
                <strong>Prima RIB CAT</strong> siap dibuka langsung dari Home
                Screen iPhone/iPad Anda!
              </p>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
