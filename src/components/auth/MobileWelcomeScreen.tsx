"use client";

import React from "react";
import { Play } from "lucide-react";

interface MobileWelcomeScreenProps {
  onStart: () => void;
}

/**
 * Layar Onboarding / Splash Mobile ("Lebih mudah untuk mengakses simulasi CAT dengan mobile")
 * Ditampilkan khusus di perangkat mobile (< lg) saat pertama kali membuka URL / Aplikasi
 * sebelum masuk ke halaman Login / Register User.
 */
export function MobileWelcomeScreen({ onStart }: MobileWelcomeScreenProps) {
  return (
    <div className="min-h-dvh w-full bg-[#e9edff] p-3 sm:p-5 flex items-center justify-center lg:hidden">
      <div className="relative mx-auto flex min-h-[calc(100dvh-24px)] sm:min-h-[680px] w-full max-w-[390px] flex-col justify-between overflow-hidden rounded-[40px] bg-[#4338ca] p-5 sm:p-6 text-white shadow-[0_24px_60px_rgba(67,56,202,0.35)]">
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

        {/* Bagian Atas Kosong Penyeimbang Proporsi */}
        <div className="h-4" />

        {/* Ilustrasi Tengah: 3D Smartphone Pastel dengan Cincin Pink */}
        <div className="relative my-auto flex flex-col items-center justify-center py-6">
          {/* Bodi Ponsel 3D */}
          <div className="relative z-10 flex h-56 w-36 flex-col items-center justify-between rounded-[30px] border-[6px] border-[#ffd6de] bg-[#fffafa] p-3.5 shadow-[0_20px_40px_rgba(30,27,75,0.28)]">
            {/* Layar Atas Pink dengan Tombol Play */}
            <div className="flex h-24 w-full items-center justify-center rounded-[18px] bg-[#fb6f84] text-white shadow-inner">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border-[2.5px] border-white">
                <Play className="h-5 w-5 translate-x-0.5 fill-white text-white" />
              </div>
            </div>

            {/* 3 Titik Warna (Pink, Navy, Kuning Emas) */}
            <div className="flex items-center justify-center gap-3">
              <span className="h-4 w-4 rounded-full bg-[#fb6f84]" />
              <span className="h-4 w-4 rounded-full bg-[#1e1b4b]" />
              <span className="h-4 w-4 rounded-full bg-[#f59e0b]" />
            </div>

            {/* 3 Kotak Pastel Pink di Bawah */}
            <div className="grid w-full grid-cols-3 gap-2 pb-0.5">
              <span className="h-5 rounded-lg bg-[#ffe0e6]" />
              <span className="h-5 rounded-lg bg-[#ffe0e6]" />
              <span className="h-5 rounded-lg bg-[#ffe0e6]" />
            </div>
          </div>

          {/* Cincin Oval Pink di Bawah Ponsel */}
          <div className="-mt-3.5 h-9 w-40 rounded-full border-[5px] border-[#fb6f84]" />
        </div>

        {/* Kartu Bawah ("Lebih mudah untuk mengakses simulasi CAT dengan mobile") */}
        <div className="relative z-10 rounded-[32px] bg-[#5248e8] px-6 py-7 text-center shadow-inner space-y-4">
          {/* Indikator 3 Titik */}
          <div className="flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
            <span className="h-2 w-2 rounded-full bg-white/40" />
          </div>

          {/* Judul Utama */}
          <h1 className="text-[20px] sm:text-[22px] font-extrabold leading-[1.3] tracking-tight text-white">
            Lebih mudah untuk mengakses simulasi CAT dengan mobile
          </h1>

          {/* Subjudul */}
          <p className="mx-auto max-w-[260px] text-xs sm:text-[13px] font-medium leading-relaxed text-indigo-100/90">
            Sekarang kamu bisa mengakses simulasi CAT dengan lebih mudah.
          </p>

          {/* Tombol Mulai */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onStart}
              className="w-full rounded-2xl bg-white py-4 text-sm font-extrabold text-[#312e81] shadow-[0_10px_25px_rgba(20,16,68,0.18)] transition-transform hover:scale-[1.01] active:scale-98 cursor-pointer"
            >
              Mulai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
