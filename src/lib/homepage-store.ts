/**
 * HOMEPAGE CMS STORE
 * Menyimpan dan mengelola seluruh konfigurasi konten, visibilitas, dan urutan
 * section di Halaman Utama (Homepage) melalui Portal Admin (/admin/homepage).
 */

export type HomepageSectionKey = "hero" | "categories" | "leaderboard";

export interface HomepageStatItem {
  value: string;
  label: string;
}

export interface HomepageSecurityFeature {
  id: string;
  title: string;
  description: string;
}

export interface HomepageCategoryItem {
  id: string;
  title: string;
  description: string;
  icon: "award" | "building" | "book";
}

export interface HomepageConfig {
  sectionOrder: HomepageSectionKey[];
  header: {
    brandName: string;
    brandSubtitle: string;
    logoUrl: string;
    loginButtonLabel: string;
    registerButtonLabel: string;
    showRegisterButton: boolean;
  };
  announcement: {
    enabled: boolean;
    badge: string;
    message: string;
    ctaLabel: string;
    ctaHref: string;
  };
  hero: {
    enabled: boolean;
    badgeText: string;
    badgeSubtext: string;
    titlePrefix: string;
    titleHighlight: string;
    titleSuffix: string;
    description: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
    stats: HomepageStatItem[];
    rightDisplayMode: "image" | "card";
    heroImageUrl: string;
    heroImageAlt: string;
    heroImageWidth: number;
    securityCardTitle: string;
    securityCardSubtitle: string;
    securityCardBadge: string;
    securityFeatures: HomepageSecurityFeature[];
  };
  categories: {
    enabled: boolean;
    sectionTitle: string;
    sectionSubtitle: string;
    items: HomepageCategoryItem[];
  };
  leaderboard: {
    enabled: boolean;
    sectionTitle: string;
    sectionSubtitle: string;
    maxRows: number;
    showSessionFilter: boolean;
    defaultRunId: string;
    emptyTitle: string;
    emptyDescription: string;
  };
  footer: {
    enabled: boolean;
    brandText: string;
    copyrightText: string;
  };
  updatedAt: string;
}

export const HOMEPAGE_STORAGE_KEY = "prima_cat_homepage_config_v2_prod";

export const DEFAULT_HOMEPAGE_CONFIG: HomepageConfig = {
  sectionOrder: ["hero", "categories", "leaderboard"],
  header: {
    brandName: "Prima RIB",
    brandSubtitle: "Portal Resmi Simulasi CAT",
    logoUrl: "/logo1.png",
    loginButtonLabel: "Masuk",
    registerButtonLabel: "Daftar Peserta",
    showRegisterButton: true,
  },
  announcement: {
    enabled: false,
    badge: "Info Terbaru",
    message:
      "Pendaftaran Simulasi CAT SKD CPNS, Sekolah Kedinasan, dan Polri periode terbaru telah dibuka.",
    ctaLabel: "Daftar Sekarang",
    ctaHref: "/register",
  },
  hero: {
    enabled: true,
    badgeText: "Standar CAT Resmi",
    badgeSubtext: "CPNS • Sekolah Kedinasan • Polri",
    titlePrefix: "Sistem Simulasi",
    titleHighlight: "Computer Assisted Test (CAT)",
    titleSuffix: "Prima RIB",
    description:
      "Latih kesiapan menghadapi ujian seleksi sesungguhnya dengan pengalaman ruang ujian CAT yang akurat, timer tersinkronisasi server, pengacakan soal per subtes, serta evaluasi ambang batas (Passing Grade) dan pembahasan komprehensif.",
    primaryCtaLabel: "Masuk Ruang Ujian",
    secondaryCtaLabel: "Registrasi Akun Peserta",
    stats: [
      { value: "Server-Side", label: "Penilaian & Timer" },
      { value: "Autosave", label: "Sinkronisasi Jawaban" },
      { value: "Realtime", label: "Analitik & Ranking" },
    ],
    rightDisplayMode: "image",
    heroImageUrl: "/hero-prima-rib.png",
    heroImageAlt: "Peserta Simulasi CAT Prima RIB",
    heroImageWidth: 380,
    securityCardTitle: "Standar Keamanan & Integritas",
    securityCardSubtitle: "Arsitektur CAT Terproteksi",
    securityCardBadge: "Aktif",
    securityFeatures: [
      {
        id: "sec-1",
        title: "Pengacakan Terkunci per Subtes:",
        description:
          "Soal TWK, TIU, dan TKP diacak di dalam bloknya masing-masing dan tidak berubah saat halaman dimuat ulang.",
      },
      {
        id: "sec-2",
        title: "Autosave & Antrean Rekoneksi:",
        description:
          "Setiap jawaban langsung tersimpan ke server dan aman saat jaringan sempat terputus.",
      },
      {
        id: "sec-3",
        title: "Evaluasi Passing Grade & Pembahasan:",
        description:
          "Rincian nilai per subtes, bobot TKP 1–5, dan pembahasan resmi sesuai jadwal publikasi.",
      },
    ],
  },
  categories: {
    enabled: true,
    sectionTitle: "Kategori Simulasi Seleksi Prima RIB",
    sectionSubtitle:
      "Mendukung berbagai skema penilaian dan ambang batas kelulusan sesuai standar seleksi nasional.",
    items: [
      {
        id: "cat-card-1",
        title: "1. Seleksi CPNS (SKD)",
        description:
          "Simulasi Seleksi Kompetensi Dasar meliputi Tes Wawasan Kebangsaan (TWK), Tes Intelegensia Umum (TIU), dan Tes Karakteristik Pribadi (TKP).",
        icon: "award",
      },
      {
        id: "cat-card-2",
        title: "2. Sekolah Kedinasan (Sekdin)",
        description:
          "Simulasi terfokus sesuai instansi tujuan seperti IPDN, PKN STAN, Politeknik STIS, STMKG, dan sekolah kedinasan lainnya.",
        icon: "building",
      },
      {
        id: "cat-card-3",
        title: "3. Seleksi Penerimaan Polri",
        description:
          "Simulasi ujian akademik dan psikotes terstruktur dengan konfigurasi subtes, bobot penilaian, dan durasi yang fleksibel.",
        icon: "book",
      },
    ],
  },
  leaderboard: {
    enabled: true,
    sectionTitle: "Papan Leaderboard Hasil Ujian Simulasi CAT",
    sectionSubtitle:
      "Peringkat resmi nilai akhir peserta setelah menyelesaikan sesi simulasi CAT (Passing Grade, Total Skor, TKP → TIU → TWK).",
    maxRows: 15,
    showSessionFilter: true,
    defaultRunId: "all",
    emptyTitle: "Belum Ada Hasil Ujian yang Selesai",
    emptyDescription:
      "Papan Leaderboard ini akan otomatis terisi setelah peserta menyelesaikan sesi simulasi CAT atau waktu ujian berakhir.",
  },
  footer: {
    enabled: true,
    brandText: "Simulasi CAT Prima RIB",
    copyrightText: "Prima RIB. Seluruh hak cipta dilindungi.",
  },
  updatedAt: "2026-10-10T00:00:00Z",
};

