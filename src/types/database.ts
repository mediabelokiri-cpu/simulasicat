/**
 * SIMULASI CAT PRIMA RIB — DATABASE TYPES (19 TABEL ERD)
 * Mengacu 100% pada dokumen SIMULASI CAT - RANCANGAN ERD.docx & PRD Final v1.0
 */

export type UserRole = "admin" | "user";

export type SimulationCategorySlug = "cpns" | "sekdin" | "polri";

export type QuestionStatus = "draft" | "ready_for_review" | "active" | "archived";

export type QuestionType = "multiple_choice" | "tkp";

export type OptionKey = "A" | "B" | "C" | "D" | "E";

export type ExamStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "completed"
  | "cancelled";

export type ExamAccessMode = "open" | "restricted";

export type ExamRunStatus =
  | "scheduled"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type ExamSessionStatus =
  | "in_progress"
  | "submitted"
  | "timed_out"
  | "paused"
  | "cancelled"
  | "needs_review";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type IncidentStatus = "open" | "investigating" | "resolved";

export type AssetPlacement = "prompt" | "option";

export interface QuestionOptionItem {
  key: OptionKey;
  text: string;
  asset_id?: string | null;
  asset_url?: string | null;
}

export type TkpScoresMap = Record<OptionKey, number>;

export interface SectionScoringConfig {
  section_key: string;
  title: string;
  question_count: number;
  max_score: number;
  passing_grade: number;
  scoring_mode: "standard" | "tkp";
  points_correct?: number;
  points_wrong?: number;
  points_blank?: number;
}

export interface ExamScoringConfig {
  preset_name: string;
  sections: SectionScoringConfig[];
  total_max_score: number;
  total_passing_grade?: number | null;
  require_all_section_thresholds: boolean;
  rounding_mode?: "none" | "nearest_int" | "two_decimals";
}

export interface ExamSettingsConfig {
  shuffle_sections?: boolean;
  shuffle_questions_per_section: boolean;
  shuffle_options: boolean;
  late_policy: "allow_full_time" | "deduct_time" | "require_admin_approval";
  late_grace_minutes?: number;
  allow_retake: boolean;
  max_attempts: number;
  require_verified_email: boolean;
}

export interface PublicationConfig {
  publish_score_immediately: boolean;
  publish_explanations: boolean;
  publish_answer_key: boolean;
  show_leaderboard: boolean;
  allow_provisional_admin_score: boolean;
}

/**
 * FullQuestionSnapshot disimpan di server (exam_questions).
 * Memuat correct_option dan tkp_scores untuk keperluan scoring di server.
 */
export interface FullQuestionSnapshot {
  question_id: string;
  question_code?: string;
  subtest_key: string;
  question_type: QuestionType;
  prompt: string;
  options: QuestionOptionItem[];
  correct_option?: OptionKey | null;
  tkp_scores?: TkpScoresMap | null;
  explanation?: string | null;
  assets?: QuestionAssetRow[];
}

/**
 * SafeQuestionSnapshot adalah payload yang dikirim ke browser peserta (exam_session_questions).
 * DILARANG memuat correct_option, tkp_scores, atau explanation sebelum dipublikasikan.
 */
export interface SafeQuestionSnapshot {
  question_id: string;
  question_code?: string;
  subtest_key: string;
  question_type: QuestionType;
  prompt: string;
  options: QuestionOptionItem[];
  assets?: QuestionAssetRow[];
}

export interface SectionScoreResult {
  section_key: string;
  title: string;
  score: number;
  max_score: number;
  passing_grade: number;
  passed: boolean;
  answered_count: number;
  correct_count?: number;
  question_count: number;
}

/* =========================================================
 * 19 TABEL ENTITAS SESUAI RANCANGAN ERD
 * ========================================================= */

// 1. PROFILES
export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  phone: string | null;
  institution: string | null;
  target_selection: string | null;
  email_verified?: boolean;
  created_at: string;
  updated_at: string;
}

// 2. SIMULATION_CATEGORIES
export interface SimulationCategoryRow {
  id: string;
  slug: SimulationCategorySlug;
  name: string;
  is_active: boolean;
  created_at: string;
}

// 3. GROUPS
export interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

// 4. GROUP_MEMBERS
export interface GroupMemberRow {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
}

