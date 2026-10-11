"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import {
  Button,
  FormField,
  inputBaseClasses,
  ToastNotification,
} from "@/components/ui";
import { registerPublicUserAsync } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [targetSelection, setTargetSelection] = useState("CPNS");
  const [institution, setInstitution] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await registerPublicUserAsync({
      fullName,
      email,
      password,
      confirmPassword,
      targetSelection,
      institution,
    });

    setIsSubmitting(false);

    if (!res.ok) {
      setError(res.error || "Registrasi gagal diproses.");
      return;
    }

    router.push(res.redirectTo || "/verifikasi-email");
  }

  return (
    <AuthSplitLayout
      title="Pendaftaran Peserta Baru"
      subtitle="Buat akun peserta untuk mengikuti ujian simulasi CPNS, Sekolah Kedinasan, dan Polri."
      footer={
        <p className="text-slate-600">
          Sudah memiliki akun peserta?{" "}
          <Link
            href="/login"
            className="font-bold text-[#494ae2] hover:underline"
          >
            Masuk di sini
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <ToastNotification
            type="error"
            title="Validasi Registrasi"
            description={error}
            onClose={() => setError(null)}
          />
        )}

        <FormField
          id="reg-fullname"
          label="Nama Lengkap Sesuai Identitas"
          required
        >
          <input
            id="reg-fullname"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Contoh: Rizky Pratama Putra"
            className={inputBaseClasses}
          />
        </FormField>

        <FormField
          id="reg-email"
          label="Alamat Email Aktif"
          required
          hint="Tautan verifikasi akun akan dikirimkan ke alamat email ini."
        >
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            className={inputBaseClasses}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField id="reg-target" label="Target Seleksi Utama">
            <select
              id="reg-target"
              value={targetSelection}
              onChange={(e) => setTargetSelection(e.target.value)}
              className={inputBaseClasses}
            >
              <option value="CPNS">Seleksi CPNS (SKD)</option>
              <option value="Sekdin (IPDN)">Sekdin — IPDN</option>
              <option value="Sekdin (PKN STAN)">Sekdin — PKN STAN</option>
              <option value="Sekdin (STIS)">Sekdin — Politeknik STIS</option>
              <option value="Sekdin (STMKG)">Sekdin — STMKG</option>
              <option value="Polri">Seleksi Penerimaan Polri</option>
            </select>
          </FormField>

          <FormField id="reg-inst" label="Institusi / Kelas (Opsional)">
            <input
              id="reg-inst"
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="Mis. Kelas Intensif SKD"
              className={inputBaseClasses}
            />
          </FormField>
        </div>

        <FormField
          id="reg-password"
          label="Kata Sandi"
          required
          hint="Minimal 8 karakter."
        >
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className={`${inputBaseClasses} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
              }
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </FormField>

        <FormField
          id="reg-confirm-password"
          label="Konfirmasi Kata Sandi"
          required
        >
          <input
            id="reg-confirm-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ulangi kata sandi Anda"
            className={inputBaseClasses}
          />
        </FormField>

        <div className="rounded-xl border border-indigo-100 bg-[#f5f8ff] p-3 text-xs text-slate-600 flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 shrink-0 text-[#494ae2] mt-0.5" />
          <span>
            Sesuai kebijakan keamanan sistem, pendaftaran mandiri otomatis
            diberikan hak akses <strong>Peserta (User)</strong> dan memerlukan
            verifikasi email sebelum dapat memulai ujian.
          </span>
        </div>

        <div className="pt-1">
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isSubmitting}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            {isSubmitting ? "Membuat Akun..." : "Daftar Sebagai Peserta"}
          </Button>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
