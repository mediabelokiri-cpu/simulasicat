"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  LogIn,
  LogOut,
  UserPlus,
  Award,
  BookOpen,
  Building2,
  Trophy,
  Megaphone,
  SlidersHorizontal,
  Activity,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { Button, StatusBadge, inputBaseClasses } from "@/components/ui";
import { MobileWelcomeScreen } from "@/components/auth/MobileWelcomeScreen";
import {
  getCurrentUserClient,
  getStoredProfiles,
  setCurrentUserClient,
  syncProfilesFromSupabase,
} from "@/lib/auth";
import {
  getExamRuns,
  getExams,
  getResults,
  syncAdminStoreFromSupabase,
} from "@/lib/admin-store";
import {
  DEFAULT_HOMEPAGE_CONFIG,
  HomepageConfig,
  HomepageSectionKey,
  getHomepageConfig,
} from "@/lib/homepage-store";
import { sortOfficialLeaderboard } from "@/lib/scoring";
import { ExamRow, ExamRunRow, ProfileRow, ResultRow } from "@/types/database";
import { cn, formatDateTimeID } from "@/lib/utils";

export default function LandingPage() {
  const router = useRouter();
  const [config, setConfig] = useState<HomepageConfig>(DEFAULT_HOMEPAGE_CONFIG);
  const [activeUser, setActiveUser] = useState<ProfileRow | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [runs, setRuns] = useState<ExamRunRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("all");

  useEffect(() => {
    const syncHomepage = () => {
      const loadedCfg = getHomepageConfig();
      const loadedRuns = getExamRuns();
      setConfig(loadedCfg);
      setSelectedRunId((prev) => {
        const candidate =
          prev === "all" ? loadedCfg.leaderboard.defaultRunId || "all" : prev;
        if (
          candidate !== "all" &&
          !loadedRuns.some((r) => r.id === candidate)
        ) {
          return "all";
        }
        return candidate;
      });
      setActiveUser(getCurrentUserClient());
      setResults(getResults());
      setRuns(loadedRuns);
      setExams(getExams());
      setProfiles(getStoredProfiles());
    };

    const syncFromRemote = async () => {
      await Promise.all([
        syncAdminStoreFromSupabase(),
        syncProfilesFromSupabase(),
      ]);
      syncHomepage();
    };

    syncHomepage();
    void syncFromRemote();

    const interval = window.setInterval(() => {
      void syncFromRemote();
    }, 6000);

    const handleFocus = () => {
      void syncFromRemote();
    };

    window.addEventListener("storage", syncHomepage);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("prima-live-score-event", syncHomepage);
    window.addEventListener("prima-store-synced", syncHomepage);
    window.addEventListener("prima-profiles-synced", syncHomepage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", syncHomepage);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("prima-live-score-event", syncHomepage);
      window.removeEventListener("prima-store-synced", syncHomepage);
      window.removeEventListener("prima-profiles-synced", syncHomepage);
    };
  }, []);

  function handleLogout() {
    setCurrentUserClient(null);
    setActiveUser(null);
  }

  // Hasil akhir ujian dari sesi simulasi CAT yang sudah selesai
  const publishedResults = results.filter((r) => Boolean(r.score_published_at));
  const activeRunFilter =
    selectedRunId !== "all" && runs.some((r) => r.id === selectedRunId)
      ? selectedRunId
      : "all";
  const filteredResults =
    activeRunFilter === "all"
      ? publishedResults
      : publishedResults.filter((r) => r.exam_run_id === activeRunFilter);
  const leaderboardRows = sortOfficialLeaderboard(filteredResults).slice(
    0,
    Math.max(1, config.leaderboard.maxRows || 15)
  );

  function renderHeroSection() {
    if (!config.hero.enabled) return null;
    return (
      <section
        key="hero"
        className="relative overflow-hidden border-b border-indigo-100/80 bg-gradient-to-br from-[#f5f8ff] via-white to-[#eef2ff] py-12 sm:py-16"
      >
        {/* Subtle decorative gradient orbs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-[#494ae2]/10 to-[#7854ec]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-gradient-to-tr from-[#7854ec]/10 to-[#494ae2]/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 space-y-6">
              {(config.hero.badgeText || config.hero.badgeSubtext) && (
                <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-2xl sm:rounded-full border border-[#494ae2]/20 bg-white px-3 py-1.5 shadow-2xs">
                  {config.hero.badgeText && (
                    <span className="shrink-0">
                      <StatusBadge
                        variant="featured"
                        label={config.hero.badgeText}
                        size="sm"
                      />
                    </span>
                  )}
                  {config.hero.badgeSubtext && (
                    <span className="text-[11px] sm:text-xs font-semibold bg-gradient-to-r from-[#494ae2] to-[#7854ec] bg-clip-text text-transparent leading-tight">
                      {config.hero.badgeSubtext}
                    </span>
                  )}
                </div>
              )}

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0c0c13] leading-[1.15]">
                {config.hero.titlePrefix}{" "}
                <span className="bg-gradient-to-r from-[#494ae2] to-[#7854ec] bg-clip-text text-transparent">
                  {config.hero.titleHighlight}
                </span>{" "}
                {config.hero.titleSuffix}
              </h1>

              <div className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl whitespace-pre-line">
                {config.hero.description}
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-1">
                {activeUser ? (
                  <Link
                    href={activeUser.role === "admin" ? "/admin" : "/dashboard"}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full justify-center"
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      Masuk ke Portal Ujian
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login" className="w-full sm:w-auto">
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full justify-center"
                        leftIcon={<LogIn className="h-4 w-4" />}
                      >
                        {config.hero.primaryCtaLabel}
                      </Button>
                    </Link>
                    {config.header.showRegisterButton && (
                      <Link href="/register" className="w-full sm:w-auto">
                        <Button
                          variant="accent"
                          size="lg"
                          className="w-full justify-center"
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
                <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-indigo-100/90 max-w-lg text-xs">
                  {config.hero.stats.map((st, i) => (
                    <div key={i} className="min-w-0">
                      <p className="font-extrabold text-sm sm:text-lg bg-gradient-to-r from-[#494ae2] to-[#7854ec] bg-clip-text text-transparent tabular-nums truncate">
                        {st.value}
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-600 leading-snug">
                        {st.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Hero Visual (Gambar Hero PNG Transparan atau Kartu Keamanan) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              {config.hero.rightDisplayMode === "card" ? (
                <div className="w-full rounded-2xl border border-indigo-100 bg-white p-6 shadow-[0_16px_40px_rgba(73,74,226,0.08)] space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#494ae2] to-[#7854ec] text-white shadow-sm">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-base font-extrabold text-[#0c0c13]">
                          {config.hero.securityCardTitle}
                        </h2>
                        <p className="text-xs text-slate-500">
                          {config.hero.securityCardSubtitle}
                        </p>
                      </div>
                    </div>
                    {config.hero.securityCardBadge && (
                      <span className="rounded-lg bg-gradient-to-r from-[#494ae2] to-[#7854ec] px-2.5 py-1 text-xs font-extrabold text-white">
                        {config.hero.securityCardBadge}
                      </span>
                    )}
                  </div>

                  <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                    {config.hero.securityFeatures.map((feat) => (
                      <li key={feat.id} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-[#494ae2] shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-[#0c0c13]">
                            {feat.title}
                          </strong>{" "}
                          {feat.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="relative flex items-center justify-center py-2">
                  {/* Soft Indigo-Violet Glow Aura di Belakang Gambar */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute h-72 w-72 rounded-full bg-gradient-to-br from-[#494ae2]/15 to-[#7854ec]/20 blur-3xl"
                  />

                  {/* Badge Melayang 1: Kiri Atas — Simulasi CAT */}
                  <div className="animate-catara-float-1 absolute top-4 -left-2 sm:-left-4 z-20 flex items-center gap-2.5 rounded-2xl border border-indigo-100 bg-white/95 px-3.5 py-2 text-[#0c0c13] shadow-[0_12px_30px_rgba(73,74,226,0.16)] backdrop-blur-md">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#494ae2] to-[#7854ec] text-white shadow-xs">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div className="text-left leading-tight">
                      <p className="text-xs font-extrabold text-[#0c0c13]">
                        Simulasi CAT
                      </p>
                      <p className="text-[10px] font-medium text-slate-500">
                        Sistem Terintegrasi
                      </p>
                    </div>
                  </div>

                  {/* Badge Melayang 2: Kanan Atas — Live Score Real-Time */}
                  <div className="animate-catara-float-2 absolute top-10 -right-2 sm:-right-4 z-20 flex items-center gap-2.5 rounded-2xl border border-indigo-100 bg-white/95 px-3.5 py-2 text-[#0c0c13] shadow-[0_12px_30px_rgba(73,74,226,0.16)] backdrop-blur-md">
                    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
                      <Activity className="h-4 w-4" />
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-300 animate-ping" />
                    </span>
                    <div className="text-left leading-tight">
                      <p className="text-xs font-extrabold text-[#0c0c13]">
                        Live Score
                      </p>
                      <p className="text-[10px] font-semibold text-emerald-600">
                        Monitoring Real-Time
                      </p>
                    </div>
                  </div>

                  {/* Gambar Hero Utama */}
                  <img
                    src={config.hero.heroImageUrl || "/gambarsectionhero.png"}
                    alt={
                      config.hero.heroImageAlt ||
                      "CATARA — Digital Assessment Platform"
                    }
                    style={{
                      maxWidth: `${config.hero.heroImageWidth || 440}px`,
                    }}
                    className="relative z-10 h-auto w-full object-contain drop-shadow-[0_20px_38px_rgba(73,74,226,0.18)] select-none"
                  />

                  {/* Badge Melayang 3: Kiri Bawah — Analisis Hasil */}
                  <div className="animate-catara-float-3 absolute bottom-5 -left-2 sm:-left-4 z-20 flex items-center gap-2.5 rounded-2xl border border-indigo-100 bg-white/95 px-3.5 py-2 text-[#0c0c13] shadow-[0_12px_30px_rgba(73,74,226,0.16)] backdrop-blur-md">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#7854ec] text-white shadow-xs">
                      <BarChart3 className="h-4 w-4" />
                    </span>
                    <div className="text-left leading-tight">
                      <p className="text-xs font-extrabold text-[#0c0c13]">
                        Analisis Hasil
                      </p>
                      <p className="text-[10px] font-medium text-slate-500">
                        Passing Grade &amp; Evaluasi
                      </p>
                    </div>
                  </div>

                  {/* Badge Melayang 4: Kanan Bawah — Autosave Server */}
                  <div className="animate-catara-float-4 absolute bottom-7 -right-2 sm:-right-4 z-20 flex items-center gap-2.5 rounded-2xl border border-indigo-100 bg-white/95 px-3.5 py-2 text-[#0c0c13] shadow-[0_12px_30px_rgba(73,74,226,0.16)] backdrop-blur-md">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#494ae2] text-white shadow-xs">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <div className="text-left leading-tight">
                      <p className="text-xs font-extrabold text-[#0c0c13]">
                        Autosave Server
                      </p>
                      <p className="text-[10px] font-medium text-slate-500">
                        Aman &amp; Terukur
                      </p>
                    </div>
                  </div>
                </div>
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
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0c0c13]">
            {config.categories.sectionTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            {config.categories.sectionSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {config.categories.items.map((cat) => (
            <div
              key={cat.id}
              className="rounded-2xl border border-indigo-100/90 bg-white p-6 shadow-xs hover:shadow-md transition-shadow space-y-3"
            >
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-xs",
                  cat.icon === "building"
                    ? "bg-gradient-to-br from-[#7854ec] to-[#494ae2]"
                    : "bg-gradient-to-br from-[#494ae2] to-[#7854ec]"
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
              <h3 className="text-base font-extrabold text-[#0c0c13]">
                {cat.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {cat.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderLeaderboardSection() {
    if (!config.leaderboard.enabled) return null;
    return (
      <React.Fragment key="leaderboard">
        {/* Section Papan Leaderboard Hasil Ujian (Terisi Setelah Sesi Simulasi CAT / Ujian Berakhir — Dikontrol dari Kelola Homepage) */}
        {(
          <section
            id="leaderboard"
            className="mx-auto max-w-6xl px-4 py-8 pb-14 sm:px-6 space-y-5"
          >
            <div className="rounded-2xl border border-indigo-100/90 bg-white p-5 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#494ae2] to-[#7854ec] text-white shadow-xs">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-extrabold text-[#0c0c13]">
                        {config.leaderboard.sectionTitle}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {config.leaderboard.sectionSubtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {config.leaderboard.showSessionFilter && runs.length > 0 && (
                  <div className="w-full sm:w-64">
                    <select
                      aria-label="Filter Sesi Ujian"
                      value={selectedRunId}
                      onChange={(e) => setSelectedRunId(e.target.value)}
                      className={inputBaseClasses}
                    >
                      <option value="all">Semua Sesi Ujian</option>
                      {runs.map((r) => {
                        const ex = exams.find((e) => e.id === r.exam_id);
                        return (
                          <option key={r.id} value={r.id}>
                            {ex ? `${ex.title} — ${r.name}` : r.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-indigo-100/80">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-[#494ae2]/20 bg-gradient-to-r from-[#494ae2] to-[#7854ec] text-white font-bold">
                      <th className="py-3 px-3">Peringkat</th>
                      <th className="py-3 px-3">Nama Peserta</th>
                      <th className="py-3 px-3">Sesi Ujian</th>
                      <th className="py-3 px-3 text-center">TWK</th>
                      <th className="py-3 px-3 text-center">TIU</th>
                      <th className="py-3 px-3 text-center">TKP</th>
                      <th className="py-3 px-3 text-center">
                        Total Skor Akhir
                      </th>
                      <th className="py-3 px-3">Status Passing Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80">
                    {leaderboardRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-10 px-4 text-center text-slate-500"
                        >
                          <div className="mx-auto max-w-md space-y-1.5">
                            <p className="text-sm font-bold text-[#0c0c13]">
                              {config.leaderboard.emptyTitle}
                            </p>
                            <p className="text-xs text-slate-500">
                              {config.leaderboard.emptyDescription}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      leaderboardRows.map((row, idx) => {
                        const prof = profiles.find(
                          (p) => p.id === row.user_id
                        );
                        const isMe = activeUser?.id === row.user_id;
                        const runObj = runs.find(
                          (r) => r.id === row.exam_run_id
                        );
                        const examObj = exams.find(
                          (e) => e.id === runObj?.exam_id
                        );
                        const rawTitle =
                          (row.result_snapshot?.exam_title as string) ||
                          examObj?.title ||
                          "Simulasi CAT CATARA";
                        const snapshotTitle = rawTitle.replace(
                          /Prima\s*RIB/gi,
                          "CATARA"
                        );
                        const snapshotRunName =
                          (row.result_snapshot?.run_name as string) ||
                          runObj?.name ||
                          "Sesi Ujian";

                        const twk =
                          row.section_scores.find(
                            (s) => s.section_key.toUpperCase() === "TWK"
                          )?.score ?? 0;
                        const tiu =
                          row.section_scores.find(
                            (s) => s.section_key.toUpperCase() === "TIU"
                          )?.score ?? 0;
                        const tkp =
                          row.section_scores.find(
                            (s) => s.section_key.toUpperCase() === "TKP"
                          )?.score ?? 0;

                        return (
                          <tr
                            key={row.id}
                            className={cn(
                              "transition-colors",
                              row.thresholds_met
                                ? "bg-emerald-50/85 hover:bg-emerald-100/80 border-l-4 border-l-emerald-600"
                                : "bg-rose-50/85 hover:bg-rose-100/80 border-l-4 border-l-rose-500",
                              isMe && "font-semibold"
                            )}
                          >
                            <td className="py-3 px-3 tabular-nums font-extrabold text-[#0c0c13]">
                              <span
                                className={cn(
                                  "inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs",
                                  idx === 0
                                    ? "bg-gradient-to-br from-[#494ae2] to-[#7854ec] text-white shadow-2xs"
                                    : idx === 1
                                    ? "bg-[#0c0c13] text-white"
                                    : idx === 2
                                    ? "bg-indigo-100 text-[#494ae2]"
                                    : "bg-white/90 text-slate-800 border border-slate-300"
                                )}
                              >
                                #{idx + 1}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#0c0c13]">
                                  {(prof?.full_name || "Peserta CATARA").replace(
                                    /Prima\s*RIB/gi,
                                    "CATARA"
                                  )}
                                </span>
                                {isMe && (
                                  <span className="rounded-md bg-gradient-to-r from-[#494ae2] to-[#7854ec] px-2 py-0.5 text-[10px] font-bold text-white">
                                    Anda
                                  </span>
                                )}
                              </div>
                              <span className="block text-[11px] text-slate-600">
                                Selesai: {formatDateTimeID(row.created_at)}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="block font-semibold text-[#0c0c13]">
                                {snapshotTitle}
                              </span>
                              <span className="block text-[11px] text-slate-600">
                                {snapshotRunName}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center tabular-nums font-bold text-[#0c0c13]">
                              {twk}
                            </td>
                            <td className="py-3 px-3 text-center tabular-nums font-bold text-[#0c0c13]">
                              {tiu}
                            </td>
                            <td className="py-3 px-3 text-center tabular-nums font-bold text-[#0c0c13]">
                              {tkp}
                            </td>
                            <td className="py-3 px-3 text-center tabular-nums text-base font-extrabold text-[#494ae2]">
                              {row.total_score}
                            </td>
                            <td className="py-3 px-3">
                              {row.thresholds_met ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Memenuhi
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-rose-700 px-2.5 py-1 text-xs font-bold text-white">
                                  <XCircle className="h-3.5 w-3.5" />
                                  Belum Memenuhi
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </React.Fragment>
    );
  }

  function renderSectionByKey(key: HomepageSectionKey) {
    if (key === "hero") return renderHeroSection();
    if (key === "categories") return renderCategoriesSection();
    if (key === "leaderboard") return renderLeaderboardSection();
    return null;
  }

  function handleStartMobileApp() {
    try {
      window.sessionStorage.setItem("prima_mobile_onboarding_done", "1");
    } catch {
      // ignore storage errors
    }
    router.push("/login");
  }

  return (
    <>
      {/* Layar Onboarding Mobile saat URL/Aplikasi dibuka di Mobile sebelum Login/Register */}
      {!activeUser && <MobileWelcomeScreen onStart={handleStartMobileApp} />}

      <div
        className={cn(
          "min-h-screen bg-[#f5f8ff] text-[#0c0c13] flex-col",
          !activeUser ? "hidden lg:flex" : "flex"
        )}
      >
        {/* Banner Pengumuman Opsional */}
        {config.announcement.enabled && (
          <div className="bg-[#0c0c13] text-white border-b border-white/10 px-4 py-2.5 text-xs sm:text-sm">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-medium">
                <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-[#494ae2] to-[#7854ec] px-2 py-0.5 text-[11px] font-bold text-white">
                  <Megaphone className="h-3 w-3" />
                  {config.announcement.badge}
                </span>
                <span className="font-semibold text-[#f5f8ff]">
                  {config.announcement.message}
                </span>
              </div>
              {config.announcement.ctaLabel && config.announcement.ctaHref && (
                <Link
                  href={config.announcement.ctaHref}
                  className="font-extrabold text-[#f5f8ff] underline hover:no-underline"
                >
                  {config.announcement.ctaLabel} →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Top Navbar */}
        <header className="sticky top-0 z-30 border-b border-white/15 bg-gradient-to-r from-[#494ae2] to-[#7854ec] text-white shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3.5 py-3 sm:px-6 sm:py-3.5">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-xs">
                <img
                  src="/logoheaderfooterhomepage.png"
                  alt="CATARA — Digital Assessment Platform"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <span className="block text-base sm:text-lg font-extrabold tracking-tight text-white whitespace-nowrap leading-tight">
                  {config.header.brandName &&
                  !config.header.brandName.toLowerCase().includes("prima")
                    ? config.header.brandName
                    : "CATARA"}
                </span>
                <span className="hidden sm:block text-[11px] font-medium text-white/85 truncate">
                  {config.header.brandSubtitle ||
                    "Digital Assessment Platform"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <Link href="/live-score" className="shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/15 text-white border-white/30 hover:bg-white/25 font-bold whitespace-nowrap px-2.5 sm:px-3.5 text-xs"
                  leftIcon={
                    <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                  }
                >
                  Live Score
                </Button>
              </Link>

              {activeUser ? (
                <>
                  {activeUser.role === "admin" && (
                    <Link
                      href="/admin/homepage"
                      className="hidden md:inline-flex shrink-0"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/15 text-white border-white/30 hover:bg-white/25 font-semibold whitespace-nowrap"
                        leftIcon={<SlidersHorizontal className="h-4 w-4" />}
                      >
                        Kelola Homepage
                      </Button>
                    </Link>
                  )}
                  <Link
                    href={activeUser.role === "admin" ? "/admin" : "/dashboard"}
                    className="shrink-0"
                  >
                    <Button
                      variant="accent"
                      size="sm"
                      className="whitespace-nowrap px-2.5 sm:px-3.5 text-xs"
                      rightIcon={
                        <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      }
                    >
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="hidden sm:inline-flex bg-white text-[#494ae2] border-white hover:bg-[#f5f8ff] font-bold whitespace-nowrap"
                    leftIcon={<LogOut className="h-4 w-4" />}
                  >
                    Keluar
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" className="shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white text-[#494ae2] border-white hover:bg-[#f5f8ff] font-bold whitespace-nowrap px-3 sm:px-3.5 text-xs"
                      leftIcon={<LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                    >
                      {config.header.loginButtonLabel}
                    </Button>
                  </Link>
                  {config.header.showRegisterButton && (
                    <Link
                      href="/register"
                      className="hidden md:inline-flex shrink-0"
                    >
                      <Button
                        variant="accent"
                        size="sm"
                        className="bg-none bg-[#494ae2] hover:bg-[#3f40cc] active:bg-[#3637b8] text-white border-white/25 whitespace-nowrap"
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
          <footer className="border-t border-indigo-100/80 bg-white py-8">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 text-xs text-slate-500">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logoheaderfooterhomepage.png"
                  alt="CATARA — Digital Assessment Platform"
                  className="h-7 w-7 rounded-md object-contain"
                />
                <span className="text-[#0c0c13]">
                  <span className="font-extrabold">CATARA</span>{" "}
                  <span className="font-normal">
                    — Digital Assessment Platform
                  </span>
                </span>
              </div>
              <p>
                © 2026 CATARA | Dikembangkan oleh{" "}
                <a
                  href="https://labide.site/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#494ae2] hover:underline"
                >
                  LABIDE
                </a>
                . Seluruh hak cipta dilindungi.
              </p>
            </div>
          </footer>
        )}
      </div>
    </>
  );
}
