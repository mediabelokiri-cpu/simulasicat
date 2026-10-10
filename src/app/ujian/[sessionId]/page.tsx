"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  ShieldCheck,
  AlertTriangle,
  Keyboard,
} from "lucide-react";
import { getCurrentUserClient } from "@/lib/auth";
import {
  getExams,
  getExamRuns,
  getExamSessions,
  getResults,
} from "@/lib/admin-store";
import {
  getSessionAnswers,
  getSessionQuestions,
  toggleQuestionFlag,
  updateSessionCurrentNumber,
  upsertSessionAnswer,
} from "@/lib/exam";
import { finalizeAndScoreExamSession } from "@/lib/scoring";
import {
  ExamRow,
  ExamRunRow,
  ExamSessionQuestionRow,
  ExamSessionRow,
  OptionKey,
  ProfileRow,
} from "@/types/database";
import { ExamTimer } from "@/components/cat/ExamTimer";
import { SaveStatus, SaveState } from "@/components/cat/SaveStatus";
import { ExamProgress } from "@/components/cat/ExamProgress";
import { QuestionCard } from "@/components/cat/QuestionCard";
import { QuestionNavigator } from "@/components/cat/QuestionNavigator";
import { SubmitConfirmation } from "@/components/cat/SubmitConfirmation";
import { LoadingState, ErrorState } from "@/components/ui";

