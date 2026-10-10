"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Lock } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import {
  Button,
  FormField,
  inputBaseClasses,
  ToastNotification,
} from "@/components/ui";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Kata sandi baru minimal harus terdiri dari 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setDone(true);
  }

  return (
    <AuthSplitLayout
      title="Atur Ulang Kata Sandi"
      subtitle="Buat kata sandi baru yang kuat untuk mengamankan akun ujian Anda."
      footer={
        <Link
          href="/login"
          className="font-bold text-[#0b49d0] hover:underline"
        >
          Kembali ke Halaman Login
        </Link>
      }
    >
      {done ? (
        <div className="space-y-4">
          <ToastNotification
            type="success"
            title="Kata Sandi Berhasil Diperbarui"
            description="Silakan masuk kembali menggunakan kata sandi baru Anda."
          />
          <Button
            variant="primary"
            className="w-full"
            onClick={() => router.push("/login")}
            leftIcon={<CheckCircle2 className="h-4 w-4" />}
          >
            Masuk Sekarang
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <ToastNotification
              type="error"
              title="Gagal Menyimpan Kata Sandi"
              description={error}
              onClose={() => setError(null)}
            />
          )}

          <FormField
            id="new-password"
            label="Kata Sandi Baru"
            required
            hint="Minimal 8 karakter."
          >
            <input
              id="new-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi baru"
              className={inputBaseClasses}
            />
          </FormField>

          <FormField
            id="confirm-new-password"
            label="Ulangi Kata Sandi Baru"
            required
          >
            <input
              id="confirm-new-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang kata sandi baru"
              className={inputBaseClasses}
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            leftIcon={<Lock className="h-4 w-4" />}
          >
            Simpan Kata Sandi Baru
          </Button>
        </form>
      )}
    </AuthSplitLayout>
  );
}
