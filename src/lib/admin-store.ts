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
  ProfileRow,
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
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "./supabase/client";

export const KEYS = {
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
  sessionQuestions: "prima_cat_session_questions_v2_prod",
  sessionAnswers: "prima_cat_session_answers_v2_prod",
  liveScoreSettings: "prima_cat_live_score_settings_v2_prod",
};

const STORE_KEY_UUIDS: Record<string, string> = {
  [KEYS.groups]: "00000000-0000-4000-8000-000000000101",
  [KEYS.groupMembers]: "00000000-0000-4000-8000-000000000102",
  [KEYS.questions]: "00000000-0000-4000-8000-000000000103",
  [KEYS.exams]: "00000000-0000-4000-8000-000000000104",
  [KEYS.examSections]: "00000000-0000-4000-8000-000000000105",
  [KEYS.scoringSnapshots]: "00000000-0000-4000-8000-000000000106",
  [KEYS.examRuns]: "00000000-0000-4000-8000-000000000107",
  [KEYS.accessGrants]: "00000000-0000-4000-8000-000000000108",
  [KEYS.runAssignments]: "00000000-0000-4000-8000-000000000109",
  [KEYS.sessions]: "00000000-0000-4000-8000-000000000110",
  [KEYS.results]: "00000000-0000-4000-8000-000000000111",
  [KEYS.incidents]: "00000000-0000-4000-8000-000000000112",
  [KEYS.auditLogs]: "00000000-0000-4000-8000-000000000113",
  [KEYS.sessionQuestions]: "00000000-0000-4000-8000-000000000114",
  [KEYS.sessionAnswers]: "00000000-0000-4000-8000-000000000115",
  [KEYS.liveScoreSettings]: "00000000-0000-4000-8000-000000000116",
};

function getStoreEmail(storageKey: string): string {
  return `store:${storageKey}@internal.primarib.id`;
}

function getRecordTimestampMs(item: Record<string, unknown>): number {
  const candidates = [
    item.submitted_at,
    item.updated_at,
    item.saved_at,
    item.last_seen_at,
    item.score_published_at,
    item.updatedAt,
    item.created_at,
  ];
  let maxMs = 0;
  for (const c of candidates) {
    if (typeof c === "string" && c) {
      const parsed = new Date(c).getTime();
      if (!Number.isNaN(parsed) && parsed > maxMs) {
        maxMs = parsed;
      }
    }
  }
  return maxMs;
}

function pickNewerRecord(
  localItem: Record<string, unknown>,
  remoteItem: Record<string, unknown>
): Record<string, unknown> {
  const finishedStatuses = new Set(["submitted", "timed_out"]);
  const localFinished =
    typeof localItem.status === "string" &&
    finishedStatuses.has(localItem.status);
  const remoteFinished =
    typeof remoteItem.status === "string" &&
    finishedStatuses.has(remoteItem.status);

  if (localFinished && !remoteFinished) return localItem;
  if (remoteFinished && !localFinished) return remoteItem;

  if (
    typeof localItem.revision === "number" &&
    typeof remoteItem.revision === "number" &&
    localItem.revision !== remoteItem.revision
  ) {
    return localItem.revision > remoteItem.revision ? localItem : remoteItem;
  }

  const localTs = getRecordTimestampMs(localItem);
  const remoteTs = getRecordTimestampMs(remoteItem);
  if (localTs > 0 && remoteTs > 0 && localTs !== remoteTs) {
    return localTs > remoteTs ? localItem : remoteItem;
  }

  return remoteItem;
}

export async function pushStoreKeyToSupabase(
  storageKey: string,
  data: unknown,
  explicitSave = true
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const storeUuid = STORE_KEY_UUIDS[storageKey];
  if (!storeUuid) return;
  try {
    const supabase = createSupabaseBrowserClient();
    const now = new Date().toISOString();
    await supabase.from("profiles").upsert(
      {
        id: storeUuid,
        full_name: "__SYSTEM_STORE__",
        email: getStoreEmail(storageKey),
        role: "admin",
        is_active: false,
        phone: explicitSave ? "EXPLICIT_SAVE" : "AUTO_SYNC",
        institution: JSON.stringify(data),
        target_selection: "SYSTEM",
        email_verified: true,
        updated_at: now,
      },
      { onConflict: "email" }
    );
  } catch {
    // ignore network errors
  }
}

