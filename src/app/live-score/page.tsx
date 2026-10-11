"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  LogIn,
  LogOut,
  SlidersHorizontal,
  Trophy,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui";
import { getCurrentUserClient, setCurrentUserClient } from "@/lib/auth";
import {
  DEFAULT_HOMEPAGE_CONFIG,
  HomepageConfig,
  getHomepageConfig,
} from "@/lib/homepage-store";
import { PublicLiveScoreSection } from "@/components/live-score/PublicLiveScoreSection";
import { ProfileRow } from "@/types/database";

export default function DedicatedLiveScorePage() {
  const [config, setConfig] = useState<HomepageConfig>(DEFAULT_HOMEPAGE_CONFIG);
  const [activeUser, setActiveUser] = useState<ProfileRow | null>(null);

  useEffect(() => {
    const sync = () => {
      setConfig(getHomepageConfig());
      setActiveUser(getCurrentUserClient());
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  function handleLogout() {
    setCurrentUserClient(null);
    setActiveUser(null);
  }

  return (
    <div className="min-h-screen bg-[#f5f8ff] text-[#0c0c13] flex flex-col">
      {/* Top Navbar Identitas CATARA */}
      <header className="sticky top-0 z-30 border-b border-white/15 bg-gradient-to-r from-[#494ae2] to-[#7854ec] text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3.5 py-3 sm:px-6 sm:py-3.5 lg:px-8">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0"
            >
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
            </Link>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <Link href="/" className="shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/15 text-white border-white/30 hover:bg-white/25 font-semibold whitespace-nowrap px-2.5 sm:px-3.5 text-xs"
                leftIcon={<ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              >
                Beranda
              </Button>
            </Link>

            <Link
              href="/#leaderboard"
              className="hidden md:inline-flex shrink-0"
            >
              <Button
                variant="outline"
                size="sm"
                className="bg-white/15 text-white border-white/30 hover:bg-white/25 font-semibold whitespace-nowrap"
                leftIcon={<Trophy className="h-4 w-4 text-white" />}
              >
                Leaderboard Hasil Akhir
              </Button>
            </Link>

            {activeUser ? (
              <>
                {activeUser.role === "admin" && (
                  <Link
                    href="/admin/live-score"
                    className="hidden md:inline-flex shrink-0"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white text-[#494ae2] border-white hover:bg-[#f5f8ff] font-extrabold whitespace-nowrap"
                      leftIcon={<SlidersHorizontal className="h-4 w-4" />}
                    >
                      Kelola Live Score
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
                      className="whitespace-nowrap"
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

      {/* Main Content: Papan Live Score Real-Time */}
      <main className="flex-1">
        <PublicLiveScoreSection
          isAuthenticatedUser={Boolean(activeUser)}
          standalonePage
        />
      </main>

      {/* Footer */}
      {config.footer.enabled && (
        <footer className="border-t border-indigo-100/80 bg-white py-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6 lg:px-8 text-xs text-slate-500">
            <div className="flex items-center gap-2.5">
              <img
                src="/logoheaderfooterhomepage.png"
                alt="CATARA — Digital Assessment Platform"
                className="h-6 w-6 rounded-md object-contain"
              />
              <span className="font-bold text-[#0c0c13]">
                {config.footer.brandText &&
                !config.footer.brandText.toLowerCase().includes("prima")
                  ? config.footer.brandText
                  : "CATARA — Digital Assessment Platform"}
              </span>
            </div>
            <p>
              © {new Date().getFullYear()}{" "}
              {config.footer.copyrightText &&
              !config.footer.copyrightText.toLowerCase().includes("prima")
                ? config.footer.copyrightText
                : "CATARA. Hak cipta dilindungi."}
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
