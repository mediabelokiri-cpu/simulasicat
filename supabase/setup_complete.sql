-- ============================================================================
-- MASTER SQL SETUP (ONE-CLICK RUN) — SIMULASI CAT PRIMA RIB
-- Salin seluruh isi file ini ke Supabase Dashboard -> SQL Editor -> Run
-- Mencakup: 19 Tabel ERD + Indeks + Trigger + RLS Policies + Storage + Seed Kategori
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- BAGIAN 1: 19 TABEL UTAMA SESUAI RANCANGAN ERD FINAL
-- ============================================================================

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    email text NOT NULL UNIQUE,
    role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_active boolean NOT NULL DEFAULT true,
    phone text,
    institution text,
    target_selection text,
    email_verified boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. SIMULATION_CATEGORIES
CREATE TABLE IF NOT EXISTS public.simulation_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE CHECK (slug IN ('cpns', 'sekdin', 'polri')),
    name text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. GROUPS
CREATE TABLE IF NOT EXISTS public.groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. GROUP_MEMBERS
CREATE TABLE IF NOT EXISTS public.group_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (group_id, user_id)
);

-- 5. EXAMS
CREATE TABLE IF NOT EXISTS public.exams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid NOT NULL REFERENCES public.simulation_categories(id) ON DELETE RESTRICT,
    title text NOT NULL,
    description text,
    institution_label text,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'cancelled')),
    access_mode text NOT NULL DEFAULT 'restricted' CHECK (access_mode IN ('open', 'restricted')),
    duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
    settings jsonb NOT NULL DEFAULT '{}'::jsonb,
    publication_config jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. EXAM_SCORING_SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.exam_scoring_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    version_no integer NOT NULL DEFAULT 1,
    scoring_config jsonb NOT NULL,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (exam_id, version_no)
);

-- 7. EXAM_SECTIONS
CREATE TABLE IF NOT EXISTS public.exam_sections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    section_key text NOT NULL,
    title text NOT NULL,
    display_order integer NOT NULL DEFAULT 1,
    question_count integer NOT NULL CHECK (question_count >= 0),
    shuffle_questions boolean NOT NULL DEFAULT true,
    scoring_config jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (exam_id, section_key)
);

-- 8. QUESTIONS
CREATE TABLE IF NOT EXISTS public.questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_code text UNIQUE,
    category_id uuid NOT NULL REFERENCES public.simulation_categories(id) ON DELETE RESTRICT,
    institution_label text,
    subtest_key text NOT NULL,
    question_type text NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'tkp')),
    prompt text NOT NULL,
    options jsonb NOT NULL DEFAULT '[]'::jsonb,
    correct_option text CHECK (correct_option IS NULL OR correct_option IN ('A', 'B', 'C', 'D', 'E')),
    tkp_scores jsonb,
    explanation text,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready_for_review', 'active', 'archived')),
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. QUESTION_ASSETS
CREATE TABLE IF NOT EXISTS public.question_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    placement text NOT NULL CHECK (placement IN ('prompt', 'option')),
    option_key text CHECK (option_key IS NULL OR option_key IN ('A', 'B', 'C', 'D', 'E')),
    storage_path text NOT NULL UNIQUE,
    mime_type text NOT NULL,
    byte_size bigint NOT NULL CHECK (byte_size > 0),
    alt_text text,
    display_order integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. EXAM_QUESTIONS
CREATE TABLE IF NOT EXISTS public.exam_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    section_id uuid NOT NULL REFERENCES public.exam_sections(id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
    display_order integer NOT NULL,
    question_snapshot jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (exam_id, question_id),
    UNIQUE (exam_id, display_order)
);

-- 11. EXAM_ACCESS_GRANTS
CREATE TABLE IF NOT EXISTS public.exam_access_grants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
    granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (user_id IS NOT NULL AND group_id IS NULL) OR
        (user_id IS NULL AND group_id IS NOT NULL)
    )
);

