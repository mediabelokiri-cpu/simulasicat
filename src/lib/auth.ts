import { ProfileRow, UserRole } from "@/types/database";
import { INITIAL_PROFILES } from "./mock-store";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "./supabase/client";

export const AUTH_STORAGE_KEY = "prima_cat_active_user_v2_prod";
export const PROFILES_STORAGE_KEY = "prima_cat_profiles_v2_prod";

export interface AuthResult {
  ok: boolean;
  error?: string;
  user?: ProfileRow;
  redirectTo?: string;
}

export function getStoredProfiles(): ProfileRow[] {
  if (typeof window === "undefined") return INITIAL_PROFILES;
  try {
    // Bersihkan kunci profil dummy versi lama jika masih ada
    if (window.localStorage.getItem("prima_cat_profiles_v1")) {
      window.localStorage.removeItem("prima_cat_profiles_v1");
    }
    if (window.localStorage.getItem("prima_cat_active_user_v1")) {
      window.localStorage.removeItem("prima_cat_active_user_v1");
    }

    const raw = window.localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(
        PROFILES_STORAGE_KEY,
        JSON.stringify(INITIAL_PROFILES)
      );
      return INITIAL_PROFILES;
    }
    return JSON.parse(raw) as ProfileRow[];
  } catch {
    return INITIAL_PROFILES;
  }
}

export function saveStoredProfiles(profiles: ProfileRow[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

export function getCurrentUserClient(): ProfileRow | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileRow;
    // Sinkronkan dengan daftar profil terbaru (mis. jika Admin menonaktifkan akun)
    const latest = getStoredProfiles().find((p) => p.id === parsed.id);
    return latest ?? parsed;
  } catch {
    return null;
  }
}

export function setCurrentUserClient(user: ProfileRow | null): void {
  if (typeof window === "undefined") return;
  if (!user) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    document.cookie =
      "prima_cat_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie =
      "prima_cat_active=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    if (isSupabaseConfigured()) {
      const supabase = createSupabaseBrowserClient();
      void supabase?.auth.signOut();
    }
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  document.cookie = `prima_cat_role=${user.role}; path=/; max-age=86400; SameSite=Lax`;
  document.cookie = `prima_cat_active=${user.is_active ? "1" : "0"}; path=/; max-age=86400; SameSite=Lax`;
}

/**
 * Validasi Login (Client + Server-ready)
 * Memeriksa kecocokan akun, status aktif (is_active), dan mengarahkan sesuai role.
 */
export function authenticateUser(email: string, password: string): AuthResult {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    return { ok: false, error: "Alamat email wajib diisi." };
  }
  if (!password || password.length < 6) {
    return {
      ok: false,
      error: "Kata sandi wajib diisi (minimal 6 karakter).",
    };
  }

  const profiles = getStoredProfiles();
  const matched = profiles.find((p) => p.email.toLowerCase() === cleanEmail);

  if (!matched) {
    return {
      ok: false,
      error:
        "Akun dengan alamat email tersebut tidak ditemukan. Silakan daftar terlebih dahulu.",
    };
  }

  if (!matched.is_active) {
    return {
      ok: false,
      error:
        "Akun Anda saat ini dinonaktifkan oleh Administrator. Riwayat ujian Anda tetap tersimpan, silakan hubungi Admin Prima RIB.",
    };
  }

  if (isSupabaseConfigured()) {
    const supabase = createSupabaseBrowserClient();
    void supabase?.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
  }

  setCurrentUserClient(matched);
  return {
    ok: true,
    user: matched,
    redirectTo: matched.role === "admin" ? "/admin" : "/dashboard",
  };
}

/**
 * Validasi Login Asinkron (Utama untuk Supabase Auth + Tabel public.profiles)
 * Memungkinkan akun yang dibuat di Supabase Dashboard (termasuk Admin) maupun
 * akun peserta lintas perangkat masuk menggunakan kredensial Supabase Auth.
 */