/**
 * Sinkronisasi dua arah seluruh tabel operasional (Ujian, Jadwal Sesi, Soal, Kelompok,
 * Sesi Pengerjaan, Jawaban, dan Hasil) melalui Supabase agar seluruh perangkat & browser berbeda
 * langsung menampilkan sesi ujian, monitoring realtime, dan hasil yang sama.
 */
export async function syncAdminStoreFromSupabase(): Promise<boolean> {
  if (typeof window === "undefined" || !isSupabaseConfigured()) {
    return false;
  }

  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("email, phone, institution, updated_at")
      .like("email", "store:%@internal.primarib.id");

    if (error || !Array.isArray(data)) {
      return false;
    }

    const remoteMap = new Map<
      string,
      { phone: string | null; institution: string | null }
    >();
    for (const row of data) {
      if (row.email) {
        remoteMap.set(String(row.email).toLowerCase(), {
          phone: row.phone ? String(row.phone) : null,
          institution: row.institution ? String(row.institution) : null,
        });
      }
    }

    let anyUpdated = false;
    const allStorageKeys = Object.values(KEYS);
    const mergeByIdKeys = new Set<string>([
      KEYS.sessions,
      KEYS.results,
      KEYS.sessionQuestions,
      KEYS.sessionAnswers,
      KEYS.incidents,
      KEYS.auditLogs,
    ]);

    for (const key of allStorageKeys) {
      const storeEmail = getStoreEmail(key).toLowerCase();
      const remoteRow = remoteMap.get(storeEmail);
      const localRaw = window.localStorage.getItem(key);

      // Penanganan khusus untuk objek konfigurasi tunggal (liveScoreSettings)
      if (key === KEYS.liveScoreSettings) {
        let localObj: Record<string, unknown> | null = null;
        try {
          if (localRaw) {
            const parsed = JSON.parse(localRaw);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              localObj = parsed as Record<string, unknown>;
            }
          }
        } catch {
          localObj = null;
        }

        if (remoteRow && remoteRow.institution) {
          try {
            const remoteParsed = JSON.parse(remoteRow.institution);
            if (
              remoteParsed &&
              typeof remoteParsed === "object" &&
              !Array.isArray(remoteParsed)
            ) {
              const winner = localObj
                ? pickNewerRecord(
                    localObj,
                    remoteParsed as Record<string, unknown>
                  )
                : (remoteParsed as Record<string, unknown>);
              const nextJson = JSON.stringify(winner);
              if (nextJson !== localRaw) {
                window.localStorage.setItem(key, nextJson);
                anyUpdated = true;
              }
              if (nextJson !== remoteRow.institution) {
                void pushStoreKeyToSupabase(key, winner, true);
              }
            }
          } catch {
            // ignore malformed JSON
          }
        } else if (localObj) {
          void pushStoreKeyToSupabase(key, localObj, true);
        }
        continue;
      }

      let localArr: unknown[] = [];
      try {
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed)) localArr = parsed;
        }
      } catch {
        localArr = [];
      }

      if (remoteRow && remoteRow.institution) {
        try {
          const remoteParsed = JSON.parse(remoteRow.institution);
          if (Array.isArray(remoteParsed)) {
            if (mergeByIdKeys.has(key)) {
              const mergedMap = new Map<string, Record<string, unknown>>();
              for (const item of localArr as Record<string, unknown>[]) {
                if (item && typeof item.id === "string") {
                  mergedMap.set(item.id, item);
                }
              }
              for (const item of remoteParsed as Record<string, unknown>[]) {
                if (item && typeof item.id === "string") {
                  const existing = mergedMap.get(item.id);
                  if (existing) {
                    mergedMap.set(item.id, pickNewerRecord(existing, item));
                  } else {
                    mergedMap.set(item.id, item);
                  }
                }
              }
              const mergedArr = Array.from(mergedMap.values());
              const nextJson = JSON.stringify(mergedArr);
              if (nextJson !== localRaw) {
                window.localStorage.setItem(key, nextJson);
                anyUpdated = true;
              }
              if (nextJson !== remoteRow.institution) {
                void pushStoreKeyToSupabase(key, mergedArr, true);
              }
            } else {
              // Untuk tabel konfigurasi Admin (exams, examRuns, questions, groups, dll.)
              if (
                remoteParsed.length > 0 ||
                remoteRow.phone === "EXPLICIT_SAVE" ||
                localArr.length === 0
              ) {
                const nextJson = JSON.stringify(remoteParsed);
                if (nextJson !== localRaw) {
                  window.localStorage.setItem(key, nextJson);
                  anyUpdated = true;
                }
              } else if (localArr.length > 0) {
                void pushStoreKeyToSupabase(key, localArr, true);
              }
            }
          }
        } catch {
          // ignore malformed JSON
        }
      } else if (localArr.length > 0) {
        // Belum ada di Supabase tapi browser ini punya data lokal -> push ke Supabase
        void pushStoreKeyToSupabase(key, localArr, true);
      }
    }

    if (anyUpdated) {
      window.dispatchEvent(new CustomEvent("prima-store-synced"));
    }
    return anyUpdated;
  } catch {
    return false;
  }
}

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
  void pushStoreKeyToSupabase(key, data, true);
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
 * Mengambil seluruh daftar kelompok (GroupRow) tempat peserta tergabung,
 * mencocokkan berdasarkan user.id maupun pencocokan alamat email lintas-perangkat.
 */