// 5. EXAMS
export interface ExamRow {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  institution_label: string | null;
  status: ExamStatus;
  access_mode: ExamAccessMode;
  duration_minutes: number;
  settings: ExamSettingsConfig;
  publication_config: PublicationConfig;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// 6. EXAM_SCORING_SNAPSHOTS
export interface ExamScoringSnapshotRow {
  id: string;
  exam_id: string;
  version_no: number;
  scoring_config: ExamScoringConfig;
  created_by: string;
  created_at: string;
}

// 7. EXAM_SECTIONS
export interface ExamSectionRow {
  id: string;
  exam_id: string;
  section_key: string;
  title: string;
  display_order: number;
  question_count: number;
  shuffle_questions: boolean;
  scoring_config: SectionScoringConfig;
}

// 8. QUESTIONS
export interface QuestionRow {
  id: string;
  question_code?: string;
  category_id: string;
  institution_label: string | null;
  subtest_key: string;
  question_type: QuestionType;
  prompt: string;
  options: QuestionOptionItem[];
  correct_option: OptionKey | null;
  tkp_scores: TkpScoresMap | null;
  explanation: string | null;
  status: QuestionStatus;
  created_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// 9. QUESTION_ASSETS
export interface QuestionAssetRow {
  id: string;
  question_id: string;
  placement: AssetPlacement;
  option_key: OptionKey | null;
  storage_path: string;
  mime_type: string;
  byte_size: number;
  alt_text: string | null;
  display_order: number;
  created_at: string;
}

// 10. EXAM_QUESTIONS
export interface ExamQuestionRow {
  id: string;
  exam_id: string;
  section_id: string;
  question_id: string;
  display_order: number;
  question_snapshot: FullQuestionSnapshot;
  created_at: string;
}

// 11. EXAM_ACCESS_GRANTS
export interface ExamAccessGrantRow {
  id: string;
  exam_id: string;
  user_id: string | null;
  group_id: string | null;
  granted_by: string;
  created_at: string;
}

// 12. EXAM_RUNS
export interface ExamRunRow {
  id: string;
  exam_id: string;
  scoring_snapshot_id: string;
  name: string;
  status: ExamRunStatus;
  scheduled_start: string;
  scheduled_end: string | null;
  activated_at: string | null;
  paused_at: string | null;
  total_paused_seconds: number;
  pause_reason: string | null;
  late_policy_override?: "allow_full_time" | "deduct_time" | "require_admin_approval";
  completed_at: string | null;
  created_by: string;
  created_at: string;
}

// 13. EXAM_RUN_ASSIGNMENTS
export interface ExamRunAssignmentRow {
  id: string;
  exam_run_id: string;
  user_id: string | null;
  group_id: string | null;
  late_permission_granted?: boolean;
  assigned_by: string;
  created_at: string;
}

// 14. EXAM_SESSIONS
export interface ExamSessionRow {
  id: string;
  exam_run_id: string;
  user_id: string;
  attempt_no: number;
  status: ExamSessionStatus;
  started_at: string;
  original_deadline_at: string;
  deadline_at: string;
  submitted_at: string | null;
  last_activity_at: string;
  current_question_number: number;
  time_extension_seconds: number;
  scoring_snapshot_id: string;
  created_at: string;
  updated_at: string;
}

// 15. EXAM_SESSION_QUESTIONS
export interface ExamSessionQuestionRow {
  id: string;
  exam_session_id: string;
  exam_question_id: string;
  display_number: number;
  section_key: string;
  question_snapshot: SafeQuestionSnapshot;
  is_flagged: boolean;
}

// 16. ANSWERS
export interface AnswerRow {
  id: string;
  exam_session_id: string;
  session_question_id: string;
  selected_option: OptionKey | null;
  revision: number;
  saved_at: string;
}

// 17. RESULTS
export interface ResultRow {
  id: string;
  exam_session_id: string;
  user_id: string;
  exam_run_id: string;
  total_score: number;
  section_scores: SectionScoreResult[];
  thresholds_met: boolean;
  result_snapshot: Record<string, unknown>;
  score_published_at: string | null;
  explanations_published_at: string | null;
  answer_key_published_at: string | null;
  created_at: string;
}

// 18. EXAM_INCIDENTS
export interface ExamIncidentRow {
  id: string;
  exam_run_id: string | null;
  exam_session_id: string | null;
  incident_type: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  details: Record<string, unknown>;
  created_by: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

// 19. EXAM_AUDIT_LOGS
export interface ExamAuditLogRow {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  reason: string | null;
  details: Record<string, unknown>;
  created_at: string;
}
