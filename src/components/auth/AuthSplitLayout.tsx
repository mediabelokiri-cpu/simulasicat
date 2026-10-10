import React from "react";
import Link from "next/link";
import { ShieldCheck, CheckCircle2, Smartphone, Clock } from "lucide-react";

interface AuthSplitLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Layout Autentikasi sesuai Bab 4 Rancangan UI/UX:
 * - Mobile: Brand di bagian atas, form satu kolom, tombol lebar penuh.
 * - Desktop: Panel visual brand Prima RIB (#0b49d0) di kiri, form autentikasi di kanan (#fcfbf7).
 */
export function AuthSplitLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen bg-[#fcfbf7] text-[#151515] flex flex-col lg:grid lg:grid-cols-12">
      {/* Desktop Left Visual Brand Panel */}
      <aside className="hidden lg:flex lg:col-span-5 xl:col-span-5 flex-col justify-between bg-[#0b49d0] p-10 text-white">
        <div className="space-y-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <img
              src="/logo2.png"
              alt="Simulasi CAT Prima RIB"
              className="h-8 w-auto object-contain"
            />
          </Link>

          <div className="space-y-4 pt-4">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffc63d] px-3 py-1 text-xs font-bold text-[#151515]">
              <ShieldCheck className="h-4 w-4" />
              PLATFORM SIMULASI CAT TERPADU
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
              Persiapan Seleksi CPNS, Sekdin, &amp; Polri Lebih Terukur.
            </h2>
            <p className="text-sm text-white/85 leading-relaxed">
              Nikmati pengalaman ruang ujian Computer Assisted Test (CAT) yang
              responsif, stabil, dan dilengkapi evaluasi ambang batas otomatis
              sesuai standar seleksi.
            </p>
          </div>

          <ul className="space-y-3.5 pt-2 text-sm">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#ffc63d]" />
              <span>
                <strong>Pengacakan Blok Subtes Konsisten:</strong> Urutan soal
                TWK, TIU, dan TKP terkunci aman selama sesi berlangsung.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-[#ffc63d]" />
              <span>
                <strong>Mobile-First &amp; Bebas Geser Horizontal:</strong>{" "}
                Nyaman dikerjakan melalui ponsel, tablet, maupun laptop.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#ffc63d]" />
              <span>
                <strong>Autosave Idempoten &amp; Pemulihan Sesi:</strong>{" "}
                Jawaban tersimpan otomatis di server dan aman saat koneksi
                terganggu.
              </span>
            </li>
          </ul>
        </div>

        <div className="border-t border-white/15 pt-5 text-xs text-white/75 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} Bimbel Prima RIB</span>
          <span>Standar Keamanan Server-Side</span>
        </div>
      </aside>

      {/* Mobile Top Brand Header */}
      <header className="flex items-center justify-between bg-[#0b49d0] px-4 py-3.5 text-white lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/logo2.png"
            alt="Simulasi CAT Prima RIB"
            className="h-6 w-auto object-contain"
          />
        </Link>
        <span className="rounded-md bg-[#ffc63d] px-2 py-0.5 text-[11px] font-bold text-[#151515]">
          CAT Prima RIB
        </span>
      </header>

      {/* Form Content Column */}
      <main className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-6 lg:col-span-7 xl:col-span-7 lg:px-12">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-[22px] sm:text-[28px] font-bold tracking-tight text-[#151515]">
              {title}
            </h1>
            <p className="text-sm text-neutral-600 leading-relaxed">
              {subtitle}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7 shadow-xs">
            {children}
          </div>

          {footer && <div className="text-center text-sm">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
