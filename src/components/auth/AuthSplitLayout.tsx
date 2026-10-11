"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, CheckCircle2, Smartphone, Clock } from "lucide-react";
import { MobileWelcomeScreen } from "@/components/auth/MobileWelcomeScreen";

interface AuthSplitLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const MOBILE_ONBOARDING_KEY = "prima_mobile_onboarding_done";

/**
 * Layout Autentikasi CATARA — Digital Assessment Platform:
 * - Mobile: Menampilkan MobileWelcomeScreen terlebih dahulu sebelum masuk ke form Login/Register,
 *   lalu menampilkan form satu kolom bergaya modern setelah klik "Mulai".
 * - Desktop: Panel visual brand CATARA (gradasi #494ae2 ke #7854ec) di kiri, form autentikasi di kanan (#f5f8ff).
 */
export function AuthSplitLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthSplitLayoutProps) {
  const [mobileStarted, setMobileStarted] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);

  useEffect(() => {
    try {
      const done =
        window.sessionStorage.getItem(MOBILE_ONBOARDING_KEY) === "1";
      setMobileStarted(done);
    } catch {
      setMobileStarted(false);
    }
    setHydrated(true);
  }, []);

  function handleStartMobile() {
    try {
      window.sessionStorage.setItem(MOBILE_ONBOARDING_KEY, "1");
    } catch {
      // ignore storage errors
    }
    setMobileStarted(true);
  }

  function handleResetWelcome() {
    try {
      window.sessionStorage.removeItem(MOBILE_ONBOARDING_KEY);
    } catch {
      // ignore
    }
    setMobileStarted(false);
  }

  return (
    <>
      {/* Layar Onboarding Mobile sebelum masuk ke Login / Register */}
      {hydrated && !mobileStarted && (
        <MobileWelcomeScreen onStart={handleStartMobile} />
      )}

      <div
        className={`min-h-screen bg-[#f5f8ff] text-[#0c0c13] flex-col lg:grid lg:grid-cols-12 ${
          !hydrated || !mobileStarted ? "hidden lg:grid" : "flex"
        }`}
      >
        {/* Desktop Left Visual Brand Panel */}
        <aside className="hidden lg:flex lg:col-span-5 xl:col-span-5 flex-col justify-between bg-gradient-to-br from-[#494ae2] via-[#5e4fe7] to-[#7854ec] p-10 text-white">
          <div className="space-y-8">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
                <img
                  src="/logoheaderfooterhomepage.png"
                  alt="CATARA — Digital Assessment Platform"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <span className="block text-xl font-extrabold tracking-tight text-white leading-none">
                  CATARA
                </span>
                <span className="block text-[11px] font-medium text-white/85 mt-0.5">
                  Digital Assessment Platform
                </span>
              </div>
            </Link>

            <div className="space-y-4 pt-4">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#0c0c13]/30 border border-white/20 px-3 py-1 text-xs font-bold text-white">
                <ShieldCheck className="h-4 w-4 text-white" />
                DIGITAL ASSESSMENT PLATFORM
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
                Solusi Evaluasi &amp; Seleksi Ujian Digital Terintegrasi.
              </h2>
              <p className="text-sm text-white/90 leading-relaxed">
                CATARA adalah platform ujian digital berbasis teknologi yang
                membantu lembaga pendidikan, bimbingan belajar, dan
                penyelenggara seleksi mengelola ujian secara terstruktur,
                efisien, dan terukur.
              </p>
            </div>

            <ul className="space-y-3.5 pt-2 text-sm">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-white" />
                <span>
                  <strong>Simulasi CAT &amp; Pengelolaan Jadwal:</strong> Urutan
                  soal subtes terkunci konsisten serta pengelolaan peserta yang
                  terstruktur.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-white" />
                <span>
                  <strong>Pemantauan Real-Time &amp; Analisis Hasil:</strong>{" "}
                  Pantau jalannya ujian secara langsung dengan evaluasi nilai
                  ambang batas otomatis.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-white" />
                <span>
                  <strong>Autosave Idempoten &amp; Pemulihan Sesi:</strong>{" "}
                  Jawaban tersimpan otomatis di server dan aman saat koneksi
                  terganggu.
                </span>
              </li>
            </ul>
          </div>

          <div className="border-t border-white/15 pt-5 text-xs text-white/80 flex items-center justify-between">
            <span>&copy; {new Date().getFullYear()} CATARA</span>
            <span>Digital Assessment Platform</span>
          </div>
        </aside>

        {/* Mobile Top Brand Header (Setelah klik Mulai) */}
        <header className="flex items-center justify-between bg-[#f5f8ff] px-5 pt-5 pb-2 lg:hidden">
          <button
            type="button"
            onClick={handleResetWelcome}
            className="flex items-center gap-3 text-left cursor-pointer"
          >
            <img
              src="/logoheadermobile.png"
              alt="CATARA — Digital Assessment Platform"
              className="h-9 w-9 object-contain shrink-0"
            />
            <div>
              <p className="text-[11px] font-medium text-slate-400 leading-tight">
                Selamat datang di,
              </p>
              <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-[#494ae2] to-[#7854ec] bg-clip-text text-transparent">
                CATARA
              </span>
            </div>
          </button>
          <Link
            href="/"
            className="rounded-xl bg-white border border-indigo-100 px-3 py-1.5 text-xs font-extrabold text-[#494ae2] shadow-2xs"
          >
            Beranda
          </Link>
        </header>

        {/* Form Content Column */}
        <main className="flex flex-1 flex-col justify-center px-4 py-6 sm:px-6 lg:col-span-7 xl:col-span-7 lg:px-12">
          <div className="mx-auto w-full max-w-md space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-[22px] sm:text-[28px] font-extrabold tracking-tight text-[#0c0c13]">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {subtitle}
              </p>
            </div>

            <div className="rounded-[26px] lg:rounded-2xl border border-indigo-100/90 bg-white p-5 sm:p-7 shadow-[0_12px_32px_rgba(73,74,226,0.06)]">
              {children}
            </div>

            {footer && <div className="text-center text-sm">{footer}</div>}
          </div>
        </main>
      </div>
    </>
  );
}