const ALL_SECTION_KEYS: HomepageSectionKey[] = [
  "hero",
  "categories",
  "leaderboard",
];

function normalizeSectionOrder(
  savedOrder?: HomepageSectionKey[]
): HomepageSectionKey[] {
  if (!Array.isArray(savedOrder) || savedOrder.length === 0) {
    return [...DEFAULT_HOMEPAGE_CONFIG.sectionOrder];
  }
  const valid = savedOrder.filter((k): k is HomepageSectionKey =>
    ALL_SECTION_KEYS.includes(k)
  );
  for (const key of ALL_SECTION_KEYS) {
    if (!valid.includes(key)) {
      valid.push(key);
    }
  }
  return valid;
}

export function getHomepageConfig(): HomepageConfig {
  if (typeof window === "undefined") return DEFAULT_HOMEPAGE_CONFIG;
  try {
    const raw = window.localStorage.getItem(HOMEPAGE_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_HOMEPAGE_CONFIG;
    }
    const parsed = JSON.parse(raw) as Partial<HomepageConfig>;
    return {
      ...DEFAULT_HOMEPAGE_CONFIG,
      ...parsed,
      sectionOrder: normalizeSectionOrder(parsed.sectionOrder),
      header: {
        ...DEFAULT_HOMEPAGE_CONFIG.header,
        ...(parsed.header || {}),
      },
      announcement: {
        ...DEFAULT_HOMEPAGE_CONFIG.announcement,
        ...(parsed.announcement || {}),
      },
      hero: {
        ...DEFAULT_HOMEPAGE_CONFIG.hero,
        ...(parsed.hero || {}),
        stats:
          parsed.hero?.stats && parsed.hero.stats.length > 0
            ? parsed.hero.stats
            : DEFAULT_HOMEPAGE_CONFIG.hero.stats,
        securityFeatures:
          parsed.hero?.securityFeatures &&
          parsed.hero.securityFeatures.length > 0
            ? parsed.hero.securityFeatures
            : DEFAULT_HOMEPAGE_CONFIG.hero.securityFeatures,
      },
      categories: {
        ...DEFAULT_HOMEPAGE_CONFIG.categories,
        ...(parsed.categories || {}),
        items:
          parsed.categories?.items && parsed.categories.items.length > 0
            ? parsed.categories.items
            : DEFAULT_HOMEPAGE_CONFIG.categories.items,
      },
      leaderboard: {
        ...DEFAULT_HOMEPAGE_CONFIG.leaderboard,
        ...(parsed.leaderboard || {}),
      },
      footer: {
        ...DEFAULT_HOMEPAGE_CONFIG.footer,
        ...(parsed.footer || {}),
      },
    };
  } catch {
    return DEFAULT_HOMEPAGE_CONFIG;
  }
}

export function saveHomepageConfig(config: HomepageConfig): HomepageConfig {
  const next: HomepageConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(HOMEPAGE_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function resetHomepageConfig(): HomepageConfig {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      HOMEPAGE_STORAGE_KEY,
      JSON.stringify(DEFAULT_HOMEPAGE_CONFIG)
    );
  }
  return DEFAULT_HOMEPAGE_CONFIG;
}
