"use client";

import React, { useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import {
  Button,
  FormField,
  inputBaseClasses,
  ToastNotification,
} from "@/components/ui";

export default function LupaPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim().includes("@")) {
      setError("Masukkan alamat email terdaftar yang valid.");
      return;
    }
    setSent(true);
  }

  return (
    <AuthSplitLayout
      title="Lupa Kata Sandi"
      subtitle="Masukkan alamat email akun Anda. Sistem akan mengirimkan tautan aman untuk mengatur ulang kata sandi."
      footer={
        <Link
          href="/login"
          className="font-bold text-[#0b49d0] hover:underline"
        >
          Kembali ke Halaman Login
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <ToastNotification
            type="success"
            title="Instruksi Reset Terkirim"
            description={`Tautan pemulihan kata sandi telah dikirimkan ke ${email}. Silakan periksa kotak masuk atau folder spam Anda.`}
          />
          <Link href="/login" className="block">
            <Button variant="outline" className="w-full">
              Kembali ke Halaman Login
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <ToastNotification
              type="error"
              title="Email Tidak Valid"
              description={error}
              onClose={() => setError(null)}
            />
          )}

          <FormField
            id="forgot-email"
            label="Alamat Email Terdaftar"
            required
          >
            <input
              id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className={inputBaseClasses}
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            leftIcon={<KeyRound className="h-4 w-4" />}
          >
            Kirim Tautan Reset Kata Sandi
          </Button>
        </form>
      )}
    </AuthSplitLayout>
  );
}
