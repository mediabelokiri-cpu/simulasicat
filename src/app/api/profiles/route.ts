import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import { ProfileRow, UserRole } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ profiles: [] });
  }

  try {
    const hasServiceKey = Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    );
    const supabase = hasServiceKey
      ? createServiceRoleClient()
      : await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return NextResponse.json({ profiles: [] });
    }

    const now = new Date().toISOString();
    const profiles: ProfileRow[] = data
      .filter(
        (row: Record<string, unknown>) =>
          !String(row.email || "")
            .toLowerCase()
            .endsWith("@internal.primarib.id") &&
          row.full_name !== "__SYSTEM_STORE__" &&
          row.full_name !== "__DELETED_USER__"
      )
      .map((row: Record<string, unknown>) => ({
        id: String(row.id),
        full_name: String(row.full_name || "Peserta"),
        email: String(row.email || "").toLowerCase(),
        role: (row.role === "admin" ? "admin" : "user") as UserRole,
        is_active: row.is_active !== false,
        phone: row.phone ? String(row.phone) : null,
        institution: row.institution ? String(row.institution) : null,
        target_selection: row.target_selection
          ? String(row.target_selection)
          : "CPNS",
        email_verified: Boolean(row.email_verified ?? true),
        created_at: row.created_at ? String(row.created_at) : now,
        updated_at: row.updated_at ? String(row.updated_at) : now,
      }));

    return NextResponse.json({ profiles });
  } catch {
    return NextResponse.json({ profiles: [] });
  }
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false });
  }

  try {
    const body = (await request.json()) as Partial<ProfileRow> & { id?: string };
    if (!body.id && !body.email) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const hasServiceKey = Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    );
    const supabase = hasServiceKey
      ? createServiceRoleClient()
      : await createServerSupabaseClient();

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof body.full_name === "string") patch.full_name = body.full_name;
    if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
    if (typeof body.email_verified === "boolean")
      patch.email_verified = body.email_verified;
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.institution !== undefined) patch.institution = body.institution;
    if (body.target_selection !== undefined)
      patch.target_selection = body.target_selection;

    const query = supabase.from("profiles").update(patch);
    const { error } = body.id
      ? await query.eq("id", body.id)
      : await query.eq("email", String(body.email).toLowerCase());

    return NextResponse.json({ ok: !error });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false });
  }

  try {
    const body = (await request.json()) as Partial<ProfileRow>;
    if (!body.email || !body.full_name) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const hasServiceKey = Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    );
    const supabase = hasServiceKey
      ? createServiceRoleClient()
      : await createServerSupabaseClient();

    const now = new Date().toISOString();
    const cleanEmail = String(body.email).trim().toLowerCase();
    const isUuid =
      typeof body.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        body.id
      );

    const payload: Record<string, unknown> = {
      full_name: String(body.full_name).trim(),
      email: cleanEmail,
      role: body.role === "admin" ? "admin" : "user",
      is_active: body.is_active !== false,
      phone: body.phone ?? null,
      institution: body.institution ?? null,
      target_selection: body.target_selection || "CPNS",
      email_verified: body.email_verified ?? true,
      updated_at: now,
    };
    if (isUuid) {
      payload.id = body.id;
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "email" })
      .select("*")
      .maybeSingle();

    return NextResponse.json({ ok: !error, profile: data || null });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false });
  }

  try {
    const body = (await request.json()) as { id?: string; email?: string };
    if (!body.id && !body.email) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const hasServiceKey = Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    );
    const supabase = hasServiceKey
      ? createServiceRoleClient()
      : await createServerSupabaseClient();

    if (body.id) {
      await supabase.from("profiles").delete().eq("id", body.id);
    }
    if (body.email) {
      await supabase
        .from("profiles")
        .delete()
        .eq("email", String(body.email).toLowerCase());
    }

    if (hasServiceKey && body.id) {
      try {
        await supabase.auth.admin.deleteUser(body.id);
      } catch {
        // ignore if user was not in auth.users
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
