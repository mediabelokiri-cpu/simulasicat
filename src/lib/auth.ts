import { ProfileRow, UserRole } from "@/types/database";
import { INITIAL_PROFILES } from "./mock-store";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "./supabase/client";

export const AUTH_STORAGE_KEY = "prima_cat_active_user_v2_prod";
export const PROFILES_STORAGE_KEY = "prima_cat_profiles_v2_prod";
export const AVATARS_STORAGE_KEY = "prima_cat_user_avatars_v2_prod";
const LEGACY_AVATARS_STORAGE_KEY = "catara_user_avatars_v1";
const AVATARS_UPDATED_AT_KEY = "prima_cat_user_avatars_updated_at_v2";
export const AVATAR_STORE_UUID = "00000000-0000-4000-8000-000000000117";
export const AVATAR_STORE_EMAIL =
  "store:catara_user_avatars_v1@internal.primarib.id";

export interface AuthResult {
  ok: boolean;
  error?: string;
  user?: ProfileRow;
  redirectTo?: string;
}

export type AuthUser = ProfileRow;

export function getUserAvatarMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    let map: Record<string, string> = {};
    const legacyRaw = window.localStorage.getItem(LEGACY_AVATARS_STORAGE_KEY);
    if (legacyRaw) {
      try {
        const parsedLegacy = JSON.parse(legacyRaw);
        if (parsedLegacy && typeof parsedLegacy === "object") {
          map = { ...(parsedLegacy as Record<string, string>) };
        }
      } catch {
        // ignore
      }
    }

    const raw = window.localStorage.getItem(AVATARS_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          map = { ...map, ...(parsed as Record<string, string>) };
        }
      } catch {
        // ignore
      }
    }

    // Panen (harvest) avatar_url yang sudah ada di sesi aktif atau daftar profil lokal
    // agar foto yang diunggah sebelum pembaruan langsung ikut tersinkron ke Supabase
    let harvested = false;
    const harvestProfile = (p: Partial<ProfileRow> | null | undefined) => {
      if (!p || !p.avatar_url || p.avatar_url === "__REMOVED__") return;
      const idKey = p.id ? String(p.id).trim() : "";
      const emailKey = p.email ? String(p.email).trim().toLowerCase() : "";
      if (idKey && !map[idKey]) {
        map[idKey] = p.avatar_url;
        harvested = true;
      }
      if (emailKey && !map[emailKey]) {
        map[emailKey] = p.avatar_url;
        harvested = true;
      }
    };

    try {
      const activeRaw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (activeRaw) {
        harvestProfile(JSON.parse(activeRaw) as Partial<ProfileRow>);
      }
    } catch {
      // ignore
    }

    try {
      const profilesRaw = window.localStorage.getItem(PROFILES_STORAGE_KEY);
      if (profilesRaw) {
        const list = JSON.parse(profilesRaw) as Array<Partial<ProfileRow>>;
        if (Array.isArray(list)) {
          for (const item of list) {
            harvestProfile(item);
          }
        }
      }
    } catch {
      // ignore
    }

    if (harvested || (legacyRaw && !raw)) {
      try {
        window.localStorage.setItem(AVATARS_STORAGE_KEY, JSON.stringify(map));
      } catch {
        // ignore
      }
    }

    return map;
  } catch {
    return {};
  }
}

export async function pushAvatarMapToSupabase(
  map: Record<string, string>
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const now = new Date().toISOString();
  try {
    const supabase = createSupabaseBrowserClient();
    await supabase.from("profiles").upsert(
      {
        id: AVATAR_STORE_UUID,
        full_name: "__SYSTEM_STORE__",
        email: AVATAR_STORE_EMAIL,
        role: "admin",
        is_active: false,
        phone: "AVATAR_SYNC",
        institution: JSON.stringify(map),
        target_selection: "SYSTEM",
        email_verified: true,
        updated_at: now,
      },
      { onConflict: "email" }
    );
  } catch {
    // ignore network errors
  }

  if (typeof window !== "undefined") {
    void fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarMap: map }),
    }).catch(() => {});
  }
}

