import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSupabaseSession(request);
  const { pathname } = request.nextUrl;

  const roleCookie = request.cookies.get("prima_cat_role")?.value;
  const activeCookie = request.cookies.get("prima_cat_active")?.value;

  // Blokir akun yang telah dinonaktifkan Admin
  if (
    activeCookie === "0" &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/ujian") ||
      pathname.startsWith("/admin"))
  ) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Proteksi rute /admin: User biasa tidak boleh mengakses halaman Admin (Bab 3.2 PRD)
  if (pathname.startsWith("/admin") && roleCookie === "user") {
    const userDash = new URL("/dashboard", request.url);
    return NextResponse.redirect(userDash);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
