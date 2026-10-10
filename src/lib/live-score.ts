/**
 * LIVE SCORE REAL-TIME ENGINE — SIMULASI CAT PRIMA RIB
 *
 * Mengimplementasikan:
 * 1. Perhitungan skor sementara (provisional) dan skor final berbasis server/snapshot
 *    untuk CPNS (TWK, TIU, TKP bobot 1-5), Sekdin, dan Polri.
 * 2. Evaluasi Passing Grade per subtes & total (Memenuhi / Belum Memenuhi / Belum Dikonfigurasi).
 * 3. Peringkat sementara & final dengan tie-breaker deterministik dalam 1 sesi/ujian (tanpa mencampur sesi).
 * 4. Kontrol publikasi Live Score Homepage (Default: OFF, audiens, masking identitas, sanitasi penuh).
 * 5. Integrasi Supabase Realtime Broadcast (channel terpisah Admin vs Publik) + Cross-tab sync + Auto-resync.
 */

import {
  AnswerRow,
  ExamRow,
  ExamRunRow,
  ExamScoringConfig,
  ExamSessionQuestionRow,
  ExamSessionRow,
  OptionKey,
  ProfileRow,
  QuestionRow,
  ResultRow,
  SectionScoreResult,
} from "@/types/database";
import {
  appendAuditLog,
  getAccessGrants,
  getExamRuns,
  getExams,
  getExamSections,
  getExamSessions,
  getGroupMembers,
  getIncidents,
  getQuestions,
  getResults,
  getRunAssignments,
  getScoringSnapshots,
  pushStoreKeyToSupabase,
} from "./admin-store";
import { getStoredProfiles } from "./auth";
import { getSessionAnswers, getSessionQuestions } from "./exam";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "./supabase/client";

export const LIVE_SCORE_SETTINGS_KEY = "prima_cat_live_score_settings_v2_prod";
export const LIVE_SCORE_SUBMITTING_MAP_KEY =
  "prima_cat_live_score_submitting_v2_prod";
export const LIVE_SCORE_ADMIN_CHANNEL = "live-score:admin";
export const LIVE_SCORE_PUBLIC_CHANNEL_PREFIX = "live-score:public:";

export type LiveScoreExamStatus =
  | "not_started"
  | "in_progress"
  | "submitting"
  | "submitted"
  | "timed_out"
  | "sync_issue";

export type PassingGradeEvaluationStatus =
  | "passed"
  | "failed"
  | "unconfigured";

export type LiveScoreAudienceMode = "all" | "authenticated";
export type LiveScoreIdentityMode = "masked_code" | "full_name";

export interface LiveScorePublishedColumns {
  showSubtestScores: boolean;
  showTotalScore: boolean;
  showPassingGrade: boolean;
  showExamStatus: boolean;
  showProgress: boolean;
}

export interface LiveScorePublicationSettings {
  homepageEnabled: boolean; // Default: OFF (false)
  publishedExamId: string | null;
  publishedRunId: string | null;
  allowedAudience: LiveScoreAudienceMode;
  publicIdentityMode: LiveScoreIdentityMode; // Default: "masked_code"
  publishedColumns: LiveScorePublishedColumns;
  sectionTitle: string;
  sectionSubtitle: string;
  maxRows: number;
  updatedBy: string | null;
  updatedAt: string;
}

export const DEFAULT_LIVE_SCORE_SETTINGS: LiveScorePublicationSettings = {
  homepageEnabled: false,
  publishedExamId: null,
  publishedRunId: null,
  allowedAudience: "all",
  publicIdentityMode: "masked_code",
  publishedColumns: {
    showSubtestScores: true,
    showTotalScore: true,
    showPassingGrade: true,
    showExamStatus: true,
    showProgress: true,
  },
  sectionTitle: "Live Score Real-Time Simulasi CAT",
  sectionSubtitle:
    "Pantauan skor dan peringkat peserta secara langsung dari server penilaian resmi Prima RIB.",
  maxRows: 25,
  updatedBy: null,
  updatedAt: "2026-10-10T00:00:00.000Z",
};

/**
 * Aturan Tie-Breaker Resmi yang Terdokumentasi & Deterministik:
 * Urutan event Realtime yang tiba tidak akan mengubah peringkat karena komparator murni berbasis state skor.
 */
export const LIVE_SCORE_TIE_BREAKER_DOC =
  "1) Status Pengerjaan Aktif/Selesai → 2) Pemenuhan Seluruh Passing Grade (Memenuhi di atas Belum Memenuhi) → 3) Total Skor Tertinggi → 4) Skor TKP Tertinggi → 5) Skor TIU Tertinggi → 6) Skor TWK Tertinggi → 7) Waktu Selesai / Pembaruan Terawal.";

/**
 * DTO Lengkap untuk Tabel Live Score Admin (12 Kolom Utama)
 */
export interface AdminLiveScoreRow {
  rank: number;
  sessionId: string;
  userId: string;
  participantCode: string;
  fullName: string;
  maskedName: string;
  institution: string | null;
  targetSelection: string | null;
  examId: string;
  examTitle: string;
  runId: string;
  runName: string;
  categorySlug: string;
  examStatus: LiveScoreExamStatus;
  examStatusLabel: string;
  scoreType: "provisional" | "final";
  twkScore: number;
  twkPassingGrade: number;
  twkPassed: boolean;
  tiuScore: number;
  tiuPassingGrade: number;
  tiuPassed: boolean;
  tkpScore: number;
  tkpPassingGrade: number;
  tkpPassed: boolean;
  sectionScores: SectionScoreResult[];
  totalScore: number;
  totalMaxScore: number;
  totalPassingGrade: number | null;
  passingGradeConfigured: boolean;
  passingGradeStatus: PassingGradeEvaluationStatus;
  passingGradeLabel: string;
  answeredCount: number;
  totalQuestions: number;
  progressPercent: number;
  startedAt: string | null;
  deadlineAt: string | null;
  submittedAt: string | null;
  lastUpdatedAt: string;
  hasSyncIssue: boolean;
  syncIssueNote: string | null;
}

/**
 * DTO Terbatas & Tersanitasi untuk Live Score Publik (Homepage)
 * DILARANG memuat email, phone, userId, correct_option, tkp_scores, atau jawaban mentah peserta.
 */
export interface PublicLiveScoreRow {
  rank: number;
  participantCode: string;
  displayIdentity: string;
  examStatus?: LiveScoreExamStatus;
  examStatusLabel?: string;
  scoreType: "provisional" | "final";
  twkScore?: number;
  tiuScore?: number;
  tkpScore?: number;
  sectionScores?: Array<{
    section_key: string;
    title: string;
    score: number;
    passing_grade: number;
    passed: boolean;
  }>;
  totalScore?: number;
  passingGradeConfigured: boolean;
  passingGradeStatus?: PassingGradeEvaluationStatus;
  passingGradeLabel?: string;
  answeredCount?: number;
  totalQuestions?: number;
  progressPercent?: number;
  lastUpdatedAt: string;
}