export function saveUserAvatarEntry(
  userId: string | undefined | null,
  email: string | undefined | null,
  avatarUrl: string | null
): void {
  if (typeof window === "undefined") return;
  try {
    const map = getUserAvatarMap();
    const idKey = userId ? String(userId).trim() : "";
    const emailKey = email ? String(email).trim().toLowerCase() : "";

    if (avatarUrl) {
      if (idKey) map[idKey] = avatarUrl;
      if (emailKey) map[emailKey] = avatarUrl;
    } else {
      if (idKey) map[idKey] = "__REMOVED__";
      if (emailKey) map[emailKey] = "__REMOVED__";
    }
    window.localStorage.setItem(AVATARS_STORAGE_KEY, JSON.stringify(map));
    window.localStorage.setItem(AVATARS_UPDATED_AT_KEY, String(Date.now()));
    void pushAvatarMapToSupabase(map);
  } catch {
    // ignore storage quota errors
  }
}

function attachStoredAvatar(
  profile: ProfileRow,
  avatarMap?: Record<string, string>
): ProfileRow {
  const map = avatarMap ?? getUserAvatarMap();
  const emailKey = String(profile.email || "").trim().toLowerCase();
  const idKey = String(profile.id || "").trim();
  const rawAvatar = map[emailKey] ?? map[idKey] ?? profile.avatar_url ?? null;
  const resolvedAvatar =
    rawAvatar && rawAvatar !== "__REMOVED__" ? rawAvatar : null;
  return {
    ...profile,
    avatar_url: resolvedAvatar,
  };
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

    const avatarMap = getUserAvatarMap();
    const raw = window.localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) {
      const initialWithAvatars = INITIAL_PROFILES.map((p) =>
        attachStoredAvatar(p, avatarMap)
      );
      window.localStorage.setItem(
        PROFILES_STORAGE_KEY,
        JSON.stringify(initialWithAvatars)
      );
      return initialWithAvatars;
    }
    const parsed = (JSON.parse(raw) as ProfileRow[])
      .filter(
        (p) =>
          !String(p.email || "")
            .toLowerCase()
            .endsWith("@internal.primarib.id") &&
          p.full_name !== "__SYSTEM_STORE__" &&
          p.full_name !== "__DELETED_USER__"
      )
      .map((p) => attachStoredAvatar(p, avatarMap));
    let modified = false;
    for (const initProfile of INITIAL_PROFILES) {
      if (
        !parsed.some(
          (p) => p.email.toLowerCase() === initProfile.email.toLowerCase()
        )
      ) {
        parsed.push(attachStoredAvatar(initProfile, avatarMap));
        modified = true;
      }
    }
    if (modified) {
      window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return INITIAL_PROFILES;
  }
}

export function saveStoredProfiles(profiles: ProfileRow[]): void {
  if (typeof window === "undefined") return;
  const avatarMap = getUserAvatarMap();
  const enriched = profiles.map((p) => attachStoredAvatar(p, avatarMap));
  window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(enriched));
}

function generateUuid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isValidUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    val
  );
}

let activeProfilesSyncPromise: Promise<ProfileRow[]> | null = null;
let lastProfilesSyncFinishedAt = 0;

/**
 * Mengambil seluruh profil pengguna dari tabel Supabase `public.profiles`
 * dan menggabungkannya dengan cache lokal, sekaligus mendorong (push) akun lokal
 * yang belum masuk ke Supabase (mis. saat terkena limit email Supabase Auth 429).
 */
