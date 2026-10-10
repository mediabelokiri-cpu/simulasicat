"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PlayCircle,
  ShieldCheck,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  StatusBadge,
  Button,
  SearchInput,
  ToastNotification,
  EmptyState,
} from "@/components/ui";
import { ExamCard } from "@/components/dashboard/ExamCard";
import { getCurrentUserClient, syncProfilesFromSupabase } from "@/lib/auth";
import {
  getExams,
  getExamRuns,
  getExamSections,
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
  ProfileRow,
} from "@/types/database";
import { formatDuration } from "@/lib/utils";

function DaftarUjianInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRunId = searchParams.get("run");

  const [user, setUser] = useState<ProfileRow>(EMPTY_USER_FALLBACK);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [runs, setRuns] = useState<ExamRunRow[]>([]);
  const [sections, setSections] = useState<ExamSectionRow[]>([]);
  const [search, setSearch] = useState("");
  const [detailPair, setDetailPair] = useState<{
    exam: ExamRow;
    run: ExamRunRow;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const active = getCurrentUserClient();
    if (!active) {
      router.replace("/login");
      return;
    }
    setUser(active);

    const refreshFromLocal = () => {
      const exs = getExams();
      const rns = getExamRuns();
      setExams(exs);
      setRuns(rns);
      setSections(getExamSections());

      if (initialRunId) {
        const foundRun = rns.find((r) => r.id === initialRunId);
        const foundExam = exs.find((e) => e.id === foundRun?.exam_id);
        if (foundRun && foundExam) {
          setDetailPair({ exam: foundExam, run: foundRun });
        }
      }
    };

    refreshFromLocal();

    let isMounted = true;
    const syncRemote = async () => {
      await Promise.all([
        syncAdminStoreFromSupabase(),
        syncProfilesFromSupabase(),
      ]);
      if (!isMounted) return;
      const latestUser = getCurrentUserClient();
      if (latestUser) setUser(latestUser);
      refreshFromLocal();
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
  }, [initialRunId, router]);

  const items = runs
    .map((run) => {
      const exam = exams.find((e) => e.id === run.exam_id);
      if (!exam) return null;
      const exSecs = sections.filter((s) => s.exam_id === exam.id);
      const qCount =
        exSecs.length > 0
          ? exSecs.reduce((sum, s) => sum + s.question_count, 0)
          : 110;
      const eligibility = evaluateUserExamEligibility(user, exam, run);
      return { exam, run, qCount, eligibility };
    })
    .filter(Boolean) as {
    exam: ExamRow;
    run: ExamRunRow;
    qCount: number;
    eligibility: ReturnType<typeof evaluateUserExamEligibility>;
  }[];

  const filtered = items.filter(
    ({ exam, run }) =>
      run.name.toLowerCase().includes(search.toLowerCase()) ||
      exam.title.toLowerCase().includes(search.toLowerCase()) ||
      (exam.institution_label || "")
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  function handleStartExam(run: ExamRunRow) {
    setErrorMsg(null);
    const res = startOrResumeExamSession(user, run.id);
    if (!res.ok || !res.session) {
      setErrorMsg(res.error || "Tidak dapat memulai sesi ujian.");
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
        title="Daftar & Detail Ujian Simulasi"
        description="Periksa jadwal sesi pelaksanaan, rincian blok subtes, ambang batas kelulusan, dan aturan ruang ujian CAT."
        badge={
          <StatusBadge
            variant="ongoing"
            label={`${filtered.length} Sesi Tersedia`}
          />
        }
      />

      {errorMsg && (
        <div className="mb-6">
          <ToastNotification
            type="error"
            title="Persyaratan Akses Belum Terpenuhi"
            description={errorMsg}
            onClose={() => setErrorMsg(null)}
          />
        </div>
      )}

      <div className="mb-6 max-w-md">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cari nama sesi ujian atau instansi..."
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Belum Ada Jadwal Sesi Ujian"
          description="Belum ada sesi ujian yang dibuka oleh Administrator. Silakan kembali lagi sesuai jadwal bimbingan Anda."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ exam, run, qCount, eligibility }) => (
            <ExamCard
              key={run.id}
              exam={exam}
              run={run}
              questionCount={qCount}
              eligibility={eligibility}
              onStartOrResume={handleStartExam}
              onViewDetail={(ex, rn) => setDetailPair({ exam: ex, run: rn })}
            />
          ))}
        </div>
      )}

      {/* Modal Detail & Persiapan Mulai Ujian */}
      {detailPair && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="my-8 w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7 shadow-xl space-y-5">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#151515]">
                  {detailPair.run.name}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {detailPair.exam.title} • Durasi{" "}
                  {formatDuration(detailPair.exam.duration_minutes)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailPair(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Rincian Subtes & Passing Grade */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-[#151515]">
                Komposisi Subtes &amp; Ambang Batas (Passing Grade)
              </h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {(sections.filter((s) => s.exam_id === detailPair.exam.id)
                  .length > 0
                  ? sections
                      .filter((s) => s.exam_id === detailPair.exam.id)
                      .map((s) => s.scoring_config)
                  : SKD_CPNS_2024_PRESET.sections
                ).map((sc) => (
                  <div
                    key={sc.section_key}
                    className="rounded-xl border border-neutral-200 bg-[#fcfbf7] p-3 text-xs space-y-1"
                  >
                    <p className="font-bold text-[#0b49d0]">{sc.title}</p>
                    <p className="text-[#151515] font-semibold tabular-nums">
                      Jumlah: {sc.question_count} Soal (Maks {sc.max_score})
                    </p>
                    <p className="text-neutral-600 tabular-nums">
                      Ambang Batas: <strong>{sc.passing_grade}</strong>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ketentuan Pengerjaan Ruang CAT */}
            <div className="rounded-xl border border-[#0b49d0]/20 bg-[#eef4ff]/60 p-4 text-xs sm:text-sm space-y-2">
              <p className="font-bold text-[#0b49d0] flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                <span>Tata Tertib &amp; Mekanisme Ruang Ujian CAT:</span>
              </p>
              <ul className="space-y-1.5 text-[#151515]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Anda bebas melompat ke nomor soal mana pun dan menggunakan
                    penanda <strong>Ragu-ragu</strong> tanpa menghapus jawaban.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Urutan soal diacak di dalam setiap blok subtes dan terkunci
                    selama sesi berlangsung (tidak berubah saat refresh).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Timer mengikuti batas waktu server. Ketika waktu habis,
                    jawaban yang telah tersimpan akan dikirimkan secara otomatis.
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-neutral-100 pt-4">
              <Button variant="outline" onClick={() => setDetailPair(null)}>
                Tutup
              </Button>
              {(() => {
                const elig = evaluateUserExamEligibility(
                  user,
                  detailPair.exam,
                  detailPair.run
                );
                return (
                  <Button
                    variant="primary"
                    disabled={!elig.canStart}
                    onClick={() => handleStartExam(detailPair.run)}
                    leftIcon={<PlayCircle className="h-4 w-4" />}
                  >
                    {elig.canResume
                      ? "Lanjutkan Sesi Ujian"
                      : "Mulai Ujian Sekarang"}
                  </Button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function DaftarUjianPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm">Memuat daftar ujian...</div>}>
      <DaftarUjianInner />
    </Suspense>
  );
}