export interface RunLiveScoreBoardResult {
  exam: ExamRow | null;
  run: ExamRunRow | null;
  scoringConfig: ExamScoringConfig | null;
  passingGradeConfigured: boolean;
  rows: AdminLiveScoreRow[];
  summary: {
    totalParticipants: number;
    notStartedCount: number;
    inProgressCount: number;
    completedCount: number;
    timedOutCount: number;
    syncIssueCount: number;
    passedCount: number;
    failedCount: number;
  };
  generatedAt: string;
}

export interface LiveScoreRealtimeEvent {
  eventId: string;
  type:
    | "ANSWER_SAVED"
    | "SESSION_STARTED"
    | "SESSION_SUBMITTING"
    | "SESSION_FINISHED"
    | "SETTINGS_UPDATED"
    | "MANUAL_RESYNC";
  runId: string | null;
  examId: string | null;
  sessionId?: string;
  timestamp: string;
}

/**
 * Membuat kode peserta dan nama samaran yang konsisten tanpa membocorkan PII.
 * Contoh: "Rizky Pratama" -> Kode "PST-4821", Masked "PST-4821 • R*** P***"
 */
export function buildParticipantCode(
  userId: string,
  sessionId?: string
): string {
  const seed = `${userId || "anon"}:${sessionId || "ses"}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const digits = String((hash % 9000) + 1000);
  return `PST-${digits}`;
}

export function maskParticipantIdentity(
  fullName: string,
  userId: string,
  sessionId: string | undefined,
  mode: LiveScoreIdentityMode
): { participantCode: string; maskedName: string; displayIdentity: string } {
  const participantCode = buildParticipantCode(userId, sessionId);
  const clean = (fullName || "Peserta").trim();
  const parts = clean.split(/\s+/).filter(Boolean);

  const maskedWords = parts.map((word) => {
    const firstChar = word.charAt(0).toUpperCase();
    return `${firstChar}***`;
  });

  const maskedOnly =
    maskedWords.length > 0 ? maskedWords.join(" ") : "P***";
  const maskedName = `${participantCode} • ${maskedOnly}`;

  const displayIdentity =
    mode === "full_name" ? `${clean} (${participantCode})` : maskedName;

  return {
    participantCode,
    maskedName,
    displayIdentity,
  };
}

/**
 * Membaca pengaturan publikasi Live Score dari penyimpanan lokal (dan sinkronisasi server).
 */
export function getLiveScoreSettings(): LiveScorePublicationSettings {
  if (typeof window === "undefined") {
    return getServerCachedLiveScoreSettings();
  }
  try {
    const raw = window.localStorage.getItem(LIVE_SCORE_SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_LIVE_SCORE_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<LiveScorePublicationSettings>;
    return normalizeLiveScoreSettings(parsed);
  } catch {
    return DEFAULT_LIVE_SCORE_SETTINGS;
  }
}

export function normalizeLiveScoreSettings(
  input?: Partial<LiveScorePublicationSettings> | null
): LiveScorePublicationSettings {
  if (!input) return { ...DEFAULT_LIVE_SCORE_SETTINGS };
  return {
    ...DEFAULT_LIVE_SCORE_SETTINGS,
    ...input,
    homepageEnabled: Boolean(input.homepageEnabled ?? false),
    publishedExamId: input.publishedExamId || null,
    publishedRunId: input.publishedRunId || null,
    allowedAudience:
      input.allowedAudience === "authenticated" ? "authenticated" : "all",
    publicIdentityMode:
      input.publicIdentityMode === "full_name" ? "full_name" : "masked_code",
    publishedColumns: {
      ...DEFAULT_LIVE_SCORE_SETTINGS.publishedColumns,
      ...(input.publishedColumns || {}),
    },
    maxRows:
      typeof input.maxRows === "number" && input.maxRows >= 5
        ? Math.min(200, input.maxRows)
        : DEFAULT_LIVE_SCORE_SETTINGS.maxRows,
    updatedAt: input.updatedAt || new Date().toISOString(),
  };
}

/**
 * Menyimpan perubahan pengaturan publikasi Live Score oleh Admin,
 * mencatat ke exam_audit_logs, menyinkronkan ke API server & Supabase,
 * serta menyiarkan event Realtime agar Homepage langsung bereaksi tanpa deploy ulang.
 */
export function saveLiveScoreSettings(
  nextSettings: Partial<LiveScorePublicationSettings>,
  actorId: string = "usr-admin-01",
  reason: string = "Pembaruan pengaturan publikasi Live Score Homepage"
): LiveScorePublicationSettings {
  const previous = getLiveScoreSettings();
  const merged = normalizeLiveScoreSettings({
    ...previous,
    ...nextSettings,
    updatedBy: actorId,
    updatedAt: new Date().toISOString(),
  });

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      LIVE_SCORE_SETTINGS_KEY,
      JSON.stringify(merged)
    );
    void pushStoreKeyToSupabase(LIVE_SCORE_SETTINGS_KEY, merged, true);
  }

  setServerCachedLiveScoreSettings(merged);

  // Catat perubahan ke exam_audit_logs sesuai spesifikasi Keamanan & Audit
  appendAuditLog({
    actor_id: actorId,
    action: merged.homepageEnabled
      ? "ENABLE_HOMEPAGE_LIVE_SCORE"
      : "UPDATE_HOMEPAGE_LIVE_SCORE_SETTINGS",
    entity_type: "live_score_settings",
    entity_id: merged.publishedRunId || merged.publishedExamId || "global",
    reason,
    details: {
      previous_settings: {
        homepageEnabled: previous.homepageEnabled,
        publishedExamId: previous.publishedExamId,
        publishedRunId: previous.publishedRunId,
        allowedAudience: previous.allowedAudience,
        publicIdentityMode: previous.publicIdentityMode,
        publishedColumns: previous.publishedColumns,
      },
      new_settings: {
        homepageEnabled: merged.homepageEnabled,
        publishedExamId: merged.publishedExamId,
        publishedRunId: merged.publishedRunId,
        allowedAudience: merged.allowedAudience,
        publicIdentityMode: merged.publicIdentityMode,
        publishedColumns: merged.publishedColumns,
      },
      timestamp: merged.updatedAt,
    },
  });

  // Sinkronkan ke Supabase live_score_settings jika tersedia
  if (typeof window !== "undefined" && isSupabaseConfigured()) {
    const supabase = createSupabaseBrowserClient();
    void supabase
      ?.from("live_score_settings")
      .upsert(
        {
          singleton_key: "default",
          homepage_enabled: merged.homepageEnabled,
          published_exam_id: merged.publishedExamId,
          published_run_id: merged.publishedRunId,
          allowed_audience: merged.allowedAudience,
          public_identity_mode: merged.publicIdentityMode,
          published_columns: {
            show_subtest_scores: merged.publishedColumns.showSubtestScores,
            show_total_score: merged.publishedColumns.showTotalScore,
            show_passing_grade: merged.publishedColumns.showPassingGrade,
            show_exam_status: merged.publishedColumns.showExamStatus,
            show_progress: merged.publishedColumns.showProgress,
          },
          section_title: merged.sectionTitle,
          section_subtitle: merged.sectionSubtitle,
          max_rows: merged.maxRows,
          updated_by: null,
          updated_at: merged.updatedAt,
        },
        { onConflict: "singleton_key" }
      );
  }

  // Sinkronkan ke endpoint server lokal & siarkan event Realtime
  syncLiveScoreSnapshotToServer();
  broadcastLiveScoreEvent({
    type: "SETTINGS_UPDATED",
    runId: merged.publishedRunId,
    examId: merged.publishedExamId,
  });

  return merged;
}

/**
 * Penanda transisi status "Menyelesaikan ujian" (submitting) sebelum hasil final selesai ditulis
 */
export function setSessionSubmittingState(
  sessionId: string,
  isSubmitting: boolean
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LIVE_SCORE_SUBMITTING_MAP_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    if (isSubmitting) {
      map[sessionId] = new Date().toISOString();
    } else {
      delete map[sessionId];
    }
    window.localStorage.setItem(
      LIVE_SCORE_SUBMITTING_MAP_KEY,
      JSON.stringify(map)
    );
  } catch {
    // ignore storage errors
  }
}

function isSessionCurrentlySubmitting(sessionId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(LIVE_SCORE_SUBMITTING_MAP_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, string>;
    const ts = map[sessionId];
    if (!ts) return false;
    // Maksimal 30 detik dianggap masih transisi submitting
    return Date.now() - new Date(ts).getTime() < 30_000;
  } catch {
    return false;
  }
}

/**
 * Menentukan konfigurasi penilaian (ExamScoringConfig) untuk suatu ujian/sesi
 * dan mendeteksi secara jujur apakah Passing Grade sudah dikonfigurasi atau belum.
 */
export function resolveExamScoringConfig(
  exam: ExamRow | undefined | null,
  run: ExamRunRow | undefined | null,
  session?: ExamSessionRow | null,
  snapshotsList?: ReturnType<typeof getScoringSnapshots>,
  examSectionsList?: ReturnType<typeof getExamSections>
): {
  scoringConfig: ExamScoringConfig | null;
  passingGradeConfigured: boolean;
} {
  const snapshots = snapshotsList ?? getScoringSnapshots();
  const sections = examSectionsList ?? getExamSections();

  const snapshotId = session?.scoring_snapshot_id || run?.scoring_snapshot_id;
  const matchedSnapshot = snapshotId
    ? snapshots.find((s) => s.id === snapshotId)
    : exam
    ? snapshots
        .filter((s) => s.exam_id === exam.id)
        .sort((a, b) => b.version_no - a.version_no)[0]
    : undefined;

  if (matchedSnapshot && matchedSnapshot.scoring_config) {
    const cfg = matchedSnapshot.scoring_config;
    const hasSectionPg =
      Array.isArray(cfg.sections) &&
      cfg.sections.length > 0 &&
      cfg.sections.some((sec) => Number(sec.passing_grade ?? 0) > 0);
    const hasTotalPg = Number(cfg.total_passing_grade ?? 0) > 0;
    return {
      scoringConfig: cfg,
      passingGradeConfigured: hasSectionPg || hasTotalPg,
    };
  }

  // Jika belum ada row di exam_scoring_snapshots, cek apakah exam memiliki exam_sections
  if (exam) {
    const examSecs = sections
      .filter((s) => s.exam_id === exam.id)
      .sort((a, b) => a.display_order - b.display_order);

    if (examSecs.length > 0) {
      const secConfigs = examSecs.map((s) => s.scoring_config);
      const totalMax = secConfigs.reduce(
        (sum, sc) => sum + Number(sc.max_score ?? 0),
        0
      );
      const hasSectionPg = secConfigs.some(
        (sc) => Number(sc.passing_grade ?? 0) > 0
      );
      return {
        scoringConfig: {
          preset_name: `Konfigurasi ${exam.title}`,
          sections: secConfigs,
          total_max_score: totalMax,
          total_passing_grade: null,
          require_all_section_thresholds: true,
          rounding_mode: "none",
        },
        passingGradeConfigured: hasSectionPg,
      };
    }
  }

  // Jika ujian sama sekali belum memiliki snapshot maupun exam_sections:
  // Jangan mengasumsikan lulus secara menyesatkan ("Passing grade belum dikonfigurasi")
  return {
    scoringConfig: null,
    passingGradeConfigured: false,
  };
}

export interface ComputedSessionScoreDetail {
  scoreType: "provisional" | "final";
  sectionScores: SectionScoreResult[];
  twkScore: number;
  twkPassingGrade: number;
  twkPassed: boolean;
  tiuScore: number;
  tiuPassingGrade: number;
  tiuPassed: boolean;
  tkpScore: number;
  tkpPassingGrade: number;
  tkpPassed: boolean;
  totalScore: number;
  totalMaxScore: number;
  totalPassingGrade: number | null;
  passingGradeConfigured: boolean;
  passingGradeStatus: PassingGradeEvaluationStatus;
  passingGradeLabel: string;
  answeredCount: number;
  totalQuestions: number;
  progressPercent: number;
  lastAnswerSavedAt: string | null;
}

/**
 * Menghitung skor sementara (provisional) atau mengambil/menghitung skor final peserta
 * secara idempoten dari jawaban yang telah tersimpan sah di server.
 *
 * Ketentuan yang dipenuhi:
 * - Jawaban kosong mendapat points_blank (default 0).
 * - Perubahan jawaban menggantikan kontribusi jawaban sebelumnya (menggunakan revisi terakhir per session_question_id).
 * - TKP dihitung dari bobot opsi 1-5 (tkp_scores[selected_option]), bukan benar/salah.
 * - Mendukung CPNS (TWK, TIU, TKP) maupun Sekdin & Polri (subtes kustom).
 * - Jika passing grade belum dikonfigurasi, mengembalikan status "unconfigured" ("Passing grade belum dikonfigurasi").
 */
export function computeAuthoritativeSessionLiveScore(params: {
  session: ExamSessionRow;
  exam: ExamRow | null;
  run: ExamRunRow | null;
  sessionQuestions: ExamSessionQuestionRow[];
  sessionAnswers: AnswerRow[];
  serverQuestions: QuestionRow[];
  existingResult?: ResultRow | null;
  scoringConfig: ExamScoringConfig | null;
  passingGradeConfigured: boolean;
}): ComputedSessionScoreDetail {
  const {
    session,
    sessionQuestions,
    sessionAnswers,
    serverQuestions,
    existingResult,
    scoringConfig,
    passingGradeConfigured,
  } = params;

  const isFinished =
    session.status === "submitted" || session.status === "timed_out";

  // Deduplikasi jawaban berdasarkan session_question_id dengan mengambil revisi tertinggi (idempoten)
  const latestAnswerBySqId = new Map<string, AnswerRow>();
  let latestSavedAt: string | null = null;

  for (const ans of sessionAnswers) {
    if (ans.exam_session_id !== session.id) continue;
    const prev = latestAnswerBySqId.get(ans.session_question_id);
    if (!prev || ans.revision >= prev.revision) {
      latestAnswerBySqId.set(ans.session_question_id, ans);
    }
    if (
      ans.saved_at &&
      (!latestSavedAt ||
        new Date(ans.saved_at).getTime() > new Date(latestSavedAt).getTime())
    ) {
      latestSavedAt = ans.saved_at;
    }
  }

  let totalAnswered = 0;
  latestAnswerBySqId.forEach((ans) => {
    if (ans.selected_option !== null && ans.selected_option !== undefined) {
      totalAnswered++;
    }
  });

  // Tentukan daftar subtes dari scoringConfig atau dari soal sesi yang ada
  const configuredSections =
    scoringConfig && scoringConfig.sections.length > 0
      ? scoringConfig.sections
      : Array.from(
          new Set(sessionQuestions.map((sq) => sq.section_key.toUpperCase()))
        ).map((secKey) => ({
          section_key: secKey,
          title: `Subtes ${secKey}`,
          question_count: sessionQuestions.filter(
            (sq) => sq.section_key.toUpperCase() === secKey
          ).length,
          max_score: 100,
          passing_grade: 0,
          scoring_mode:
            secKey === "TKP" ? ("tkp" as const) : ("standard" as const),
          points_correct: 5,
          points_wrong: 0,
          points_blank: 0,
        }));

  const questionMap = new Map<string, QuestionRow>();
  for (const q of serverQuestions) {
    questionMap.set(q.id, q);
  }

  let sectionScores: SectionScoreResult[];

  // Jika sesi telah selesai dan memiliki ResultRow resmi, gunakan section_scores final tersebut
  if (
    isFinished &&
    existingResult &&
    Array.isArray(existingResult.section_scores) &&
    existingResult.section_scores.length > 0
  ) {
    sectionScores = existingResult.section_scores;
  } else {
    sectionScores = configuredSections.map((secCfg) => {
      const sqInSection = sessionQuestions.filter(
        (sq) =>
          sq.exam_session_id === session.id &&
          sq.section_key.toUpperCase() === secCfg.section_key.toUpperCase()
      );

      let sectionScore = 0;
      let answeredInSec = 0;
      let correctInSec = 0;

      for (const sq of sqInSection) {
        const ans = latestAnswerBySqId.get(sq.id);
        const selected: OptionKey | null = ans?.selected_option ?? null;

        if (!selected) {
          sectionScore += Number(secCfg.points_blank ?? 0);
          continue;
        }

        answeredInSec++;
        const serverQ = questionMap.get(sq.question_snapshot.question_id);

        if (
          secCfg.scoring_mode === "tkp" ||
          sq.question_snapshot.question_type === "tkp"
        ) {
          const tkpMap = serverQ?.tkp_scores;
          const pt = tkpMap ? Number(tkpMap[selected] ?? 0) : 0;
          sectionScore += pt;
          if (pt === 5) correctInSec++;
        } else {
          const correctKey = serverQ?.correct_option;
          if (correctKey && selected === correctKey) {
            sectionScore += Number(secCfg.points_correct ?? 5);
            correctInSec++;
          } else {
            sectionScore += Number(secCfg.points_wrong ?? 0);
          }
        }
      }

      const pg = Number(secCfg.passing_grade ?? 0);
      const passed = pg > 0 ? sectionScore >= pg : false;

      return {
        section_key: secCfg.section_key,
        title: secCfg.title,
        score: sectionScore,
        max_score: Number(secCfg.max_score ?? 0),
        passing_grade: pg,
        passed,
        answered_count: answeredInSec,
        correct_count: correctInSec,
        question_count: sqInSection.length || Number(secCfg.question_count ?? 0),
      };
    });
  }

  const totalScore =
    isFinished && existingResult
      ? existingResult.total_score
      : sectionScores.reduce((sum, s) => sum + s.score, 0);

  const totalQuestionsFromConfig = configuredSections.reduce(
    (sum, s) => sum + Number(s.question_count ?? 0),
    0
  );
  const sessionSqCount = sessionQuestions.filter(
    (sq) => sq.exam_session_id === session.id
  ).length;
  const totalQuestions = sessionSqCount || totalQuestionsFromConfig || 0;

  const progressPercent =
    totalQuestions > 0
      ? Math.min(100, Math.round((totalAnswered / totalQuestions) * 100))
      : 0;

  const findSec = (key: string, fallbackIdx?: number) => {
    const byKey = sectionScores.find(
      (s) => s.section_key.toUpperCase() === key.toUpperCase()
    );
    if (byKey) return byKey;
    if (
      fallbackIdx !== undefined &&
      sectionScores[fallbackIdx] &&
      !["TWK", "TIU", "TKP"].includes(
        sectionScores[fallbackIdx].section_key.toUpperCase()
      )
    ) {
      return sectionScores[fallbackIdx];
    }
    return undefined;
  };

  const twkSec = findSec("TWK", 0);
  const tiuSec = findSec("TIU", 1);
  const tkpSec = findSec("TKP", 2);

  // Evaluasi Passing Grade
  let passingGradeStatus: PassingGradeEvaluationStatus = "unconfigured";
  let passingGradeLabel = "Passing grade belum dikonfigurasi";

  if (passingGradeConfigured && scoringConfig) {
    const sectionsWithPg = sectionScores.filter((s) => s.passing_grade > 0);
    const allSectionsMet =
      sectionsWithPg.length > 0 && sectionsWithPg.every((s) => s.passed);
    const totalPg = Number(scoringConfig.total_passing_grade ?? 0);
    const totalMet = totalPg > 0 ? totalScore >= totalPg : true;

    const overallMet = scoringConfig.require_all_section_thresholds
      ? allSectionsMet && totalMet
      : totalPg > 0
      ? totalMet
      : allSectionsMet;

    if (overallMet) {
      passingGradeStatus = "passed";
      passingGradeLabel = "Memenuhi";
    } else {
      passingGradeStatus = "failed";
      passingGradeLabel = "Belum Memenuhi";
    }
  }

  return {
    scoreType: isFinished ? "final" : "provisional",
    sectionScores,
    twkScore: twkSec?.score ?? 0,
    twkPassingGrade: twkSec?.passing_grade ?? 0,
    twkPassed: twkSec ? twkSec.passed : false,
    tiuScore: tiuSec?.score ?? 0,
    tiuPassingGrade: tiuSec?.passing_grade ?? 0,
    tiuPassed: tiuSec ? tiuSec.passed : false,
    tkpScore: tkpSec?.score ?? 0,
    tkpPassingGrade: tkpSec?.passing_grade ?? 0,
    tkpPassed: tkpSec ? tkpSec.passed : false,
    totalScore,
    totalMaxScore:
      scoringConfig?.total_max_score ??
      sectionScores.reduce((sum, s) => sum + s.max_score, 0),
    totalPassingGrade: scoringConfig?.total_passing_grade ?? null,
    passingGradeConfigured,
    passingGradeStatus,
    passingGradeLabel,
    answeredCount: totalAnswered,
    totalQuestions,
    progressPercent,
    lastAnswerSavedAt: latestSavedAt,
  };
}

/**
 * Komparator Peringkat Deterministik dalam 1 Sesi/Ujian:
 * 1. Peserta yang sudah mulai/selesai berada di atas yang "Belum mulai" (not_started).
 * 2. Jika Passing Grade dikonfigurasi: "Memenuhi" (passed) berada di atas "Belum Memenuhi" (failed).
 * 3. Total Skor tertinggi.
 * 4. Tie-breaker: Skor TKP -> Skor TIU -> Skor TWK -> Waktu selesai/update terawal -> ID sesi.
 */
export function sortLiveScoreRows(
  rows: Omit<AdminLiveScoreRow, "rank">[]
): AdminLiveScoreRow[] {
  const sorted = [...rows].sort((a, b) => {
    const aStarted = a.examStatus !== "not_started";
    const bStarted = b.examStatus !== "not_started";
    if (aStarted !== bStarted) {
      return aStarted ? -1 : 1;
    }

    if (a.passingGradeConfigured && b.passingGradeConfigured) {
      const aPass = a.passingGradeStatus === "passed";
      const bPass = b.passingGradeStatus === "passed";
      if (aPass !== bPass) {
        return aPass ? -1 : 1;
      }
    }

    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }

    if (b.tkpScore !== a.tkpScore) {
      return b.tkpScore - a.tkpScore;
    }

    if (b.tiuScore !== a.tiuScore) {
      return b.tiuScore - a.tiuScore;
    }

    if (b.twkScore !== a.twkScore) {
      return b.twkScore - a.twkScore;
    }

    if (b.answeredCount !== a.answeredCount) {
      return b.answeredCount - a.answeredCount;
    }

    const aTime = new Date(
      a.submittedAt || a.lastUpdatedAt || "2099-01-01T00:00:00Z"
    ).getTime();
    const bTime = new Date(
      b.submittedAt || b.lastUpdatedAt || "2099-01-01T00:00:00Z"
    ).getTime();
    if (aTime !== bTime) {
      return aTime - bTime;
    }

    return a.sessionId.localeCompare(b.sessionId);
  });

  return sorted.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}

export function getExamStatusDisplayLabel(
  status: LiveScoreExamStatus
): string {
  switch (status) {
    case "not_started":
      return "Belum mulai";
    case "in_progress":
      return "Sedang ujian";
    case "submitting":
      return "Menyelesaikan ujian";
    case "submitted":
      return "Selesai";
    case "timed_out":
      return "Waktu habis";
    case "sync_issue":
      return "Gangguan / Sinkronisasi bermasalah";
  }
}

/**
 * Menghitung papan Live Score lengkap untuk satu Sesi Pelaksanaan (runId).
 * PENTING: Tidak pernah mencampur peserta dari ujian atau sesi yang berbeda.
 */
export function computeRunLiveScoreBoard(
  runId: string | null | undefined
): RunLiveScoreBoardResult {
  const runs = getExamRuns();
  const exams = getExams();
  const profiles = getStoredProfiles();
  const sessions = getExamSessions();
  const results = getResults();
  const questions = getQuestions();
  const incidents = getIncidents();
  const runAssignments = getRunAssignments();
  const accessGrants = getAccessGrants();
  const groupMembers = getGroupMembers();
  const allSessionQuestions = getSessionQuestions();
  const allSessionAnswers = getSessionAnswers();

  const targetRun = runId
    ? runs.find((r) => r.id === runId) || null
    : runs.find((r) => r.status === "active") || runs[0] || null;

  if (!targetRun) {
    return {
      exam: null,
      run: null,
      scoringConfig: null,
      passingGradeConfigured: false,
      rows: [],
      summary: {
        totalParticipants: 0,
        notStartedCount: 0,
        inProgressCount: 0,
        completedCount: 0,
        timedOutCount: 0,
        syncIssueCount: 0,
        passedCount: 0,
        failedCount: 0,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  const exam = exams.find((e) => e.id === targetRun.exam_id) || null;
  const { scoringConfig, passingGradeConfigured } = resolveExamScoringConfig(
    exam,
    targetRun
  );

  // Ambil seluruh sesi ujian pada runId ini (jika seorang peserta memiliki >1 attempt, ambil attempt terbaru)
  const runSessions = sessions
    .filter((s) => s.exam_run_id === targetRun.id)
    .sort((a, b) => b.attempt_no - a.attempt_no);

  const latestSessionByUser = new Map<string, ExamSessionRow>();
  for (const ses of runSessions) {
    if (!latestSessionByUser.has(ses.user_id)) {
      latestSessionByUser.set(ses.user_id, ses);
    }
  }

  const unrankedRows: Omit<AdminLiveScoreRow, "rank">[] = [];
  const categorySlug =
    exam?.category_id === "cat-sekdin"
      ? "sekdin"
      : exam?.category_id === "cat-polri"
      ? "polri"
      : "cpns";

  // 1. Proses peserta yang sudah memiliki exam_session pada run ini
  for (const session of latestSessionByUser.values()) {
    const profile = profiles.find((p) => p.id === session.user_id);
    const fullName = profile?.full_name || `Peserta ${session.user_id}`;
    const identity = maskParticipantIdentity(
      fullName,
      session.user_id,
      session.id,
      "masked_code"
    );

    const existingResult =
      results.find((r) => r.exam_session_id === session.id) || null;

    const sessionScoring = resolveExamScoringConfig(exam, targetRun, session);

    const computed = computeAuthoritativeSessionLiveScore({
      session,
      exam,
      run: targetRun,
      sessionQuestions: allSessionQuestions,
      sessionAnswers: allSessionAnswers,
      serverQuestions: questions,
      existingResult,
      scoringConfig: sessionScoring.scoringConfig,
      passingGradeConfigured: sessionScoring.passingGradeConfigured,
    });

    // Cek apakah terdapat insiden terbuka atau status gangguan/sinkronisasi bermasalah yang terverifikasi
    const openIncident = incidents.find(
      (inc) =>
        inc.exam_session_id === session.id && inc.status !== "resolved"
    );

    let examStatus: LiveScoreExamStatus = "in_progress";
    let hasSyncIssue = false;
    let syncIssueNote: string | null = null;

    if (session.status === "submitted") {
      examStatus = "submitted";
    } else if (session.status === "timed_out") {
      examStatus = "timed_out";
    } else if (
      session.status === "needs_review" ||
      session.status === "paused" ||
      Boolean(openIncident)
    ) {
      examStatus = "sync_issue";
      hasSyncIssue = true;
      syncIssueNote =
        (openIncident?.details?.description as string | undefined) ||
        openIncident?.incident_type ||
        (session.status === "paused"
          ? "Sesi dijeda sementara oleh Admin"
          : "Sesi memerlukan pemeriksaan sinkronisasi");
    } else if (isSessionCurrentlySubmitting(session.id)) {
      examStatus = "submitting";
    } else if (
      new Date(session.deadline_at).getTime() <= Date.now() &&
      session.status === "in_progress"
    ) {
      examStatus = "timed_out";
    } else {
      examStatus = "in_progress";
    }

    const lastUpdatedAt =
      session.submitted_at ||
      computed.lastAnswerSavedAt ||
      session.last_activity_at ||
      session.updated_at;

    unrankedRows.push({
      sessionId: session.id,
      userId: session.user_id,
      participantCode: identity.participantCode,
      fullName,
      maskedName: identity.maskedName,
      institution: profile?.institution || exam?.institution_label || null,
      targetSelection: profile?.target_selection || categorySlug.toUpperCase(),
      examId: exam?.id || "",
      examTitle: exam?.title || "Simulasi CAT",
      runId: targetRun.id,
      runName: targetRun.name,
      categorySlug,
      examStatus,
      examStatusLabel: getExamStatusDisplayLabel(examStatus),
      scoreType: computed.scoreType,
      twkScore: computed.twkScore,
      twkPassingGrade: computed.twkPassingGrade,
      twkPassed: computed.twkPassed,
      tiuScore: computed.tiuScore,
      tiuPassingGrade: computed.tiuPassingGrade,
      tiuPassed: computed.tiuPassed,
      tkpScore: computed.tkpScore,
      tkpPassingGrade: computed.tkpPassingGrade,
      tkpPassed: computed.tkpPassed,
      sectionScores: computed.sectionScores,
      totalScore: computed.totalScore,
      totalMaxScore: computed.totalMaxScore,
      totalPassingGrade: computed.totalPassingGrade,
      passingGradeConfigured: computed.passingGradeConfigured,
      passingGradeStatus: computed.passingGradeStatus,
      passingGradeLabel: computed.passingGradeLabel,
      answeredCount: computed.answeredCount,
      totalQuestions: computed.totalQuestions,
      progressPercent: computed.progressPercent,
      startedAt: session.started_at,
      deadlineAt: session.deadline_at,
      submittedAt: session.submitted_at,
      lastUpdatedAt,
      hasSyncIssue,
      syncIssueNote,
    });
  }

  // 2. Sertakan peserta yang sudah ditugaskan ke run ini namun belum memulai sesi ("Belum mulai")
  const assignedUserIds = new Set<string>();
  for (const ra of runAssignments.filter((a) => a.exam_run_id === targetRun.id)) {
    if (ra.user_id) assignedUserIds.add(ra.user_id);
    if (ra.group_id) {
      groupMembers
        .filter((gm) => gm.group_id === ra.group_id)
        .forEach((gm) => assignedUserIds.add(gm.user_id));
    }
  }
  if (exam) {
    for (const ag of accessGrants.filter((g) => g.exam_id === exam.id)) {
      if (ag.user_id) assignedUserIds.add(ag.user_id);
      if (ag.group_id) {
        groupMembers
          .filter((gm) => gm.group_id === ag.group_id)
          .forEach((gm) => assignedUserIds.add(gm.user_id));
      }
    }
  }

  const defaultQuestionCount =
    scoringConfig?.sections.reduce(
      (sum, s) => sum + Number(s.question_count ?? 0),
      0
    ) || 0;

  for (const assignedUserId of assignedUserIds) {
    if (latestSessionByUser.has(assignedUserId)) continue;
    const profile = profiles.find(
      (p) => p.id === assignedUserId && p.role === "user"
    );
    if (!profile) continue;

    const identity = maskParticipantIdentity(
      profile.full_name,
      profile.id,
      `not-started-${targetRun.id}-${profile.id}`,
      "masked_code"
    );

    const emptySections: SectionScoreResult[] = (
      scoringConfig?.sections || []
    ).map((secCfg) => ({
      section_key: secCfg.section_key,
      title: secCfg.title,
      score: 0,
      max_score: secCfg.max_score,
      passing_grade: secCfg.passing_grade,
      passed: false,
      answered_count: 0,
      correct_count: 0,
      question_count: secCfg.question_count,
    }));

    const twkCfg = emptySections.find(
      (s) => s.section_key.toUpperCase() === "TWK"
    );
    const tiuCfg = emptySections.find(
      (s) => s.section_key.toUpperCase() === "TIU"
    );
    const tkpCfg = emptySections.find(
      (s) => s.section_key.toUpperCase() === "TKP"
    );

    unrankedRows.push({
      sessionId: `pending-${targetRun.id}-${profile.id}`,
      userId: profile.id,
      participantCode: identity.participantCode,
      fullName: profile.full_name,
      maskedName: identity.maskedName,
      institution: profile.institution || exam?.institution_label || null,
      targetSelection: profile.target_selection || categorySlug.toUpperCase(),
      examId: exam?.id || "",
      examTitle: exam?.title || "Simulasi CAT",
      runId: targetRun.id,
      runName: targetRun.name,
      categorySlug,
      examStatus: "not_started",
      examStatusLabel: "Belum mulai",
      scoreType: "provisional",
      twkScore: 0,
      twkPassingGrade: twkCfg?.passing_grade ?? 0,
      twkPassed: false,
      tiuScore: 0,
      tiuPassingGrade: tiuCfg?.passing_grade ?? 0,
      tiuPassed: false,
      tkpScore: 0,
      tkpPassingGrade: tkpCfg?.passing_grade ?? 0,
      tkpPassed: false,
      sectionScores: emptySections,
      totalScore: 0,
      totalMaxScore: scoringConfig?.total_max_score ?? 550,
      totalPassingGrade: scoringConfig?.total_passing_grade ?? null,
      passingGradeConfigured,
      passingGradeStatus: passingGradeConfigured ? "failed" : "unconfigured",
      passingGradeLabel: passingGradeConfigured
        ? "Belum Memenuhi"
        : "Passing grade belum dikonfigurasi",
      answeredCount: 0,
      totalQuestions: defaultQuestionCount,
      progressPercent: 0,
      startedAt: null,
      deadlineAt: null,
      submittedAt: null,
      lastUpdatedAt: targetRun.activated_at || targetRun.created_at,
      hasSyncIssue: false,
      syncIssueNote: null,
    });
  }

  const rankedRows = sortLiveScoreRows(unrankedRows);

  const summary = {
    totalParticipants: rankedRows.length,
    notStartedCount: rankedRows.filter((r) => r.examStatus === "not_started")
      .length,
    inProgressCount: rankedRows.filter(
      (r) => r.examStatus === "in_progress" || r.examStatus === "submitting"
    ).length,
    completedCount: rankedRows.filter((r) => r.examStatus === "submitted")
      .length,
    timedOutCount: rankedRows.filter((r) => r.examStatus === "timed_out")
      .length,
    syncIssueCount: rankedRows.filter((r) => r.examStatus === "sync_issue")
      .length,
    passedCount: rankedRows.filter((r) => r.passingGradeStatus === "passed")
      .length,
    failedCount: rankedRows.filter((r) => r.passingGradeStatus === "failed")
      .length,
  };

  return {
    exam,
    run: targetRun,
    scoringConfig,
    passingGradeConfigured,
    rows: rankedRows,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Mengonversi baris AdminLiveScoreRow menjadi DTO Publik yang disanitasi ketat.
 * Hanya menyertakan kolom yang diizinkan Admin dan menyamarkan identitas sesuai pengaturan.
 */
export function sanitizeRowForPublic(
  row: AdminLiveScoreRow,
  settings: LiveScorePublicationSettings
): PublicLiveScoreRow {
  const { displayIdentity } = maskParticipantIdentity(
    row.fullName,
    row.userId,
    row.sessionId,
    settings.publicIdentityMode
  );

  const cols = settings.publishedColumns;

  const dto: PublicLiveScoreRow = {
    rank: row.rank,
    participantCode: row.participantCode,
    displayIdentity,
    scoreType: row.scoreType,
    passingGradeConfigured: row.passingGradeConfigured,
    lastUpdatedAt: row.lastUpdatedAt,
  };

  if (cols.showExamStatus) {
    dto.examStatus = row.examStatus;
    dto.examStatusLabel = row.examStatusLabel;
  }

  if (cols.showSubtestScores) {
    dto.twkScore = row.twkScore;
    dto.tiuScore = row.tiuScore;
    dto.tkpScore = row.tkpScore;
    dto.sectionScores = row.sectionScores.map((s) => ({
      section_key: s.section_key,
      title: s.title,
      score: s.score,
      passing_grade: s.passing_grade,
      passed: s.passed,
    }));
  }

  if (cols.showTotalScore) {
    dto.totalScore = row.totalScore;
  }

  if (cols.showPassingGrade) {
    dto.passingGradeStatus = row.passingGradeStatus;
    dto.passingGradeLabel = row.passingGradeLabel;
  }

  if (cols.showProgress) {
    dto.answeredCount = row.answeredCount;
    dto.totalQuestions = row.totalQuestions;
    dto.progressPercent = row.progressPercent;
  }

  return dto;
}

export interface PublicLiveScoreResponse {
  enabled: boolean;
  authorized: boolean;
  reason?: string;
  settings?: {
    sectionTitle: string;
    sectionSubtitle: string;
    allowedAudience: LiveScoreAudienceMode;
    publicIdentityMode: LiveScoreIdentityMode;
    publishedColumns: LiveScorePublishedColumns;
    maxRows: number;
    updatedAt: string;
  };
  examTitle?: string;
  runName?: string;
  runId?: string;
  passingGradeConfigured?: boolean;
  tieBreakerRule?: string;
  rows: PublicLiveScoreRow[];
  generatedAt: string;
}

/**
 * Mengambil data Live Score Publik yang telah divalidasi izin & audiensnya.
 * Jika homepageEnabled === false, mengembalikan enabled: false dan rows: [] (menolak eksposur data).
 */
export function getSanitizedPublicLiveScoreBoard(options: {
  isAuthenticatedUser: boolean;
  overrideSettings?: LiveScorePublicationSettings;
}): PublicLiveScoreResponse {
  const settings = options.overrideSettings || getLiveScoreSettings();
  const now = new Date().toISOString();

  if (!settings.homepageEnabled) {
    return {
      enabled: false,
      authorized: false,
      reason: "Publikasi Live Score Homepage sedang dinonaktifkan oleh Admin.",
      rows: [],
      generatedAt: now,
    };
  }

  if (
    settings.allowedAudience === "authenticated" &&
    !options.isAuthenticatedUser
  ) {
    return {
      enabled: true,
      authorized: false,
      reason:
        "Live Score ini hanya dapat dilihat oleh peserta yang telah masuk (login).",
      settings: {
        sectionTitle: settings.sectionTitle,
        sectionSubtitle: settings.sectionSubtitle,
        allowedAudience: settings.allowedAudience,
        publicIdentityMode: settings.publicIdentityMode,
        publishedColumns: settings.publishedColumns,
        maxRows: settings.maxRows,
        updatedAt: settings.updatedAt,
      },
      rows: [],
      generatedAt: now,
    };
  }

  if (!settings.publishedRunId) {
    return {
      enabled: true,
      authorized: true,
      reason: "Admin belum memilih sesi ujian yang dipublikasikan.",
      settings: {
        sectionTitle: settings.sectionTitle,
        sectionSubtitle: settings.sectionSubtitle,
        allowedAudience: settings.allowedAudience,
        publicIdentityMode: settings.publicIdentityMode,
        publishedColumns: settings.publishedColumns,
        maxRows: settings.maxRows,
        updatedAt: settings.updatedAt,
      },
      rows: [],
      generatedAt: now,
    };
  }

  const board = computeRunLiveScoreBoard(settings.publishedRunId);
  if (!board.run) {
    return {
      enabled: true,
      authorized: true,
      reason: "Sesi ujian yang dipilih tidak ditemukan.",
      rows: [],
      generatedAt: now,
    };
  }

  const sanitizedRows = board.rows
    .slice(0, settings.maxRows)
    .map((row) => sanitizeRowForPublic(row, settings));

  return {
    enabled: true,
    authorized: true,
    settings: {
      sectionTitle: settings.sectionTitle,
      sectionSubtitle: settings.sectionSubtitle,
      allowedAudience: settings.allowedAudience,
      publicIdentityMode: settings.publicIdentityMode,
      publishedColumns: settings.publishedColumns,
      maxRows: settings.maxRows,
      updatedAt: settings.updatedAt,
    },
    examTitle: board.exam?.title || "Simulasi CAT Prima RIB",
    runName: board.run.name,
    runId: board.run.id,
    passingGradeConfigured: board.passingGradeConfigured,
    tieBreakerRule: LIVE_SCORE_TIE_BREAKER_DOC,
    rows: sanitizedRows,
    generatedAt: board.generatedAt,
  };
}

/* ============================================================================
 * SERVER-SIDE STATE CACHE & REALTIME BROADCAST INFRASTRUCTURE
 * ============================================================================ */

interface ServerLiveScoreCache {
  settings: LiveScorePublicationSettings;
  boardsByRunId: Record<string, RunLiveScoreBoardResult>;
  updatedAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __primaLiveScoreServerCache: ServerLiveScoreCache | undefined;
}

function getServerCache(): ServerLiveScoreCache {
  if (!globalThis.__primaLiveScoreServerCache) {
    globalThis.__primaLiveScoreServerCache = {
      settings: { ...DEFAULT_LIVE_SCORE_SETTINGS },
      boardsByRunId: {},
      updatedAt: new Date().toISOString(),
    };
  }
  return globalThis.__primaLiveScoreServerCache;
}

export function getServerCachedLiveScoreSettings(): LiveScorePublicationSettings {
  return getServerCache().settings;
}

export function setServerCachedLiveScoreSettings(
  settings: LiveScorePublicationSettings
): void {
  const cache = getServerCache();
  cache.settings = normalizeLiveScoreSettings(settings);
  cache.updatedAt = new Date().toISOString();
}

export function getServerCachedBoard(
  runId: string
): RunLiveScoreBoardResult | null {
  return getServerCache().boardsByRunId[runId] || null;
}

export function setServerCachedBoard(
  runId: string,
  board: RunLiveScoreBoardResult
): void {
  const cache = getServerCache();
  cache.boardsByRunId[runId] = board;
  cache.updatedAt = new Date().toISOString();
}

/**
 * Menyinkronkan state Live Score terbaru ke Route Handler server (/api/live-score/admin)
 * agar endpoint publik & admin memiliki snapshot otoritatif terbaru.
 */
export function syncLiveScoreSnapshotToServer(targetRunId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const settings = getLiveScoreSettings();
    const runs = getExamRuns();
    const runIdsToSync = new Set<string>();
    if (targetRunId) runIdsToSync.add(targetRunId);
    if (settings.publishedRunId) runIdsToSync.add(settings.publishedRunId);
    runs.forEach((r) => runIdsToSync.add(r.id));

    const boardsByRunId: Record<string, RunLiveScoreBoardResult> = {};
    runIdsToSync.forEach((rId) => {
      boardsByRunId[rId] = computeRunLiveScoreBoard(rId);
    });

    void fetch("/api/live-score/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SYNC_SNAPSHOT",
        settings,
        boardsByRunId,
      }),
    }).catch(() => {
      // Abaikan jika sedang offline; akan otomatis disinkronkan saat online kembali
    });
  } catch {
    // ignore
  }
}

/**
 * Menyiarkan event pembaruan Live Score secara real-time melalui:
 * 1. Supabase Realtime Broadcast (channel terpisah Admin vs Publik dengan payload tersanitasi)
 * 2. Browser BroadcastChannel ('prima_cat_live_score_bc') untuk sinkronisasi instan antar-tab
 * 3. CustomEvent & localStorage trigger untuk reaktivitas langsung tanpa refresh
 */
export function broadcastLiveScoreEvent(
  eventInput: Omit<LiveScoreRealtimeEvent, "eventId" | "timestamp">
): void {
  if (typeof window === "undefined") return;

  const event: LiveScoreRealtimeEvent = {
    ...eventInput,
    eventId: `lse-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  // Sinkronkan snapshot ke API server
  syncLiveScoreSnapshotToServer(event.runId);

  // 1. Browser CustomEvent & LocalStorage signal
  try {
    window.dispatchEvent(
      new CustomEvent("prima-live-score-event", { detail: event })
    );
    window.localStorage.setItem(
      "prima_cat_live_score_last_event",
      JSON.stringify(event)
    );
  } catch {
    // ignore
  }

  // 2. Browser BroadcastChannel (antar tab)
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("prima_cat_live_score_bc");
      bc.postMessage(event);
      bc.close();
    }
  } catch {
    // ignore
  }

  // 3. Supabase Realtime Broadcast (Channel Admin & Channel Publik Terpisah)
  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseBrowserClient();
      if (supabase) {
        const adminChannel = supabase.channel(LIVE_SCORE_ADMIN_CHANNEL);
        adminChannel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void adminChannel.send({
              type: "broadcast",
              event: "live_score_update",
              payload: event,
            });
          }
        });

        const settings = getLiveScoreSettings();
        if (
          settings.homepageEnabled &&
          settings.publishedRunId &&
          (!event.runId ||
            event.runId === settings.publishedRunId ||
            event.type === "SETTINGS_UPDATED")
        ) {
          const publicChannel = supabase.channel(
            `${LIVE_SCORE_PUBLIC_CHANNEL_PREFIX}${settings.publishedRunId}`
          );
          publicChannel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              // Hanya kirim metadata notifikasi yang aman tanpa data sensitif
              void publicChannel.send({
                type: "broadcast",
                event: "public_score_update",
                payload: {
                  eventId: event.eventId,
                  type: event.type,
                  runId: settings.publishedRunId,
                  timestamp: event.timestamp,
                },
              });
            }
          });
        }
      }
    } catch {
      // ignore realtime socket errors
    }
  }
}
