-- ============================================================================
-- MIGRATION 01: INITIAL SCHEMA (19 TABEL SESUAI RANCANGAN ERD FINAL)
-- Produk: Simulasi CAT Prima RIB (CPNS, Sekdin, Polri)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- ============================================================================
-- INDEKS PERFORMA
-- ============================================================================
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
