import { createBrowserClient } from "@supabase/ssr";

/**
 * Mengecek apakah kredensial Supabase telah dikonfigurasi secara nyata di .env.local.
 * Sebelum masuk fase Prepare Deployment, fungsi ini akan bernilai false sehingga
 * localhost otomatis menggunakan Localhost Adapter Store (19 Tabel ERD).
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      anonKey &&
      !url.includes("your-project-id") &&
      !anonKey.includes("your-anon-key")
  );
}

export function createClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://placeholder-project.supabase.co";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createBrowserClient(url, anonKey);
}
