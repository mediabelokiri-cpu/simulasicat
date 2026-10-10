/**
 * ADMIN & OPERATIONAL STORE
 * Menyediakan operasi CRUD dan Audit Log untuk ke-19 tabel ERD.
 */

import {
  GroupRow,
  GroupMemberRow,
  ExamAuditLogRow,
  ExamIncidentRow,
  QuestionRow,
  ExamRow,
  ExamRunRow,
  ExamSectionRow,
  ExamScoringSnapshotRow,
  ExamAccessGrantRow,
  ExamRunAssignmentRow,
  ExamSessionRow,
  ResultRow,
} from "@/types/database";
import {
  INITIAL_GROUPS,
  INITIAL_GROUP_MEMBERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_EXAM_INCIDENTS,
  INITIAL_QUESTIONS,
  INITIAL_EXAMS,
  INITIAL_EXAM_RUNS,
  INITIAL_EXAM_SECTIONS,
  INITIAL_SCORING_SNAPSHOTS,
  INITIAL_EXAM_ACCESS_GRANTS,
  INITIAL_EXAM_RUN_ASSIGNMENTS,
  INITIAL_EXAM_SESSIONS,
  INITIAL_RESULTS,
} from "./mock-store";
import { getStoredProfiles, saveStoredProfiles } from "./auth";

const KEYS = {
  groups: "prima_cat_groups_v2_prod",
  groupMembers: "prima_cat_group_members_v2_prod",
  auditLogs: "prima_cat_audit_logs_v2_prod",
  incidents: "prima_cat_incidents_v2_prod",
  questions: "prima_cat_questions_v2_prod",
  exams: "prima_cat_exams_v2_prod",
  examSections: "prima_cat_exam_sections_v2_prod",
  scoringSnapshots: "prima_cat_scoring_snapshots_v2_prod",
  examRuns: "prima_cat_exam_runs_v2_prod",
  accessGrants: "prima_cat_access_grants_v2_prod",
  runAssignments: "prima_cat_run_assignments_v2_prod",
  sessions: "prima_cat_sessions_v2_prod",
  results: "prima_cat_results_v2_prod",
};

const LEGACY_V1_PURGED_FLAG = "prima_cat_v1_dummy_purged";

function purgeLegacyDummyDataOnce(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(LEGACY_V1_PURGED_FLAG) === "1") return;
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.endsWith("_v1")) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
    window.localStorage.setItem(LEGACY_V1_PURGED_FLAG, "1");
  } catch {
    // ignore storage quota/security errors
  }
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  purgeLegacyDummyDataOnce();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(data));
}

// GROUPS & MEMBERS
export function getGroups(): GroupRow[] {
  return loadFromStorage(KEYS.groups, INITIAL_GROUPS);
}
export function saveGroups(groups: GroupRow[]): void {
  saveToStorage(KEYS.groups, groups);
}

export function getGroupMembers(): GroupMemberRow[] {
  return loadFromStorage(KEYS.groupMembers, INITIAL_GROUP_MEMBERS);
}
export function saveGroupMembers(members: GroupMemberRow[]): void {
  saveToStorage(KEYS.groupMembers, members);
}

// AUDIT LOGS & INCIDENTS
export function getAuditLogs(): ExamAuditLogRow[] {
  return loadFromStorage(KEYS.auditLogs, INITIAL_AUDIT_LOGS);
}
export function appendAuditLog(entry: {
  actor_id?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  reason?: string | null;
  details?: Record<string, unknown>;
}): ExamAuditLogRow {
  const logs = getAuditLogs();
  const newLog: ExamAuditLogRow = {
    id: `aud-${Date.now()}`,
    actor_id: entry.actor_id || "usr-admin-01",
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    reason: entry.reason || null,
    details: entry.details || {},
    created_at: new Date().toISOString(),
  };
  const updated = [newLog, ...logs];
  saveToStorage(KEYS.auditLogs, updated);
  return newLog;
}

