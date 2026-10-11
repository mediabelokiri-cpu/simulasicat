"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlayCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Megaphone,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  UsersRound,
  Award,
  BookOpen,
  Smartphone,
  LayoutGrid,
  Trophy,
  PenTool,
  X,
  GraduationCap,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  StatCard,
  StatusBadge,
  Button,
  FormField,
  inputBaseClasses,
  ToastNotification,
  EmptyState,
} from "@/components/ui";
import { ExamCard } from "@/components/dashboard/ExamCard";
import { getCurrentUserClient, syncProfilesFromSupabase } from "@/lib/auth";
import {
  getExams,
  getExamRuns,
  getExamSections,
  getResults,
  getUserEnrolledGroups,
  getUserDeactivationNotice,
  syncAdminStoreFromSupabase,
} from "@/lib/admin-store";
import {
  evaluateUserExamEligibility,
  startOrResumeExamSession,
} from "@/lib/exam";
import { EMPTY_USER_FALLBACK, SKD_CPNS_2024_PRESET } from "@/lib/mock-store";
import {
  ExamRow,
  ExamRunRow,
  ExamSectionRow,
  GroupRow,
  ProfileRow,
  ResultRow,
} from "@/types/database";
import { formatDateTimeID } from "@/lib/utils";

function generateParticipantNumber(userId: string): string {
  let hash = 0;
  const seed = userId || "prima-user";
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const sixDigits = String((hash % 900000) + 100000);
  return `1983${sixDigits}`;
}

