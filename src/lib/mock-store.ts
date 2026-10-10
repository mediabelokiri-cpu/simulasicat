/**
 * PRODUCTION REFERENCE & STORE CONSTANTS — SIMULASI CAT PRIMA RIB
 * Berisi hanya data master kategori seleksi resmi (CPNS, Sekdin, Polri),
 * preset standar penilaian SKD, dan metadata skema 19 tabel ERD.
 * Seluruh data dummy/demo telah dihapus untuk kesiapan deployment produksi.
 */

import {
  ProfileRow,
  SimulationCategoryRow,
  GroupRow,
  GroupMemberRow,
  ExamRow,
  ExamScoringSnapshotRow,
  ExamSectionRow,
  QuestionRow,
  QuestionAssetRow,
  ExamQuestionRow,
  ExamAccessGrantRow,
  ExamRunRow,
  ExamRunAssignmentRow,
  ExamSessionRow,
  ExamSessionQuestionRow,
  AnswerRow,
  ResultRow,
  ExamIncidentRow,
  ExamAuditLogRow,
  ExamScoringConfig,
} from "@/types/database";

export const SKD_CPNS_2024_PRESET: ExamScoringConfig = {
  preset_name: "Preset Referensi SKD CPNS 2024",
  total_max_score: 550,
  total_passing_grade: null,
  require_all_section_thresholds: true,
  rounding_mode: "none",
  sections: [
    {
      section_key: "TWK",
      title: "Tes Wawasan Kebangsaan (TWK)",
      question_count: 30,
      max_score: 150,
      passing_grade: 65,
      scoring_mode: "standard",
      points_correct: 5,
      points_wrong: 0,
      points_blank: 0,
    },
    {
      section_key: "TIU",
      title: "Tes Intelegensia Umum (TIU)",
      question_count: 35,
      max_score: 175,
      passing_grade: 80,
      scoring_mode: "standard",
      points_correct: 5,
      points_wrong: 0,
      points_blank: 0,
    },
    {
      section_key: "TKP",
      title: "Tes Karakteristik Pribadi (TKP)",
      question_count: 45,
      max_score: 225,
      passing_grade: 166,
      scoring_mode: "tkp",
      points_blank: 0,
    },
  ],
};

// 1. SIMULATION_CATEGORIES (Master Kategori Resmi)
export const INITIAL_CATEGORIES: SimulationCategoryRow[] = [
  {
    id: "cat-cpns",
    slug: "cpns",
    name: "Seleksi CPNS (SKD)",
    is_active: true,
    created_at: "2026-10-01T08:00:00Z",
  },
  {
    id: "cat-sekdin",
    slug: "sekdin",
    name: "Sekolah Kedinasan (Sekdin)",
    is_active: true,
    created_at: "2026-10-01T08:00:00Z",
  },
  {
    id: "cat-polri",
    slug: "polri",
    name: "Seleksi Penerimaan Polri",
    is_active: true,
    created_at: "2026-10-01T08:00:00Z",
  },
];