export function getIncidents(): ExamIncidentRow[] {
  return loadFromStorage(KEYS.incidents, INITIAL_EXAM_INCIDENTS);
}
export function saveIncidents(incidents: ExamIncidentRow[]): void {
  saveToStorage(KEYS.incidents, incidents);
}

// QUESTIONS, EXAMS, RUNS, SESSIONS, RESULTS
export function getQuestions(): QuestionRow[] {
  return loadFromStorage(KEYS.questions, INITIAL_QUESTIONS);
}
export function saveQuestions(questions: QuestionRow[]): void {
  saveToStorage(KEYS.questions, questions);
}

export function getExams(): ExamRow[] {
  return loadFromStorage(KEYS.exams, INITIAL_EXAMS);
}
export function saveExams(exams: ExamRow[]): void {
  saveToStorage(KEYS.exams, exams);
}

export function getExamSections(): ExamSectionRow[] {
  return loadFromStorage(KEYS.examSections, INITIAL_EXAM_SECTIONS);
}
export function saveExamSections(sections: ExamSectionRow[]): void {
  saveToStorage(KEYS.examSections, sections);
}

export function getScoringSnapshots(): ExamScoringSnapshotRow[] {
  return loadFromStorage(KEYS.scoringSnapshots, INITIAL_SCORING_SNAPSHOTS);
}
export function saveScoringSnapshots(
  snapshots: ExamScoringSnapshotRow[]
): void {
  saveToStorage(KEYS.scoringSnapshots, snapshots);
}

export function getExamRuns(): ExamRunRow[] {
  return loadFromStorage(KEYS.examRuns, INITIAL_EXAM_RUNS);
}
export function saveExamRuns(runs: ExamRunRow[]): void {
  saveToStorage(KEYS.examRuns, runs);
}

export function getAccessGrants(): ExamAccessGrantRow[] {
  return loadFromStorage(KEYS.accessGrants, INITIAL_EXAM_ACCESS_GRANTS);
}
export function saveAccessGrants(grants: ExamAccessGrantRow[]): void {
  saveToStorage(KEYS.accessGrants, grants);
}

export function getRunAssignments(): ExamRunAssignmentRow[] {
  return loadFromStorage(KEYS.runAssignments, INITIAL_EXAM_RUN_ASSIGNMENTS);
}
export function saveRunAssignments(
  assignments: ExamRunAssignmentRow[]
): void {
  saveToStorage(KEYS.runAssignments, assignments);
}

export function getExamSessions(): ExamSessionRow[] {
  return loadFromStorage(KEYS.sessions, INITIAL_EXAM_SESSIONS);
}
export function saveExamSessions(sessions: ExamSessionRow[]): void {
  saveToStorage(KEYS.sessions, sessions);
}

export function getResults(): ResultRow[] {
  return loadFromStorage(KEYS.results, INITIAL_RESULTS);
}
export function saveResults(results: ResultRow[]): void {
  saveToStorage(KEYS.results, results);
}

/**
 * Mengubah status aktif/nonaktif akun peserta tanpa menghapus riwayat ujian,
 * disertai pencatatan wajib ke dalam exam_audit_logs.
 */
export function toggleUserActiveStatus(
  userId: string,
  newActiveState: boolean,
  reason: string
) {
  const profiles = getStoredProfiles();
  const idx = profiles.findIndex((p) => p.id === userId);
  if (idx === -1) return null;

  const previous = profiles[idx].is_active;
  profiles[idx] = {
    ...profiles[idx],
    is_active: newActiveState,
    updated_at: new Date().toISOString(),
  };
  saveStoredProfiles(profiles);

  appendAuditLog({
    action: newActiveState ? "ACTIVATE_USER_ACCOUNT" : "DEACTIVATE_USER_ACCOUNT",
    entity_type: "profiles",
    entity_id: userId,
    reason,
    details: {
      email: profiles[idx].email,
      previous_is_active: previous,
      new_is_active: newActiveState,
    },
  });

  if (typeof window !== "undefined") {
    void fetch("/api/profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: userId,
        email: profiles[idx].email,
        is_active: newActiveState,
      }),
    }).catch(() => {});
  }

  return profiles[idx];
}