export default function UserDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileRow>(EMPTY_USER_FALLBACK);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [runs, setRuns] = useState<ExamRunRow[]>([]);
  const [sections, setSections] = useState<ExamSectionRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [userGroups, setUserGroups] = useState<GroupRow[]>([]);
  const [deactivationNotice, setDeactivationNotice] = useState<{
    reason: string;
    updatedAt: string;
  } | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sekdinInstFilter, setSekdinInstFilter] = useState("ALL");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showOnboardingCard, setShowOnboardingCard] = useState(false);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>([]);

  useEffect(() => {
    const active = getCurrentUserClient();
    if (!active) {
      router.replace("/login");
      return;
    }
    setUser(active);

    const refreshFromLocal = (currentUser: ProfileRow) => {
      setExams(getExams());
      setRuns(getExamRuns());
      setSections(getExamSections());
      setResults(getResults());
      setUserGroups(getUserEnrolledGroups(currentUser));
      setDeactivationNotice(getUserDeactivationNotice(currentUser));
    };

    refreshFromLocal(active);

    let isMounted = true;
    const syncRemote = async () => {
      await Promise.all([
        syncAdminStoreFromSupabase(),
        syncProfilesFromSupabase(),
      ]);
      if (!isMounted) return;
      const latestUser = getCurrentUserClient();
      if (!latestUser) {
        router.replace("/login");
        return;
      }
      setUser(latestUser);
      refreshFromLocal(latestUser);
    };

    void syncRemote();
    const interval = window.setInterval(syncRemote, 8000);
    const onFocus = () => void syncRemote();
    window.addEventListener("focus", onFocus);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [router]);

  const enrichedRuns = runs
    .map((run) => {
      const exam = exams.find((e) => e.id === run.exam_id);
      if (!exam) return null;
      const exSecs = sections.filter((s) => s.exam_id === exam.id);
      const qCount =
        exSecs.length > 0
          ? exSecs.reduce((sum, s) => sum + s.question_count, 0)
          : SKD_CPNS_2024_PRESET.sections.reduce(
              (sum, s) => sum + s.question_count,
              0
            );
      const eligibility = evaluateUserExamEligibility(user, exam, run);
      return { exam, run, qCount, eligibility };
    })
    .filter(Boolean) as {
    exam: ExamRow;
    run: ExamRunRow;
    qCount: number;
    eligibility: ReturnType<typeof evaluateUserExamEligibility>;
  }[];

  const filteredItems = enrichedRuns.filter(({ exam }) => {
    const matchesCat =
      categoryFilter === "ALL" || exam.category_id === categoryFilter;
    const matchesInst =
      categoryFilter !== "cat-sekdin" ||
      sekdinInstFilter === "ALL" ||
      (exam.institution_label || "").toUpperCase() === sekdinInstFilter;
    return matchesCat && matchesInst;
  });

  const readyCount = enrichedRuns.filter(
    (i) => i.eligibility.displayStatus === "ready_to_start"
  ).length;
  const ongoingCount = enrichedRuns.filter(
    (i) => i.eligibility.displayStatus === "in_progress"
  ).length;
  const upcomingCount = enrichedRuns.filter(
    (i) => i.eligibility.displayStatus === "waiting_schedule"
  ).length;
  const userResults = results.filter((r) => r.user_id === user.id);
  const bestScore =
    userResults.length > 0
      ? Math.max(...userResults.map((r) => r.total_score))
      : 0;
  const participantNumber = generateParticipantNumber(user.id);

  function handleStartExam(run: ExamRunRow) {
    setErrorMsg(null);
    const res = startOrResumeExamSession(user, run.id);
    if (!res.ok || !res.session) {
      setErrorMsg(res.error || "Gagal memulai sesi ujian.");
      return;
    }
    router.push(`/ujian/${res.session.id}`);
  }

  // Susun daftar notifikasi dinamis untuk tampilan Mobile & Desktop
  const mobileNotifications: Array<{
    id: string;
    title: string;
    subtitle: string;
    accentColor: string;
    href?: string;
  }> = [];

  if (!user.is_active) {
    mobileNotifications.push({
      id: "notif-deactivated",
      title: "Akun Anda Sedang Dinonaktifkan",
      subtitle:
        deactivationNotice?.reason ||
        "Akun Anda saat ini dinonaktifkan sementara oleh Administrator.",
      accentColor: "bg-rose-500",
      href: "/profil",
    });
  }

  if (userGroups.length > 0) {
    mobileNotifications.push({
      id: "notif-groups",
      title: `Tergabung di ${userGroups.map((g) => g.name).join(", ")}`,
      subtitle:
        "Akun peserta Anda telah terdaftar resmi dalam kelompok belajar & sesi ujian khusus.",
      accentColor: "bg-emerald-400",
      href: "/profil",
    });
  }

  if (enrichedRuns.length > 0) {
    const firstRun = enrichedRuns[0];
    mobileNotifications.push({
      id: `notif-run-${firstRun.run.id}`,
      title: firstRun.run.name,
      subtitle: `${firstRun.exam.title} • ${firstRun.eligibility.statusLabel}`,
      accentColor: "bg-emerald-400",
      href: "#daftar-sesi-ujian",
    });
  } else {
    mobileNotifications.push({
      id: "notif-default-magang",
      title: "Program Simulasi CAT Prima RIB",
      subtitle:
        "Persiapan seleksi CPNS, Sekolah Kedinasan & Polri terintegrasi realtime",
      accentColor: "bg-emerald-400",
      href: "/ujian",
    });
  }

  const visibleMobileNotifs = mobileNotifications.filter(
    (n) => !dismissedNotifIds.includes(n.id)
  );

  return (
    <AppShell
      role="user"
      userName={user.full_name}
      userSubtitle={`Peserta • ${user.target_selection || "CPNS"}`}
    >
      {/* =====================================================================
          TAMPILAN MOBILE MODERN APP (Sesuai Referensi Gambar Mobile UI)
          ===================================================================== */}
      <div className="mx-auto max-w-md space-y-6 lg:hidden">
        {/* Screen 1: Onboarding Splash Card (Bisa dibuka/ditutup) */}
        {showOnboardingCard && (
          <div className="relative overflow-hidden rounded-[32px] bg-[#4338ca] p-5 text-white shadow-[0_20px_50px_rgba(67,56,202,0.35)]">
            {/* Wavy Top SVG Pattern */}
            <svg
              viewBox="0 0 400 90"
              fill="none"
              className="pointer-events-none absolute inset-x-0 top-0 w-full opacity-25"
              aria-hidden="true"
            >
              <path
                d="M-20 20 C 80 70, 180 -10, 280 40 C 350 75, 400 20, 440 40"
                stroke="white"
                strokeWidth="2"
              />
              <path
                d="M-20 45 C 80 95, 180 15, 280 65 C 350 100, 400 45, 440 65"
                stroke="white"
                strokeWidth="2"
              />
            </svg>

            <button
              type="button"
              onClick={() => setShowOnboardingCard(false)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              aria-label="Tutup banner"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Ilustrasi 3D Hand Holding Smartphone */}
            <div className="relative mx-auto my-4 flex h-44 w-44 items-center justify-center">
              <div className="absolute h-36 w-36 rounded-full bg-indigo-400/20 blur-xl" />
              <div className="relative flex h-36 w-24 flex-col items-center justify-between rounded-[22px] border-4 border-rose-200 bg-white p-2.5 shadow-xl">
                <div className="flex h-14 w-full items-center justify-center rounded-xl bg-rose-400 text-white shadow-inner">
                  <PlayCircle className="h-7 w-7 fill-white/20" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-rose-400" />
                  <span className="h-3 w-3 rounded-full bg-indigo-900" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                </div>
                <div className="grid w-full grid-cols-3 gap-1">
                  <span className="h-3 rounded bg-rose-100" />
                  <span className="h-3 rounded bg-rose-100" />
                  <span className="h-3 rounded bg-rose-100" />
                </div>
              </div>
              {/* Ring accent */}
              <div className="pointer-events-none absolute -bottom-1 h-7 w-28 rounded-full border-4 border-rose-400/90" />
            </div>

            {/* Frosted Bottom Card */}
            <div className="rounded-[26px] bg-[#5248e8] p-5 text-center shadow-inner space-y-3">
              <div className="flex items-center justify-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                <span className="h-2 w-2 rounded-full bg-white" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
              </div>
              <h2 className="text-base font-extrabold leading-snug text-white">
                Lebih mudah untuk mengakses simulasi CAT dengan mobile
              </h2>
              <p className="text-xs text-indigo-100/90 leading-relaxed">
                Sekarang kamu bisa mengakses latihan &amp; simulasi CAT dengan
                lebih mudah di Android maupun iOS.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowOnboardingCard(false);
                  document
                    .getElementById("daftar-sesi-ujian")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-2 w-full rounded-2xl bg-white py-3.5 text-xs font-extrabold text-[#3730a3] shadow-md transition-transform active:scale-98 cursor-pointer"
              >
                Mulai
              </button>
            </div>
          </div>
        )}

        {/* Screen 2: Hero Kartu Identitas Peserta (Royal Indigo Card) */}
        <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#4338ca] via-[#493fe8] to-[#3730a3] p-5 text-white shadow-[0_16px_36px_rgba(67,56,202,0.26)]">
          <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-wider text-indigo-200 tabular-nums">
                {participantNumber}
              </p>
              <h2 className="mt-1 truncate text-xl font-extrabold tracking-tight text-white">
                {user.full_name}
              </h2>

              <div className="mt-5 space-y-0.5">
                <p className="text-xs font-medium text-indigo-100">
                  {user.institution ||
                    `Seleksi ${user.target_selection || "CPNS"}`}
                </p>
                <p className="text-xs font-extrabold text-white tabular-nums">
                  {bestScore > 0
                    ? `Skor Terbaik ${bestScore}`
                    : `Target ${user.target_selection || "CPNS"}`}
                </p>
              </div>
            </div>

            {/* Ilustrasi 3D Hand Holding Pencil + Pill Badge */}
            <div className="flex flex-col items-end justify-between self-stretch">
              <button
                type="button"
                onClick={() => setShowOnboardingCard((v) => !v)}
                title="Tampilkan info mobile"
                className="relative flex h-16 w-20 items-center justify-center"
              >
                {/* 3D Stylized Hand & Pencil SVG */}
                <svg
                  viewBox="0 0 100 80"
                  className="h-16 w-20 drop-shadow-md"
                  aria-hidden="true"
                >
                  {/* Fingers / Hand */}
                  <rect
                    x="18"
                    y="18"
                    width="14"
                    height="36"
                    rx="7"
                    transform="rotate(-18 18 18)"
                    fill="#f59e0b"
                  />
                  <rect
                    x="31"
                    y="14"
                    width="14"
                    height="40"
                    rx="7"
                    transform="rotate(-12 31 14)"
                    fill="#fbbf24"
                  />
                  <rect
                    x="44"
                    y="16"
                    width="14"
                    height="38"
                    rx="7"
                    transform="rotate(-6 44 16)"
                    fill="#f59e0b"
                  />
                  <ellipse cx="42" cy="48" rx="24" ry="18" fill="#d97706" />
                  {/* Green Pencil */}
                  <rect
                    x="46"
                    y="10"
                    width="38"
                    height="12"
                    rx="4"
                    transform="rotate(32 46 10)"
                    fill="#10b981"
                  />
                  <polygon
                    points="43,12 34,10 39,20"
                    fill="#fef3c7"
                  />
                </svg>
              </button>

              <span className="mt-2 inline-flex items-center rounded-xl bg-white px-3.5 py-1.5 text-xs font-extrabold text-[#3730a3] shadow-sm tabular-nums">
                {readyCount + ongoingCount > 0
                  ? `${readyCount + ongoingCount} Sesi`
                  : "110 Soal"}
              </span>
            </div>
          </div>
        </div>

        {/* Menu Informasi (Grid 4x2 = 8 Ikon Pastel Modern) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1e1b4b]">
              Menu Informasi
            </h3>
            <button
              type="button"
              onClick={() => setShowOnboardingCard((v) => !v)}
              className="text-[11px] font-bold text-[#4338ca] hover:underline cursor-pointer"
            >
              Info Mobile
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: "Jadwal",
                href: "/ujian",
                icon: CalendarClock,
                iconBg: "bg-indigo-100 text-[#4338ca]",
              },
              {
                label: "Simulasi",
                href: "#daftar-sesi-ujian",
                icon: GraduationCap,
                iconBg: "bg-rose-100 text-rose-500",
              },
              {
                label: "Nilai",
                href: "/hasil",
                icon: Award,
                iconBg: "bg-amber-100 text-amber-500",
              },
              {
                label: "Leaderboard",
                href: "/hasil?tab=leaderboard",
                icon: Trophy,
                iconBg: "bg-emerald-100 text-emerald-600",
              },
              {
                label: "Cat PA",
                href: "/hasil",
                icon: PenTool,
                iconBg: "bg-purple-100 text-purple-600",
              },
              {
                label: "Soal CAT",
                href: "/ujian",
                icon: BookOpen,
                iconBg: "bg-cyan-100 text-cyan-600",
              },
              {
                label: "App Mobile",
                href: "/download-app",
                icon: Smartphone,
                iconBg: "bg-blue-100 text-[#4338ca]",
              },
              {
                label: "Lainnya",
                href: "/profil",
                icon: LayoutGrid,
                iconBg: "bg-pink-100 text-pink-500",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-indigo-50/90 bg-white p-3 shadow-[0_8px_24px_rgba(67,56,202,0.05)] transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.iconBg} transition-transform group-hover:scale-105`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold text-[#1e1b4b] text-center leading-tight">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Notifikasi Mobile (Sesuai Referensi Gambar) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1e1b4b]">
              Notifikasi
            </h3>
            <Link
              href="/profil"
              className="text-xs font-bold text-[#4338ca] hover:underline"
            >
              Lihat semua
            </Link>
          </div>

          <div className="space-y-2.5">
            {visibleMobileNotifs.map((notif) => (
              <div
                key={notif.id}
                className="relative flex items-start gap-3 rounded-2xl border border-indigo-50/90 bg-white p-4 shadow-[0_8px_24px_rgba(67,56,202,0.05)]"
              >
                <span
                  className={`mt-0.5 h-10 w-1 shrink-0 rounded-full ${notif.accentColor}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 pr-5">
                  {notif.href ? (
                    <Link
                      href={notif.href}
                      className="block text-xs font-extrabold text-[#1e1b4b] hover:text-[#4338ca]"
                    >
                      {notif.title}
                    </Link>
                  ) : (
                    <p className="text-xs font-extrabold text-[#1e1b4b]">
                      {notif.title}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                    {notif.subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDismissedNotifIds((prev) => [...prev, notif.id])
                  }
                  aria-label="Tutup notifikasi"
                  className="absolute right-3 top-3 text-slate-300 hover:text-slate-500 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Banner Cepat Download App (Android & iOS) */}
        <Link
          href="/download-app"
          className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#4338ca] to-[#6366f1] p-4 text-white shadow-[0_10px_24px_rgba(67,56,202,0.22)] transition-transform active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-white">
                Download Aplikasi Mobile (Android &amp; iOS)
              </p>
              <p className="text-[11px] text-indigo-100">
                Akses simulasi CAT lebih cepat langsung dari layar utama HP
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-white" />
        </Link>
      </div>

      {/* =====================================================================
          TAMPILAN DESKTOP HEADER & STATISTIK (Hidden di Mobile)
          ===================================================================== */}
      <div className="hidden lg:block">
        <PageHeader
          title={`Selamat Datang, ${user.full_name}`}
          description="Pilih sesi ujian simulasi yang tersedia di bawah ini. Pastikan koneksi stabil sebelum menekan tombol Mulai Ujian."
          badge={
            <StatusBadge
              variant="featured"
              label={`Target: ${user.target_selection || "CPNS"}`}
            />
          }
          actions={
            <div className="flex flex-wrap gap-2.5">
              <Link href="/download-app">
                <Button
                  variant="outline"
                  leftIcon={<Smartphone className="h-4 w-4 text-[#0b49d0]" />}
                >
                  Download App (Android &amp; iOS)
                </Button>
              </Link>
              <Link href="/ujian">
                <Button
                  variant="outline"
                  leftIcon={<ClipboardList className="h-4 w-4" />}
                >
                  Semua Jadwal Ujian
                </Button>
              </Link>
              <Link href="/hasil">
                <Button
                  variant="primary"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                >
                  Riwayat &amp; Hasil ({userResults.length})
                </Button>
              </Link>
            </div>
          }
        />

        {/* Pesan dari Admin ketika Akun Peserta Dinonaktifkan */}
        {!user.is_active && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border-2 border-rose-200 bg-rose-50/90 p-4 sm:p-5 shadow-xs"
          >
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-rose-950">
                    Pesan dari Administrator — Akun Anda Dinonaktifkan
                  </h2>
                  {deactivationNotice?.updatedAt && (
                    <span className="text-[11px] font-medium text-rose-700">
                      {formatDateTimeID(deactivationNotice.updatedAt)}
                    </span>
                  )}
                </div>
                <div className="rounded-xl border border-rose-200/80 bg-white/90 p-3 text-xs sm:text-sm font-medium text-rose-900 leading-relaxed">
                  &ldquo;
                  {deactivationNotice?.reason ||
                    "Akun Anda saat ini dinonaktifkan sementara oleh Administrator."}
                  &rdquo;
                </div>
                <p className="text-xs text-rose-800">
                  Anda tidak dapat memulai sesi ujian baru selama akun berstatus
                  nonaktif, namun seluruh riwayat hasil ujian lama tetap tersimpan.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notifikasi Keanggotaan Kelompok */}
        {userGroups.length > 0 && (
          <div className="mb-6 rounded-2xl border border-[#0b49d0]/25 bg-[#eef4ff]/80 p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0b49d0] text-white">
                  <UsersRound className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-[#0b49d0]">
                    Anda Tergabung dalam Kelompok:{" "}
                    {userGroups.map((g) => g.name).join(", ")}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-700">
                    Akun Anda memiliki akses penuh ke jadwal sesi ujian khusus
                    untuk anggota kelompok ini.
                  </p>
                </div>
              </div>
              <Link
                href="/profil"
                className="shrink-0 text-xs font-bold text-[#0b49d0] hover:underline"
              >
                Lihat Profil &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Pengumuman Penting Admin (Bab 4.1 PRD) */}
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#ffc63d] bg-[#fff9e6] p-4 text-xs sm:text-sm text-[#151515]">
          <Megaphone className="h-5 w-5 shrink-0 text-[#0b49d0] mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">
              Informasi Pelaksanaan Simulasi CAT Prima RIB:
            </p>
            <p className="mt-0.5 text-neutral-700 leading-relaxed">
              Timer pengerjaan bersifat individual sejak Anda menekan tombol{" "}
              <strong>Mulai Ujian</strong>. Urutan soal telah diacak per blok
              subtes (TWK, TIU, TKP) dan jawaban Anda tersimpan otomatis di
              server.
            </p>
          </div>
        </div>

        {/* Ringkasan Statistik Peserta */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Ujian Siap Dimulai"
            value={readyCount}
            subtitle="Memenuhi syarat akses & jadwal"
            accent="blue"
            icon={<PlayCircle className="h-5 w-5" />}
          />
          <StatCard
            title="Sedang Berlangsung"
            value={ongoingCount}
            subtitle="Dapat dilanjutkan kembali"
            accent="yellow"
            icon={<Sparkles className="h-5 w-5" />}
          />
          <StatCard
            title="Jadwal Mendatang"
            value={upcomingCount}
            subtitle="Menunggu waktu pelaksanaan"
            accent="neutral"
            icon={<CalendarClock className="h-5 w-5" />}
          />
          <StatCard
            title="Ujian Selesai"
            value={userResults.length}
            subtitle="Tersimpan di riwayat hasil"
            accent="green"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
        </section>
      </div>

      {errorMsg && (
        <div className="my-4">
          <ToastNotification
            type="error"
            title="Tidak Dapat Memulai Ujian"
            description={errorMsg}
            onClose={() => setErrorMsg(null)}
          />
        </div>
      )}

      {/* Filter Kategori CPNS, Sekdin (+Filter Instansi), Polri */}
      <section
        id="daftar-sesi-ujian"
        className="mt-7 lg:mt-8 space-y-5 max-w-md mx-auto lg:max-w-none"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-neutral-200 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#151515]">
              Daftar Sesi Ujian Simulasi
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600">
              Filter berdasarkan kategori seleksi CPNS, Sekolah Kedinasan
              (Sekdin), dan Polri.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2.5">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "ALL", label: "Semua" },
                { id: "cat-cpns", label: "CPNS" },
                { id: "cat-sekdin", label: "Sekdin" },
                { id: "cat-polri", label: "Polri" },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  size="sm"
                  variant={categoryFilter === tab.id ? "primary" : "outline"}
                  onClick={() => setCategoryFilter(tab.id)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {categoryFilter === "cat-sekdin" && (
              <div className="w-44">
                <FormField id="sekdin-inst" label="Filter Instansi Sekdin">
                  <select
                    id="sekdin-inst"
                    value={sekdinInstFilter}
                    onChange={(e) => setSekdinInstFilter(e.target.value)}
                    className={inputBaseClasses}
                  >
                    <option value="ALL">Semua Instansi</option>
                    <option value="IPDN">IPDN</option>
                    <option value="PKN STAN">PKN STAN</option>
                    <option value="STIS">Politeknik STIS</option>
                    <option value="STMKG">STMKG</option>
                  </select>
                </FormField>
              </div>
            )}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState
            title="Belum Ada Jadwal Sesi Ujian"
            description="Saat ini belum ada sesi ujian simulasi yang dijadwalkan pada kategori ini. Silakan periksa kembali secara berkala."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map(({ exam, run, qCount, eligibility }) => (
              <ExamCard
                key={run.id}
                exam={exam}
                run={run}
                questionCount={qCount}
                eligibility={eligibility}
                onStartOrResume={handleStartExam}
                onViewDetail={() => router.push(`/ujian?run=${run.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Riwayat Singkat */}
      {userResults.length > 0 && (
        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-[#151515]">
              Hasil Ujian Terakhir Anda
            </h2>
            <Link
              href="/hasil"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#0b49d0] hover:underline"
            >
              <span>Lihat Semua Riwayat</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {userResults.slice(0, 2).map((res) => {
              const r = runs.find((rn) => rn.id === res.exam_run_id);
              return (
                <div
                  key={res.id}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 bg-[#fcfbf7] p-4"
                >
                  <div>
                    <p className="text-sm font-bold text-[#151515]">
                      {r?.name || "Sesi Simulasi CAT"}
                    </p>
                    <p className="text-xs text-neutral-600 tabular-nums mt-0.5">
                      Skor Total: <strong>{res.total_score}</strong>
                    </p>
                  </div>
                  <StatusBadge
                    variant={res.thresholds_met ? "completed" : "warning"}
                    label={
                      res.thresholds_met
                        ? "Lulus Passing Grade"
                        : "Belum Memenuhi PG"
                    }
                    size="sm"
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </AppShell>
  );
}