-- 12. EXAM_RUNS
CREATE TABLE IF NOT EXISTS public.exam_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE RESTRICT,
    scoring_snapshot_id uuid NOT NULL REFERENCES public.exam_scoring_snapshots(id) ON DELETE RESTRICT,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'paused', 'completed', 'cancelled')),
    scheduled_start timestamptz NOT NULL,
    scheduled_end timestamptz,
    activated_at timestamptz,
    paused_at timestamptz,
    total_paused_seconds integer NOT NULL DEFAULT 0 CHECK (total_paused_seconds >= 0),
    pause_reason text,
    completed_at timestamptz,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 13. EXAM_RUN_ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.exam_run_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_run_id uuid NOT NULL REFERENCES public.exam_runs(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
    assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (user_id IS NOT NULL AND group_id IS NULL) OR
        (user_id IS NULL AND group_id IS NOT NULL)
    )
);

-- 14. EXAM_SESSIONS
CREATE TABLE IF NOT EXISTS public.exam_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_run_id uuid NOT NULL REFERENCES public.exam_runs(id) ON DELETE RESTRICT,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    attempt_no integer NOT NULL DEFAULT 1 CHECK (attempt_no >= 1),
    status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'timed_out', 'paused', 'cancelled', 'needs_review')),
    started_at timestamptz NOT NULL DEFAULT now(),
    original_deadline_at timestamptz NOT NULL,
    deadline_at timestamptz NOT NULL,
    submitted_at timestamptz,
    last_activity_at timestamptz NOT NULL DEFAULT now(),
    current_question_number integer NOT NULL DEFAULT 1,
    time_extension_seconds integer NOT NULL DEFAULT 0,
    scoring_snapshot_id uuid NOT NULL REFERENCES public.exam_scoring_snapshots(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (exam_run_id, user_id, attempt_no)
);

-- 15. EXAM_SESSION_QUESTIONS
CREATE TABLE IF NOT EXISTS public.exam_session_questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_session_id uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
    exam_question_id uuid NOT NULL REFERENCES public.exam_questions(id) ON DELETE RESTRICT,
    display_number integer NOT NULL CHECK (display_number >= 1),
    section_key text NOT NULL,
    question_snapshot jsonb NOT NULL,
    is_flagged boolean NOT NULL DEFAULT false,
    UNIQUE (exam_session_id, display_number),
    UNIQUE (exam_session_id, exam_question_id)
);

-- 16. ANSWERS
CREATE TABLE IF NOT EXISTS public.answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_session_id uuid NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
    session_question_id uuid NOT NULL REFERENCES public.exam_session_questions(id) ON DELETE CASCADE,
    selected_option text CHECK (selected_option IS NULL OR selected_option IN ('A', 'B', 'C', 'D', 'E')),
    revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
    saved_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (exam_session_id, session_question_id)
);

-- 17. RESULTS
CREATE TABLE IF NOT EXISTS public.results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_session_id uuid NOT NULL UNIQUE REFERENCES public.exam_sessions(id) ON DELETE RESTRICT,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    exam_run_id uuid NOT NULL REFERENCES public.exam_runs(id) ON DELETE RESTRICT,
    total_score numeric(8,2) NOT NULL DEFAULT 0,
    section_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
    thresholds_met boolean NOT NULL DEFAULT false,
    result_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    score_published_at timestamptz,
    explanations_published_at timestamptz,
    answer_key_published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 18. EXAM_INCIDENTS
CREATE TABLE IF NOT EXISTS public.exam_incidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_run_id uuid REFERENCES public.exam_runs(id) ON DELETE CASCADE,
    exam_session_id uuid REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
    incident_type text NOT NULL,
    severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolution_note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz
);

