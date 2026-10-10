"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Save,
  UserCheck,
  Mail,
  UsersRound,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  StatusBadge,
  Button,
  FormField,
  inputBaseClasses,
  ToastNotification,
} from "@/components/ui";
import {
  getCurrentUserClient,
  setCurrentUserClient,
  updateProfileClient,
} from "@/lib/auth";
import { getGroups, getGroupMembers } from "@/lib/admin-store";
import { EMPTY_USER_FALLBACK } from "@/lib/mock-store";
import { GroupRow, ProfileRow } from "@/types/database";
import { formatDateTimeID } from "@/lib/utils";

export default function ProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileRow>(EMPTY_USER_FALLBACK);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [institution, setInstitution] = useState("");
  const [targetSelection, setTargetSelection] = useState("CPNS");
  const [userGroups, setUserGroups] = useState<GroupRow[]>([]);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    title: string;
    desc: string;
  } | null>(null);

  useEffect(() => {
    const active = getCurrentUserClient();
    if (!active) {
      router.replace("/login");
      return;
    }
    setUser(active);
    setFullName(active.full_name);
    setPhone(active.phone || "");
    setInstitution(active.institution || "");
    setTargetSelection(active.target_selection || "CPNS");

    const allGroups = getGroups();
    const myGroupIds = getGroupMembers()
      .filter((gm) => gm.user_id === active.id)
      .map((gm) => gm.group_id);
    setUserGroups(allGroups.filter((g) => myGroupIds.includes(g.id)));
  }, [router]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const res = updateProfileClient(user.id, {
      full_name: fullName,
      phone,
      institution,
      target_selection: targetSelection,
    });

    if (!res.ok || !res.user) {
      setToast({
        type: "error",
        title: "Gagal Menyimpan Profil",
        desc: res.error || "Terjadi kesalahan validasi input.",
      });
      return;
    }

    setUser(res.user);
    setToast({
      type: "success",
      title: "Profil Berhasil Diperbarui",
      desc: "Perubahan data profil Anda telah disimpan.",
    });
  }

  function handleLogout() {
    setCurrentUserClient(null);
    router.push("/login");
  }

  return (
    <AppShell
      role={user.role}
      userName={user.full_name}
      userSubtitle={
        user.role === "admin"
          ? "Administrator"
          : `Peserta • ${user.target_selection || "CPNS"}`
      }
    >
      <PageHeader
        title="Profil & Akun Saya"
        description="Kelola informasi identitas peserta, target seleksi, dan status verifikasi akun ujian Anda."
        badge={
          user.is_active ? (
            <StatusBadge variant="active" label="Akun Aktif" />
          ) : (
            <StatusBadge variant="danger" label="Akun Nonaktif" />
          )
        }
        actions={
          <Button
            variant="outline"
            onClick={handleLogout}
            leftIcon={<LogOut className="h-4 w-4" />}
          >
            Keluar Akun
          </Button>
        }
      />

      {toast && (
        <div className="mb-6">
          <ToastNotification
            type={toast.type}
            title={toast.title}
            description={toast.desc}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Summary Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0b49d0] text-xl font-bold text-white">
                {(user.full_name || "P").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[#151515] truncate">
                  {user.full_name}
                </h2>
                <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#eef4ff] px-2 py-0.5 text-[11px] font-bold text-[#0b49d0] uppercase">
                    <ShieldCheck className="h-3 w-3" />
                    Role: {user.role}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Status Email:
                </span>
                {user.email_verified !== false ? (
                  <StatusBadge
                    variant="active"
                    label="Terverifikasi"
                    size="sm"
                  />
                ) : (
                  <StatusBadge
                    variant="warning"
                    label="Belum Verifikasi"
                    size="sm"
                  />
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Terdaftar Sejak:</span>
                <span className="font-semibold text-[#151515]">
                  {formatDateTimeID(user.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Group Membership Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-[#0b49d0]" />
              <h3 className="text-sm font-bold text-[#151515]">
                Keanggotaan Kelompok / Kelas
              </h3>
            </div>
            {userGroups.length === 0 ? (
              <p className="text-xs text-neutral-500 leading-relaxed">
                Anda belum tergabung dalam kelompok khusus. Anda tetap dapat
                mengikuti seluruh ujian bertipe <strong>Terbuka (Open)</strong>.
              </p>
            ) : (
              <ul className="space-y-2">
                {userGroups.map((g) => (
                  <li
                    key={g.id}
                    className="rounded-xl border border-neutral-200 bg-[#fcfbf7] p-3"
                  >
                    <p className="text-xs font-bold text-[#151515]">
                      {g.name}
                    </p>
                    {g.description && (
                      <p className="mt-0.5 text-[11px] text-neutral-600">
                        {g.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Edit Profile Form */}
        <div className="lg:col-span-8">
          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7 shadow-xs space-y-5"
          >
            <div className="border-b border-neutral-100 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-[#151515] flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-[#0b49d0]" />
                <span>Perbarui Informasi Peserta</span>
              </h2>
              <p className="mt-0.5 text-xs text-neutral-600">
                Nama lengkap wajib diisi dan digunakan pada laporan hasil ujian
                serta sertifikat/peringkat simulasi.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                id="prof-fullname"
                label="Nama Lengkap"
                required
                className="sm:col-span-2"
              >
                <input
                  id="prof-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputBaseClasses}
                />
              </FormField>

              <FormField
                id="prof-email"
                label="Alamat Email (Tidak Dapat Diubah)"
                hint="Dikelola melalui autentikasi akun."
              >
                <input
                  id="prof-email"
                  type="email"
                  disabled
                  value={user.email}
                  className={inputBaseClasses}
                />
              </FormField>

              <FormField id="prof-phone" label="Nomor Telepon / WhatsApp">
                <input
                  id="prof-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className={inputBaseClasses}
                />
              </FormField>

              <FormField id="prof-institution" label="Institusi / Sekolah Asal">
                <input
                  id="prof-institution"
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Contoh: Bimbel Prima RIB / SMA Mitra"
                  className={inputBaseClasses}
                />
              </FormField>

              <FormField id="prof-target" label="Target Seleksi Utama">
                <select
                  id="prof-target"
                  value={targetSelection}
                  onChange={(e) => setTargetSelection(e.target.value)}
                  className={inputBaseClasses}
                >
                  <option value="CPNS">Seleksi CPNS (SKD)</option>
                  <option value="Sekdin (IPDN)">Sekdin — IPDN</option>
                  <option value="Sekdin (PKN STAN)">Sekdin — PKN STAN</option>
                  <option value="Sekdin (STIS)">Sekdin — Politeknik STIS</option>
                  <option value="Sekdin (STMKG)">Sekdin — STMKG</option>
                  <option value="Polri">Seleksi Penerimaan Polri</option>
                </select>
              </FormField>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:justify-between sm:items-center">
              <Link
                href="/lupa-password"
                className="text-xs font-semibold text-[#0b49d0] hover:underline"
              >
                Ingin mengubah kata sandi akun?
              </Link>
              <Button
                type="submit"
                variant="primary"
                fullWidthMobile
                leftIcon={<Save className="h-4 w-4" />}
              >
                Simpan Perubahan Profil
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
