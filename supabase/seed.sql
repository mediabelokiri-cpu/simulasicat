-- ============================================================================
-- SEED DATA AWAL — SIMULASI CAT PRIMA RIB
-- ============================================================================

-- 1. Kategori Simulasi Utama (CPNS, Sekdin, Polri)
INSERT INTO public.simulation_categories (id, slug, name, is_active)
VALUES
    ('11111111-1111-4111-8111-111111111101', 'cpns', 'Seleksi CPNS (SKD)', true),
    ('11111111-1111-4111-8111-111111111102', 'sekdin', 'Sekolah Kedinasan (Sekdin)', true),
    ('11111111-1111-4111-8111-111111111103', 'polri', 'Seleksi Penerimaan Polri', true)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;

-- 2. Panduan Promosi Akun Admin (Jalankan di SQL Editor Supabase setelah akun Admin mendaftar):
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE email = 'admin@primarib.id';