export function getUserEnrolledGroups(user: {
  id: string;
  email?: string;
}): GroupRow[] {
  const allGroups = getGroups();
  const allMembers = getGroupMembers();
  const allProfiles = getStoredProfiles();

  const targetEmail = String(user.email || "").toLowerCase();
  const matchingUserIds = new Set<string>([user.id]);

  if (targetEmail) {
    for (const p of allProfiles) {
      if (p.email.toLowerCase() === targetEmail) {
        matchingUserIds.add(p.id);
      }
    }
  }

  const groupIds = new Set<string>();
  for (const gm of allMembers) {
    if (
      matchingUserIds.has(gm.user_id) ||
      (targetEmail && gm.user_id.toLowerCase() === targetEmail)
    ) {
      groupIds.add(gm.group_id);
    }
  }

  return allGroups.filter((g) => groupIds.has(g.id));
}

/**
 * Mengambil pesan/alasan penonaktifan akun terbaru dari Admin untuk ditampilkan
 * pada halaman profil dan dashboard peserta ketika akun berstatus Nonaktif.
 */
export function getUserDeactivationNotice(user: {
  id: string;
  email?: string;
  is_active: boolean;
}): { reason: string; updatedAt: string } | null {
  if (user.is_active) return null;
  const logs = getAuditLogs();
  const targetEmail = String(user.email || "").toLowerCase();

  const matchingLog = logs.find((log) => {
    if (log.action !== "DEACTIVATE_USER_ACCOUNT") return false;
    if (log.entity_id === user.id) return true;
    const logEmail = String(
      (log.details as Record<string, unknown> | undefined)?.email || ""
    ).toLowerCase();
    return Boolean(targetEmail && logEmail === targetEmail);
  });

  if (matchingLog && matchingLog.reason) {
    return {
      reason: matchingLog.reason,
      updatedAt: matchingLog.created_at,
    };
  }

  return {
    reason:
      "Akun Anda saat ini dinonaktifkan sementara oleh Administrator. Silakan hubungi Admin Prima Catania untuk informasi pengaktifan kembali.",
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Mengubah status aktif/nonaktif akun peserta tanpa menghapus riwayat ujian,
 * disertai pencatatan wajib ke dalam exam_audit_logs dan sinkronisasi ke Supabase.
 */
export function toggleUserActiveStatus(
  userId: string,
  newActiveState: boolean,
  reason: string
) {
  const profiles = getStoredProfiles();
  const idx = profiles.findIndex((p) => p.id === userId);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  const previous = profiles[idx].is_active;
  const updatedProfile: ProfileRow = {
    ...profiles[idx],
    is_active: newActiveState,
    updated_at: now,
  };
  profiles[idx] = updatedProfile;
  saveStoredProfiles(profiles);

  appendAuditLog({
    action: newActiveState ? "ACTIVATE_USER_ACCOUNT" : "DEACTIVATE_USER_ACCOUNT",
    entity_type: "profiles",
    entity_id: userId,
    reason,
    details: {
      email: updatedProfile.email,
      previous_is_active: previous,
      new_is_active: newActiveState,
    },
  });

  if (typeof window !== "undefined") {
    if (isSupabaseConfigured()) {
      const supabase = createSupabaseBrowserClient();
      void supabase
        .from("profiles")
        .upsert(
          {
            id: updatedProfile.id,
            full_name: updatedProfile.full_name,
            email: updatedProfile.email.toLowerCase(),
            role: updatedProfile.role,
            is_active: newActiveState,
            phone: updatedProfile.phone ?? null,
            institution: updatedProfile.institution ?? null,
            target_selection: updatedProfile.target_selection || "CPNS",
            email_verified: updatedProfile.email_verified ?? true,
            created_at: updatedProfile.created_at || now,
            updated_at: now,
          },
          { onConflict: "email" }
        )
        .then(() => {});
    }

    void fetch("/api/profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: userId,
        email: updatedProfile.email,
        is_active: newActiveState,
      }),
    }).catch(() => {});
  }

  return updatedProfile;
}

