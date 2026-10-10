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
    <div className="min-h-screen bg-[#fcfbf7] text-[#151515] flex flex-col">
      {/* Top Navbar Identitas Prima RIB */}
      <header className="sticky top-0 z-30 border-b border-[#093db0] bg-[#0b49d0] text-white shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3.5 py-3 sm:px-6 sm:py-3.5 lg:px-8">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
              <img
                src={config.header.logoUrl || "/logo1.png"}
                alt={config.header.brandName}
                className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-xl object-contain"
              />
              <div className="min-w-0">
                <span className="block text-sm sm:text-base font-extrabold tracking-tight text-white whitespace-nowrap leading-tight">
                  {config.header.brandName}
                </span>
                <span className="block text-[10px] sm:text-[11px] font-medium text-white/80 whitespace-nowrap leading-tight">
                  Papan Live Score Real-Time
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

            <Link href="/#leaderboard" className="hidden md:inline-flex shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/15 text-white border-white/30 hover:bg-white/25 font-semibold whitespace-nowrap"
                leftIcon={<Trophy className="h-4 w-4 text-[#ffc63d]" />}
              >
                Leaderboard Hasil Akhir
              </Button>
            </Link>

            {activeUser ? (
              <>
                {activeUser.role === "admin" && (
                  <Link href="/admin/live-score" className="hidden md:inline-flex shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-[#ffc63d] text-[#151515] border-[#ffc63d] hover:bg-[#f4b928] font-extrabold whitespace-nowrap"
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
                    rightIcon={<ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  >
                    Dashboard
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="hidden sm:inline-flex bg-white text-[#0b49d0] border-white hover:bg-neutral-100 font-bold whitespace-nowrap"
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
                    className="bg-white text-[#0b49d0] border-white hover:bg-neutral-100 font-bold whitespace-nowrap px-3 sm:px-3.5 text-xs"
                    leftIcon={<LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  >
                    {config.header.loginButtonLabel}
                  </Button>
                </Link>
                {config.header.showRegisterButton && (
                  <Link href="/register" className="hidden md:inline-flex shrink-0">
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
        <footer className="border-t border-neutral-200 bg-white py-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6 lg:px-8 text-xs text-neutral-500">
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
