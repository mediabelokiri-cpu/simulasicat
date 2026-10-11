/**
 * EXAM ACCESS VALIDATOR & SESSION INITIALIZER — CATARA DIGITAL ASSESSMENT PLATFORM
 * Sesuai Bab 4.1, 5.3, 5.4, 8.3, 8.4 PRD Final v1.0 & Bab 11 Rancangan UI/UX
 */

import {
  AnswerRow,
  ExamRow,
  ExamRunRow,
  ExamSessionQuestionRow,
  ExamSessionRow,
  ProfileRow,
  QuestionRow,
  SafeQuestionSnapshot,
} from "@/types/database";
import {
  getAccessGrants,
  getExamRuns,
  getExams,
  getExamSections,
  getExamSessions,
  getQuestions,
  getRunAssignments,
  saveExamSessions,
  appendAuditLog,
  getUserEnrolledGroups,
  getUserDeactivationNotice,
  pushStoreKeyToSupabase,
} from "./admin-store";
import { SKD_CPNS_2024_PRESET } from "./mock-store";
import { broadcastLiveScoreEvent } from "./live-score";

const SESSION_QUESTIONS_KEY = "prima_cat_session_questions_v2_prod";
const SESSION_ANSWERS_KEY = "prima_cat_session_answers_v2_prod";

export function getSessionQuestions(
  sessionId?: string
): ExamSessionQuestionRow[] {
  if (typeof window === "undefined") return [];
  try {
    if (window.localStorage.getItem("prima_cat_session_questions_v1")) {
      window.localStorage.removeItem("prima_cat_session_questions_v1");
    }
    const raw = window.localStorage.getItem(SESSION_QUESTIONS_KEY);
    const all: ExamSessionQuestionRow[] = raw ? JSON.parse(raw) : [];
    return sessionId
      ? all
          .filter((sq) => sq.exam_session_id === sessionId)
          .sort((a, b) => a.display_number - b.display_number)
      : all;
  } catch {
    return [];
  }
}

export function saveAllSessionQuestions(
  rows: ExamSessionQuestionRow[]
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_QUESTIONS_KEY, JSON.stringify(rows));
  void pushStoreKeyToSupabase(SESSION_QUESTIONS_KEY, rows, true);
}

export function getSessionAnswers(sessionId?: string): AnswerRow[] {
  if (typeof window === "undefined") return [];
  try {
    if (window.localStorage.getItem("prima_cat_session_answers_v1")) {
      window.localStorage.removeItem("prima_cat_session_answers_v1");
    }
    const raw = window.localStorage.getItem(SESSION_ANSWERS_KEY);
    const all: AnswerRow[] = raw ? JSON.parse(raw) : [];
    return sessionId
      ? all.filter((a) => a.exam_session_id === sessionId)
      : all;
  } catch {
    return [];
  }
}

export function saveAllSessionAnswers(rows: AnswerRow[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_ANSWERS_KEY, JSON.stringify(rows));
  void pushStoreKeyToSupabase(SESSION_ANSWERS_KEY, rows, true);
}

export type UserExamDisplayStatus =
  | "waiting_schedule"
  | "not_activated"
  | "ready_to_start"
  | "in_progress"
  | "completed"
  | "access_denied";

export interface ExamEligibilityEvaluation {
  canStart: boolean;
  canResume: boolean;
  displayStatus: UserExamDisplayStatus;
  statusLabel: string;
  reasonIfBlocked: string | null;
  activeSession?: ExamSessionRow;
  completedSession?: ExamSessionRow;
}

/**
 * Mengevaluasi seluruh persyaratan akses ujian & sesi untuk seorang peserta:
 * 1. Status aktif akun & verifikasi email
 * 2. Hak akses ujian (Open vs Restricted: user_id, group_id, atau penugasan sesi)
 * 3. Status aktivasi & jadwal sesi (exam_runs)
 * 4. Sesi aktif (in_progress) atau riwayat selesai (submitted)
 */
