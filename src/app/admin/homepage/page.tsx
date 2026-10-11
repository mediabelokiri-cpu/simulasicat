"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  EyeOff,
  LayoutTemplate,
  Megaphone,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Award,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  StatusBadge,
  Button,
  FormField,
  inputBaseClasses,
  selectBaseClasses,
  textareaBaseClasses,
  ConfirmDialog,
  ToastNotification,
} from "@/components/ui";
import {
  DEFAULT_HOMEPAGE_CONFIG,
  HomepageCategoryItem,
  HomepageConfig,
  HomepageSectionKey,
  HomepageSecurityFeature,
  getHomepageConfig,
  resetHomepageConfig,
  saveHomepageConfig,
} from "@/lib/homepage-store";
import { appendAuditLog, getExamRuns, getExams } from "@/lib/admin-store";
import { ExamRow, ExamRunRow } from "@/types/database";
import { cn } from "@/lib/utils";

type EditorTab = "layout" | "header" | "hero" | "categories" | "leaderboard";

const SECTION_LABELS: Record<
  HomepageSectionKey,
  { title: string; desc: string }
> = {
  hero: {
    title: "Hero Section & Kartu Standar Keamanan",
    desc: "Judul utama portal, tombol CTA masuk/registrasi, 3 metrik keunggulan, dan kartu arsitektur keamanan CAT.",
  },
  categories: {
    title: "Section Kategori Simulasi Seleksi",
    desc: "Kartu informasi kategori seleksi (CPNS SKD, Sekolah Kedinasan, Seleksi Polri, atau kategori kustom).",
  },
  leaderboard: {
    title: "Section Papan Leaderboard Hasil Ujian",
    desc: "Papan peringkat nilai akhir resmi peserta yang otomatis terisi setelah sesi simulasi CAT atau ujian berakhir.",
  },
};

