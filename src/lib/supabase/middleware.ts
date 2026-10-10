import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicKey, isSupabaseConfigured } from "./client";

export async function updateSupabaseSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  });

  if (!isSupabaseConfigured()) {
    return supabaseResponse;
  }

  const pubKey = getSupabasePublicKey()!;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    pubKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }>
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();
  return supabaseResponse;
}