export async function syncProfilesFromSupabase(): Promise<ProfileRow[]> {
  const localProfiles = getStoredProfiles();
  if (!isSupabaseConfigured()) {
    return localProfiles;
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return localProfiles;
  }
  if (
    typeof document !== "undefined" &&
    document.visibilityState === "hidden" &&
    lastProfilesSyncFinishedAt > 0
  ) {
    return localProfiles;
  }
  if (activeProfilesSyncPromise) {
    return activeProfilesSyncPromise;
  }
  if (Date.now() - lastProfilesSyncFinishedAt < 1500) {
    return localProfiles;
  }

  activeProfilesSyncPromise = (async () => {
    try {
      const fetchedRows: ProfileRow[] = [];
      const deletedEmails = new Set<string>();
      const now = new Date().toISOString();
      let remoteAvatarMap: Record<string, string> = {};
      let hasRemoteAvatarRow = false;

      // 1. Query langsung melalui browser Supabase client (kecualikan baris store:prima_cat_% agar ringan)
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .not("email", "like", "store:prima_cat_%")
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          for (const row of data) {
            const emailStr = String(row.email || "").toLowerCase();
            if (emailStr === AVATAR_STORE_EMAIL) {
              hasRemoteAvatarRow = true;
              if (row.institution) {
                try {
                  const parsedAvatars = JSON.parse(String(row.institution));
                  if (parsedAvatars && typeof parsedAvatars === "object") {
                    remoteAvatarMap = parsedAvatars as Record<string, string>;
                  }
                } catch {
                  // ignore invalid json
                }
              }
              continue;
            }
            if (
              emailStr.endsWith("@internal.primarib.id") ||
              row.full_name === "__SYSTEM_STORE__"
            ) {
              continue;
            }
            if (row.full_name === "__DELETED_USER__") {
              deletedEmails.add(emailStr);
              continue;
            }
            fetchedRows.push({
              id: String(row.id),
              full_name: String(row.full_name || "Peserta"),
              email: emailStr,
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
              email_verified: Boolean(row.email_verified ?? true),
              created_at: row.created_at ? String(row.created_at) : now,
              updated_at: row.updated_at ? String(row.updated_at) : now,
            });
          }
        }
      } catch {
        // ignore
      }

      // 2. Fallback / tambahan melalui endpoint server /api/profiles
      if (
        (fetchedRows.length === 0 || !hasRemoteAvatarRow) &&
        typeof window !== "undefined"
      ) {
        try {
          const res = await fetch("/api/profiles", { cache: "no-store" });
          if (res.ok) {
            const json = (await res.json()) as {
              profiles?: ProfileRow[];
              avatars?: Record<string, string>;
            };
            if (fetchedRows.length === 0 && Array.isArray(json.profiles)) {
              fetchedRows.push(...json.profiles);
            }
            if (
              !hasRemoteAvatarRow &&
              json.avatars &&
              typeof json.avatars === "object"
            ) {
              remoteAvatarMap = {
                ...remoteAvatarMap,
                ...json.avatars,
              };
              if (Object.keys(json.avatars).length > 0) {
                hasRemoteAvatarRow = true;
              }
            }
          }
        } catch {
          // ignore
        }
      }

      // Sinkronkan dua arah peta avatar pengguna (Laptop <-> HP via Supabase)
      if (typeof window !== "undefined") {
        const localAvatarMap = getUserAvatarMap();
        const lastWriteRaw = window.localStorage.getItem(
          AVATARS_UPDATED_AT_KEY
        );
        const localWriteRecent =
          lastWriteRaw && Date.now() - Number(lastWriteRaw) < 20000;

        const mergedAvatarMap: Record<string, string> = localWriteRecent
          ? { ...remoteAvatarMap, ...localAvatarMap }
          : { ...localAvatarMap, ...remoteAvatarMap };

        let needPushAvatars =
          !hasRemoteAvatarRow && Object.keys(localAvatarMap).length > 0;
        for (const [k, v] of Object.entries(localAvatarMap)) {
          if (
            v &&
            (!remoteAvatarMap[k] ||
              (localWriteRecent && remoteAvatarMap[k] !== v))
          ) {
            mergedAvatarMap[k] = v;
            needPushAvatars = true;
          }
        }
        try {
          window.localStorage.setItem(
            AVATARS_STORAGE_KEY,
            JSON.stringify(mergedAvatarMap)
          );
        } catch {
          // ignore
        }
        if (needPushAvatars) {
          await pushAvatarMapToSupabase(mergedAvatarMap);
        }
      }

      // 3. Push akun peserta lokal (role === 'user') yang belum tercatat di Supabase public.profiles
      const remoteEmails = new Set(
        fetchedRows.map((r) => r.email.toLowerCase())
      );
      const unsyncedLocalUsers = localProfiles.filter(
        (lp) =>
          lp.role === "user" &&
          !remoteEmails.has(lp.email.toLowerCase()) &&
          !deletedEmails.has(lp.email.toLowerCase())
      );

      if (unsyncedLocalUsers.length > 0) {
        try {
          const supabase = createSupabaseBrowserClient();
          for (const localUser of unsyncedLocalUsers) {
            const validId = isValidUuid(localUser.id)
              ? localUser.id
              : generateUuid();
            const payload = {
              id: validId,
              full_name: localUser.full_name,
              email: localUser.email.toLowerCase(),
              role: "user" as UserRole,
              is_active: localUser.is_active !== false,
              phone: localUser.phone ?? null,
              institution: localUser.institution ?? null,
              target_selection: localUser.target_selection || "CPNS",
              email_verified: true,
              created_at: localUser.created_at || now,
              updated_at: now,
            };
            const { data: upserted, error: upsertErr } = await supabase
              .from("profiles")
              .upsert(payload, { onConflict: "email" })
              .select("*")
              .maybeSingle();

            if (!upsertErr && upserted) {
              fetchedRows.push({
                ...payload,
                id: String(upserted.id || validId),
              });
            } else {
              fetchedRows.push(payload);
            }
          }
        } catch {
          // ignore
        }
      }

      if (fetchedRows.length === 0 && deletedEmails.size === 0) {
        return localProfiles;
      }

      // Gabungkan fetchedRows (dari Supabase) dengan localProfiles berdasarkan email
      const currentAvatarMap = getUserAvatarMap();
      const mergedByEmail = new Map<string, ProfileRow>();
      for (const lp of localProfiles) {
        if (!deletedEmails.has(lp.email.toLowerCase())) {
          mergedByEmail.set(
            lp.email.toLowerCase(),
            attachStoredAvatar(lp, currentAvatarMap)
          );
        }
      }
      for (const remote of fetchedRows) {
        const emailKey = remote.email.toLowerCase();
        if (deletedEmails.has(emailKey)) continue;
        const existing = mergedByEmail.get(emailKey);
        const combined: ProfileRow = {
          ...existing,
          ...remote,
          institution: remote.institution || existing?.institution || null,
          target_selection:
            remote.target_selection || existing?.target_selection || "CPNS",
          avatar_url:
            remote.avatar_url !== undefined && remote.avatar_url !== null
              ? remote.avatar_url
              : existing?.avatar_url ?? null,
        };
        mergedByEmail.set(
          emailKey,
          attachStoredAvatar(combined, currentAvatarMap)
        );
      }

      const finalProfiles = Array.from(mergedByEmail.values());
      saveStoredProfiles(finalProfiles);

      // Perbarui atau hapus sesi pengguna aktif jika terdampak perubahan/penghapusan dari Admin
      if (typeof window !== "undefined") {
        try {
          const activeRaw = window.localStorage.getItem(AUTH_STORAGE_KEY);
          if (activeRaw) {
            const activeParsed = JSON.parse(activeRaw) as ProfileRow;
            const activeEmail = String(activeParsed.email || "").toLowerCase();
            if (deletedEmails.has(activeEmail)) {
              setCurrentUserClient(null);
            } else {
              const syncedSelf =
                finalProfiles.find((p) => p.id === activeParsed.id) ||
                finalProfiles.find(
                  (p) => p.email.toLowerCase() === activeEmail
                );
              if (syncedSelf) {
                window.localStorage.setItem(
                  AUTH_STORAGE_KEY,
                  JSON.stringify(syncedSelf)
                );
                window.dispatchEvent(new CustomEvent("prima-profiles-synced"));
              }
            }
          }
        } catch {
          // ignore
        }
      }

      return finalProfiles;
    } finally {
      lastProfilesSyncFinishedAt = Date.now();
      activeProfilesSyncPromise = null;
    }
  })();

  return activeProfilesSyncPromise;
}

