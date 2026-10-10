-- ============================================================================
-- MIGRATION 04: LIVE SCORE REALTIME, PUBLICATION SETTINGS, RPC & RLS POLICIES
-- Simulasi CAT Prima RIB (CPNS, Sekdin, Polri)
-- ============================================================================
-- Catatan Keamanan & Kompatibilitas:
-- 1. Bersifat aditif (IF NOT EXISTS / CREATE OR REPLACE), aman dijalankan pada
--    database produksi tanpa menghapus data maupun mengubah snapshot ujian.
-- 2. Default publikasi Live Score Homepage adalah OFF (homepage_enabled = false).
-- 3. Default identitas publik adalah Nomor Peserta / Nama Samaran (masked_code).
-- 4. Menyediakan fungsi RPC dengan SECURITY DEFINER dan search_path = public
--    yang memvalidasi otorisasi dan menyaring kolom sensitif di sisi database.
-- ============================================================================

-- 1. Tabel Konfigurasi Publikasi Live Score (Singleton id = 'global')
CREATE TABLE IF NOT EXISTS public.live_score_settings (
    id text PRIMARY KEY DEFAULT 'global' CHECK (id = 'global'),
    homepage_enabled boolean NOT NULL DEFAULT false,
    published_exam_id uuid REFERENCES public.exams(id) ON DELETE SET NULL,
    published_run_id uuid REFERENCES public.exam_runs(id) ON DELETE SET NULL,
    allowed_audience text NOT NULL DEFAULT 'all'
        CHECK (allowed_audience IN ('all', 'authenticated')),
    public_identity_mode text NOT NULL DEFAULT 'masked_code'
        CHECK (public_identity_mode IN ('masked_code', 'full_name')),
    published_columns jsonb NOT NULL DEFAULT '{
        "show_subtest_scores": true,
        "show_total_score": true,
        "show_passing_grade": true,
        "show_exam_status": false,
        "show_progress": false
    }'::jsonb,
    max_rows integer NOT NULL DEFAULT 25 CHECK (max_rows BETWEEN 5 AND 200),
    updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_score_settings_run
    ON public.live_score_settings(published_run_id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_live_score_settings_updated_at ON public.live_score_settings;
CREATE TRIGGER trg_live_score_settings_updated_at
BEFORE UPDATE ON public.live_score_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed baris singleton default (OFF secara default)
INSERT INTO public.live_score_settings (
    id,
    homepage_enabled,
    allowed_audience,
    public_identity_mode
)
VALUES (
    'global',
    false,
    'all',
    'masked_code'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Row Level Security (RLS) untuk live_score_settings
ALTER TABLE public.live_score_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_score_settings_select_public" ON public.live_score_settings;
CREATE POLICY "live_score_settings_select_public"
ON public.live_score_settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "live_score_settings_write_admin" ON public.live_score_settings;
CREATE POLICY "live_score_settings_write_admin"
ON public.live_score_settings FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3. Fungsi Helper Masking Identitas Peserta di Server
CREATE OR REPLACE FUNCTION public.mask_participant_identity(
    p_full_name text,
    p_session_id uuid,
    p_mode text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    v_code text;
    v_words text[];
    v_masked text := '';
    v_word text;
BEGIN
    v_code := 'PST-' || upper(substr(replace(p_session_id::text, '-', ''), 1, 4));
    IF p_mode = 'full_name' THEN
        RETURN v_code || ' • ' || COALESCE(p_full_name, 'Peserta');
    END IF;

    v_words := regexp_split_to_array(trim(COALESCE(p_full_name, 'Peserta')), '\s+');
    FOREACH v_word IN ARRAY v_words LOOP
        IF length(v_word) > 0 THEN
            v_masked := v_masked || CASE WHEN v_masked = '' THEN '' ELSE ' ' END
                || upper(substr(v_word, 1, 1)) || '***';
        END IF;
    END LOOP;

    RETURN v_code || ' • ' || COALESCE(NULLIF(v_masked, ''), 'P***');
END;
$$;

-- 4. RPC Sanitized DTO untuk Live Score Publik (Homepage)
-- Menolak akses jika homepage_enabled = false atau jika allowed_audience = 'authenticated'
-- tetapi pemanggil belum login. Tidak pernah mengekspos kunci jawaban, email, atau jawaban mentah.
CREATE OR REPLACE FUNCTION public.get_public_live_score()
RETURNS TABLE (
    rank_no bigint,
    public_id text,
    display_identity text,
    exam_status text,
    twk_score numeric,
    tiu_score numeric,
    tkp_score numeric,
    total_score numeric,
    passing_grade_status text,
    answered_count integer,
    total_questions integer,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cfg public.live_score_settings%ROWTYPE;
    v_show_subtests boolean;
    v_show_total boolean;
    v_show_pg boolean;
    v_show_status boolean;
    v_show_progress boolean;
BEGIN
    SELECT * INTO v_cfg
    FROM public.live_score_settings
    WHERE id = 'global'
    LIMIT 1;

    -- Jika fitur Live Score Homepage OFF atau belum ada sesi yang dipilih, tolak/kembalikan kosong
    IF NOT FOUND OR v_cfg.homepage_enabled IS NOT TRUE OR v_cfg.published_run_id IS NULL THEN
        RETURN;
    END IF;

    -- Validasi audiens di level database
    IF v_cfg.allowed_audience = 'authenticated' AND auth.uid() IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED_AUDIENCE: Live Score ini hanya dapat diakses oleh pengguna yang telah masuk.';
    END IF;

    v_show_subtests := COALESCE((v_cfg.published_columns->>'show_subtest_scores')::boolean, true);
    v_show_total    := COALESCE((v_cfg.published_columns->>'show_total_score')::boolean, true);
    v_show_pg       := COALESCE((v_cfg.published_columns->>'show_passing_grade')::boolean, true);
    v_show_status   := COALESCE((v_cfg.published_columns->>'show_exam_status')::boolean, false);
    v_show_progress := COALESCE((v_cfg.published_columns->>'show_progress')::boolean, false);

    RETURN QUERY
    WITH session_base AS (
        SELECT
            es.id AS session_id,
            es.user_id,
            es.status AS raw_status,
            es.updated_at AS session_updated_at,
            es.started_at,
            p.full_name,
            r.total_score AS final_total_score,
            r.section_scores AS final_section_scores,
            r.thresholds_met AS final_thresholds_met,
            (
                SELECT count(*)::integer
                FROM public.answers a
                WHERE a.exam_session_id = es.id
                  AND a.selected_option IS NOT NULL
            ) AS ans_count,
            (
                SELECT count(*)::integer
                FROM public.exam_session_questions esq
                WHERE esq.exam_session_id = es.id
            ) AS q_count
        FROM public.exam_sessions es
        JOIN public.profiles p ON p.id = es.user_id
        LEFT JOIN public.results r ON r.exam_session_id = es.id
        WHERE es.exam_run_id = v_cfg.published_run_id
          AND es.status IN ('in_progress', 'submitted', 'timed_out', 'paused')
    ),
    scored AS (
        SELECT
            sb.session_id,
            public.mask_participant_identity(sb.full_name, sb.session_id, v_cfg.public_identity_mode) AS disp_name,
            CASE WHEN v_show_status THEN sb.raw_status ELSE NULL END AS pub_status,
            COALESCE(sb.final_total_score, 0)::numeric AS tot_score,
            CASE
                WHEN NOT v_show_pg THEN 'hidden'
                WHEN sb.final_thresholds_met IS TRUE THEN 'passed'
                ELSE 'failed'
            END AS pg_status,
            CASE WHEN v_show_progress THEN sb.ans_count ELSE NULL END AS pub_ans,
            CASE WHEN v_show_progress THEN sb.q_count ELSE NULL END AS pub_q,
            sb.session_updated_at,
            sb.started_at
        FROM session_base sb
    )
    SELECT
        row_number() OVER (
            ORDER BY
                (CASE WHEN s.pg_status = 'passed' THEN 1 ELSE 0 END) DESC,
                s.tot_score DESC,
                s.started_at ASC
        ) AS rank_no,
        'PST-' || upper(substr(replace(s.session_id::text, '-', ''), 1, 6)) AS public_id,
        s.disp_name AS display_identity,
        s.pub_status AS exam_status,
        CASE WHEN v_show_subtests THEN 0::numeric ELSE NULL END AS twk_score,
        CASE WHEN v_show_subtests THEN 0::numeric ELSE NULL END AS tiu_score,
        CASE WHEN v_show_subtests THEN 0::numeric ELSE NULL END AS tkp_score,
        CASE WHEN v_show_total THEN s.tot_score ELSE NULL END AS total_score,
        s.pg_status AS passing_grade_status,
        s.pub_ans AS answered_count,
        s.pub_q AS total_questions,
        s.session_updated_at AS updated_at
    FROM scored s
    LIMIT v_cfg.max_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_live_score() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_live_score() TO anon, authenticated;

-- ============================================================================
-- ROLLBACK PLAN (Jika diperlukan pemulihan):
-- DROP FUNCTION IF EXISTS public.get_public_live_score();
-- DROP FUNCTION IF EXISTS public.mask_participant_identity(text, uuid, text);
-- DROP TABLE IF EXISTS public.live_score_settings;
-- ============================================================================
