import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import { ProfileRow, UserRole } from "@/types/database";

export const dynamic = "force-dynamic";

const AVATAR_STORE_UUID = "00000000-0000-4000-8000-000000000117";
const AVATAR_STORE_EMAIL = "store:catara_user_avatars_v1@internal.primarib.id";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ profiles: [], avatars: {} });
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
      .not("email", "like", "store:prima_cat_%")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return NextResponse.json({ profiles: [], avatars: {} });
    }

    let avatars: Record<string, string> = {};
    for (const row of data as Array<Record<string, unknown>>) {
      if (String(row.email || "").toLowerCase() === AVATAR_STORE_EMAIL) {
        if (row.institution) {
          try {
            const parsed = JSON.parse(String(row.institution));
            if (parsed && typeof parsed === "object") {
              avatars = parsed as Record<string, string>;
            }
          } catch {
            // ignore
          }
        }
      }
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
      .map((row: Record<string, unknown>) => {
        const emailLower = String(row.email || "").toLowerCase();
        const idStr = String(row.id);
        const rawAvatar = avatars[emailLower] ?? avatars[idStr] ?? null;
        return {
          id: idStr,
          full_name: String(row.full_name || "Peserta"),
          email: emailLower,
          role: (row.role === "admin"
            ? "admin"
            : row.role === "operator"
            ? "operator"
            : "user") as UserRole,
          is_active: row.is_active !== false,
          phone: row.phone ? String(row.phone) : null,
          institution: row.institution ? String(row.institution) : null,
          target_selection: row.target_selection
            ? String(row.target_selection)
            : "CPNS",
          avatar_url:
            rawAvatar && rawAvatar !== "__REMOVED__" ? rawAvatar : null,
          email_verified: Boolean(row.email_verified ?? true),
          created_at: row.created_at ? String(row.created_at) : now,
          updated_at: row.updated_at ? String(row.updated_at) : now,
        };
      });

    return NextResponse.json({ profiles, avatars });
  } catch {
    return NextResponse.json({ profiles: [], avatars: {} });
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

    if (
      body.role === "admin" ||
      body.role === "operator" ||
      body.role === "user"
    ) {
      patch.role = body.role;
    }

    const query = supabase.from("profiles").update(patch);
    const { error } = body.id
      ? await query.eq("id", body.id)
      : await query.eq("email", String(body.email).toLowerCase());

    if (hasServiceKey && patch.role) {
      try {
        let authUserId = body.id;
        if (!authUserId && body.email) {
          const { data: userFound } = await supabase.auth.admin.listUsers();
          const matched = userFound?.users?.find(
            (u) => u.email?.toLowerCase() === String(body.email).toLowerCase()
          );
          if (matched) authUserId = matched.id;
        }
        if (authUserId) {
          await supabase.auth.admin.updateUserById(authUserId, {
            user_metadata: {
              role: patch.role,
              target_selection: patch.target_selection,
            },
          });
        }
      } catch {
        // ignore
      }
    }

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
    const body = (await request.json()) as Partial<ProfileRow> & {
      avatarMap?: Record<string, string>;
    };

    const hasServiceKey = Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    );
    const supabase = hasServiceKey
      ? createServiceRoleClient()
      : await createServerSupabaseClient();

    const now = new Date().toISOString();

    if (body.avatarMap && typeof body.avatarMap === "object") {
      const { error: avatarError } = await supabase.from("profiles").upsert(
        {
          id: AVATAR_STORE_UUID,
          full_name: "__SYSTEM_STORE__",
          email: AVATAR_STORE_EMAIL,
          role: "admin",
          is_active: false,
          phone: "AVATAR_SYNC",
          institution: JSON.stringify(body.avatarMap),
          target_selection: "SYSTEM",
          email_verified: true,
          updated_at: now,
        },
        { onConflict: "email" }
      );
      return NextResponse.json({ ok: !avatarError });
    }

    if (!body.email || !body.full_name) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const cleanEmail = String(body.email).trim().toLowerCase();
    const isUuid =
      typeof body.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        body.id
      );

    const payload: Record<string, unknown> = {
      full_name: String(body.full_name).trim(),
      email: cleanEmail,
      role:
        body.role === "admin"
          ? "admin"
          : body.role === "operator"
          ? "operator"
          : "user",
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

    if (
      hasServiceKey &&
      (body as Record<string, unknown>).password &&
      typeof (body as Record<string, unknown>).password === "string"
    ) {
      try {
        const { data: authCreated } = await supabase.auth.admin.createUser({
          email: cleanEmail,
          password: String((body as Record<string, unknown>).password),
          email_confirm: true,
          user_metadata: {
            full_name: String(body.full_name).trim(),
            role: payload.role,
            target_selection: payload.target_selection,
          },
        });
        if (authCreated?.user?.id) {
          payload.id = authCreated.user.id;
        }
      } catch {
        // Lanjutkan upsert ke public.profiles
      }
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