/**
 * Menghapus akun peserta secara permanen dari penyimpanan lokal, keanggotaan kelompok,
 * penugasan sesi, serta tabel `public.profiles` di Supabase.
 */
export async function deleteUserAccountPermanently(
  user: ProfileRow
): Promise<void> {
  const cleanEmail = user.email.toLowerCase();

  // 1. Hapus dari daftar profil lokal
  const remainingProfiles = getStoredProfiles().filter(
    (p) => p.id !== user.id && p.email.toLowerCase() !== cleanEmail
  );
  saveStoredProfiles(remainingProfiles);

  // 2. Bersihkan keanggotaan kelompok & grant akses milik akun tersebut
  const remainingMembers = getGroupMembers().filter(
    (gm) => gm.user_id !== user.id && gm.user_id.toLowerCase() !== cleanEmail
  );
  saveGroupMembers(remainingMembers);

  const remainingGrants = getAccessGrants().filter(
    (g) => g.user_id !== user.id
  );
  saveAccessGrants(remainingGrants);

  const remainingAssignments = getRunAssignments().filter(
    (a) => a.user_id !== user.id
  );
  saveRunAssignments(remainingAssignments);

  appendAuditLog({
    action: "DELETE_USER_ACCOUNT",
    entity_type: "profiles",
    entity_id: user.id,
    reason: `Penghapusan permanen akun peserta ${user.full_name} (${user.email}) oleh Admin`,
    details: {
      email: cleanEmail,
      full_name: user.full_name,
    },
  });

  // 3. Hapus / tandai terhapus di Supabase public.profiles & API server
  if (typeof window !== "undefined") {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.from("profiles").delete().eq("id", user.id);
        await supabase.from("profiles").delete().eq("email", cleanEmail);
        // Pastikan jika kebijakan RLS membatasi DELETE langsung dari anon key,
        // baris ditandai sebagai __DELETED_USER__ agar tersinkron terhapus di semua browser
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            full_name: "__DELETED_USER__",
            email: cleanEmail,
            role: "user",
            is_active: false,
            email_verified: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email" }
        );
      } catch {
        // ignore
      }
    }

    await fetch("/api/profiles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, email: cleanEmail }),
    }).catch(() => {});
  }
}

