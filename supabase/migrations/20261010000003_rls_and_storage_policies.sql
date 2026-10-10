-- ============================================================================
-- MIGRATION 03: ROW LEVEL SECURITY (RLS) & PRIVATE STORAGE POLICIES
-- Produk: Simulasi CAT Prima RIB
-- ============================================================================

-- Aktifkan RLS pada seluruh 19 tabel ERD
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_scoring_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_run_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES: User lihat/update profil sendiri (tanpa bisa ubah role/is_active); Admin akses penuh
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_own_safe" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
        AND is_active = (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid())
    );

CREATE POLICY "profiles_admin_all" ON public.profiles
    FOR ALL USING (public.is_admin());

-- 2. SIMULATION_CATEGORIES: User aktif boleh baca kategori aktif; Admin akses penuh
CREATE POLICY "categories_select_active" ON public.simulation_categories
    FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "categories_admin_all" ON public.simulation_categories
    FOR ALL USING (public.is_admin());

-- 3 & 4. GROUPS & GROUP_MEMBERS: User melihat grup tempat ia bergabung; Admin akses penuh
CREATE POLICY "groups_select_member_or_admin" ON public.groups
    FOR SELECT USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "groups_admin_all" ON public.groups
    FOR ALL USING (public.is_admin());

CREATE POLICY "group_members_select_own_or_admin" ON public.group_members
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "group_members_admin_all" ON public.group_members
    FOR ALL USING (public.is_admin());

-- 5, 6, 7. EXAMS, EXAM_SCORING_SNAPSHOTS, EXAM_SECTIONS
-- Catatan Keamanan: EXAM_SCORING_SNAPSHOTS hanya boleh diakses Admin / Server
CREATE POLICY "exams_select_published_or_admin" ON public.exams
    FOR SELECT USING (
        public.is_admin() OR (
            status IN ('scheduled', 'active', 'completed') AND public.is_active_user()
        )
    );

CREATE POLICY "exams_admin_all" ON public.exams
    FOR ALL USING (public.is_admin());

CREATE POLICY "scoring_snapshots_admin_only" ON public.exam_scoring_snapshots
    FOR ALL USING (public.is_admin());

CREATE POLICY "exam_sections_select_authenticated" ON public.exam_sections
    FOR SELECT USING (public.is_active_user() OR public.is_admin());

CREATE POLICY "exam_sections_admin_all" ON public.exam_sections
    FOR ALL USING (public.is_admin());

-- 8, 9, 10. QUESTIONS, QUESTION_ASSETS, EXAM_QUESTIONS
-- PENTING (Bab 9.4 & 13 PRD): Tabel QUESTIONS dan EXAM_QUESTIONS memuat kunci jawaban
-- dan bobot TKP, sehingga TIDAK BOLEH dibaca langsung oleh client peserta!
-- Peserta hanya membaca dari EXAM_SESSION_QUESTIONS yang sudah disanitasi.
CREATE POLICY "questions_admin_only" ON public.questions
    FOR ALL USING (public.is_admin());

CREATE POLICY "question_assets_admin_only" ON public.question_assets
    FOR ALL USING (public.is_admin());

CREATE POLICY "exam_questions_admin_only" ON public.exam_questions
    FOR ALL USING (public.is_admin());

-- 11, 12, 13. EXAM_ACCESS_GRANTS, EXAM_RUNS, EXAM_RUN_ASSIGNMENTS
CREATE POLICY "exam_access_grants_select_own_or_admin" ON public.exam_access_grants
    FOR SELECT USING (
        public.is_admin()
        OR user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = exam_access_grants.group_id AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "exam_access_grants_admin_all" ON public.exam_access_grants
    FOR ALL USING (public.is_admin());

CREATE POLICY "exam_runs_select_authenticated" ON public.exam_runs
    FOR SELECT USING (public.is_active_user() OR public.is_admin());

CREATE POLICY "exam_runs_admin_all" ON public.exam_runs
    FOR ALL USING (public.is_admin());

CREATE POLICY "exam_run_assignments_select_own_or_admin" ON public.exam_run_assignments
    FOR SELECT USING (
        public.is_admin()
        OR user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = exam_run_assignments.group_id AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "exam_run_assignments_admin_all" ON public.exam_run_assignments
    FOR ALL USING (public.is_admin());

-- 14 & 15. EXAM_SESSIONS & EXAM_SESSION_QUESTIONS
CREATE POLICY "exam_sessions_select_own_or_admin" ON public.exam_sessions
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "exam_sessions_admin_all" ON public.exam_sessions
    FOR ALL USING (public.is_admin());

CREATE POLICY "session_questions_select_own_or_admin" ON public.exam_session_questions
    FOR SELECT USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.exam_sessions es
            WHERE es.id = exam_session_questions.exam_session_id
              AND es.user_id = auth.uid()
        )
    );

CREATE POLICY "session_questions_update_flag_own_active" ON public.exam_session_questions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.exam_sessions es
            WHERE es.id = exam_session_questions.exam_session_id
              AND es.user_id = auth.uid()
              AND es.status = 'in_progress'
              AND es.deadline_at > now()
        )
    );

-- 16. ANSWERS: Peserta hanya bisa membaca & menyimpan jawaban pada sesi miliknya yang masih aktif
CREATE POLICY "answers_select_own_or_admin" ON public.answers
    FOR SELECT USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.exam_sessions es
            WHERE es.id = answers.exam_session_id
              AND es.user_id = auth.uid()
        )
    );

CREATE POLICY "answers_upsert_own_active_session" ON public.answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.exam_sessions es
            WHERE es.id = answers.exam_session_id
              AND es.user_id = auth.uid()
              AND es.status = 'in_progress'
              AND es.deadline_at > now()
        )
    );

CREATE POLICY "answers_update_own_active_session" ON public.answers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.exam_sessions es
            WHERE es.id = answers.exam_session_id
              AND es.user_id = auth.uid()
              AND es.status = 'in_progress'
              AND es.deadline_at > now()
        )
    );

CREATE POLICY "answers_admin_all" ON public.answers
    FOR ALL USING (public.is_admin());

-- 17. RESULTS: Peserta hanya melihat hasil miliknya yang telah dipublikasikan (score_published_at IS NOT NULL)
CREATE POLICY "results_select_own_published_or_admin" ON public.results
    FOR SELECT USING (
        public.is_admin() OR (
            user_id = auth.uid() AND score_published_at IS NOT NULL
        )
    );

CREATE POLICY "results_admin_all" ON public.results
    FOR ALL USING (public.is_admin());

-- 18 & 19. EXAM_INCIDENTS & EXAM_AUDIT_LOGS: Khusus Admin
CREATE POLICY "incidents_admin_all" ON public.exam_incidents
    FOR ALL USING (public.is_admin());

CREATE POLICY "audit_logs_admin_select_insert" ON public.exam_audit_logs
    FOR ALL USING (public.is_admin());

-- ============================================================================
-- SUPABASE STORAGE: BUCKET PRIVAT UNTUK GAMBAR SOAL
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'question-assets',
    'question-assets',
    false,
    5242880, -- 5 MB per gambar
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
