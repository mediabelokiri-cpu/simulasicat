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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
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
                  Papan Live Score Real-Time
                </span>
              </div>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/15 text-white border-white/30 hover:bg-white/25 font-semibold"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Beranda
              </Button>
            </Link>

            <Link href="/#leaderboard" className="hidden md:inline-flex">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/15 text-white border-white/30 hover:bg-white/25 font-semibold"
                leftIcon={<Trophy className="h-4 w-4 text-[#ffc63d]" />}
              >
                Leaderboard Hasil Akhir
              </Button>
            </Link>

            {activeUser ? (
              <>
                {activeUser.role === "admin" && (
                  <Link href="/admin/live-score" className="hidden sm:inline-flex">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-[#ffc63d] text-[#151515] border-[#ffc63d] hover:bg-[#f4b928] font-extrabold"
                      leftIcon={<SlidersHorizontal className="h-4 w-4" />}
                    >
                      Kelola Live Score (Admin)
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
                    Dashboard ({activeUser.full_name.split(" ")[0]})
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
                  <Link href="/register" className="hidden sm:inline-flex">
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