export function getCurrentUserClient(): ProfileRow | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileRow;
    const avatarMap = getUserAvatarMap();
    // Sinkronkan dengan daftar profil terbaru berdasarkan ID maupun email
    const stored = getStoredProfiles();
    const latest =
      stored.find((p) => p.id === parsed.id) ||
      stored.find(
        (p) =>
          p.email.toLowerCase() === String(parsed.email || "").toLowerCase()
      );
    const resolved = attachStoredAvatar(latest ?? parsed, avatarMap);
    if (
      latest &&
      (latest.id !== parsed.id ||
        latest.is_active !== parsed.is_active ||
        resolved.avatar_url !== parsed.avatar_url)
    ) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(resolved));
    }
    return resolved;
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
  const enriched = attachStoredAvatar(user);
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(enriched));
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
        "Akun Anda saat ini dinonaktifkan oleh Administrator. Riwayat ujian Anda tetap tersimpan, silakan hubungi Admin CATARA.",
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
    redirectTo:
      matched.role === "admin"
        ? "/admin"
        : matched.role === "operator"
        ? "/admin/bank-soal"
        : "/dashboard",
  };
}

/**
 * Validasi Login Asinkron (Utama untuk Supabase Auth + Tabel public.profiles)
 * Memungkinkan akun yang dibuat di Supabase Dashboard (termasuk Admin & Operator) maupun
 * akun peserta lintas perangkat masuk menggunakan kredensial Supabase Auth atau public.profiles.
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

  const isDefaultAdminEmail =
    cleanEmail === "admin@catara.id" ||
    cleanEmail === "admin@primarib.id" ||
    cleanEmail === "admin@simulasicat.id";

  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      const now = new Date().toISOString();

      if (data?.user) {
        const { data: dbProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        const resolvedProfile: ProfileRow = dbProfile
          ? {
              id: dbProfile.id,
              full_name: dbProfile.full_name,
              email: dbProfile.email,
              role: isDefaultAdminEmail
                ? ("admin" as UserRole)
                : ((dbProfile.role as UserRole) || "user"),
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
              role: isDefaultAdminEmail
                ? ("admin" as UserRole)
                : ((data.user.user_metadata?.role as UserRole) || "user"),
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
              "Akun Anda saat ini dinonaktifkan oleh Administrator. Riwayat ujian Anda tetap tersimpan, silakan hubungi Admin CATARA.",
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
            resolvedProfile.role === "admin"
              ? "/admin"
              : resolvedProfile.role === "operator"
              ? "/admin/bank-soal"
              : "/dashboard",
        };
      }

      // Fallback cek langsung ke tabel public.profiles di Supabase (untuk akun lintas browser/HP)
      const { data: remoteByEmail } = await supabase
        .from("profiles")
        .select("*")
        .ilike("email", cleanEmail)
        .maybeSingle();

      if (remoteByEmail) {
        const resolvedRemote: ProfileRow = {
          id: String(remoteByEmail.id),
          full_name: String(remoteByEmail.full_name || "Peserta"),
          email: String(remoteByEmail.email || cleanEmail).toLowerCase(),
          role: isDefaultAdminEmail
            ? ("admin" as UserRole)
            : ((remoteByEmail.role as UserRole) || "user"),
          is_active: remoteByEmail.is_active !== false,
          phone: remoteByEmail.phone ? String(remoteByEmail.phone) : null,
          institution: remoteByEmail.institution
            ? String(remoteByEmail.institution)
            : null,
          target_selection: remoteByEmail.target_selection
            ? String(remoteByEmail.target_selection)
            : "CPNS",
          email_verified: Boolean(remoteByEmail.email_verified ?? true),
          created_at: remoteByEmail.created_at
            ? String(remoteByEmail.created_at)
            : now,
          updated_at: remoteByEmail.updated_at
            ? String(remoteByEmail.updated_at)
            : now,
        };

        if (!resolvedRemote.is_active) {
          return {
            ok: false,
            error:
              "Akun Anda saat ini dinonaktifkan oleh Administrator. Riwayat ujian Anda tetap tersimpan, silakan hubungi Admin CATARA.",
          };
        }

        const stored = getStoredProfiles();
        const existingIdx = stored.findIndex(
          (p) => p.email.toLowerCase() === cleanEmail
        );
        if (existingIdx >= 0) {
          stored[existingIdx] = resolvedRemote;
        } else {
          stored.push(resolvedRemote);
        }
        saveStoredProfiles(stored);
        setCurrentUserClient(resolvedRemote);

        return {
          ok: true,
          user: resolvedRemote,
          redirectTo:
            resolvedRemote.role === "admin"
              ? "/admin"
              : resolvedRemote.role === "operator"
              ? "/admin/bank-soal"
              : "/dashboard",
        };
      }
    } catch {
      // Lanjutkan ke fallback lokal bila terjadi kendala jaringan sementara
    }
  }

  return authenticateUser(email, password);
}

/**
 * Registrasi Mandiri Peserta (Asinkron — Menunggu penyimpanan ke Supabase Auth & public.profiles)
 * PENTING: Memastikan akun yang didaftarkan dari HP atau browser mana pun langsung masuk ke
 * tabel `public.profiles` di Supabase (bahkan jika terkena limit email Supabase Auth 429).
 */
