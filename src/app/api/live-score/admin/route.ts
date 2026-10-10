import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getServerCachedBoard,
  getServerCachedLiveScoreSettings,
  LiveScorePublicationSettings,
  normalizeLiveScoreSettings,
  RunLiveScoreBoardResult,
  setServerCachedBoard,
  setServerCachedLiveScoreSettings,
} from "@/lib/live-score";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function verifyAdminRequest(): Promise<{
  isAdmin: boolean;
  actorId: string;
}> {
  const cookieStore = await cookies();
  const roleCookie = cookieStore.get("prima_cat_role")?.value;
  const activeCookie = cookieStore.get("prima_cat_active")?.value;

  if (roleCookie === "admin" && activeCookie !== "0") {
    return { isAdmin: true, actorId: "usr-admin-01" };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role, is_active")
          .eq("id", user.id)
          .maybeSingle();
        if (profile && profile.role === "admin" && profile.is_active) {
          return { isAdmin: true, actorId: profile.id };
        }
      }
    } catch {
      // ignore
    }
  }

  return { isAdmin: false, actorId: "" };
}

/**
 * GET /api/live-score/admin
 * Endpoint otoritatif khusus Admin. Menolak akses pengunjung publik dan peserta biasa (403 Forbidden).
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest();
  if (!auth.isAdmin) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Akses ditolak. Endpoint Live Score Admin hanya dapat diakses oleh Administrator aktif.",
      },
      { status: 403 }
    );
  }

  const runId = request.nextUrl.searchParams.get("runId");
  const settings = getServerCachedLiveScoreSettings();
  const board = runId ? getServerCachedBoard(runId) : null;

  return NextResponse.json({
    ok: true,
    settings,
    board,
    serverTimestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/live-score/admin
 * Menyinkronkan snapshot Live Score atau memperbarui pengaturan publikasi Homepage.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action?: "SYNC_SNAPSHOT" | "UPDATE_SETTINGS";
      settings?: Partial<LiveScorePublicationSettings>;
      boardsByRunId?: Record<string, RunLiveScoreBoardResult>;
    };

    const auth = await verifyAdminRequest();

    if (body.action === "UPDATE_SETTINGS") {
      if (!auth.isAdmin) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Akses ditolak. Hanya Administrator yang dapat mengubah pengaturan publikasi Live Score.",
          },
          { status: 403 }
        );
      }

      const current = getServerCachedLiveScoreSettings();
      const updated = normalizeLiveScoreSettings({
        ...current,
        ...(body.settings || {}),
        updatedBy: auth.actorId,
        updatedAt: new Date().toISOString(),
      });
      setServerCachedLiveScoreSettings(updated);

      return NextResponse.json({
        ok: true,
        settings: updated,
      });
    }

    // SYNC_SNAPSHOT: menyimpan hasil perhitungan skor terbaru di cache server
    // Perubahan settings hanya diterima jika pemanggil adalah Admin terverifikasi
    if (auth.isAdmin && body.settings) {
      setServerCachedLiveScoreSettings(
        normalizeLiveScoreSettings(body.settings)
      );
    }

    if (body.boardsByRunId && typeof body.boardsByRunId === "object") {
      for (const [rId, boardData] of Object.entries(body.boardsByRunId)) {
        if (boardData && typeof boardData === "object") {
          setServerCachedBoard(rId, boardData);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      syncedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Payload permintaan tidak valid." },
      { status: 400 }
    );
  }
}