export default function CatExamRoomPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId || "";
  const router = useRouter();

  const [user, setUser] = useState<ProfileRow | null>(null);
  const [session, setSession] = useState<ExamSessionRow | null>(null);
  const [run, setRun] = useState<ExamRunRow | null>(null);
  const [exam, setExam] = useState<ExamRow | null>(null);
  const [questions, setQuestions] = useState<ExamSessionQuestionRow[]>([]);
  const [answersMap, setAnswersMap] = useState<Record<string, OptionKey | null>>(
    {}
  );

  const [currentNumber, setCurrentNumber] = useState<number>(1);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [pendingQueue, setPendingQueue] = useState<
    Array<{ sqId: string; option: OptionKey | null }>
  >([]);

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [submitModalOpen, setSubmitModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadExamRoomData = useCallback(() => {
    const activeUser = getCurrentUserClient();
    if (!activeUser) {
      router.replace("/login");
      return;
    }
    setUser(activeUser);

    const allSessions = getExamSessions();
    const foundSession = allSessions.find((s) => s.id === sessionId);

    if (!foundSession) {
      setErrorMsg("Sesi ujian tidak ditemukan di server.");
      setLoading(false);
      return;
    }

    // Jika sesi sudah selesai, arahkan ke halaman hasil
    if (
      foundSession.status === "submitted" ||
      foundSession.status === "timed_out"
    ) {
      const existingRes = getResults().find(
        (r) => r.exam_session_id === foundSession.id
      );
      if (!existingRes) {
        finalizeAndScoreExamSession(foundSession.id, "manual_submit");
      }
      router.replace(`/hasil?sessionId=${foundSession.id}`);
      return;
    }

    const allRuns = getExamRuns();
    const foundRun = allRuns.find((r) => r.id === foundSession.exam_run_id);
    const allExams = getExams();
    const foundExam = allExams.find((e) => e.id === foundRun?.exam_id);

    const sqList = getSessionQuestions(foundSession.id);
    const ansList = getSessionAnswers(foundSession.id);

    const map: Record<string, OptionKey | null> = {};
    let latestSaved: string | null = foundSession.last_activity_at;
    ansList.forEach((a) => {
      map[a.session_question_id] = a.selected_option;
      if (!latestSaved || a.saved_at > latestSaved) {
        latestSaved = a.saved_at;
      }
    });

    setSession(foundSession);
    setRun(foundRun || null);
    setExam(foundExam || null);
    setQuestions(sqList);
    setAnswersMap(map);
    setCurrentNumber(foundSession.current_question_number || 1);
    setLastSavedAt(latestSaved);
    setLoading(false);
  }, [sessionId, router]);

  useEffect(() => {
    loadExamRoomData();
  }, [loadExamRoomData]);

  // Sinkronisasi antrean lokal saat kembali online (Bab 8.5 PRD)
  const flushOfflineQueue = useCallback(() => {
    if (!session || pendingQueue.length === 0) {
      setSaveState("saved");
      return;
    }
    setSaveState("saving");
    let latestTime = lastSavedAt;
    for (const item of pendingQueue) {
      const res = upsertSessionAnswer(session.id, item.sqId, item.option);
      if (res.ok && res.answer) {
        latestTime = res.answer.saved_at;
      }
    }
    setPendingQueue([]);
    setLastSavedAt(latestTime);
    setSaveState("saved");
  }, [session, pendingQueue, lastSavedAt]);

  // Listener koneksi jaringan nyata browser (online / offline)
  useEffect(() => {
    function handleOffline() {
      setSaveState("offline");
    }
    function handleOnline() {
      flushOfflineQueue();
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [flushOfflineQueue]);

  const activeQuestion =
    questions.find((q) => q.display_number === currentNumber) || questions[0];

  const handleSelectOption = useCallback(
    (option: OptionKey | null) => {
      if (!session || !activeQuestion || isSubmitting) return;

      // Optimistic UI update di layar peserta
      setAnswersMap((prev) => ({
        ...prev,
        [activeQuestion.id]: option,
      }));

      // Jika koneksi internet perangkat sedang terputus
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSaveState("offline");
        setPendingQueue((prev) => [
          ...prev.filter((p) => p.sqId !== activeQuestion.id),
          { sqId: activeQuestion.id, option },
        ]);
        return;
      }

      // Simpan ke server secara idempoten
      setSaveState("saving");
      setTimeout(() => {
        const res = upsertSessionAnswer(session.id, activeQuestion.id, option);
        if (res.ok && res.answer) {
          setSaveState("saved");
          setLastSavedAt(res.answer.saved_at);
        } else {
          setSaveState("error");
        }
      }, 120);
    },
    [session, activeQuestion, isSubmitting]
  );

  const handleToggleFlag = useCallback(() => {
    if (!session || !activeQuestion || isSubmitting) return;
    const updatedSq = toggleQuestionFlag(session.id, activeQuestion.id);
    if (updatedSq) {
      setQuestions((prev) =>
        prev.map((q) => (q.id === updatedSq.id ? updatedSq : q))
      );
    }
  }, [session, activeQuestion, isSubmitting]);

  const handleNavigateQuestion = useCallback(
    (targetNumber: number) => {
      if (!session || targetNumber < 1 || targetNumber > questions.length)
        return;
      setCurrentNumber(targetNumber);
      updateSessionCurrentNumber(session.id, targetNumber);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [session, questions.length]
  );

  // Navigasi Keyboard Desktop (Bab 12.6 UI/UX: TIDAK BOLEH memicu pengiriman ujian)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (submitModalOpen || mobileDrawerOpen || isSubmitting) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const key = e.key.toUpperCase();
      if (["A", "B", "C", "D", "E"].includes(key)) {
        e.preventDefault();
        handleSelectOption(key as OptionKey);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentNumber > 1) handleNavigateQuestion(currentNumber - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (currentNumber < questions.length)
          handleNavigateQuestion(currentNumber + 1);
      } else if (key === "R") {
        e.preventDefault();
        handleToggleFlag();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    submitModalOpen,
    mobileDrawerOpen,
    isSubmitting,
    currentNumber,
    questions.length,
    handleSelectOption,
    handleNavigateQuestion,
    handleToggleFlag,
  ]);

  const handleFinalSubmit = useCallback(
    (trigger: "manual_submit" | "timeout_auto_submit") => {
      if (!session || isSubmitting) return;
      setIsSubmitting(true);

      // Flush antrean jawaban lokal terlebih dahulu jika ada
      for (const item of pendingQueue) {
        upsertSessionAnswer(session.id, item.sqId, item.option);
      }

      const scored = finalizeAndScoreExamSession(session.id, trigger);
      if (scored.ok) {
        router.push(`/hasil?sessionId=${session.id}`);
      } else {
        setIsSubmitting(false);
        setErrorMsg(scored.error || "Gagal menyimpan hasil akhir ujian.");
      }
    },
    [session, isSubmitting, pendingQueue, router]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfbf7] flex items-center justify-center p-6">
        <LoadingState message="Menyiapkan Ruang Ujian CAT & menyinkronkan waktu server..." />
      </div>
    );
  }

  if (errorMsg || !session || !activeQuestion) {
    return (
      <div className="min-h-screen bg-[#fcfbf7] flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <ErrorState
            title="Tidak Dapat Membuka Ruang Ujian"
            description={
              errorMsg || "Sesi ujian tidak ditemukan atau soal belum tersedia."
            }
            onRetry={() => router.push("/dashboard")}
          />
        </div>
      </div>
    );
  }

  const answeredCount = questions.filter((q) =>
    Boolean(answersMap[q.id])
  ).length;
  const flaggedCount = questions.filter((q) => q.is_flagged).length;

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex flex-col">
      {/* Header Sticky Mode Fokus Ruang Ujian CAT (Background Biru #0b49d0) */}
      <header className="sticky top-0 z-30 border-b border-white/15 bg-[#0b49d0] text-white shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Identitas Ujian & Peserta */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo1.png"
              alt="Logo Prima RIB"
              className="h-10 w-10 shrink-0 rounded-xl border border-white/25 object-contain shadow-xs"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm sm:text-base font-extrabold text-white">
                  {exam?.title || "Simulasi SKD CPNS"}
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-bold text-[#ffc63d] border border-white/20">
                  <ShieldCheck className="h-3 w-3" />
                  Sesi Terkunci Server
                </span>
              </div>
              <p className="truncate text-xs text-white/80">
                {run?.name || "Sesi Ujian"} • Peserta:{" "}
                <span className="font-bold text-white">
                  {user?.full_name || "Peserta"}
                </span>
              </p>
            </div>
          </div>

          {/* Kanan: Status Simpan Jujur + Timer Server + Tombol Selesai */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <SaveStatus
              state={saveState}
              lastSavedAt={lastSavedAt}
              pendingCount={pendingQueue.length}
              onRetry={flushOfflineQueue}
            />

            <ExamTimer
              deadlineAt={session.deadline_at}
              isPaused={session.status === "paused" || run?.status === "paused"}
              onExpire={() => handleFinalSubmit("timeout_auto_submit")}
            />

            <button
              type="button"
              onClick={() => setSubmitModalOpen(true)}
              disabled={isSubmitting}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#ffc63d] px-3.5 py-2 text-xs sm:text-sm font-extrabold text-[#151515] shadow-xs hover:bg-[#f2b829] transition-colors cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Selesai & Kirim</span>
            </button>
          </div>
        </div>

        {/* Peringatan Jika Sesi Dijeda Admin */}
        {(session.status === "paused" || run?.status === "paused") && (
          <div className="bg-[#fff9e6] border-t border-[#ffc63d] px-4 py-2 text-center text-xs font-bold text-[#151515] flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <span>
              Sesi ujian sedang dijeda sementara oleh Admin untuk pemulihan
              gangguan. Waktu batas akhir Anda akan disesuaikan secara otomatis.
            </span>
          </div>
        )}
      </header>

      {/* Konten Utama Ruang Ujian */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 space-y-4">
        {/* 1. Di Atas Soal: Progress Soal yang Sudah Dikerjakan */}
        <ExamProgress
          answeredCount={answeredCount}
          totalCount={questions.length}
          flaggedCount={flaggedCount}
        />

        {/* 2. Kartu Soal Utama & Pilihan Jawaban A-E */}
        <QuestionCard
          sessionQuestion={activeQuestion}
          totalQuestions={questions.length}
          selectedOption={answersMap[activeQuestion.id] ?? null}
          disabled={
            isSubmitting ||
            session.status === "paused" ||
            run?.status === "paused"
          }
          onSelectOption={handleSelectOption}
          onToggleFlag={handleToggleFlag}
        />

        {/* 3. Bar Navigasi Soal (Sebelumnya | Ragu-ragu | Berikutnya) */}
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-white p-3 sm:p-4 shadow-xs">
          <button
            type="button"
            onClick={() => handleNavigateQuestion(currentNumber - 1)}
            disabled={currentNumber <= 1}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-bold text-[#151515] hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span>Sebelumnya</span>
          </button>

          <button
            type="button"
            onClick={handleToggleFlag}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeQuestion.is_flagged
                ? "border-[#d89c14] bg-[#ffc63d] text-[#151515]"
                : "border-neutral-300 bg-[#fcfbf7] text-[#151515] hover:border-[#ffc63d]"
            }`}
          >
            <Flag className="h-4 w-4 shrink-0" />
            <span>Ragu-ragu</span>
          </button>

          {currentNumber < questions.length ? (
            <button
              type="button"
              onClick={() => handleNavigateQuestion(currentNumber + 1)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#0b49d0] px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#093bb0] transition-colors cursor-pointer"
            >
              <span>Berikutnya</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSubmitModalOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <Send className="h-4 w-4 shrink-0" />
              <span>Kirim Ujian</span>
            </button>
          )}
        </div>

        {/* 4. Di Bawah Soal: Kotak-kotak Nomor Soal */}
        <QuestionNavigator
          questions={questions}
          currentNumber={currentNumber}
          answersMap={answersMap}
          onSelectNumber={handleNavigateQuestion}
          mobileDrawerOpen={mobileDrawerOpen}
          onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
        />

        {/* 5. Panel Bantuan Pintasan Keyboard */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white/80 px-4 py-2.5 text-xs text-neutral-600">
          <div className="hidden sm:flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-[#0b49d0]" />
            <span>
              Pintasan Keyboard: Tekan{" "}
              <kbd className="rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] font-bold">
                A–E
              </kbd>{" "}
              pilih jawaban,{" "}
              <kbd className="rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] font-bold">
                ← / →
              </kbd>{" "}
              pindah nomor,{" "}
              <kbd className="rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] font-bold">
                R
              </kbd>{" "}
              ragu-ragu.
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Link
              href="/dashboard"
              className="text-[11px] font-semibold text-[#0b49d0] hover:underline"
            >
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </main>

      {/* Dialog Konfirmasi Selesai & Kirim Ujian */}
      <SubmitConfirmation
        open={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onConfirmSubmit={() => handleFinalSubmit("manual_submit")}
        totalQuestions={questions.length}
        answeredCount={answeredCount}
        flaggedCount={flaggedCount}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
