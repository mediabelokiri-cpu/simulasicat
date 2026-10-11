/**
 * SERVER-SIDE SCORING ENGINE — CATARA DIGITAL ASSESSMENT PLATFORM
 * Sesuai Bab 8.6 & Bab 9.1–9.4 PRD Final v1.0
 *
 * Prinsip Keamanan & Integritas:
 * 1. Kunci jawaban (correct_option) dan bobot TKP (tkp_scores) diambil dari bank soal/snapshot server,
 *    bukan dari kiriman client.
 * 2. Perhitungan bersifat idempoten: jika sesi sudah memiliki hasil (ResultRow),
 *    submit berulang tidak membuat hasil ganda melainkan mengembalikan hasil yang sudah sah.
 * 3. Kelulusan ambang batas (thresholds_met) mengharuskan setiap subtes memenuhi passing grade masing-masing.
 */

import {
  ExamSessionRow,
  OptionKey,
  ResultRow,
  SectionScoreResult,
} from "@/types/database";
import {
  getExams,
  getExamRuns,
  getExamSessions,
  getQuestions,
  getResults,
  getScoringSnapshots,
  saveExamSessions,
  saveResults,
  appendAuditLog,
} from "./admin-store";
import { getSessionAnswers, getSessionQuestions } from "./exam";
import { SKD_CPNS_2024_PRESET } from "./mock-store";
import {
  broadcastLiveScoreEvent,
  setSessionSubmittingState,
} from "./live-score";