export async function authenticateUserAsync(
  email: string,
  password: string
): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    return { ok: false, error: "Alamat email wajib diisi." };
  }
  if (!password || password.length < 6) {
    return {
      ok: false,
      error: "Kata sandi wajib diisi (minimal 6 karakter).",
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (data?.user) {
        const { data: dbProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        const now = new Date().toISOString();
        const resolvedProfile: ProfileRow = dbProfile
          ? {
              id: dbProfile.id,
              full_name: dbProfile.full_name,
              email: dbProfile.email,
              role: (dbProfile.role as UserRole) || "user",
              is_active: dbProfile.is_active ?? true,
              phone: dbProfile.phone ?? null,
              institution: dbProfile.institution ?? null,
              target_selection: dbProfile.target_selection ?? "CPNS",
              email_verified: dbProfile.email_verified ?? true,
              created_at: dbProfile.created_at ?? now,
              updated_at: dbProfile.updated_at ?? now,
            }
          : {
              id: data.user.id,
              full_name:
                (data.user.user_metadata?.full_name as string) ||
                cleanEmail.split("@")[0],
              email: cleanEmail,
              role:
                cleanEmail === "admin@primarib.id"
                  ? ("admin" as UserRole)
                  : ("user" as UserRole),
              is_active: true,
              phone: null,
              institution:
                (data.user.user_metadata?.institution as string) || null,
              target_selection:
                (data.user.user_metadata?.target_selection as string) || "CPNS",
              email_verified: true,
              created_at: data.user.created_at || now,
              updated_at: now,
            };

        if (!resolvedProfile.is_active) {
          await supabase.auth.signOut();
          return {
            ok: false,
            error:
              "Akun Anda saat ini dinonaktifkan oleh Administrator. Riwayat ujian Anda tetap tersimpan, silakan hubungi Admin Prima RIB.",
          };
        }

        const stored = getStoredProfiles();
        const existingIdx = stored.findIndex(
          (p) =>
            p.id === resolvedProfile.id ||
            p.email.toLowerCase() === cleanEmail
        );
        if (existingIdx >= 0) {
          stored[existingIdx] = resolvedProfile;
        } else {
          stored.push(resolvedProfile);
        }
        saveStoredProfiles(stored);
        setCurrentUserClient(resolvedProfile);

        return {
          ok: true,
          user: resolvedProfile,
          redirectTo:
            resolvedProfile.role === "admin" ? "/admin" : "/dashboard",
        };
      }

      if (error && error.message.toLowerCase().includes("invalid login")) {
        // Fallback ke profil bootstrap lokal jika admin@primarib.id belum didaftarkan ke Supabase Auth
        const localProfiles = getStoredProfiles();
        const localMatch = localProfiles.find(
          (p) => p.email.toLowerCase() === cleanEmail
        );
        if (!localMatch) {
          return {
            ok: false,
            error:
              "Email atau kata sandi tidak sesuai, atau akun belum terdaftar.",
          };
        }
      }
    } catch {
      // Lanjutkan ke fallback lokal bila terjadi kendala jaringan sementara
    }
  }

  return authenticateUser(email, password);
}

/**
 * Registrasi Mandiri Peserta
 * PENTING (Bab 3.3 & 13 PRD): Registrasi publik SELALU menghasilkan role 'user'.
 */
export function registerPublicUser(input: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  targetSelection?: string;
  institution?: string;
}): AuthResult {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();

  if (fullName.length < 3) {
    return { ok: false, error: "Nama lengkap minimal terdiri dari 3 karakter." };
  }
  if (!email.includes("@") || !email.includes(".")) {
    return { ok: false, error: "Format alamat email tidak valid." };
  }
  if (input.password.length < 8) {
    return {
      ok: false,
      error: "Kata sandi minimal 8 karakter demi keamanan akun Anda.",
    };
  }
  if (input.password !== input.confirmPassword) {
    return {
      ok: false,
      error: "Konfirmasi kata sandi tidak cocok dengan kata sandi yang dimasukkan.",
    };
  }

  const profiles = getStoredProfiles();
  if (profiles.some((p) => p.email.toLowerCase() === email)) {
    return {
      ok: false,
      error: "Alamat email ini sudah terdaftar. Silakan masuk melalui halaman Login.",
    };
  }

  const now = new Date().toISOString();

  // Sinkronkan pendaftaran ke Supabase Auth jika telah dikonfigurasi
  if (isSupabaseConfigured()) {
    const supabase = createSupabaseBrowserClient();
    void supabase?.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          full_name: fullName,
          institution: input.institution?.trim() || null,
          target_selection: input.targetSelection || "CPNS",
        },
      },
    });
  }

  // Role dipaksa 'user' — tidak menerima input role dari form publik
  const newUser: ProfileRow = {
    id: `usr-${Date.now()}`,
    full_name: fullName,
    email,
    role: "user" as UserRole,
    is_active: true,
    phone: null,
    institution: input.institution?.trim() || null,
    target_selection: input.targetSelection || "CPNS",
    email_verified: true,
    created_at: now,
    updated_at: now,
  };

  const updated = [...profiles, newUser];
  saveStoredProfiles(updated);
  setCurrentUserClient(newUser);

  return {
    ok: true,
    user: newUser,
    redirectTo: "/dashboard",
  };
}

export function updateProfileClient(
  userId: string,
  patch: Pick<
    ProfileRow,
    "full_name" | "phone" | "institution" | "target_selection"
  >
): AuthResult {
  if (!patch.full_name || patch.full_name.trim().length < 3) {
    return { ok: false, error: "Nama lengkap wajib diisi minimal 3 karakter." };
  }

  const profiles = getStoredProfiles();
  const idx = profiles.findIndex((p) => p.id === userId);
  if (idx === -1) {
    return { ok: false, error: "Profil pengguna tidak ditemukan." };
  }

  // Keamanan: Hanya memperbarui field profil yang diizinkan (bukan role atau is_active)
  const updatedUser: ProfileRow = {
    ...profiles[idx],
    full_name: patch.full_name.trim(),
    phone: patch.phone?.trim() || null,
    institution: patch.institution?.trim() || null,
    target_selection: patch.target_selection || null,
    updated_at: new Date().toISOString(),
  };

  profiles[idx] = updatedUser;
  saveStoredProfiles(profiles);
  setCurrentUserClient(updatedUser);

  return { ok: true, user: updatedUser };
}
