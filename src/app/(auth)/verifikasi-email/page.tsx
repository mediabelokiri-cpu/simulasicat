"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck, Send, ArrowRight } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button, StatusBadge, ToastNotification } from "@/components/ui";
import { getCurrentUserClient } from "@/lib/auth";
import { ProfileRow } from "@/types/database";

export default function VerifikasiEmailPage() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileRow | null>(null);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    setUser(getCurrentUserClient());
  }, []);

  return (
    <AuthSplitLayout
      title="Verifikasi Alamat Email"
      subtitle="Sesuai ketentuan keamanan ujian, email peserta wajib diverifikasi sebelum dapat menekan tombol Mulai Ujian."
      footer={
        <Link
          href="/login"
          className="font-bold text-[#0b49d0] hover:underline"
        >
          Kembali ke Halaman Login
        </Link>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-[#fcfbf7] p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef4ff] text-[#0b49d0]">
              <MailCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-neutral-500">Email Terdaftar</p>
              <p className="text-sm font-bold text-[#151515] truncate">
                {user?.email || "-"}
              </p>
            </div>
          </div>
          {user?.email_verified ? (
            <StatusBadge variant="active" label="Terverifikasi" size="sm" />
          ) : (
            <StatusBadge variant="warning" label="Belum Verifikasi" size="sm" />
          )}
        </div>

        {resent && (
          <ToastNotification
            type="info"
            title="Tautan Verifikasi Dikirim Ulang"
            description="Silakan periksa kotak masuk atau folder spam pada email Anda."
            onClose={() => setResent(false)}
          />
        )}

        {user?.email_verified ? (
          <div className="space-y-4">
            <ToastNotification
              type="success"
              title="Email Berhasil Diverifikasi"
              description="Akun Anda kini memenuhi syarat verifikasi email untuk mengikuti ujian simulasi."
            />
            <Button
              variant="primary"
              className="w-full"
              onClick={() => router.push("/dashboard")}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Lanjut ke Dashboard Peserta
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Kami telah mengirimkan tautan konfirmasi ke alamat email Anda.
              Klik tautan tersebut untuk mengaktifkan akses penuh ruang ujian.
            </p>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setResent(true)}
              leftIcon={<Send className="h-4 w-4" />}
            >
              Kirim Ulang Email Verifikasi
            </Button>
          </div>
        )}
      </div>
    </AuthSplitLayout>
  );
}