// Fallback objek profil kosong untuk initial render sebelum hydrasi sesi autentikasi
export const EMPTY_USER_FALLBACK: ProfileRow = {
  id: "",
  full_name: "Pengguna",
  email: "",
  role: "user",
  is_active: true,
  phone: null,
  institution: null,
  target_selection: "CPNS",
  email_verified: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// 2. PROFILES (Akun Bootstrap Administrator Utama; 0 Peserta Dummy)
export const INITIAL_PROFILES: ProfileRow[] = [
  {
    id: "usr-admin-01",
    full_name: "Administrator Utama Prima RIB",
    email: "admin@primarib.id",
    role: "admin",
    is_active: true,
    phone: null,
    institution: "Prima RIB",
    target_selection: "Administrator",
    email_verified: true,
    created_at: "2026-10-01T08:00:00Z",
    updated_at: "2026-10-01T08:00:00Z",
  },
  {
    id: "usr-admin-02",
    full_name: "Administrator Simulasi CAT",
    email: "admin@simulasicat.id",
    role: "admin",
    is_active: true,
    phone: null,
    institution: "Prima RIB",
    target_selection: "Administrator",
    email_verified: true,
    created_at: "2026-10-01T08:00:00Z",
    updated_at: "2026-10-01T08:00:00Z",
  },
];

// 3–19. SELURUH TABEL TRANSAKSIONAL KOSONG (0 DATA DUMMY / DEMO)
export const INITIAL_GROUPS: GroupRow[] = [];
export const INITIAL_GROUP_MEMBERS: GroupMemberRow[] = [];
export const INITIAL_QUESTIONS: QuestionRow[] = [];
export const INITIAL_QUESTION_ASSETS: QuestionAssetRow[] = [];
export const INITIAL_EXAMS: ExamRow[] = [];
export const INITIAL_SCORING_SNAPSHOTS: ExamScoringSnapshotRow[] = [];
export const INITIAL_EXAM_SECTIONS: ExamSectionRow[] = [];
export const INITIAL_EXAM_QUESTIONS: ExamQuestionRow[] = [];
export const INITIAL_EXAM_ACCESS_GRANTS: ExamAccessGrantRow[] = [];
export const INITIAL_EXAM_RUNS: ExamRunRow[] = [];
export const INITIAL_EXAM_RUN_ASSIGNMENTS: ExamRunAssignmentRow[] = [];
export const INITIAL_EXAM_SESSIONS: ExamSessionRow[] = [];
export const INITIAL_EXAM_SESSION_QUESTIONS: ExamSessionQuestionRow[] = [];
export const INITIAL_ANSWERS: AnswerRow[] = [];
export const INITIAL_RESULTS: ResultRow[] = [];
export const INITIAL_EXAM_INCIDENTS: ExamIncidentRow[] = [];
export const INITIAL_AUDIT_LOGS: ExamAuditLogRow[] = [];

export const ERD_TABLES_SUMMARY = [
  { no: 1, name: "profiles", group: "Auth & Users", desc: "Profil pengguna, role (admin/user), dan status aktif akun" },
  { no: 2, name: "simulation_categories", group: "Master Data", desc: "3 Kategori utama: CPNS, Sekdin, dan Polri" },
  { no: 3, name: "groups", group: "Auth & Users", desc: "Kelompok/kelas peserta (mis. Kelas SKD CPNS, Kelas Sekdin)" },
  { no: 4, name: "group_members", group: "Auth & Users", desc: "Relasi keanggotaan peserta di dalam kelompok" },
  { no: 5, name: "exams", group: "Exam Management", desc: "Definisi ujian, durasi, mode akses, dan konfigurasi publikasi" },
  { no: 6, name: "exam_scoring_snapshots", group: "Scoring & Snapshot", desc: "Snapshot versi aturan penilaian agar hasil historis terlindungi" },
  { no: 7, name: "exam_sections", group: "Exam Management", desc: "Definisi blok subtes ujian (mis. TWK, TIU, TKP) & pengacakan" },
  { no: 8, name: "questions", group: "Question Bank", desc: "Bank soal pilihan ganda A-E, kunci jawaban, bobot TKP, & status review" },
  { no: 9, name: "question_assets", group: "Question Bank", desc: "Metadata & path gambar pertanyaan/opsi di private Supabase Storage" },
  { no: 10, name: "exam_questions", group: "Exam Management", desc: "Daftar soal ujian beserta FullQuestionSnapshot di sisi server" },
  { no: 11, name: "exam_access_grants", group: "Access Control", desc: "Hak akses ujian terbatas untuk user atau kelompok tertentu" },
  { no: 12, name: "exam_runs", group: "Scheduling", desc: "Sesi pelaksanaan ujian (Sesi Pagi/Siang), jadwal, & status jeda massal" },
  { no: 13, name: "exam_run_assignments", group: "Access Control", desc: "Penugasan peserta atau kelompok ke sesi pelaksanaan tertentu" },
  { no: 14, name: "exam_sessions", group: "CAT Engine", desc: "Rekam pengerjaan individual peserta, timer deadline server, & ekstensi waktu" },
  { no: 15, name: "exam_session_questions", group: "CAT Engine", desc: "Urutan soal acak per blok subtes yang dibekukan (tanpa kunci jawaban)" },
  { no: 16, name: "answers", group: "CAT Engine", desc: "Jawaban peserta per soal sesi dengan nomor revisi autosave idempoten" },
  { no: 17, name: "results", group: "Scoring & Results", desc: "Skor akhir total, skor per subtes, status passing grade, & jadwal publikasi" },
  { no: 18, name: "exam_incidents", group: "Recovery & Audit", desc: "Catatan gangguan teknis atau kendala sesi peserta" },
  { no: 19, name: "exam_audit_logs", group: "Recovery & Audit", desc: "Jejak audit tindakan sensitif Admin beserta alasan & waktu" },
] as const;
