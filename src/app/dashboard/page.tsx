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

  function handleStartExam(run: ExamRunRow) {
    setErrorMsg(null);
    const res = startOrResumeExamSession(user, run.id);
    if (!res.ok || !res.session) {
      setErrorMsg(res.error || "Gagal memulai sesi ujian.");
      return;
    }
    router.push(`/ujian/${res.session.id}`);
  }

  return (
    <AppShell
      role="user"
      userName={user.full_name}
      userSubtitle={`Peserta • ${user.target_selection || "CPNS"}`}
    >
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

      {errorMsg && (
        <div className="mb-6">
          <ToastNotification
            type="error"
            title="Tidak Dapat Memulai Ujian"
            description={errorMsg}
            onClose={() => setErrorMsg(null)}
          />
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

      {/* Filter Kategori CPNS, Sekdin (+Filter Instansi), Polri */}
      <section className="mt-8 space-y-5">
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
