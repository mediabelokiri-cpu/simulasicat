"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Activity } from "lucide-react";

interface MobileWelcomeScreenProps {
  onStart: () => void;
}

/**
 * Layar Onboarding / Splash Mobile ("Lebih mudah untuk mengakses simulasi CAT dengan mobile")
 * Ditampilkan khusus di perangkat mobile (< lg) saat pertama kali membuka URL / Aplikasi
 * sebelum masuk ke halaman Login / Register User.
 */
export function MobileWelcomeScreen({ onStart }: MobileWelcomeScreenProps) {
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const totalSlides = 3;

  function prevSlide() {
    setActiveSlide((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
  }

  function nextSlide() {
    setActiveSlide((prev) => (prev === totalSlides - 1 ? 0 : prev + 1));
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    setTouchStartX(e.touches[0]?.clientX ?? null);
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX;
    const diff = touchStartX - endX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    setTouchStartX(null);
  }

  return (
    <div className="min-h-dvh w-full bg-[#f5f8ff] p-3 sm:p-5 flex items-center justify-center lg:hidden">
      <div className="relative mx-auto flex min-h-[calc(100dvh-24px)] sm:min-h-[680px] w-full max-w-[390px] flex-col justify-between overflow-hidden rounded-[40px] bg-gradient-to-br from-[#494ae2] via-[#5e4fe7] to-[#7854ec] p-5 sm:p-6 text-white shadow-[0_24px_60px_rgba(73,74,226,0.35)]">
        {/* Garis Gelombang Dekoratif Atas (3 Wavy Lines sesuai referensi) */}
        <svg
          viewBox="0 0 400 130"
          fill="none"
          className="pointer-events-none absolute inset-x-0 top-2 w-full opacity-25"
          aria-hidden="true"
        >
          <path
            d="M-20 28 C 90 10, 180 55, 290 25 C 350 10, 390 25, 430 18"
            stroke="white"
            strokeWidth="1.8"
          />
          <path
            d="M-20 55 C 90 35, 180 82, 290 52 C 350 35, 390 50, 430 42"
            stroke="white"
            strokeWidth="1.8"
          />
          <path
            d="M-20 82 C 90 62, 180 110, 290 78 C 350 60, 390 75, 430 68"
            stroke="white"
            strokeWidth="1.8"
          />
        </svg>

        {/* Bagian Atas: Brand Pill CATARA */}
        <div className="relative z-10 flex items-center justify-center pt-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-xs border border-white/20 px-3.5 py-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white p-1">
              <img
                src="/logoheadermobile.png"
                alt="CATARA"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-xs font-extrabold tracking-wide text-white">
              CATARA — Digital Assessment
            </span>
          </div>
        </div>

        {/* Visual Tengah: Gambar Hero Section dari Folder */}
        <div className="relative my-auto flex flex-col items-center justify-center py-3">
          <img
            src="/gambarsectionhero.png"
            alt="CATARA — Digital Assessment Platform"
            className="h-auto w-full max-w-[265px] sm:max-w-[295px] object-contain drop-shadow-[0_18px_36px_rgba(12,12,19,0.28)] select-none"
          />
        </div>

        {/* Kartu Bawah dengan 3 Slide CTA */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative z-10 rounded-[32px] bg-white/15 backdrop-blur-md border border-white/20 px-6 py-7 text-center shadow-inner space-y-4 select-none"
        >
          {/* Navigasi & Indikator 3 Slide */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Slide sebelumnya"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-white/90 hover:bg-white/25 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center justify-center gap-2">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  aria-label={`Pilih slide ${idx + 1}`}
                  className={`rounded-full transition-all cursor-pointer ${
                    activeSlide === idx
                      ? "h-2.5 w-6 bg-white"
                      : "h-2 w-2 bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={nextSlide}
              aria-label="Slide berikutnya"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-white/90 hover:bg-white/25 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* SLIDE 1: CTA Mulai (Tidak diganggu konten & tombolnya) */}
          {activeSlide === 0 && (
            <>
              <h1 className="text-[20px] sm:text-[22px] font-extrabold leading-[1.3] tracking-tight text-white">
                Lebih mudah untuk mengakses simulasi CAT dengan mobile
              </h1>

              <p className="mx-auto max-w-[260px] text-xs sm:text-[13px] font-medium leading-relaxed text-[#f5f8ff]/90">
                Sekarang kamu bisa mengakses CATARA — Digital Assessment Platform
                dengan lebih mudah.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onStart}
                  className="w-full rounded-2xl bg-white py-4 text-sm font-extrabold text-[#494ae2] shadow-[0_10px_25px_rgba(12,12,19,0.2)] transition-transform hover:scale-[1.01] active:scale-98 cursor-pointer"
                >
                  Mulai
                </button>
              </div>
            </>
          )}

          {/* SLIDE 2: CTA Melihat Laman Download App */}
          {activeSlide === 1 && (
            <>
              <h1 className="text-[20px] sm:text-[22px] font-extrabold leading-[1.3] tracking-tight text-white">
                Instal aplikasi CATARA di perangkat mobile kamu
              </h1>

              <p className="mx-auto max-w-[260px] text-xs sm:text-[13px] font-medium leading-relaxed text-[#f5f8ff]/90">
                Pasang aplikasi CATARA langsung di layar utama ponsel untuk akses
                simulasi ujian yang lebih praktis.
              </p>

              <div className="pt-2">
                <Link
                  href="/download-app"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-extrabold text-[#494ae2] shadow-[0_10px_25px_rgba(12,12,19,0.2)] transition-transform hover:scale-[1.01] active:scale-98"
                >
                  <Download className="h-4 w-4" />
                  <span>Lihat Laman Download App</span>
                </Link>
              </div>
            </>
          )}

          {/* SLIDE 3: CTA Melihat Laman Live Score */}
          {activeSlide === 2 && (
            <>
              <h1 className="text-[20px] sm:text-[22px] font-extrabold leading-[1.3] tracking-tight text-white">
                Pantau perolehan Live Score ujian secara real-time
              </h1>

              <p className="mx-auto max-w-[260px] text-xs sm:text-[13px] font-medium leading-relaxed text-[#f5f8ff]/90">
                Lihat papan peringkat dan perolehan skor peserta sesi ujian yang
                sedang berlangsung secara langsung.
              </p>

              <div className="pt-2">
                <Link
                  href="/live-score"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-extrabold text-[#494ae2] shadow-[0_10px_25px_rgba(12,12,19,0.2)] transition-transform hover:scale-[1.01] active:scale-98"
                >
                  <Activity className="h-4 w-4" />
                  <span>Lihat Laman Live Score</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