export function finalizeAndScoreExamSession(
  sessionId: string,
  trigger: "manual_submit" | "timeout_auto_submit" = "manual_submit"
): { ok: boolean; error?: string; result?: ResultRow } {
  const sessions = getExamSessions();
  const sessionIdx = sessions.findIndex((s) => s.id === sessionId);
  if (sessionIdx === -1) {
    return { ok: false, error: "Sesi pengerjaan peserta tidak ditemukan." };
  }

  const session = sessions[sessionIdx];

  // Idempotency Check (Bab 8.6 PRD: Pengiriman berulang tidak membuat hasil ganda)
  const existingResults = getResults();
  const alreadyScored = existingResults.find(
    (r) => r.exam_session_id === sessionId
  );
  if (alreadyScored) {
    return { ok: true, result: alreadyScored };
  }

  const runs = getExamRuns();
  const exams = getExams();
  const run = runs.find((r) => r.id === session.exam_run_id);
  const exam = exams.find((e) => e.id === run?.exam_id);

  // Ambil snapshot konfigurasi penilaian yang mengikat sesi ini
  const snapshots = getScoringSnapshots();
  const snap = snapshots.find((s) => s.id === session.scoring_snapshot_id);
  const scoringConfig = snap?.scoring_config || SKD_CPNS_2024_PRESET;

  const sessionQuestions = getSessionQuestions(sessionId);
  const sessionAnswers = getSessionAnswers(sessionId);
  const answerMap = new Map<string, OptionKey | null>();
  sessionAnswers.forEach((a) => {
    answerMap.set(a.session_question_id, a.selected_option);
  });

  // Ambil bank soal server untuk pencocokan kunci jawaban & bobot TKP
  const serverQuestions = getQuestions();

  const sectionScores: SectionScoreResult[] = scoringConfig.sections.map(
    (secCfg) => {
      const sqInSection = sessionQuestions.filter(
        (sq) => sq.section_key.toUpperCase() === secCfg.section_key.toUpperCase()
      );

      let sectionScore = 0;
      let answeredCount = 0;
      let correctCount = 0;

      for (const sq of sqInSection) {
        const selected = answerMap.get(sq.id) ?? null;
        if (selected) {
          answeredCount++;
        }

        const serverQ = serverQuestions.find(
          (q) => q.id === sq.question_snapshot.question_id
        );

        if (!selected) {
          sectionScore += Number(secCfg.points_blank ?? 0);
          continue;
        }

        if (
          secCfg.scoring_mode === "tkp" ||
          sq.question_snapshot.question_type === "tkp"
        ) {
          const tkpMap = serverQ?.tkp_scores || {
            A: 0,
            B: 0,
            C: 0,
            D: 0,
            E: 0,
          };
          const pt = Number(tkpMap[selected] ?? 0);
          sectionScore += pt;
          if (pt === 5) correctCount++;
        } else {
          const correctKey = serverQ?.correct_option;
          if (correctKey && selected === correctKey) {
            sectionScore += Number(secCfg.points_correct ?? 5);
            correctCount++;
          } else {
            sectionScore += Number(secCfg.points_wrong ?? 0);
          }
        }
      }

      const passed = sectionScore >= secCfg.passing_grade;

      return {
        section_key: secCfg.section_key,
        title: secCfg.title,
        score: sectionScore,
        max_score: secCfg.max_score,
        passing_grade: secCfg.passing_grade,
        passed,
        answered_count: answeredCount,
        correct_count: correctCount,
        question_count: sqInSection.length || secCfg.question_count,
      };
    }
  );

  const totalScore = sectionScores.reduce((sum, s) => sum + s.score, 0);
  const thresholdsMet = scoringConfig.require_all_section_thresholds
    ? sectionScores.every((s) => s.passed)
    : totalScore >= (scoringConfig.total_passing_grade || 0);

  const now = new Date().toISOString();
  const pubCfg = exam?.publication_config || {
    publish_score_immediately: true,
    publish_explanations: true,
    publish_answer_key: true,
    show_leaderboard: true,
    allow_provisional_admin_score: true,
  };

  // Kunci status sesi peserta (exam_sessions)
  const updatedSession: ExamSessionRow = {
    ...session,
    status: trigger === "timeout_auto_submit" ? "timed_out" : "submitted",
    submitted_at: now,
    last_activity_at: now,
    updated_at: now,
  };
  sessions[sessionIdx] = updatedSession;
  saveExamSessions(sessions);

  // Simpan hasil akhir beserta result_snapshot historis
  const newResult: ResultRow = {
    id: `res-${Date.now()}`,
    exam_session_id: sessionId,
    user_id: session.user_id,
    exam_run_id: session.exam_run_id,
    total_score: totalScore,
    section_scores: sectionScores,
    thresholds_met: thresholdsMet,
    result_snapshot: {
      exam_title: exam?.title || "Simulasi CAT CATARA",
      run_name: run?.name || "Sesi Ujian",
      scoring_preset: scoringConfig.preset_name,
      submit_trigger: trigger,
      started_at: session.started_at,
      submitted_at: now,
    },
    score_published_at: pubCfg.publish_score_immediately ? now : null,
    explanations_published_at: pubCfg.publish_explanations ? now : null,
    answer_key_published_at: pubCfg.publish_answer_key ? now : null,
    created_at: now,
  };

  saveResults([newResult, ...existingResults]);

  appendAuditLog({
    actor_id: session.user_id,
    action:
      trigger === "timeout_auto_submit"
        ? "AUTO_SUBMIT_TIMEOUT_EXAM_SESSION"
        : "SUBMIT_EXAM_SESSION",
    entity_type: "results",
    entity_id: newResult.id,
    reason:
      trigger === "timeout_auto_submit"
        ? "Waktu ujian habis (Auto-submit oleh server)"
        : "Peserta menyelesaikan dan mengirim jawaban ujian",
    details: {
      exam_session_id: sessionId,
      total_score: totalScore,
      thresholds_met: thresholdsMet,
    },
  });

  setSessionSubmittingState(sessionId, false);

  broadcastLiveScoreEvent({
    type: "SESSION_FINISHED",
    runId: session.exam_run_id,
    examId: exam?.id || null,
    sessionId,
  });

  return { ok: true, result: newResult };
}

/**
 * Menghitung skor sementara (Provisional Score) untuk sesi yang masih berjalan
 * Khusus ditampilkan di Panel Monitoring Admin (Bab 9.4 & Bab 10.1 PRD).
 */