export default function AdminHomepagePage() {
  const [config, setConfig] = useState<HomepageConfig>(DEFAULT_HOMEPAGE_CONFIG);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>("layout");
  const [runs, setRuns] = useState<ExamRunRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "warning";
    title: string;
    desc: string;
  } | null>(null);

  useEffect(() => {
    const loaded = getHomepageConfig();
    setConfig(loaded);
    setRuns(getExamRuns());
    setExams(getExams());
    setHydrated(true);
  }, []);

  // Auto-save setiap perubahan konfigurasi Homepage setelah hydrasi agar tidak kembali semula saat di-refresh
  useEffect(() => {
    if (!hydrated) return;
    saveHomepageConfig(config);
  }, [hydrated, config]);

  function handleSaveAll(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const saved = saveHomepageConfig(config);
    setConfig(saved);

    appendAuditLog({
      action: "UPDATE_HOMEPAGE_CMS",
      entity_type: "homepage_config",
      entity_id: "landing-page",
      reason: "Admin memperbarui tata letak dan konten halaman depan (Homepage)",
      details: {
        sectionOrder: saved.sectionOrder,
        heroEnabled: saved.hero.enabled,
        categoriesEnabled: saved.categories.enabled,
        leaderboardEnabled: saved.leaderboard.enabled,
        announcementEnabled: saved.announcement.enabled,
      },
    });

    setToast({
      type: "success",
      title: "Perubahan Homepage Disimpan",
      desc: "Seluruh pengaturan section, urutan tampil, dan Papan Leaderboard Hasil Ujian telah diperbarui.",
    });
  }

  function handleResetDefault() {
    const def = resetHomepageConfig();
    setConfig(def);
    setResetModalOpen(false);
    setToast({
      type: "warning",
      title: "Homepage Dikembalikan ke Default",
      desc: "Seluruh konten dan urutan section halaman depan telah dikembalikan ke pengaturan awal CATARA.",
    });
  }

  function moveSection(index: number, direction: "up" | "down") {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= config.sectionOrder.length) return;
    const nextOrder = [...config.sectionOrder];
    const temp = nextOrder[index];
    nextOrder[index] = nextOrder[targetIdx];
    nextOrder[targetIdx] = temp;
    setConfig((prev) => ({ ...prev, sectionOrder: nextOrder }));
  }

  function toggleSectionEnabled(key: HomepageSectionKey) {
    setConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key].enabled,
      },
    }));
  }

  // Helpers untuk Hero Security Features
  function addSecurityFeature() {
    const newFeat: HomepageSecurityFeature = {
      id: `sec-${Date.now()}`,
      title: "Fitur Keamanan Baru:",
      description: "Tuliskan penjelasan keunggulan sistem di sini.",
    };
    setConfig((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        securityFeatures: [...prev.hero.securityFeatures, newFeat],
      },
    }));
  }

  function updateSecurityFeature(
    id: string,
    patch: Partial<HomepageSecurityFeature>
  ) {
    setConfig((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        securityFeatures: prev.hero.securityFeatures.map((f) =>
          f.id === id ? { ...f, ...patch } : f
        ),
      },
    }));
  }

  function removeSecurityFeature(id: string) {
    setConfig((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        securityFeatures: prev.hero.securityFeatures.filter((f) => f.id !== id),
      },
    }));
  }

  // Helpers untuk Kartu Kategori
  function addCategoryCard() {
    const nextNum = config.categories.items.length + 1;
    const newItem: HomepageCategoryItem = {
      id: `cat-card-${Date.now()}`,
      title: `${nextNum}. Kategori Seleksi Baru`,
      description:
        "Tuliskan rincian subtes, sistem penilaian, atau instansi tujuan untuk kategori ini.",
      icon: "award",
    };
    setConfig((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        items: [...prev.categories.items, newItem],
      },
    }));
  }

  function updateCategoryCard(
    id: string,
    patch: Partial<HomepageCategoryItem>
  ) {
    setConfig((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        items: prev.categories.items.map((item) =>
          item.id === id ? { ...item, ...patch } : item
        ),
      },
    }));
  }

  function removeCategoryCard(id: string) {
    setConfig((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        items: prev.categories.items.filter((item) => item.id !== id),
      },
    }));
  }

  return (
    <AppShell
      role="admin"
      userName="Administrator Utama"
      userSubtitle="Manajemen Konten Homepage"
    >
      <PageHeader
        title="Kelola Section & Konten Homepage"
        description="Atur visibilitas, urutan tampil, teks judul, tombol aksi, kartu kategori seleksi, hingga pengaturan Leaderboard Hasil Ujian di halaman utama."
        badge={<StatusBadge variant="featured" label="Homepage CMS" />}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/" target="_blank">
              <Button
                variant="outline"
                leftIcon={<ExternalLink className="h-4 w-4" />}
              >
                Lihat Homepage
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => setResetModalOpen(true)}
              leftIcon={<RotateCcw className="h-4 w-4 text-red-600" />}
            >
              Reset Default
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSaveAll()}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Simpan Perubahan
            </Button>
          </div>
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

      {/* Navigasi Tab Editor Homepage */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
        {[
          {
            id: "layout" as const,
            label: "1. Urutan & Visibilitas Section",
            icon: LayoutTemplate,
          },
          {
            id: "header" as const,
            label: "2. Header & Pengumuman",
            icon: Megaphone,
          },
          {
            id: "hero" as const,
            label: "3. Hero & Kartu Keamanan",
            icon: Sparkles,
          },
          {
            id: "categories" as const,
            label: "4. Kategori Seleksi",
            icon: Award,
          },
          {
            id: "leaderboard" as const,
            label: "5. Leaderboard & Footer",
            icon: Trophy,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-colors cursor-pointer",
                active
                  ? "bg-gradient-to-r from-[#494ae2] to-[#7854ec] text-white shadow-xs"
                  : "bg-white text-neutral-700 border border-neutral-200 hover:bg-[#f5f8ff]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* TAB 1: URUTAN & VISIBILITAS SECTION */}
        {activeTab === "layout" && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-6">
            <div className="border-b border-neutral-100 pb-4">
              <h2 className="text-base sm:text-lg font-extrabold text-[#0c0c13]">
                Atur Visibilitas & Urutan Section Homepage
              </h2>
              <p className="text-xs text-neutral-500">
                Aktifkan atau sembunyikan section tertentu dan gunakan tombol
                panah atas/bawah untuk mengubah urutan tampilnya di halaman
                utama.
              </p>
            </div>

            {/* Banner Pengumuman & Footer Quick Toggles */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-[#f5f8ff] p-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-extrabold text-[#0c0c13]">
                    Banner Pengumuman Atas
                  </p>
                  <p className="text-xs text-neutral-500">
                    Pita pengumuman di bagian paling atas halaman depan
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={config.announcement.enabled ? "primary" : "outline"}
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      announcement: {
                        ...prev.announcement,
                        enabled: !prev.announcement.enabled,
                      },
                    }))
                  }
                  leftIcon={
                    config.announcement.enabled ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )
                  }
                >
                  {config.announcement.enabled ? "Ditampilkan" : "Disembunyikan"}
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-[#f5f8ff] p-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-extrabold text-[#0c0c13]">
                    Footer Halaman Depan
                  </p>
                  <p className="text-xs text-neutral-500">
                    Baris informasi hak cipta dan identitas di bagian bawah
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={config.footer.enabled ? "primary" : "outline"}
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      footer: {
                        ...prev.footer,
                        enabled: !prev.footer.enabled,
                      },
                    }))
                  }
                  leftIcon={
                    config.footer.enabled ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )
                  }
                >
                  {config.footer.enabled ? "Ditampilkan" : "Disembunyikan"}
                </Button>
              </div>
            </div>

            {/* Daftar Urutan 3 Section Utama */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Urutan Section Utama (Atas ke Bawah)
              </p>

              {config.sectionOrder.map((secKey, idx) => {
                const info = SECTION_LABELS[secKey];
                const isEnabled = config[secKey].enabled;

                return (
                  <div
                    key={secKey}
                    className={cn(
                      "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border p-4 transition-colors",
                      isEnabled
                        ? "border-neutral-200 bg-white"
                        : "border-neutral-200 bg-neutral-50 opacity-75"
                    )}
                  >
                    <div className="flex items-start gap-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#494ae2] to-[#7854ec] text-xs font-extrabold text-white tabular-nums">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-extrabold text-[#0c0c13]">
                            {info.title}
                          </h3>
                          <StatusBadge
                            variant={isEnabled ? "active" : "draft"}
                            label={isEnabled ? "Aktif" : "Nonaktif"}
                            size="sm"
                          />
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {info.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveSection(idx, "up")}
                        title="Pindahkan ke atas"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === config.sectionOrder.length - 1}
                        onClick={() => moveSection(idx, "down")}
                        title="Pindahkan ke bawah"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab(secKey)}
                      >
                        Edit Konten
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={isEnabled ? "primary" : "outline"}
                        onClick={() => toggleSectionEnabled(secKey)}
                        leftIcon={
                          isEnabled ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )
                        }
                      >
                        {isEnabled ? "Tampil" : "Sembunyi"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: HEADER & PENGUMUMAN */}
        {activeTab === "header" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Pengaturan Header */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="border-b border-neutral-100 pb-3">
                <h2 className="text-base font-extrabold text-[#0c0c13]">
                  Pengaturan Header / Navbar Utama
                </h2>
                <p className="text-xs text-neutral-500">
                  Mengatur nama platform, logo, dan tombol navigasi di bagian
                  atas halaman depan.
                </p>
              </div>

              <FormField id="hdr-brand" label="Nama Brand Utama" required>
                <input
                  id="hdr-brand"
                  type="text"
                  value={config.header.brandName}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      header: { ...prev.header, brandName: e.target.value },
                    }))
                  }
                  className={inputBaseClasses}
                />
              </FormField>

              <FormField id="hdr-sub" label="Subjudul Brand">
                <input
                  id="hdr-sub"
                  type="text"
                  value={config.header.brandSubtitle}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      header: { ...prev.header, brandSubtitle: e.target.value },
                    }))
                  }
                  className={inputBaseClasses}
                />
              </FormField>

              <FormField
                id="hdr-logo"
                label="Path / URL Logo Header"
                hint="Default: /logoheaderfooterhomepage.png"
              >
                <input
                  id="hdr-logo"
                  type="text"
                  value={config.header.logoUrl}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      header: { ...prev.header, logoUrl: e.target.value },
                    }))
                  }
                  className={inputBaseClasses}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField id="hdr-login" label="Label Tombol Masuk (Putih)">
                  <input
                    id="hdr-login"
                    type="text"
                    value={config.header.loginButtonLabel}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        header: {
                          ...prev.header,
                          loginButtonLabel: e.target.value,
                        },
                      }))
                    }
                    className={inputBaseClasses}
                  />
                </FormField>

                <FormField id="hdr-reg" label="Label Tombol Daftar">
                  <input
                    id="hdr-reg"
                    type="text"
                    value={config.header.registerButtonLabel}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        header: {
                          ...prev.header,
                          registerButtonLabel: e.target.value,
                        },
                      }))
                    }
                    className={inputBaseClasses}
                  />
                </FormField>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-[#f5f8ff] p-3.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.header.showRegisterButton}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      header: {
                        ...prev.header,
                        showRegisterButton: e.target.checked,
                      },
                    }))
                  }
                  className="h-4 w-4 rounded border-neutral-300 text-[#494ae2]"
                />
                <span className="text-xs sm:text-sm font-semibold text-[#0c0c13]">
                  Tampilkan tombol Pendaftaran Peserta di Header & Hero
                </span>
              </label>
            </div>

            {/* Pengaturan Banner Pengumuman */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-[#0c0c13]">
                    Banner Pengumuman Atas
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Tampilkan informasi jadwal Tryout Akbar atau pengumuman
                    penting di bagian atas Homepage.
                  </p>
                </div>
                <StatusBadge
                  variant={config.announcement.enabled ? "active" : "draft"}
                  label={config.announcement.enabled ? "Aktif" : "Nonaktif"}
                />
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-[#f5f8ff] p-3.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.announcement.enabled}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      announcement: {
                        ...prev.announcement,
                        enabled: e.target.checked,
                      },
                    }))
                  }
                  className="h-4 w-4 rounded border-neutral-300 text-[#494ae2]"
                />
                <span className="text-xs sm:text-sm font-semibold text-[#0c0c13]">
                  Aktifkan Pita Pengumuman di Halaman Utama
                </span>
              </label>

              <FormField id="ann-badge" label="Label Badge Pengumuman">
                <input
                  id="ann-badge"
                  type="text"
                  value={config.announcement.badge}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      announcement: {
                        ...prev.announcement,
                        badge: e.target.value,
                      },
                    }))
                  }
                  className={inputBaseClasses}
                />
              </FormField>

              <FormField id="ann-msg" label="Teks Isi Pengumuman">
                <textarea
                  id="ann-msg"
                  rows={3}
                  value={config.announcement.message}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      announcement: {
                        ...prev.announcement,
                        message: e.target.value,
                      },
                    }))
                  }
                  className={textareaBaseClasses}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField id="ann-cta" label="Teks Link Aksi (Opsional)">
                  <input
                    id="ann-cta"
                    type="text"
                    value={config.announcement.ctaLabel}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        announcement: {
                          ...prev.announcement,
                          ctaLabel: e.target.value,
                        },
                      }))
                    }
                    className={inputBaseClasses}
                  />
                </FormField>

                <FormField id="ann-href" label="URL Tujuan Link">
                  <input
                    id="ann-href"
                    type="text"
                    value={config.announcement.ctaHref}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        announcement: {
                          ...prev.announcement,
                          ctaHref: e.target.value,
                        },
                      }))
                    }
                    className={inputBaseClasses}
                  />
                </FormField>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: HERO & KARTU KEAMANAN */}
        {activeTab === "hero" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Kolom Kiri: Konten Hero Utama (7/12) */}
            <div className="lg:col-span-7 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-[#0c0c13]">
                    Konten Utama Hero Section
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Atur judul utama, teks deskripsi, tombol CTA, dan 3 metrik
                    keunggulan.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.hero.enabled}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, enabled: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded border-neutral-300 text-[#494ae2]"
                  />
                  <span>Tampilkan Hero</span>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField id="hero-badge" label="Teks Badge Utama">
                  <input
                    id="hero-badge"
                    type="text"
                    value={config.hero.badgeText}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, badgeText: e.target.value },
                      }))
                    }
                    className={inputBaseClasses}
                  />
                </FormField>

                <FormField id="hero-subbadge" label="Teks Pendamping Badge">
                  <input
                    id="hero-subbadge"
                    type="text"
                    value={config.hero.badgeSubtext}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, badgeSubtext: e.target.value },
                      }))
                    }
                    className={inputBaseClasses}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField id="hero-t1" label="Judul Bagian Awal">
                  <input
                    id="hero-t1"
                    type="text"
                    value={config.hero.titlePrefix}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, titlePrefix: e.target.value },
                      }))
                    }
                    className={inputBaseClasses}
                  />
                </FormField>

                <FormField id="hero-t2" label="Judul Highlight (Gradasi)">
                  <input
                    id="hero-t2"
                    type="text"
                    value={config.hero.titleHighlight}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, titleHighlight: e.target.value },
                      }))
                    }
                    className={inputBaseClasses}
                  />
                </FormField>

                <FormField id="hero-t3" label="Judul Bagian Akhir">
                  <input
                    id="hero-t3"
                    type="text"
                    value={config.hero.titleSuffix}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, titleSuffix: e.target.value },
                      }))
                    }
                    className={inputBaseClasses}
                  />
                </FormField>
              </div>

              <FormField id="hero-desc" label="Paragraf Deskripsi Hero">
                <textarea
                  id="hero-desc"
                  rows={3}
                  value={config.hero.description}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, description: e.target.value },
                    }))
                  }
                  className={textareaBaseClasses}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField id="hero-cta1" label="Label Tombol Utama">
                  <input
                    id="hero-cta1"
                    type="text"
                    value={config.hero.primaryCtaLabel}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: {
                          ...prev.hero,
                          primaryCtaLabel: e.target.value,
                        },
                      }))
                    }
                    className={inputBaseClasses}
                  />
                </FormField>

                <FormField id="hero-cta2" label="Label Tombol Kedua">
                  <input
                    id="hero-cta2"
                    type="text"
                    value={config.hero.secondaryCtaLabel}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: {
                          ...prev.hero,
                          secondaryCtaLabel: e.target.value,
                        },
                      }))
                    }
                    className={inputBaseClasses}
                  />
                </FormField>
              </div>

              <div className="border-t border-neutral-100 pt-3 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  3 Metrik Keunggulan di Bawah Tombol Hero
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {config.hero.stats.map((st, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-neutral-200 bg-[#f5f8ff] p-3 space-y-2"
                    >
                      <input
                        type="text"
                        value={st.value}
                        placeholder="Judul Metrik"
                        onChange={(e) => {
                          const nextStats = [...config.hero.stats];
                          nextStats[idx] = {
                            ...nextStats[idx],
                            value: e.target.value,
                          };
                          setConfig((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, stats: nextStats },
                          }));
                        }}
                        className={inputBaseClasses}
                      />
                      <input
                        type="text"
                        value={st.label}
                        placeholder="Sub-label"
                        onChange={(e) => {
                          const nextStats = [...config.hero.stats];
                          nextStats[idx] = {
                            ...nextStats[idx],
                            label: e.target.value,
                          };
                          setConfig((prev) => ({
                            ...prev,
                            hero: { ...prev.hero, stats: nextStats },
                          }));
                        }}
                        className={inputBaseClasses}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Visual Kanan Hero (Gambar Hero atau Kartu Keamanan) */}
            <div className="lg:col-span-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="border-b border-neutral-100 pb-3 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#494ae2]" />
                  <h2 className="text-base font-extrabold text-[#0c0c13]">
                    Visual Sisi Kanan Hero Section
                  </h2>
                </div>
                <FormField
                  id="hero-right-mode"
                  label="Pilih Tampilan Sisi Kanan Hero"
                >
                  <select
                    id="hero-right-mode"
                    value={config.hero.rightDisplayMode || "image"}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: {
                          ...prev.hero,
                          rightDisplayMode: e.target.value as "image" | "card",
                        },
                      }))
                    }
                    className={selectBaseClasses}
                  >
                    <option value="image">
                      Gambar / Foto Hero Section (Sesuai Desain Utama)
                    </option>
                    <option value="card">
                      Kartu Poin Standar Keamanan & Integritas
                    </option>
                  </select>
                </FormField>
              </div>

              {config.hero.rightDisplayMode !== "card" ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-[#f5f8ff] p-3 flex justify-center">
                    <img
                      src={config.hero.heroImageUrl || "/gambarsectionhero.png"}
                      alt={config.hero.heroImageAlt || "Preview Gambar Hero"}
                      className="max-h-64 w-auto rounded-2xl object-contain"
                    />
                  </div>

                  <FormField
                    id="hero-img-url"
                    label="Path / URL Gambar Hero"
                    hint="Default: /gambarsectionhero.png"
                  >
                    <input
                      id="hero-img-url"
                      type="text"
                      value={config.hero.heroImageUrl || "/gambarsectionhero.png"}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: {
                            ...prev.hero,
                            heroImageUrl: e.target.value,
                          },
                        }))
                      }
                      className={inputBaseClasses}
                    />
                  </FormField>

                  <FormField
                    id="hero-img-upload"
                    label="Atau Unggah Gambar Hero Baru dari Komputer"
                  >
                    <input
                      id="hero-img-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === "string") {
                            setConfig((prev) => ({
                              ...prev,
                              hero: {
                                ...prev.hero,
                                heroImageUrl: reader.result as string,
                              },
                            }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="block w-full text-xs text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#494ae2] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-[#3f40cd] cursor-pointer"
                    />
                  </FormField>

                  <FormField id="hero-img-alt" label="Teks Alt Gambar Hero">
                    <input
                      id="hero-img-alt"
                      type="text"
                      value={
                        config.hero.heroImageAlt ||
                        "Peserta Simulasi CAT CATARA"
                      }
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: {
                            ...prev.hero,
                            heroImageAlt: e.target.value,
                          },
                        }))
                      }
                      className={inputBaseClasses}
                    />
                  </FormField>

                  <FormField
                    id="hero-img-width"
                    label={`Ukuran Lebar Gambar Hero: ${
                      config.hero.heroImageWidth || 380
                    }px`}
                    hint="Geser untuk memperkecil atau memperbesar ukuran gambar PNG di Hero Section"
                  >
                    <input
                      id="hero-img-width"
                      type="range"
                      min={260}
                      max={500}
                      step={10}
                      value={config.hero.heroImageWidth || 380}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: {
                            ...prev.hero,
                            heroImageWidth: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full accent-[#494ae2] cursor-pointer"
                    />
                  </FormField>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-500">
                      Pengaturan Kartu Keamanan
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addSecurityFeature}
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                    >
                      Tambah Poin
                    </Button>
                  </div>

                  <FormField id="sec-title" label="Judul Kartu Kanan">
                    <input
                      id="sec-title"
                      type="text"
                      value={config.hero.securityCardTitle}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: {
                            ...prev.hero,
                            securityCardTitle: e.target.value,
                          },
                        }))
                      }
                      className={inputBaseClasses}
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField id="sec-sub" label="Subjudul Kartu">
                      <input
                        id="sec-sub"
                        type="text"
                        value={config.hero.securityCardSubtitle}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            hero: {
                              ...prev.hero,
                              securityCardSubtitle: e.target.value,
                            },
                          }))
                        }
                        className={inputBaseClasses}
                      />
                    </FormField>

                    <FormField id="sec-badge" label="Label Badge Status">
                      <input
                        id="sec-badge"
                        type="text"
                        value={config.hero.securityCardBadge}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            hero: {
                              ...prev.hero,
                              securityCardBadge: e.target.value,
                            },
                          }))
                        }
                        className={inputBaseClasses}
                      />
                    </FormField>
                  </div>

                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Daftar Poin Keunggulan (
                      {config.hero.securityFeatures.length})
                    </p>
                    {config.hero.securityFeatures.map((feat, i) => (
                      <div
                        key={feat.id}
                        className="rounded-xl border border-neutral-200 bg-[#f5f8ff] p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#494ae2]">
                            Poin #{i + 1}
                          </span>
                          {config.hero.securityFeatures.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSecurityFeature(feat.id)}
                              className="text-xs font-semibold text-red-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Hapus
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={feat.title}
                          onChange={(e) =>
                            updateSecurityFeature(feat.id, {
                              title: e.target.value,
                            })
                          }
                          placeholder="Judul poin (tebal)"
                          className={inputBaseClasses}
                        />
                        <textarea
                          rows={2}
                          value={feat.description}
                          onChange={(e) =>
                            updateSecurityFeature(feat.id, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Penjelasan poin"
                          className={textareaBaseClasses}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: KATEGORI SELEKSI */}
        {activeTab === "categories" && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#0c0c13]">
                  Kelola Section Kategori Simulasi Seleksi
                </h2>
                <p className="text-xs text-neutral-500">
                  Ubah judul section, edit kartu kategori yang ada, atau
                  tambahkan kartu kategori baru sesuai layanan CATARA.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.categories.enabled}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        categories: {
                          ...prev.categories,
                          enabled: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 rounded border-neutral-300 text-[#494ae2]"
                  />
                  <span>Tampilkan Section Kategori</span>
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addCategoryCard}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Tambah Kartu Kategori
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField id="cat-sec-title" label="Judul Section Kategori">
                <input
                  id="cat-sec-title"
                  type="text"
                  value={config.categories.sectionTitle}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      categories: {
                        ...prev.categories,
                        sectionTitle: e.target.value,
                      },
                    }))
                  }
                  className={inputBaseClasses}
                />
              </FormField>

              <FormField id="cat-sec-sub" label="Subjudul Section Kategori">
                <input
                  id="cat-sec-sub"
                  type="text"
                  value={config.categories.sectionSubtitle}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      categories: {
                        ...prev.categories,
                        sectionSubtitle: e.target.value,
                      },
                    }))
                  }
                  className={inputBaseClasses}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {config.categories.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-neutral-200 bg-[#f5f8ff] p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#494ae2]">
                        Kartu Kategori #{idx + 1}
                      </span>
                      {config.categories.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCategoryCard(item.id)}
                          className="text-xs font-semibold text-red-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus
                        </button>
                      )}
                    </div>

                    <FormField
                      id={`cat-title-${item.id}`}
                      label="Judul Kategori"
                    >
                      <input
                        id={`cat-title-${item.id}`}
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          updateCategoryCard(item.id, {
                            title: e.target.value,
                          })
                        }
                        className={inputBaseClasses}
                      />
                    </FormField>

                    <FormField id={`cat-icon-${item.id}`} label="Ikon Kartu">
                      <select
                        id={`cat-icon-${item.id}`}
                        value={item.icon}
                        onChange={(e) =>
                          updateCategoryCard(item.id, {
                            icon: e.target.value as
                              | "award"
                              | "building"
                              | "book",
                          })
                        }
                        className={selectBaseClasses}
                      >
                        <option value="award">Medali / Penghargaan (CPNS)</option>
                        <option value="building">
                          Gedung Instansi (Sekolah Kedinasan)
                        </option>
                        <option value="book">
                          Buku Akademik (Seleksi Polri / Umum)
                        </option>
                      </select>
                    </FormField>

                    <FormField
                      id={`cat-desc-${item.id}`}
                      label="Deskripsi Kategori"
                    >
                      <textarea
                        id={`cat-desc-${item.id}`}
                        rows={3}
                        value={item.description}
                        onChange={(e) =>
                          updateCategoryCard(item.id, {
                            description: e.target.value,
                          })
                        }
                        className={textareaBaseClasses}
                      />
                    </FormField>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: LEADERBOARD & FOOTER */}
        {activeTab === "leaderboard" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Pengaturan Papan Leaderboard Hasil Ujian (7/12) */}
            <div className="lg:col-span-7 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-[#0c0c13]">
                    Pengaturan Papan Leaderboard Hasil Ujian
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Tabel peringkat nilai akhir yang otomatis terisi setelah peserta menyelesaikan sesi simulasi CAT atau ujian berakhir.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.leaderboard.enabled}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        leaderboard: {
                          ...prev.leaderboard,
                          enabled: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 rounded border-neutral-300 text-[#494ae2]"
                  />
                  <span>Tampilkan di Homepage</span>
                </label>
              </div>

              {/* Informasi Halaman Tersendiri untuk Papan Live Score Real-Time */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#494ae2]/20 bg-[#f5f8ff] p-3.5">
                <div>
                  <p className="text-xs font-extrabold text-[#494ae2]">
                    Papan Live Score Real-Time Memiliki Halaman Tersendiri (/live-score)
                  </p>
                  <p className="text-[11px] text-neutral-600">
                    Pantauan skor sementara saat ujian sedang berlangsung kini tampil di halaman khusus <strong>/live-score</strong> dan dapat dikelola melalui menu Live Score Admin.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/live-score"
                    target="_blank"
                    className="rounded-lg bg-white border border-neutral-200 px-3 py-1.5 text-xs font-bold text-[#0c0c13] hover:bg-neutral-50"
                  >
                    Lihat Halaman /live-score ↗
                  </Link>
                  <Link
                    href="/admin/live-score"
                    className="rounded-lg bg-gradient-to-r from-[#494ae2] to-[#7854ec] px-3 py-1.5 text-xs font-bold text-white hover:opacity-95"
                  >
                    Kelola Live Score →
                  </Link>
                </div>
              </div>

              <FormField id="lb-title" label="Judul Section Leaderboard">
                <input
                  id="lb-title"
                  type="text"
                  value={config.leaderboard.sectionTitle}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      leaderboard: {
                        ...prev.leaderboard,
                        sectionTitle: e.target.value,
                      },
                    }))
                  }
                  className={inputBaseClasses}
                />
              </FormField>

              <FormField id="lb-sub" label="Subjudul Penjelasan Leaderboard">
                <input
                  id="lb-sub"
                  type="text"
                  value={config.leaderboard.sectionSubtitle}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      leaderboard: {
                        ...prev.leaderboard,
                        sectionSubtitle: e.target.value,
                      },
                    }))
                  }
                  className={inputBaseClasses}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  id="lb-max"
                  label="Jumlah Baris Peringkat Ditampilkan"
                  hint="Mis. Top 10, Top 15, atau Top 50 peserta"
                >
                  <select
                    id="lb-max"
                    value={String(config.leaderboard.maxRows)}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        leaderboard: {
                          ...prev.leaderboard,
                          maxRows: Number(e.target.value),
                        },
                      }))
                    }
                    className={selectBaseClasses}
                  >
                    <option value="5">Top 5 Peserta</option>
                    <option value="10">Top 10 Peserta</option>
                    <option value="15">Top 15 Peserta</option>
                    <option value="25">Top 25 Peserta</option>
                    <option value="50">Top 50 Peserta</option>
                    <option value="100">Top 100 Peserta</option>
                  </select>
                </FormField>

                <FormField
                  id="lb-run"
                  label="Sesi Ujian Default yang Ditampilkan"
                >
                  <select
                    id="lb-run"
                    value={config.leaderboard.defaultRunId}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        leaderboard: {
                          ...prev.leaderboard,
                          defaultRunId: e.target.value,
                        },
                      }))
                    }
                    className={selectBaseClasses}
                  >
                    <option value="all">Semua Sesi Ujian (Gabungan)</option>
                    {runs.map((r) => {
                      const ex = exams.find((e) => e.id === r.exam_id);
                      return (
                        <option key={r.id} value={r.id}>
                          {ex ? `${ex.title} — ${r.name}` : r.name}
                        </option>
                      );
                    })}
                  </select>
                </FormField>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-[#f5f8ff] p-3.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.leaderboard.showSessionFilter}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      leaderboard: {
                        ...prev.leaderboard,
                        showSessionFilter: e.target.checked,
                      },
                    }))
                  }
                  className="h-4 w-4 rounded border-neutral-300 text-[#494ae2]"
                />
                <span className="text-xs sm:text-sm font-semibold text-[#0c0c13]">
                  Tampilkan Dropdown Filter Sesi Ujian kepada pengunjung
                </span>
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                <FormField
                  id="lb-empty-t"
                  label="Judul Saat Belum Ada Hasil Ujian"
                >
                  <input
                    id="lb-empty-t"
                    type="text"
                    value={config.leaderboard.emptyTitle}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        leaderboard: {
                          ...prev.leaderboard,
                          emptyTitle: e.target.value,
                        },
                      }))
                    }
                    className={inputBaseClasses}
                  />
                </FormField>

                <FormField
                  id="lb-empty-d"
                  label="Keterangan Saat Belum Ada Hasil"
                >
                  <input
                    id="lb-empty-d"
                    type="text"
                    value={config.leaderboard.emptyDescription}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        leaderboard: {
                          ...prev.leaderboard,
                          emptyDescription: e.target.value,
                        },
                      }))
                    }
                    className={inputBaseClasses}
                  />
                </FormField>
              </div>
            </div>

            {/* Pengaturan Footer Homepage (5/12) */}
            <div className="lg:col-span-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4 h-fit">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-[#0c0c13]">
                    Pengaturan Footer Homepage
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Teks nama aplikasi dan keterangan hak cipta di bagian bawah.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.footer.enabled}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, enabled: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded border-neutral-300 text-[#494ae2]"
                  />
                  <span>Tampilkan</span>
                </label>
              </div>

              <FormField id="ft-brand" label="Teks Brand Footer">
                <input
                  id="ft-brand"
                  type="text"
                  value={config.footer.brandText}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      footer: { ...prev.footer, brandText: e.target.value },
                    }))
                  }
                  className={inputBaseClasses}
                />
              </FormField>

              <FormField id="ft-copy" label="Teks Hak Cipta (Copyright)">
                <input
                  id="ft-copy"
                  type="text"
                  value={config.footer.copyrightText}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      footer: {
                        ...prev.footer,
                        copyrightText: e.target.value,
                      },
                    }))
                  }
                  className={inputBaseClasses}
                />
              </FormField>
            </div>
          </div>
        )}

        {/* Bar Tombol Simpan Bawah */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="text-xs text-neutral-500">
            Klik <strong>Simpan Perubahan Homepage</strong> untuk menerapkan
            pengaturan ke halaman depan secara instan.
          </p>
          <div className="flex items-center gap-2.5">
            <Link href="/" target="_blank">
              <Button
                type="button"
                variant="outline"
                leftIcon={<ExternalLink className="h-4 w-4" />}
              >
                Pratinjau Homepage
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Save className="h-4 w-4" />}
            >
              Simpan Perubahan Homepage
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onConfirm={handleResetDefault}
        title="Kembalikan Homepage ke Pengaturan Awal?"
        description="Seluruh perubahan teks, urutan section, dan daftar kartu pada Homepage akan dikembalikan ke standar awal CATARA — Digital Assessment Platform."
        confirmLabel="Ya, Reset ke Default"
        variant="danger"
      />
    </AppShell>
  );
}
