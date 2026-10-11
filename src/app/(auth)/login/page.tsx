"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import {
  Button,
  FormField,
  inputBaseClasses,
  ToastNotification,
} from "@/components/ui";
import { authenticateUserAsync } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await authenticateUserAsync(email, password);
    setIsSubmitting(false);

    if (!res.ok) {
      setError(res.error || "Gagal masuk ke aplikasi.");
      return;
    }

    router.push(res.redirectTo || "/dashboard");
  }

  return (
    <AuthSplitLayout
      title="Masuk ke Akun Anda"
      subtitle="Masukkan alamat email dan kata sandi untuk mengakses ruang ujian atau panel pengelolaan."
      footer={
        <p className="text-slate-600">
          Belum memiliki akun peserta?{" "}
          <Link
            href="/register"
            className="font-bold text-[#494ae2] hover:underline"
          >
            Daftar Sekarang
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <ToastNotification
            type="error"
            title="Gagal Masuk"
            description={error}
            onClose={() => setError(null)}
          />
        )}

        <FormField id="login-email" label="Alamat Email" required>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            className={inputBaseClasses}
          />
        </FormField>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-sm font-semibold text-[#0c0c13]"
            >
              Kata Sandi <span className="text-red-600">*</span>
            </label>
            <Link
              href="/lupa-password"
              className="text-xs font-semibold text-[#494ae2] hover:underline"
            >
              Lupa kata sandi?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi"
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
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isSubmitting}
            leftIcon={<LogIn className="h-4 w-4" />}
          >
            {isSubmitting ? "Memverifikasi..." : "Masuk Aplikasi"}
          </Button>
        </div>
      </form>
    </AuthSplitLayout>
  );
}
