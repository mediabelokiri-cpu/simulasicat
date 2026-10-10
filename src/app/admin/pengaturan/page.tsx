"use client";

import React, { useEffect, useState } from "react";
import {
  Database,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  StatusBadge,
  Button,
  FormField,
  inputBaseClasses,
  selectBaseClasses,
  ConfirmDialog,
  ToastNotification,
} from "@/components/ui";
import { appendAuditLog } from "@/lib/admin-store";
import { ERD_TABLES_SUMMARY } from "@/lib/mock-store";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const SYSTEM_SETTINGS_KEY = "prima_cat_system_settings_v2_prod";

interface SystemSettingsData {
  orgName: string;
  appTitle: string;
  supportEmail: string;
  timezone: string;
  defaultGraceMins: string;
  signedUrlTtl: string;
  updatedAt?: string;
}

const DEFAULT_SYSTEM_SETTINGS: SystemSettingsData = {
  orgName: "Prima RIB",
  appTitle: "Simulasi CAT Prima RIB",
  supportEmail: "support@primarib.id",
  timezone: "Asia/Makassar (WITA - UTC+8)",
  defaultGraceMins: "15",
  signedUrlTtl: "60",
};

export default function AdminPengaturanPage() {
  const [orgName, setOrgName] = useState(DEFAULT_SYSTEM_SETTINGS.orgName);
  const [appTitle, setAppTitle] = useState(DEFAULT_SYSTEM_SETTINGS.appTitle);
  const [supportEmail, setSupportEmail] = useState(
    DEFAULT_SYSTEM_SETTINGS.supportEmail
  );
  const [timezone, setTimezone] = useState(DEFAULT_SYSTEM_SETTINGS.timezone);
  const [defaultGraceMins, setDefaultGraceMins] = useState(
    DEFAULT_SYSTEM_SETTINGS.defaultGraceMins
  );
  const [signedUrlTtl, setSignedUrlTtl] = useState(
    DEFAULT_SYSTEM_SETTINGS.signedUrlTtl
  );
  const [hydrated, setHydrated] = useState(false);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "warning";
    title: string;
    desc: string;
  } | null>(null);

  const supabaseConnected = isSupabaseConfigured();

  // Muat pengaturan tersimpan saat halaman dibuka / di-refresh
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SYSTEM_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SystemSettingsData>;
        if (parsed.orgName !== undefined) setOrgName(parsed.orgName);
        if (parsed.appTitle !== undefined) setAppTitle(parsed.appTitle);
        if (parsed.supportEmail !== undefined)
          setSupportEmail(parsed.supportEmail);
        if (parsed.timezone !== undefined) setTimezone(parsed.timezone);
        if (parsed.defaultGraceMins !== undefined)
          setDefaultGraceMins(String(parsed.defaultGraceMins));
        if (parsed.signedUrlTtl !== undefined)
          setSignedUrlTtl(String(parsed.signedUrlTtl));
      }
    } catch {
      // ignore
    } finally {
      setHydrated(true);
    }
  }, []);

  // Auto-save setiap kali nilai berubah setelah hydrasi agar tidak hilang saat refresh
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const payload: SystemSettingsData = {
      orgName,
      appTitle,
      supportEmail,
      timezone,
      defaultGraceMins,
      signedUrlTtl,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(SYSTEM_SETTINGS_KEY, JSON.stringify(payload));
  }, [
    hydrated,
    orgName,
    appTitle,
    supportEmail,
    timezone,
    defaultGraceMins,
    signedUrlTtl,
  ]);

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    const payload: SystemSettingsData = {
      orgName,
      appTitle,
      supportEmail,
      timezone,
      defaultGraceMins,
      signedUrlTtl,
      updatedAt: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SYSTEM_SETTINGS_KEY, JSON.stringify(payload));
    }

    appendAuditLog({
      action: "UPDATE_SYSTEM_SETTINGS",
      entity_type: "system_settings",
      entity_id: "global-config",
      reason: "Admin memperbarui konfigurasi umum & kebijakan keamanan sistem",
      details: {
        orgName,
        appTitle,
        supportEmail,
        timezone,
        defaultGraceMins: Number(defaultGraceMins),
        signedUrlTtl: Number(signedUrlTtl),
      },
    });

    setToast({
      type: "success",
      title: "Pengaturan Sistem Disimpan",
      desc: "Konfigurasi instansi, zona waktu, dan kebijakan keamanan default berhasil disimpan secara permanen.",
    });
  }

  function handleClearLocalCache() {
    if (typeof window !== "undefined") {
      // Hanya bersihkan cache sesi ujian sementara, JANGAN hapus pengaturan sistem/homepage/akun admin
      const preservedKeys = new Set([
        SYSTEM_SETTINGS_KEY,
        "prima_cat_homepage_config_v2_prod",
        "prima_cat_live_score_settings_v2_prod",
        "prima_cat_active_user_v2_prod",
        "prima_cat_profiles_v2_prod",
      ]);
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith("prima_cat_") && !preservedKeys.has(k)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    }
    setResetModalOpen(false);
    setToast({
      type: "warning",
      title: "Cache SesiSementara Dibersihkan",
      desc: "Cache sesi sementara telah dibersihkan tanpa menghapus Pengaturan Sistem dan Konfigurasi Homepage Anda.",
    });
  }

  return (
    <AppShell
      role="admin"
      userName="Administrator Utama"
      userSubtitle="Pengaturan Sistem & Arsitektur"
    >
      <PageHeader
        title="Pengaturan Aplikasi & Kebijakan Sistem"
        description="Kelola profil instansi Prima RIB, kebijakan keamanan ruang ujian CAT, konfigurasi bucket privat Supabase Storage, dan utilitas sistem."
        badge={<StatusBadge variant="active" label="Production Ready" />}
        actions={
          <Button
            variant="outline"
            onClick={() => setResetModalOpen(true)}
            leftIcon={<RotateCcw className="h-4 w-4 text-red-600" />}
          >
            Bersihkan Cache Browser
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

      {/* Status Koneksi Environment Supabase */}
      <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          {supabaseConnected ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-sm font-extrabold text-[#151515]">
              Status Koneksi Supabase:{" "}
              {supabaseConnected
                ? "Terhubung ke Supabase Produksi"
                : "Menunggu Konfigurasi Environment (.env.local / Vercel Env)"}
            </p>
            <p className="text-xs text-neutral-600 mt-0.5">
              {supabaseConnected
                ? "Variabel NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY telah terdeteksi aktif."
                : "Isi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY pada environment deployment Anda."}
            </p>
          </div>
        </div>
        <StatusBadge
          variant={supabaseConnected ? "active" : "scheduled"}
          label={supabaseConnected ? "Supabase Connected" : "Standalone Mode"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Form Pengaturan Instansi & Kebijakan Default (7/12) */}
        <form
          onSubmit={handleSaveSettings}
          className="lg:col-span-7 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-5"
        >
          <div className="border-b border-neutral-100 pb-3">
            <h2 className="text-base font-extrabold text-[#151515] flex items-center gap-2">
              <Settings className="h-5 w-5 text-[#0b49d0]" />
              <span>Identitas Instansi & Parameter Operasional</span>
            </h2>
            <p className="text-xs text-neutral-500">
              Pengaturan ini digunakan sebagai nilai bawaan pada pembuatan sesi
              ujian baru dan laporan hasil.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="set-org" label="Nama Instansi Penyelenggara" required>
              <input
                id="set-org"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className={inputBaseClasses}
              />
            </FormField>

            <FormField id="set-title" label="Judul Portal Aplikasi" required>
              <input
                id="set-title"
                type="text"
                value={appTitle}
                onChange={(e) => setAppTitle(e.target.value)}
                className={inputBaseClasses}
              />
            </FormField>

            <FormField id="set-email" label="Email Kontak / Helpdesk Peserta">
              <input
                id="set-email"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className={inputBaseClasses}
              />
            </FormField>

            <FormField id="set-tz" label="Zona Waktu Standar Jadwal Ujian">
              <select
                id="set-tz"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={selectBaseClasses}
              >
                <option value="Asia/Jakarta (WIB - UTC+7)">
                  Asia/Jakarta (WIB - UTC+7)
                </option>
                <option value="Asia/Makassar (WITA - UTC+8)">
                  Asia/Makassar (WITA - UTC+8)
                </option>
                <option value="Asia/Jayapura (WIT - UTC+9)">
                  Asia/Jayapura (WIT - UTC+9)
                </option>
              </select>
            </FormField>

            <FormField
              id="set-grace"
              label="Toleransi Keterlambatan Default (Menit)"
              hint="Batas waktu sebelum memerlukan izin manual Admin"
            >
              <input
                id="set-grace"
                type="number"
                min={0}
                max={60}
                value={defaultGraceMins}
                onChange={(e) => setDefaultGraceMins(e.target.value)}
                className={inputBaseClasses}
              />
            </FormField>

            <FormField
              id="set-ttl"
              label="Masa Berlaku Signed URL Gambar (Menit)"
              hint="Untuk bucket privat question-assets"
            >
              <input
                id="set-ttl"
                type="number"
                min={15}
                max={240}
                value={signedUrlTtl}
                onChange={(e) => setSignedUrlTtl(e.target.value)}
                className={inputBaseClasses}
              />
            </FormField>
          </div>

          <div className="flex justify-end border-t border-neutral-100 pt-4">
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Save className="h-4 w-4" />}
            >
              Simpan Pengaturan
            </Button>
          </div>
        </form>

        {/* Kebijakan Keamanan & Storage (5/12) */}
        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-3.5">
            <h2 className="text-base font-extrabold text-[#151515] flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span>Standar Keamanan & Integritas CAT</span>
            </h2>
            <ul className="space-y-2.5 text-xs text-neutral-700 leading-relaxed">
              <li className="rounded-xl bg-[#fcfbf7] border border-neutral-200 p-3">
                <strong className="text-[#151515] block">
                  1. Proteksi Kunci Jawaban & Penilaian Server-Side
                </strong>
                Payload soal ke perangkat peserta (`SafeQuestionSnapshot`) telah
                dibersihkan dari <code>correct_option</code>,{" "}
                <code>tkp_scores</code>, dan <code>explanation</code>.
              </li>
              <li className="rounded-xl bg-[#fcfbf7] border border-neutral-200 p-3">
                <strong className="text-[#151515] block">
                  2. Pencegahan Eskalasi Role (`role = user`)
                </strong>
                Trigger database PostgreSQL{" "}
                <code>handle_new_auth_user()</code> memaksa seluruh registrasi
                mandiri berstatus <code>user</code>.
              </li>
              <li className="rounded-xl bg-[#fcfbf7] border border-neutral-200 p-3">
                <strong className="text-[#151515] block">
                  3. Private Storage Bucket (`question-assets`)
                </strong>
                Format diizinkan: <code>JPG, PNG, WEBP</code> dengan ukuran
                maksimal <strong>2 MB</strong> per gambar.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#151515] flex items-center gap-2">
                <Database className="h-4 w-4 text-[#0b49d0]" />
                <span>Status Skema 19 Tabel ERD</span>
              </h2>
              <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                19 / 19 Tabel Siap
              </span>
            </div>
            <p className="text-xs text-neutral-600">
              File migrasi SQL lengkap tersedia di{" "}
              <code>supabase/migrations/</code> dan siap dijalankan pada
              Supabase produksi.
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {ERD_TABLES_SUMMARY.map((t) => (
                <div
                  key={t.no}
                  className="flex items-center justify-between rounded-lg border border-neutral-100 bg-[#fcfbf7] px-2.5 py-1.5 text-xs"
                >
                  <span className="font-mono font-bold text-[#0b49d0]">
                    {t.no}. {t.name}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {t.group}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onConfirm={handleClearLocalCache}
        variant="danger"
        title="Bersihkan Cache Penyimpanan Browser?"
        description="Seluruh cache penyimpanan lokal aplikasi di browser ini akan dibersihkan."
        confirmLabel="Ya, Bersihkan Cache"
      />
    </AppShell>
  );
}
