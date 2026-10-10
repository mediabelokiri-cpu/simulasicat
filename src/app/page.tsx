"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  LogIn,
  LogOut,
  UserPlus,
  Award,
  BookOpen,
  Building2,
  Megaphone,
  SlidersHorizontal,
} from "lucide-react";
import { Button, StatusBadge } from "@/components/ui";
import {
  getCurrentUserClient,
  setCurrentUserClient,
} from "@/lib/auth";
import {
  DEFAULT_HOMEPAGE_CONFIG,
  HomepageConfig,
  HomepageSectionKey,
  getHomepageConfig,
} from "@/lib/homepage-store";
import { PublicLiveScoreSection } from "@/components/live-score/PublicLiveScoreSection";
import { ProfileRow } from "@/types/database";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const [config, setConfig] = useState<HomepageConfig>(DEFAULT_HOMEPAGE_CONFIG);
  const [activeUser, setActiveUser] = useState<ProfileRow | null>(null);

  useEffect(() => {
    const syncHomepage = () => {
      setConfig(getHomepageConfig());
      setActiveUser(getCurrentUserClient());
    };
    syncHomepage();
    window.addEventListener("storage", syncHomepage);
    window.addEventListener("focus", syncHomepage);
    return () => {
      window.removeEventListener("storage", syncHomepage);
      window.removeEventListener("focus", syncHomepage);
    };
  }, []);

  function handleLogout() {
    setCurrentUserClient(null);
    setActiveUser(null);
  }

  function renderHeroSection() {
    if (!config.hero.enabled) return null;
    return (
      <section
        key="hero"
        className="relative overflow-hidden border-b border-neutral-200/80 bg-gradient-to-b from-[#eef4ff]/70 to-[#fcfbf7] py-10 sm:py-14"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 space-y-6">
              {(config.hero.badgeText || config.hero.badgeSubtext) && (
                <div className="inline-flex items-center gap-2 rounded-full border border-[#0b49d0]/20 bg-white px-3.5 py-1.5 shadow-2xs">
                  {config.hero.badgeText && (
                    <StatusBadge
                      variant="featured"
                      label={config.hero.badgeText}
                      size="sm"
                    />
                  )}
                  {config.hero.badgeSubtext && (
                    <span className="text-xs font-semibold text-[#0b49d0]">
                      {config.hero.badgeSubtext}
                    </span>
                  )}
                </div>
              )}

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#151515] leading-[1.15]">
                {config.hero.titlePrefix}{" "}
                <span className="text-[#0b49d0]">
                  {config.hero.titleHighlight}
                </span>{" "}
                {config.hero.titleSuffix}
              </h1>

              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed max-w-2xl">
                {config.hero.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {activeUser ? (
                  <Link
                    href={activeUser.role === "admin" ? "/admin" : "/dashboard"}
                  >
                    <Button
                      variant="primary"
                      size="lg"
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      Masuk ke Portal Ujian
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login">
                      <Button
                        variant="primary"
                        size="lg"
                        leftIcon={<LogIn className="h-4 w-4" />}
                      >
                        {config.hero.primaryCtaLabel}
                      </Button>
                    </Link>
                    {config.header.showRegisterButton && (
                      <Link href="/register">
                        <Button
                          variant="accent"
                          size="lg"
                          leftIcon={<UserPlus className="h-4 w-4" />}
                        >
                          {config.hero.secondaryCtaLabel}
                        </Button>
                      </Link>
                    )}
                  </>
                )}
              </div>

              {config.hero.stats.length > 0 && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-200/80 max-w-lg text-xs">
                  {config.hero.stats.map((st, i) => (
                    <div key={i}>
                      <p className="font-extrabold text-base sm:text-lg text-[#0b49d0] tabular-nums">
                        {st.value}
                      </p>
                      <p className="text-neutral-600">{st.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Hero Visual (Gambar Hero PNG Transparan atau Kartu Keamanan) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              {config.hero.rightDisplayMode === "card" ? (
                <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-md space-y-5">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0b49d0] text-white">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-base font-extrabold text-[#151515]">
                          {config.hero.securityCardTitle}
                        </h2>
                        <p className="text-xs text-neutral-500">
                          {config.hero.securityCardSubtitle}
                        </p>
                      </div>
                    </div>
                    {config.hero.securityCardBadge && (
                      <span className="rounded-lg bg-[#ffc63d] px-2.5 py-1 text-xs font-extrabold text-[#151515]">
                        {config.hero.securityCardBadge}
                      </span>
                    )}
                  </div>

                  <ul className="space-y-3 text-xs sm:text-sm text-neutral-700">
                    {config.hero.securityFeatures.map((feat) => (
                      <li key={feat.id} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>{feat.title}</strong> {feat.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <img
                  src={config.hero.heroImageUrl || "/hero-prima-rib.png"}
                  alt={
                    config.hero.heroImageAlt ||
                    "Peserta Simulasi CAT Prima RIB"
                  }
                  style={{
                    maxWidth: `${config.hero.heroImageWidth || 380}px`,
                  }}
                  className="h-auto w-full object-contain select-none"
                />
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderCategoriesSection() {
    if (!config.categories.enabled) return null;
    return (
      <section
        key="categories"
        className="mx-auto max-w-6xl px-4 py-12 sm:px-6 space-y-6"
      >
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#151515]">
            {config.categories.sectionTitle}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600">
            {config.categories.sectionSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {config.categories.items.map((cat) => (
            <div
              key={cat.id}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs space-y-3"
            >
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl",
                  cat.icon === "building"
                    ? "bg-[#fff9e6] text-[#0b49d0]"
                    : "bg-[#eef4ff] text-[#0b49d0]"
                )}
              >
                {cat.icon === "award" ? (
                  <Award className="h-5 w-5" />
                ) : cat.icon === "building" ? (
                  <Building2 className="h-5 w-5" />
                ) : (
                  <BookOpen className="h-5 w-5" />
                )}
              </div>
              <h3 className="text-base font-extrabold text-[#151515]">
                {cat.title}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                {cat.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderLeaderboardSection() {
    return (
      <PublicLiveScoreSection
        key="leaderboard"
        isAuthenticatedUser={Boolean(activeUser)}
      />
    );
  }

  function renderSectionByKey(key: HomepageSectionKey) {
    if (key === "hero") return renderHeroSection();
    if (key === "categories") return renderCategoriesSection();
    if (key === "leaderboard") return renderLeaderboardSection();
    return null;
  }

  return (
    <div className="min-h-screen bg-[#fcfbf7] text-[#151515] flex flex-col">
      {/* Banner Pengumuman Opsional */}
      {config.announcement.enabled && (
        <div className="bg-[#ffc63d] text-[#151515] border-b border-[#e5ad28] px-4 py-2.5 text-xs sm:text-sm">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#151515] px-2 py-0.5 text-[11px] font-bold text-[#ffc63d]">
                <Megaphone className="h-3 w-3" />
                {config.announcement.badge}
              </span>
              <span className="font-semibold">
                {config.announcement.message}
              </span>
            </div>
            {config.announcement.ctaLabel && config.announcement.ctaHref && (
              <Link
                href={config.announcement.ctaHref}
                className="font-extrabold text-[#0b49d0] underline hover:no-underline"
              >
                {config.announcement.ctaLabel} →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-[#093db0] bg-[#0b49d0] text-white shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src={config.header.logoUrl || "/logo1.png"}
              alt={config.header.brandName}
              className="h-10 w-10 rounded-xl object-contain"
            />
            <div>
              <span className="block text-sm sm:text-base font-extrabold tracking-tight text-white">
                {config.header.brandName}
              </span>
              <span className="block text-[11px] font-medium text-white/80">
                {config.header.brandSubtitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {activeUser ? (
              <>
                {activeUser.role === "admin" && (
                  <Link href="/admin/homepage" className="hidden sm:inline-flex">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/15 text-white border-white/30 hover:bg-white/25 font-semibold"
                      leftIcon={<SlidersHorizontal className="h-4 w-4" />}
                    >
                      Kelola Homepage
                    </Button>
                  </Link>
                )}
                <Link
                  href={activeUser.role === "admin" ? "/admin" : "/dashboard"}
                >
                  <Button
                    variant="accent"
                    size="sm"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Buka Dashboard ({activeUser.full_name.split(" ")[0]})
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="bg-white text-[#0b49d0] border-white hover:bg-neutral-100 font-bold"
                  leftIcon={<LogOut className="h-4 w-4" />}
                >
                  Keluar
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white text-[#0b49d0] border-white hover:bg-neutral-100 font-bold"
                    leftIcon={<LogIn className="h-4 w-4" />}
                  >
                    {config.header.loginButtonLabel}
                  </Button>
                </Link>
                {config.header.showRegisterButton && (
                  <Link href="/register">
                    <Button
                      variant="accent"
                      size="sm"
                      leftIcon={<UserPlus className="h-4 w-4" />}
                    >
                      {config.header.registerButtonLabel}
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Sections (Berdasarkan urutan & visibilitas dari Admin) */}
      <main className="flex-1">
        {config.sectionOrder.map((secKey) => renderSectionByKey(secKey))}
      </main>

      {/* Footer */}
      {config.footer.enabled && (
        <footer className="border-t border-neutral-200 bg-white py-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6 text-xs text-neutral-500">
            <div className="flex items-center gap-2">
              <img
                src={config.header.logoUrl || "/logo1.png"}
                alt={config.header.brandName}
                className="h-6 w-6 rounded-md object-contain"
              />
              <span className="font-bold text-[#151515]">
                {config.footer.brandText}
              </span>
            </div>
            <p>
              © {new Date().getFullYear()} {config.footer.copyrightText}
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