-- 19. EXAM_AUDIT_LOGS
CREATE TABLE IF NOT EXISTS public.exam_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    reason text,
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indeks Performa
CREATE INDEX IF NOT EXISTS idx_profiles_role_active ON public.profiles(role, is_active);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_category_status ON public.questions(category_id, status, subtest_key);
CREATE INDEX IF NOT EXISTS idx_exams_category_status ON public.exams(category_id, status);
CREATE INDEX IF NOT EXISTS idx_exam_runs_exam_status ON public.exam_runs(exam_id, status);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_run_user ON public.exam_sessions(exam_run_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_session_questions_session ON public.exam_session_questions(exam_session_id, display_number);
CREATE INDEX IF NOT EXISTS idx_answers_session ON public.answers(exam_session_id);
CREATE INDEX IF NOT EXISTS idx_results_run_score ON public.results(exam_run_id, total_score DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.exam_incidents(status, severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.exam_audit_logs(entity_type, entity_id, created_at DESC);

-- ============================================================================
-- BAGIAN 2: TRIGGERS & HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_exams_updated_at ON public.exams;
CREATE TRIGGER trg_exams_updated_at
BEFORE UPDATE ON public.exams
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_questions_updated_at ON public.questions;
CREATE TRIGGER trg_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_exam_sessions_updated_at ON public.exam_sessions;
CREATE TRIGGER trg_exam_sessions_updated_at
BEFORE UPDATE ON public.exam_sessions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        role,
        is_active,
        institution,
        target_selection,
        email_verified
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        CASE WHEN lower(NEW.email) IN ('admin@primarib.id', 'admin@simulasicat.id') THEN 'admin' ELSE 'user' END,
        true,
        NEW.raw_user_meta_data->>'institution',
        COALESCE(NEW.raw_user_meta_data->>'target_selection', 'CPNS'),
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        institution = COALESCE(EXCLUDED.institution, public.profiles.institution),
        target_selection = COALESCE(EXCLUDED.target_selection, public.profiles.target_selection),
        updated_at = now();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
          AND is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.sanitize_question_snapshot(full_snapshot jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT full_snapshot - 'correct_option' - 'tkp_scores' - 'explanation';
$$;

-- ============================================================================
-- BAGIAN 3: ROW LEVEL SECURITY (RLS) & STORAGE BUCKET
-- ============================================================================

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

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert_all" ON public.profiles;
CREATE POLICY "profiles_insert_all" ON public.profiles
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update_own_safe" ON public.profiles;
CREATE POLICY "profiles_update_own_safe" ON public.profiles
    FOR UPDATE USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "categories_select_active" ON public.simulation_categories;
CREATE POLICY "categories_select_active" ON public.simulation_categories
    FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "categories_admin_all" ON public.simulation_categories;
CREATE POLICY "categories_admin_all" ON public.simulation_categories
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "groups_select_member_or_admin" ON public.groups;
CREATE POLICY "groups_select_member_or_admin" ON public.groups
    FOR SELECT USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "groups_admin_all" ON public.groups;
CREATE POLICY "groups_admin_all" ON public.groups
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "group_members_select_own_or_admin" ON public.group_members;
CREATE POLICY "group_members_select_own_or_admin" ON public.group_members
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "group_members_admin_all" ON public.group_members;
CREATE POLICY "group_members_admin_all" ON public.group_members
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "exams_select_published_or_admin" ON public.exams;
CREATE POLICY "exams_select_published_or_admin" ON public.exams
    FOR SELECT USING (
        public.is_admin() OR (
            status IN ('scheduled', 'active', 'completed') AND public.is_active_user()
        )
    );

DROP POLICY IF EXISTS "exams_admin_all" ON public.exams;
CREATE POLICY "exams_admin_all" ON public.exams
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "scoring_snapshots_admin_only" ON public.exam_scoring_snapshots;
CREATE POLICY "scoring_snapshots_admin_only" ON public.exam_scoring_snapshots
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "exam_sections_select_authenticated" ON public.exam_sections;
CREATE POLICY "exam_sections_select_authenticated" ON public.exam_sections
    FOR SELECT USING (public.is_active_user() OR public.is_admin());

DROP POLICY IF EXISTS "exam_sections_admin_all" ON public.exam_sections;
CREATE POLICY "exam_sections_admin_all" ON public.exam_sections
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "questions_admin_only" ON public.questions;
CREATE POLICY "questions_admin_only" ON public.questions
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "question_assets_admin_only" ON public.question_assets;
CREATE POLICY "question_assets_admin_only" ON public.question_assets
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "exam_questions_admin_only" ON public.exam_questions;
CREATE POLICY "exam_questions_admin_only" ON public.exam_questions
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "exam_access_grants_select_own_or_admin" ON public.exam_access_grants;
CREATE POLICY "exam_access_grants_select_own_or_admin" ON public.exam_access_grants
    FOR SELECT USING (
        public.is_admin()
        OR user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = exam_access_grants.group_id AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "exam_access_grants_admin_all" ON public.exam_access_grants;
CREATE POLICY "exam_access_grants_admin_all" ON public.exam_access_grants
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "exam_runs_select_authenticated" ON public.exam_runs;
CREATE POLICY "exam_runs_select_authenticated" ON public.exam_runs
    FOR SELECT USING (public.is_active_user() OR public.is_admin());

DROP POLICY IF EXISTS "exam_runs_admin_all" ON public.exam_runs;
CREATE POLICY "exam_runs_admin_all" ON public.exam_runs
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "exam_run_assignments_select_own_or_admin" ON public.exam_run_assignments;
CREATE POLICY "exam_run_assignments_select_own_or_admin" ON public.exam_run_assignments
    FOR SELECT USING (
        public.is_admin()
        OR user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = exam_run_assignments.group_id AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "exam_run_assignments_admin_all" ON public.exam_run_assignments;
CREATE POLICY "exam_run_assignments_admin_all" ON public.exam_run_assignments
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "exam_sessions_select_own_or_admin" ON public.exam_sessions;
CREATE POLICY "exam_sessions_select_own_or_admin" ON public.exam_sessions
    FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "exam_sessions_admin_all" ON public.exam_sessions;
CREATE POLICY "exam_sessions_admin_all" ON public.exam_sessions
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "session_questions_select_own_or_admin" ON public.exam_session_questions;
CREATE POLICY "session_questions_select_own_or_admin" ON public.exam_session_questions
    FOR SELECT USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.exam_sessions es
            WHERE es.id = exam_session_questions.exam_session_id
              AND es.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "session_questions_update_flag_own_active" ON public.exam_session_questions;
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

DROP POLICY IF EXISTS "answers_select_own_or_admin" ON public.answers;
CREATE POLICY "answers_select_own_or_admin" ON public.answers
    FOR SELECT USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.exam_sessions es
            WHERE es.id = answers.exam_session_id
              AND es.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "answers_upsert_own_active_session" ON public.answers;
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

DROP POLICY IF EXISTS "answers_update_own_active_session" ON public.answers;
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

DROP POLICY IF EXISTS "answers_admin_all" ON public.answers;
CREATE POLICY "answers_admin_all" ON public.answers
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "results_select_own_published_or_admin" ON public.results;
CREATE POLICY "results_select_own_published_or_admin" ON public.results
    FOR SELECT USING (
        public.is_admin() OR (
            user_id = auth.uid() AND score_published_at IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "results_admin_all" ON public.results;
CREATE POLICY "results_admin_all" ON public.results
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "incidents_admin_all" ON public.exam_incidents;
CREATE POLICY "incidents_admin_all" ON public.exam_incidents
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "audit_logs_admin_select_insert" ON public.exam_audit_logs;
CREATE POLICY "audit_logs_admin_select_insert" ON public.exam_audit_logs
    FOR ALL USING (public.is_admin());

-- Storage Bucket Privat (question-assets)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'question-assets',
    'question-assets',
    false,
    5242880,
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- BAGIAN 4: SEED DATA MASTER KATEGORI SELEKSI (CPNS, SEKDIN, POLRI)
-- ============================================================================
INSERT INTO public.simulation_categories (id, slug, name, is_active)
VALUES
    ('11111111-1111-4111-8111-111111111101', 'cpns', 'Seleksi CPNS (SKD)', true),
    ('11111111-1111-4111-8111-111111111102', 'sekdin', 'Sekolah Kedinasan (Sekdin)', true),
    ('11111111-1111-4111-8111-111111111103', 'polri', 'Seleksi Penerimaan Polri', true)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;
