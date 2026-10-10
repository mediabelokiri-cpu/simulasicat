import { createBrowserClient } from "@supabase/ssr";

export function getSupabasePublicKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Mengecek apakah kredensial Supabase telah dikonfigurasi secara nyata di .env.local / Vercel.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const pubKey = getSupabasePublicKey();
  return Boolean(
    url &&
      pubKey &&
      !url.includes("your-project-id") &&
      !pubKey.includes("your-anon-key")
  );
}

export function createClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://placeholder-project.supabase.co";
  const pubKey = getSupabasePublicKey() || "placeholder-anon-key";

  return createBrowserClient(url, pubKey);
}

export const createSupabaseBrowserClient = createClient;