export function computeProvisionalSessionScore(sessionId: string): {
  totalScore: number;
  sectionScores: SectionScoreResult[];
  answeredCount: number;
  totalQuestions: number;
} {
  const sessions = getExamSessions();
  const session = sessions.find((s) => s.id === sessionId);
  const snapshots = getScoringSnapshots();
  const snap = snapshots.find((s) => s.id === session?.scoring_snapshot_id);
  const scoringConfig = snap?.scoring_config || SKD_CPNS_2024_PRESET;

  const sessionQuestions = getSessionQuestions(sessionId);
  const sessionAnswers = getSessionAnswers(sessionId);
  const answerMap = new Map<string, OptionKey | null>();
  sessionAnswers.forEach((a) => {
    answerMap.set(a.session_question_id, a.selected_option);
  });

  const serverQuestions = getQuestions();
  let totalAnswered = 0;

  const sectionScores: SectionScoreResult[] = scoringConfig.sections.map(
    (secCfg) => {
      const sqInSection = sessionQuestions.filter(
        (sq) => sq.section_key.toUpperCase() === secCfg.section_key.toUpperCase()
      );

      let sectionScore = 0;
      let answeredCount = 0;
      let correctCount = 0;

      for (const sq of sqInSection) {
        const selected = answerMap.get(sq.id) ?? null;
        if (!selected) continue;

        answeredCount++;
        totalAnswered++;
        const serverQ = serverQuestions.find(
          (q) => q.id === sq.question_snapshot.question_id
        );

        if (
          secCfg.scoring_mode === "tkp" ||
          sq.question_snapshot.question_type === "tkp"
        ) {
          const tkpMap = serverQ?.tkp_scores || {
            A: 0,
            B: 0,
            C: 0,
            D: 0,
            E: 0,
          };
          const pt = Number(tkpMap[selected] ?? 0);
          sectionScore += pt;
          if (pt === 5) correctCount++;
        } else {
          const correctKey = serverQ?.correct_option;
          if (correctKey && selected === correctKey) {
            sectionScore += Number(secCfg.points_correct ?? 5);
            correctCount++;
          } else {
            sectionScore += Number(secCfg.points_wrong ?? 0);
          }
        }
      }

      return {
        section_key: secCfg.section_key,
        title: secCfg.title,
        score: sectionScore,
        max_score: secCfg.max_score,
        passing_grade: secCfg.passing_grade,
        passed: sectionScore >= secCfg.passing_grade,
        answered_count: answeredCount,
        correct_count: correctCount,
        question_count: sqInSection.length || secCfg.question_count,
      };
    }
  );

  return {
    totalScore: sectionScores.reduce((sum, s) => sum + s.score, 0),
    sectionScores,
    answeredCount: totalAnswered,
    totalQuestions: sessionQuestions.length,
  };
}

/**
 * Mengurutkan peringkat resmi (Official Leaderboard) sesuai standar SKD:
 * 1. Peserta yang memenuhi seluruh ambang batas (thresholds_met = true) berada di atas.
 * 2. Diurutkan berdasarkan total_score tertinggi.
 * 3. Tie-breaker berturut-turut: Skor TKP -> Skor TIU -> Skor TWK.
 */
export function sortOfficialLeaderboard(results: ResultRow[]): ResultRow[] {
  const getSecScore = (r: ResultRow, key: string) =>
    r.section_scores.find(
      (s) => s.section_key.toUpperCase() === key.toUpperCase()
    )?.score ?? 0;

  return [...results].sort((a, b) => {
    if (a.thresholds_met !== b.thresholds_met) {
      return a.thresholds_met ? -1 : 1;
    }
    if (b.total_score !== a.total_score) {
      return b.total_score - a.total_score;
    }
    const tkpDiff = getSecScore(b, "TKP") - getSecScore(a, "TKP");
    if (tkpDiff !== 0) return tkpDiff;
    const tiuDiff = getSecScore(b, "TIU") - getSecScore(a, "TIU");
    if (tiuDiff !== 0) return tiuDiff;
    return getSecScore(b, "TWK") - getSecScore(a, "TWK");
  });
}