export async function registerPublicUserAsync(input: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  targetSelection?: string;
  institution?: string;
}): Promise<AuthResult> {
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

  const now = new Date().toISOString();
  let profileId = generateUuid();

  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseBrowserClient();

      // 1. Cek apakah email sudah ada di public.profiles
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, email")
        .ilike("email", email)
        .maybeSingle();

      if (existingProfile) {
        return {
          ok: false,
          error:
            "Alamat email ini sudah terdaftar. Silakan masuk melalui halaman Login.",
        };
      }

      // 2. Daftarkan ke Supabase Auth
      const { data, error } = await supabase.auth.signUp({
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

      if (error && error.message.toLowerCase().includes("already registered")) {
        return {
          ok: false,
          error:
            "Alamat email ini sudah terdaftar. Silakan masuk melalui halaman Login.",
        };
      }

      if (data?.user?.id) {
        profileId = data.user.id;
      }

      // 3. SELALU upsert langsung ke public.profiles (agar meskipun Supabase Auth terkena limit email 429,
      //    data peserta tetap langsung tercatat di database Supabase dan muncul di Panel Admin)
      const profilePayload = {
        id: profileId,
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

      const { data: upsertedRow } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "email" })
        .select("id")
        .maybeSingle();

      if (upsertedRow?.id) {
        profileId = String(upsertedRow.id);
      }

      if (typeof window !== "undefined") {
        void fetch("/api/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...profilePayload, id: profileId }),
        }).catch(() => {});
      }
    } catch {
      // Lanjutkan ke penyimpanan lokal jika terjadi gangguan jaringan sementara
    }
  }

  const profiles = getStoredProfiles();
  const newUser: ProfileRow = {
    id: profileId,
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

  const filtered = profiles.filter((p) => p.email.toLowerCase() !== email);
  const updated = [newUser, ...filtered];
  saveStoredProfiles(updated);
  setCurrentUserClient(newUser);

  return {
    ok: true,
    user: newUser,
    redirectTo: "/dashboard",
  };
}