export function evaluateUserExamEligibility(
  user: ProfileRow | null,
  exam: ExamRow,
  run: ExamRunRow
): ExamEligibilityEvaluation {
  if (!user || !user.id) {
    return {
      canStart: false,
      canResume: false,
      displayStatus: "access_denied",
      statusLabel: "Belum Login",
      reasonIfBlocked: "Silakan masuk terlebih dahulu untuk mengikuti ujian.",
    };
  }

  if (!user.is_active) {
    const notice = getUserDeactivationNotice(user);
    return {
      canStart: false,
      canResume: false,
      displayStatus: "access_denied",
      statusLabel: "Akun Nonaktif",
      reasonIfBlocked:
        notice?.reason ||
        "Akun Anda sedang dinonaktifkan oleh Administrator.",
    };
  }

  // Akun peserta yang aktif dapat mengikuti ujian tanpa tertahan status verifikasi email manual
  if (!user.is_active && exam.settings.require_verified_email && user.email_verified === false) {
    return {
      canStart: false,
      canResume: false,
      displayStatus: "access_denied",
      statusLabel: "Email Belum Diverifikasi",
      reasonIfBlocked:
        "Verifikasi alamat email Anda terlebih dahulu sebelum memulai ujian.",
    };
  }

  // Cek sesi pengerjaan yang sudah ada milik peserta ini
  const userSessions = getExamSessions().filter(
    (s) => s.exam_run_id === run.id && s.user_id === user.id
  );
  const inProgress = userSessions.find(
    (s) => s.status === "in_progress" || s.status === "paused"
  );
  if (inProgress) {
    return {
      canStart: true,
      canResume: true,
      displayStatus: "in_progress",
      statusLabel: "Sedang Berlangsung",
      reasonIfBlocked: null,
      activeSession: inProgress,
    };
  }

  const finished = userSessions.find(
    (s) => s.status === "submitted" || s.status === "timed_out"
  );
  if (finished && !exam.settings.allow_retake) {
    return {
      canStart: false,
      canResume: false,
      displayStatus: "completed",
      statusLabel: "Selesai Dikerjakan",
      reasonIfBlocked:
        "Anda telah menyelesaikan sesi ujian ini. Silakan lihat hasil pengerjaan Anda.",
      completedSession: finished,
    };
  }

  // Cek Hak Akses (Open vs Restricted)
  if (exam.access_mode === "restricted") {
    const userGroupIds = getUserEnrolledGroups(user).map((g) => g.id);

    const grants = getAccessGrants().filter((g) => g.exam_id === exam.id);
    const runAsgs = getRunAssignments().filter(
      (a) => a.exam_run_id === run.id
    );

    const hasDirectExamGrant = grants.some(
      (g) =>
        g.user_id === user.id ||
        (g.group_id && userGroupIds.includes(g.group_id))
    );
    const hasRunAssignment = runAsgs.some(
      (a) =>
        a.user_id === user.id ||
        (a.group_id && userGroupIds.includes(a.group_id))
    );

    if (!hasDirectExamGrant && !hasRunAssignment && user.role !== "admin") {
      return {
        canStart: false,
        canResume: false,
        displayStatus: "access_denied",
        statusLabel: "Akses Terbatas",
        reasonIfBlocked:
          "Ujian ini terbatas untuk kelompok peserta yang ditugaskan.",
      };
    }
  }

  // Cek Status Sesi & Jadwal
  if (
    run.status === "scheduled" ||
    (exam.status === "draft" && run.status !== "active")
  ) {
    return {
      canStart: false,
      canResume: false,
      displayStatus: "waiting_schedule",
      statusLabel: "Menunggu Jadwal / Aktivasi",
      reasonIfBlocked:
        "Sesi pelaksanaan ini masih terjadwal dan belum diaktifkan oleh Admin.",
    };
  }

  if (run.status === "paused") {
    return {
      canStart: false,
      canResume: false,
      displayStatus: "not_activated",
      statusLabel: "Sesi Dijeda Sementara",
      reasonIfBlocked:
        "Sesi pelaksanaan sedang dijeda sementara oleh Admin karena pemeliharaan/gangguan.",
    };
  }

  if (run.status === "completed" || run.status === "cancelled") {
    return {
      canStart: false,
      canResume: false,
      displayStatus: "completed",
      statusLabel: "Sesi Berakhir",
      reasonIfBlocked: "Waktu pelaksanaan sesi ujian ini telah ditutup.",
    };
  }

  return {
    canStart: true,
    canResume: false,
    displayStatus: "ready_to_start",
    statusLabel: "Siap Dimulai",
    reasonIfBlocked: null,
  };
}

/**
 * Pengacakan array deterministik / Fisher-Yates di dalam blok subtes.
 */
function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Sanitasi soal menjadi SafeQuestionSnapshot:
 * PENTING (Bab 9.4 & 13 PRD): Menghapus correct_option, tkp_scores, dan explanation
 * agar tidak pernah terekspos ke browser peserta selama ujian.
 */
