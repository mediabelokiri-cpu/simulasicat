import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getServerCachedBoard,
  getServerCachedLiveScoreSettings,
  LIVE_SCORE_TIE_BREAKER_DOC,
  PublicLiveScoreResponse,
  sanitizeRowForPublic,
} from "@/lib/live-score";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function checkIsAuthenticatedRequest(): Promise<boolean> {
  const cookieStore = await cookies();
  const roleCookie = cookieStore.get("prima_cat_role")?.value;
  const activeCookie = cookieStore.get("prima_cat_active")?.value;

  if ((roleCookie === "user" || roleCookie === "admin") && activeCookie !== "0") {
    return true;
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) return true;
    } catch {
      // ignore
    }
  }

  return false;
}

/**
 * GET /api/live-score/public
 * Endpoint publik Live Score Homepage dengan validasi izin ketat di server:
 * 1. Jika homepageEnabled === false (OFF), mengembalikan HTTP 403 dan rows: [] (menolak eksposur data).
 * 2. Jika allowedAudience === "authenticated" namun pengunjung belum login, mengembalikan HTTP 401 dan rows: [].
 * 3. Hanya mengembalikan DTO yang telah disanitasi (tanpa email, phone, user_id, kunci jawaban, atau jawaban mentah).
 */
export async function GET() {
  const settings = getServerCachedLiveScoreSettings();
  const now = new Date().toISOString();

  // 1. Validasi Status Publikasi Homepage (Default: OFF)
  if (!settings.homepageEnabled) {
    const disabledPayload: PublicLiveScoreResponse = {
      enabled: false,
      authorized: false,
      reason: "Publikasi Live Score Homepage sedang dinonaktifkan oleh Admin.",
      rows: [],
      generatedAt: now,
    };
    return NextResponse.json(disabledPayload, { status: 403 });
  }

  // 2. Validasi Audiens yang Diizinkan
  const isAuthenticated = await checkIsAuthenticatedRequest();
  if (settings.allowedAudience === "authenticated" && !isAuthenticated) {
    const unauthorizedPayload: PublicLiveScoreResponse = {
      enabled: true,
      authorized: false,
      reason:
        "Live Score ini hanya dapat dilihat oleh peserta yang telah masuk (login).",
      settings: {
        sectionTitle: settings.sectionTitle,
        sectionSubtitle: settings.sectionSubtitle,
        allowedAudience: settings.allowedAudience,
        publicIdentityMode: settings.publicIdentityMode,
        publishedColumns: settings.publishedColumns,
        maxRows: settings.maxRows,
        updatedAt: settings.updatedAt,
      },
      rows: [],
      generatedAt: now,
    };
    return NextResponse.json(unauthorizedPayload, { status: 401 });
  }

  // 3. Pastikan Sesi Ujian yang Dipublikasikan Telah Dipilih (Tidak Mencampur Sesi)
  if (!settings.publishedRunId) {
    const emptyPayload: PublicLiveScoreResponse = {
      enabled: true,
      authorized: true,
      reason: "Admin belum memilih sesi ujian yang dipublikasikan.",
      settings: {
        sectionTitle: settings.sectionTitle,
        sectionSubtitle: settings.sectionSubtitle,
        allowedAudience: settings.allowedAudience,
        publicIdentityMode: settings.publicIdentityMode,
        publishedColumns: settings.publishedColumns,
        maxRows: settings.maxRows,
        updatedAt: settings.updatedAt,
      },
      rows: [],
      generatedAt: now,
    };
    return NextResponse.json(emptyPayload, { status: 200 });
  }

  const board = getServerCachedBoard(settings.publishedRunId);
  if (!board || !board.run) {
    const noBoardPayload: PublicLiveScoreResponse = {
      enabled: true,
      authorized: true,
      settings: {
        sectionTitle: settings.sectionTitle,
        sectionSubtitle: settings.sectionSubtitle,
        allowedAudience: settings.allowedAudience,
        publicIdentityMode: settings.publicIdentityMode,
        publishedColumns: settings.publishedColumns,
        maxRows: settings.maxRows,
        updatedAt: settings.updatedAt,
      },
      runId: settings.publishedRunId,
      tieBreakerRule: LIVE_SCORE_TIE_BREAKER_DOC,
      rows: [],
      generatedAt: now,
    };
    return NextResponse.json(noBoardPayload, { status: 200 });
  }

  // 4. Sanitasi Ketat Baris Data Publik (Masking Identitas & Filter Kolom)
  const sanitizedRows = board.rows
    .slice(0, settings.maxRows)
    .map((row) => sanitizeRowForPublic(row, settings));

  const responsePayload: PublicLiveScoreResponse = {
    enabled: true,
    authorized: true,
    settings: {
      sectionTitle: settings.sectionTitle,
      sectionSubtitle: settings.sectionSubtitle,
      allowedAudience: settings.allowedAudience,
      publicIdentityMode: settings.publicIdentityMode,
      publishedColumns: settings.publishedColumns,
      maxRows: settings.maxRows,
      updatedAt: settings.updatedAt,
    },
    examTitle: board.exam?.title || "Simulasi CAT CATARA",
    runName: board.run.name,
    runId: board.run.id,
    passingGradeConfigured: board.passingGradeConfigured,
    tieBreakerRule: LIVE_SCORE_TIE_BREAKER_DOC,
    rows: sanitizedRows,
    generatedAt: board.generatedAt,
  };

  return NextResponse.json(responsePayload, { status: 200 });
}
