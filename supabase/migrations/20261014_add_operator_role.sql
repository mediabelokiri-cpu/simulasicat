-- ============================================================================
-- MIGRATION: ADD OPERATOR ROLE & BANK SOAL PERMISSIONS
-- Salin dan jalankan script ini di Supabase Dashboard -> SQL Editor -> Run
-- ============================================================================

-- 1. Perbarui Constraint CHECK pada kolom role di tabel public.profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'operator', 'user'));

-- 2. Fungsi Helper untuk memeriksa apakah user saat ini adalah Admin atau Operator
CREATE OR REPLACE FUNCTION public.is_admin_or_operator()
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
          AND role IN ('admin', 'operator')
          AND is_active = true
    );
$$;

-- 3. Perbarui Trigger Pendaftaran Pengguna Baru (Auth Hook)
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
        CASE 
            WHEN lower(NEW.email) IN ('admin@primarib.id', 'admin@simulasicat.id') THEN 'admin'
            WHEN NEW.raw_user_meta_data->>'role' IN ('admin', 'operator') THEN NEW.raw_user_meta_data->>'role'
            ELSE 'user' 
        END,
        true,
        NEW.raw_user_meta_data->>'institution',
        COALESCE(
            NEW.raw_user_meta_data->>'target_selection',
            CASE WHEN NEW.raw_user_meta_data->>'role' = 'operator' THEN 'Operator Bank Soal' ELSE 'CPNS' END
        ),
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = CASE
            WHEN lower(EXCLUDED.email) IN ('admin@primarib.id', 'admin@simulasicat.id') THEN 'admin'
            WHEN EXCLUDED.role IN ('admin', 'operator') THEN EXCLUDED.role
            ELSE public.profiles.role
        END,
        institution = COALESCE(EXCLUDED.institution, public.profiles.institution),
        target_selection = COALESCE(EXCLUDED.target_selection, public.profiles.target_selection),
        updated_at = now();

    RETURN NEW;
END;
$$;

-- 4. Perbarui Kebijakan Row Level Security (RLS) untuk Bank Soal
DROP POLICY IF EXISTS "questions_admin_only" ON public.questions;
CREATE POLICY "questions_admin_only" ON public.questions
    FOR ALL USING (public.is_admin_or_operator());

DROP POLICY IF EXISTS "question_assets_admin_only" ON public.question_assets;
CREATE POLICY "question_assets_admin_only" ON public.question_assets
    FOR ALL USING (public.is_admin_or_operator());

DROP POLICY IF EXISTS "exam_questions_admin_only" ON public.exam_questions;
CREATE POLICY "exam_questions_admin_only" ON public.exam_questions
    FOR ALL USING (public.is_admin_or_operator());

-- 5. Perbarui role dan target_selection untuk akun Operator yang telah dibuat (misal: Munawwara)
UPDATE public.profiles
SET role = 'operator',
    target_selection = 'Operator Bank Soal',
    updated_at = now()
WHERE email ILIKE '%munawwara%' 
   OR full_name ILIKE '%munawwara%';
