/**
 * HOMEPAGE CMS STORE — CATARA (Digital Assessment Platform)
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

export const HOMEPAGE_STORAGE_KEY = "catara_homepage_config_v5_prod";

export const DEFAULT_HOMEPAGE_CONFIG: HomepageConfig = {
  sectionOrder: ["hero", "categories", "leaderboard"],
  header: {
    brandName: "CATARA",
    brandSubtitle: "Digital Assessment Platform",
    logoUrl: "/logoheaderfooterhomepage.png",
    loginButtonLabel: "Masuk",
    registerButtonLabel: "Daftar Peserta",
    showRegisterButton: true,
  },
  announcement: {
    enabled: false,
    badge: "Info Terbaru",
    message:
      "CATARA — Digital Assessment Platform siap mendukung pelaksanaan simulasi Computer Assisted Test (CAT) yang terstruktur, efisien, dan terukur.",
    ctaLabel: "Daftar Sekarang",
    ctaHref: "/register",
  },
  hero: {
    enabled: true,
    badgeText: "CATARA",
    badgeSubtext: "Digital Assessment Platform",
    titlePrefix: "Platform Ujian Digital & Simulasi",
    titleHighlight: "Computer Assisted Test (CAT)",
    titleSuffix: "Terintegrasi",
    description:
      "CATARA adalah platform ujian digital berbasis teknologi yang membantu lembaga pendidikan, bimbingan belajar, dan penyelenggara seleksi mengelola ujian secara terstruktur, efisien, dan terukur. Menyediakan Sistem simulasi Computer Assisted Test (CAT), pengelolaan jadwal dan peserta, pemantauan ujian secara real-time, serta analisis hasil, CATARA menghadirkan pengalaman ujian digital yang modern dalam satu platform terintegrasi.",
    primaryCtaLabel: "Masuk Ruang Ujian",
    secondaryCtaLabel: "Registrasi Akun Peserta",
    stats: [
      { value: "Terstruktur", label: "Jadwal & Peserta" },
      { value: "Real-Time", label: "Monitoring Ujian" },
      { value: "Terukur", label: "Analisis & Evaluasi" },
    ],
    rightDisplayMode: "image",
    heroImageUrl: "/gambarsectionhero.png",
    heroImageAlt: "CATARA — Digital Assessment Platform",
    heroImageWidth: 420,
    securityCardTitle: "CATARA — Digital Assessment Platform",
    securityCardSubtitle: "Solusi Evaluasi & Seleksi Profesional",
    securityCardBadge: "Terintegrasi",
    securityFeatures: [
      {
        id: "sec-1",
        title: "Sistem Simulasi CAT Terstruktur:",
        description:
          "Pengelolaan bank soal, pengacakan terkunci per subtes, serta pengaturan durasi dan bobot nilai yang fleksibel.",
      },
      {
        id: "sec-2",
        title: "Pemantauan Ujian Secara Real-Time:",
        description:
          "Monitoring progres peserta secara langsung, autosave jawaban otomatis, serta penanganan insiden sesi ujian.",
      },
      {
        id: "sec-3",
        title: "Analisis Hasil & Evaluasi Terukur:",
        description:
          "Perhitungan skor otomatis, evaluasi ambang batas (Passing Grade), transkripsi nilai, dan pembahasan komprehensif.",
      },
    ],
  },
  categories: {
    enabled: true,
    sectionTitle: "Solusi Evaluasi & Simulasi Seleksi CATARA",
    sectionSubtitle:
      "Dikembangkan untuk mendukung penyelenggaraan ujian yang lebih profesional, CATARA hadir sebagai solusi fleksibel bagi berbagai kebutuhan evaluasi dan seleksi.",
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
        title: "3. Seleksi Akademik & Institusi",
        description:
          "Simulasi ujian akademik, lembaga pendidikan, bimbingan belajar, dan seleksi Polri dengan konfigurasi subtes yang fleksibel.",
        icon: "book",
      },
    ],
  },
  leaderboard: {
    enabled: true,
    sectionTitle: "Papan Leaderboard Hasil Ujian CATARA",
    sectionSubtitle:
      "Peringkat resmi nilai akhir peserta setelah menyelesaikan sesi ujian di CATARA (Passing Grade, Total Skor, TKP → TIU → TWK).",
    maxRows: 15,
    showSessionFilter: true,
    defaultRunId: "all",
    emptyTitle: "Belum Ada Hasil Ujian yang Selesai",
    emptyDescription:
      "Papan Leaderboard ini akan otomatis terisi setelah peserta menyelesaikan sesi ujian CAT atau waktu ujian berakhir.",
  },
  footer: {
    enabled: true,
    brandText: "CATARA — Digital Assessment Platform",
    copyrightText:
      "CATARA — Digital Assessment Platform. Seluruh hak cipta dilindungi.",
  },
  updatedAt: "2026-10-11T12:00:00Z",
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
