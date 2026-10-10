import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabasePublicKey } from "./client";

/**
 * Supabase Server Client menggunakan session cookies pengguna yang sedang login.
 * Patuh terhadap kebijakan Row Level Security (RLS).
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://placeholder-project.supabase.co";
  const anonKey = getSupabasePublicKey() || "placeholder-anon-key";

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }>
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Diabaikan jika dipanggil dari Server Component murni
        }
      },
    },
  });
}

/**
 * Supabase Service-Role Admin Client KHUSUS operasi server-side
 * seperti perhitungan skor akhir (scoring), pembekuan soal sesi (snapshot),
 * dan pembuatan signed URL gambar soal privat.
 * PENTING: Dilarang keras mengimpor fungsi ini di Client Component.
 */
export function createServiceRoleClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://placeholder-project.supabase.co";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    "placeholder-service-role-key";

  return createSupabaseAdmin(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