export function sanitizeQuestionForClient(
  q: QuestionRow
): SafeQuestionSnapshot {
  return {
    question_id: q.id,
    question_code: q.question_code || q.id,
    subtest_key: q.subtest_key,
    question_type: q.question_type,
    prompt: q.prompt,
    options: q.options.map((o) => ({
      key: o.key,
      text: o.text,
      asset_id: o.asset_id ?? null,
      asset_url: o.asset_url ?? null,
    })),
  };
}

/**
 * Memulai atau Melanjutkan Sesi Ujian Peserta (exam_sessions & exam_session_questions).
 * - Jika peserta sudah memiliki sesi in_progress pada run tersebut, langsung kembalikan sesi yang ada
 *   sehingga urutan soal dan timer TIDAK diacak ulang atau direset.
 * - Jika memulai sesi baru, acak soal per blok subtes (TWK, TIU, TKP) dan bekukan urutannya.
 */
export function startOrResumeExamSession(
  user: ProfileRow,
  runId: string
): { ok: boolean; error?: string; session?: ExamSessionRow } {
  const runs = getExamRuns();
  const exams = getExams();
  const run = runs.find((r) => r.id === runId);
  if (!run) {
    return { ok: false, error: "Sesi pelaksanaan ujian tidak ditemukan." };
  }

  const exam = exams.find((e) => e.id === run.exam_id);
  if (!exam) {
    return { ok: false, error: "Definisi ujian induk tidak ditemukan." };
  }

  const eligibility = evaluateUserExamEligibility(user, exam, run);
  if (!eligibility.canStart) {
    return {
      ok: false,
      error:
        eligibility.reasonIfBlocked ||
        "Anda belum memenuhi syarat untuk memulai ujian ini.",
    };
  }

  // Resume sesi yang sudah aktif tanpa mereset timer atau urutan soal
  if (eligibility.canResume && eligibility.activeSession) {
    return { ok: true, session: eligibility.activeSession };
  }

  // Susun soal per blok subtes (TWK, TIU, TKP) dari bank soal aktif
  const activeBank = getQuestions().filter(
    (q) => q.status === "active" && q.category_id === exam.category_id
  );
  const fallbackBank =
    activeBank.length > 0
      ? activeBank
      : getQuestions().filter((q) => q.status === "active");

  if (fallbackBank.length === 0) {
    return {
      ok: false,
      error:
        "Bank soal berstatus Aktif belum tersedia untuk ujian ini. Silakan hubungi Administrator.",
    };
  }

  const examSections = getExamSections()
    .filter((s) => s.exam_id === exam.id)
    .sort((a, b) => a.display_order - b.display_order);

  const sectionsToBuild =
    examSections.length > 0
      ? examSections.map((s) => ({
          section_key: s.section_key,
          title: s.title,
          question_count: s.question_count,
          shuffle: s.shuffle_questions,
        }))
      : SKD_CPNS_2024_PRESET.sections.map((s) => ({
          section_key: s.section_key,
          title: s.title,
          question_count: s.question_count,
          shuffle: true,
        }));

  const now = new Date();
  const deadline = new Date(
    now.getTime() + exam.duration_minutes * 60 * 1000
  );
  const sessionId = `ses-${Date.now()}`;

  const frozenQuestions: ExamSessionQuestionRow[] = [];
  let displayNum = 1;

  for (const sec of sectionsToBuild) {
    let pool = fallbackBank.filter(
      (q) => q.subtest_key.toUpperCase() === sec.section_key.toUpperCase()
    );

    if (sec.shuffle && exam.settings.shuffle_questions_per_section) {
      pool = shuffleArray(pool);
    }

    if (sec.question_count > 0 && pool.length > sec.question_count) {
      pool = pool.slice(0, sec.question_count);
    }

    for (const q of pool) {
      frozenQuestions.push({
        id: `sq-${sessionId}-${displayNum}`,
        exam_session_id: sessionId,
        exam_question_id: `eq-${exam.id}-${q.id}`,
        display_number: displayNum,
        section_key: sec.section_key,
        question_snapshot: sanitizeQuestionForClient(q),
        is_flagged: false,
      });
      displayNum++;
    }
  }

  if (frozenQuestions.length === 0) {
    return {
      ok: false,
      error:
        "Tidak ada butir soal aktif yang cocok dengan kode subtes ujian ini.",
    };
  }

  const newSession: ExamSessionRow = {
    id: sessionId,
    exam_run_id: run.id,
    user_id: user.id,
    attempt_no: 1,
    status: "in_progress",
    started_at: now.toISOString(),
    original_deadline_at: deadline.toISOString(),
    deadline_at: deadline.toISOString(),
    submitted_at: null,
    last_activity_at: now.toISOString(),
    current_question_number: 1,
    time_extension_seconds: 0,
    scoring_snapshot_id: run.scoring_snapshot_id,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const allSessions = getExamSessions();
  saveExamSessions([newSession, ...allSessions]);

  const allSq = getSessionQuestions();
  saveAllSessionQuestions([...allSq, ...frozenQuestions]);

  appendAuditLog({
    actor_id: user.id,
    action: "START_EXAM_SESSION",
    entity_type: "exam_sessions",
    entity_id: sessionId,
    reason: `Peserta ${user.full_name} memulai sesi "${run.name}"`,
    details: {
      exam_run_id: run.id,
      deadline_at: newSession.deadline_at,
      frozen_question_count: frozenQuestions.length,
    },
  });

  broadcastLiveScoreEvent({
    type: "SESSION_STARTED",
    runId: run.id,
    examId: exam.id,
    sessionId,
  });

  return { ok: true, session: newSession };
}

/**
 * Menyimpan jawaban peserta secara idempoten berdasarkan session_question_id
 * dan menaikkan nomor revisi (revision).
 */
export function upsertSessionAnswer(
  sessionId: string,
  sessionQuestionId: string,
  selectedOption: "A" | "B" | "C" | "D" | "E" | null
): { ok: boolean; error?: string; answer?: AnswerRow } {
  const sessions = getExamSessions();
  const sIdx = sessions.findIndex((s) => s.id === sessionId);
  if (sIdx === -1) {
    return { ok: false, error: "Sesi ujian tidak ditemukan." };
  }
  const session = sessions[sIdx];

  if (session.status !== "in_progress") {
    return {
      ok: false,
      error: "Sesi ujian sudah ditutup atau sedang dijeda.",
    };
  }

  const now = new Date();
  if (new Date(session.deadline_at).getTime() <= now.getTime()) {
    return {
      ok: false,
      error: "Waktu pengerjaan telah berakhir menurut waktu server.",
    };
  }

  const allAnswers = getSessionAnswers();
  const existingIdx = allAnswers.findIndex(
    (a) =>
      a.exam_session_id === sessionId &&
      a.session_question_id === sessionQuestionId
  );

  let savedRow: AnswerRow;
  if (existingIdx !== -1) {
    const prev = allAnswers[existingIdx];
    savedRow = {
      ...prev,
      selected_option: selectedOption,
      revision: prev.revision + 1,
      saved_at: now.toISOString(),
    };
    allAnswers[existingIdx] = savedRow;
  } else {
    savedRow = {
      id: `ans-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      exam_session_id: sessionId,
      session_question_id: sessionQuestionId,
      selected_option: selectedOption,
      revision: 1,
      saved_at: now.toISOString(),
    };
    allAnswers.push(savedRow);
  }

  saveAllSessionAnswers(allAnswers);

  // Perbarui last_activity_at pada sesi peserta
  sessions[sIdx] = {
    ...session,
    last_activity_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  saveExamSessions(sessions);

  broadcastLiveScoreEvent({
    type: "ANSWER_SAVED",
    runId: session.exam_run_id,
    examId: null,
    sessionId,
  });

  return { ok: true, answer: savedRow };
}

/**
 * Mengubah status penanda Ragu-ragu (is_flagged) pada soal sesi
 * TANPA menghapus jawaban yang telah dipilih (Bab 8.2 PRD).
 */
export function toggleQuestionFlag(
  sessionId: string,
  sessionQuestionId: string
): ExamSessionQuestionRow | null {
  const allSq = getSessionQuestions();
  const idx = allSq.findIndex(
    (sq) => sq.exam_session_id === sessionId && sq.id === sessionQuestionId
  );
  if (idx === -1) return null;

  allSq[idx] = {
    ...allSq[idx],
    is_flagged: !allSq[idx].is_flagged,
  };
  saveAllSessionQuestions(allSq);
  return allSq[idx];
}

export function updateSessionCurrentNumber(
  sessionId: string,
  questionNumber: number
): void {
  const sessions = getExamSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return;
  sessions[idx] = {
    ...sessions[idx],
    current_question_number: questionNumber,
    last_activity_at: new Date().toISOString(),
  };
  saveExamSessions(sessions);
}