/**
 * Registrasi Mandiri Peserta (Sinkron fallback)
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

export function saveUserAvatarInstant(
  user: ProfileRow,
  avatarUrl: string | null
): ProfileRow {
  saveUserAvatarEntry(user.id, user.email, avatarUrl);
  const profiles = getStoredProfiles();
  const emailLower = String(user.email || "").toLowerCase();
  const idx = profiles.findIndex(
    (p) => p.id === user.id || p.email.toLowerCase() === emailLower
  );

  const updatedUser: ProfileRow = {
    ...(idx !== -1 ? profiles[idx] : user),
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(),
  };

  if (idx !== -1) {
    profiles[idx] = updatedUser;
  } else {
    profiles.push(updatedUser);
  }

  saveStoredProfiles(profiles);
  setCurrentUserClient(updatedUser);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("prima-profiles-synced"));
  }

  return updatedUser;
}

export function updateProfileClient(
  userId: string,
  patch: Pick<
    ProfileRow,
    "full_name" | "phone" | "institution" | "target_selection"
  > & {
    avatar_url?: string | null;
  }
): AuthResult {
  if (!patch.full_name || patch.full_name.trim().length < 3) {
    return { ok: false, error: "Nama lengkap wajib diisi minimal 3 karakter." };
  }

  const activeUser = getCurrentUserClient();
  const activeEmail = String(activeUser?.email || "").toLowerCase();
  const profiles = getStoredProfiles();
  let idx = profiles.findIndex((p) => p.id === userId);
  if (idx === -1 && activeEmail) {
    idx = profiles.findIndex((p) => p.email.toLowerCase() === activeEmail);
  }
  if (idx === -1 && activeUser) {
    profiles.push(activeUser);
    idx = profiles.length - 1;
  }
  if (idx === -1) {
    return { ok: false, error: "Profil pengguna tidak ditemukan." };
  }

  const nextAvatar =
    patch.avatar_url !== undefined
      ? patch.avatar_url
      : profiles[idx].avatar_url ?? null;

  saveUserAvatarEntry(profiles[idx].id, profiles[idx].email, nextAvatar);

  const updatedUser: ProfileRow = {
    ...profiles[idx],
    full_name: patch.full_name.trim(),
    phone: patch.phone?.trim() || null,
    institution: patch.institution?.trim() || null,
    target_selection: patch.target_selection || null,
    avatar_url: nextAvatar,
    updated_at: new Date().toISOString(),
  };

  profiles[idx] = updatedUser;
  saveStoredProfiles(profiles);
  setCurrentUserClient(updatedUser);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("prima-profiles-synced"));
  }

  if (isSupabaseConfigured()) {
    const supabase = createSupabaseBrowserClient();
    void supabase
      ?.from("profiles")
      .update({
        full_name: updatedUser.full_name,
        phone: updatedUser.phone,
        institution: updatedUser.institution,
        target_selection: updatedUser.target_selection,
        updated_at: updatedUser.updated_at,
      })
      .eq("id", updatedUser.id);
  }

  return { ok: true, user: updatedUser };
}
