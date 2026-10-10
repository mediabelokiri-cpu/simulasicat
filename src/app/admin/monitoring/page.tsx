"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PauseCircle,
  PlayCircle,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  StatCard,
  StatusBadge,
  Button,
  SearchInput,
  FormField,
  inputBaseClasses,
  selectBaseClasses,
  ConfirmDialog,
  ToastNotification,
} from "@/components/ui";
import { getStoredProfiles, syncProfilesFromSupabase } from "@/lib/auth";
import {
  appendAuditLog,
  deleteSingleExamSessionAndResult,
  getExamRuns,
  getExamSessions,
  resetAllMonitoringAndResults,
  saveExamSessions,
  syncAdminStoreFromSupabase,
} from "@/lib/admin-store";
import {
  computeProvisionalSessionScore,
  finalizeAndScoreExamSession,
} from "@/lib/scoring";
import {
  ExamRunRow,
  ExamSessionRow,
  ProfileRow,
} from "@/types/database";
import { formatDateTimeID } from "@/lib/utils";

export default function AdminRealtimeMonitoringPage() {
  const [runs, setRuns] = useState<ExamRunRow[]>([]);
  const [sessions, setSessions] = useState<ExamSessionRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  const [selectedRunId, setSelectedRunId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  // Modal Tambah Waktu / Pemulihan Sesi Individu
  const [extendTarget, setExtendTarget] = useState<ExamSessionRow | null>(null);
  const [extendMinutes, setExtendMinutes] = useState<number>(10);
  const [auditReason, setAuditReason] = useState<string>(
    "Kompensasi gangguan jaringan pada perangkat peserta"
  );

  // Modal Reopen / Force Submit
  const [actionModal, setActionModal] = useState<{
    session: ExamSessionRow;
    mode: "pause" | "resume" | "reopen" | "force_submit";
  } | null>(null);

  // Modal Reset / Bersihkan Semua Data & Hapus Sesi Individu
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [deleteSessionTarget, setDeleteSessionTarget] =
    useState<ExamSessionRow | null>(null);

  const [toast, setToast] = useState<{
    type: "success" | "info";
    title: string;
    desc: string;
  } | null>(null);

  const loadMonitoringData = () => {
    const profs = getStoredProfiles();
    setProfiles(profs);
    setRuns(getExamRuns());
    setSessions(getExamSessions());
  };

  const syncMonitoringFromRemote = async () => {
    await Promise.all([
      syncAdminStoreFromSupabase(),
      syncProfilesFromSupabase(),
    ]);
    loadMonitoringData();
  };

  useEffect(() => {
    loadMonitoringData();
    void syncMonitoringFromRemote();

    const interval = window.setInterval(() => {
      void syncMonitoringFromRemote();
    }, 4000);

    const handleFocus = () => {
      void syncMonitoringFromRemote();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", loadMonitoringData);
    window.addEventListener("prima-store-synced", loadMonitoringData);
    window.addEventListener("prima-profiles-synced", loadMonitoringData);
    window.addEventListener("prima-live-score-event", loadMonitoringData);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", loadMonitoringData);
      window.removeEventListener("prima-store-synced", loadMonitoringData);
      window.removeEventListener("prima-profiles-synced", loadMonitoringData);
      window.removeEventListener("prima-live-score-event", loadMonitoringData);
    };
  }, []);

  const filteredSessions = sessions.filter((s) => {
    const prof = profiles.find((p) => p.id === s.user_id);
    const matchesRun =
      selectedRunId === "ALL" || s.exam_run_id === selectedRunId;
    const matchesStatus =
      statusFilter === "ALL" || s.status === statusFilter;
    const matchesSearch =
      !search.trim() ||
      (prof?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (prof?.email || "").toLowerCase().includes(search.toLowerCase());

    return matchesRun && matchesStatus && matchesSearch;
  });

  const inProgressCount = sessions.filter(
    (s) => s.status === "in_progress"
  ).length;
  const pausedCount = sessions.filter((s) => s.status === "paused").length;
  const finishedCount = sessions.filter(
    (s) => s.status === "submitted" || s.status === "timed_out"
  ).length;
  const totalExtensionMinutes = Math.round(
    sessions.reduce((sum, s) => sum + (s.time_extension_seconds || 0), 0) / 60
  );

  function handleExtendTime() {
    if (!extendTarget || !auditReason.trim()) return;
    const addSeconds = Math.max(1, extendMinutes) * 60;
    const currentDeadlineMs = new Date(extendTarget.deadline_at).getTime();
    const baseMs = Math.max(Date.now(), currentDeadlineMs);
    const newDeadlineIso = new Date(baseMs + addSeconds * 1000).toISOString();
    const nowIso = new Date().toISOString();

    const all = getExamSessions();
    const updated = all.map((s) =>
      s.id === extendTarget.id
        ? {
            ...s,
            deadline_at: newDeadlineIso,
            time_extension_seconds:
              (s.time_extension_seconds || 0) + addSeconds,
            updated_at: nowIso,
          }
        : s
    );
    saveExamSessions(updated);
    setSessions(updated);

    const prof = profiles.find((p) => p.id === extendTarget.user_id);
    appendAuditLog({
      action: "EXTEND_SESSION_TIME",
      entity_type: "exam_sessions",
      entity_id: extendTarget.id,
      reason: auditReason,
      details: {
        participant_name: prof?.full_name,
        added_minutes: extendMinutes,
        new_deadline_at: newDeadlineIso,
      },
    });

    setExtendTarget(null);
    setToast({
      type: "success",
      title: `Waktu Ditambah +${extendMinutes} Menit`,
      desc: `Batas akhir server (deadline_at) untuk ${
        prof?.full_name || "Peserta"
      } berhasil diperpanjang dan dicatat di Audit Log.`,
    });
  }

  function handleConfirmSessionAction() {
    if (!actionModal || !auditReason.trim()) return;
    const { session, mode } = actionModal;
    const nowIso = new Date().toISOString();
    const prof = profiles.find((p) => p.id === session.user_id);

    if (mode === "force_submit") {
      finalizeAndScoreExamSession(session.id, "timeout_auto_submit");
      setSessions(getExamSessions());
      setActionModal(null);
      setToast({
        type: "info",
        title: "Sesi Berhasil Diselesaikan & Dinilai",
        desc: `Sesi milik ${
          prof?.full_name || "Peserta"
        } telah dikunci dan dinilai di server.`,
      });
      return;
    }

    const all = getExamSessions();
    const updated = all.map((s) => {
      if (s.id !== session.id) return s;

      if (mode === "pause") {
        return { ...s, status: "paused" as const, updated_at: nowIso };
      }
      if (mode === "resume") {
        return { ...s, status: "in_progress" as const, updated_at: nowIso };
      }
      // reopen: buka kembali sesi yang sudah selesai/timed_out + tambah 10 menit
      const newDeadline = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      return {
        ...s,
        status: "in_progress" as const,
        submitted_at: null,
        deadline_at: newDeadline,
        time_extension_seconds: (s.time_extension_seconds || 0) + 600,
        updated_at: nowIso,
      };
    });

    saveExamSessions(updated);
    setSessions(updated);

    appendAuditLog({
      action:
        mode === "pause"
          ? "PAUSE_PARTICIPANT_SESSION"
          : mode === "resume"
          ? "RESUME_PARTICIPANT_SESSION"
          : "REOPEN_EXAM_SESSION",
      entity_type: "exam_sessions",
      entity_id: session.id,
      reason: auditReason,
      details: {
        participant_name: prof?.full_name,
        mode,
      },
    });

    setActionModal(null);
    setToast({
      type: "success",
      title: "Status Sesi Peserta Diperbarui",
      desc: `Tindakan ${mode.toUpperCase()} untuk ${
        prof?.full_name || "Peserta"
      } berhasil dijalankan dan tercatat di Audit Log.`,
    });
  }

  async function handleResetAllMonitoring() {
    await resetAllMonitoringAndResults(
      "usr-admin-01",
      "Admin mereset dan membersihkan seluruh data Monitoring Realtime & Hasil Ujian"
    );
    loadMonitoringData();
    setShowResetModal(false);
    setToast({
      type: "success",
      title: "Data Monitoring & Hasil Dibersihkan",
      desc: "Seluruh data sesi pengerjaan dan hasil ujian telah direset hingga kembali kosong.",
    });
  }

  async function handleDeleteSingleSession() {
    if (!deleteSessionTarget) return;
    const target = deleteSessionTarget;
    const prof = profiles.find((p) => p.id === target.user_id);
    await deleteSingleExamSessionAndResult(target.id);
    loadMonitoringData();
    setDeleteSessionTarget(null);
    setToast({
      type: "info",
      title: "Sesi Peserta Dihapus",
      desc: `Data sesi pengerjaan dan hasil ujian milik ${
        prof?.full_name || "Peserta"
      } telah dihapus.`,
    });
  }

  return (
    <AppShell
      role="admin"
      userName="Administrator Utama"
      userSubtitle="Monitoring Realtime & Pemulihan"
    >
      <PageHeader
        title="Monitoring Realtime Sesi Peserta"
        description="Pantau progres pengerjaan soal, nomor aktif, aktivitas terakhir, skor sementara (provisional), dan jalankan pemulihan individu."
        badge={
          <StatusBadge
            variant="ongoing"
            label={`${inProgressCount} Sedang Mengerjakan`}
          />
        }
        actions={
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="outline"
              onClick={() => void syncMonitoringFromRemote()}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Segarkan Data
            </Button>
            <Button
              variant="danger"
              disabled={sessions.length === 0}
              onClick={() => setShowResetModal(true)}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Reset / Bersihkan Data
            </Button>
            <Link href="/admin/insiden">
              <Button
                variant="accent"
                leftIcon={<AlertTriangle className="h-4 w-4" />}
              >
                Panel Insiden &amp; Global Pause
              </Button>
            </Link>
          </div>
        }
      />

      {toast && (
        <div className="mb-6">
          <ToastNotification
            type={toast.type}
            title={toast.title}
            description={toast.desc}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* 4 Kartu Statistik Monitoring */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Sedang Mengerjakan"
          value={inProgressCount}
          subtitle="Sesi aktif (in_progress)"
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          title="Sesi Dijeda"
          value={pausedCount}
          subtitle="Dijeda sementara oleh Admin"
          icon={<PauseCircle className="h-5 w-5" />}
        />
        <StatCard
          title="Selesai / Terkirim"
          value={finishedCount}
          subtitle="Submitted / Timed-out"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          title="Total Ekstensi Waktu"
          value={`+${totalExtensionMinutes} Menit`}
          subtitle="Kompensasi waktu pemulihan"
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      {/* Filter & Tabel Monitoring Peserta */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12 items-end">
          <div className="md:col-span-5">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Cari nama peserta atau email..."
            />
          </div>
          <div className="md:col-span-4">
            <FormField id="mon-run" label="Filter Sesi Pelaksanaan">
              <select
                id="mon-run"
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
                className={selectBaseClasses}
              >
                <option value="ALL">Semua Sesi Pelaksanaan</option>
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="md:col-span-3">
            <FormField id="mon-status" label="Status Sesi Peserta">
              <select
                id="mon-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={selectBaseClasses}
              >
                <option value="ALL">Semua Status</option>
                <option value="in_progress">Sedang Mengerjakan</option>
                <option value="paused">Dijeda Sementara</option>
                <option value="submitted">Selesai (Submitted)</option>
                <option value="timed_out">Waktu Habis (Timed Out)</option>
              </select>
            </FormField>
          </div>
        </div>

        {/* Daftar Sesi Peserta */}
        <div className="space-y-3">
          {filteredSessions.map((ses) => {
            const prof = profiles.find((p) => p.id === ses.user_id);
            const runObj = runs.find((r) => r.id === ses.exam_run_id);
            const provisional = computeProvisionalSessionScore(ses.id);
            const pct =
              provisional.totalQuestions > 0
                ? Math.round(
                    (provisional.answeredCount / provisional.totalQuestions) *
                      100
                  )
                : 0;
            const extMins = Math.round(
              (ses.time_extension_seconds || 0) / 60
            );

            return (
              <div
                key={ses.id}
                className="rounded-2xl border border-neutral-200 bg-[#fcfbf7] p-4 sm:p-5 transition-colors hover:border-[#0b49d0]/40 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0b49d0] text-white font-extrabold text-sm">
                      {(prof?.full_name || "P").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-extrabold text-[#151515]">
                          {prof?.full_name || "Peserta Simulasi"}
                        </h3>
                        {ses.status === "in_progress" ? (
                          <StatusBadge
                            variant="ongoing"
                            label="Sedang Mengerjakan"
                            size="sm"
                          />
                        ) : ses.status === "paused" ? (
                          <StatusBadge
                            variant="scheduled"
                            label="Dijeda"
                            size="sm"
                          />
                        ) : ses.status === "submitted" ? (
                          <StatusBadge
                            variant="completed"
                            label="Selesai (Submitted)"
                            size="sm"
                          />
                        ) : (
                          <StatusBadge
                            variant="warning"
                            label="Waktu Habis"
                            size="sm"
                          />
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">
                        {prof?.email || "-"} •{" "}
                        <span className="font-semibold text-[#151515]">
                          {runObj?.name || "Sesi Ujian"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Skor Sementara (Provisional Score Admin) */}
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-right">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        Skor Sementara (Admin)
                      </span>
                      <span className="text-lg font-extrabold text-[#0b49d0] tabular-nums">
                        {provisional.totalScore} Poin
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bar Progres & Info Waktu */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12 items-center bg-white rounded-xl border border-neutral-200/80 p-3.5">
                  <div className="md:col-span-5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#151515] tabular-nums">
                        Terjawab: {provisional.answeredCount} /{" "}
                        {provisional.totalQuestions} Soal ({pct}%)
                      </span>
                      <span className="rounded-md bg-[#eef4ff] px-2 py-0.5 text-[11px] font-bold text-[#0b49d0] tabular-nums">
                        Posisi Soal #{ses.current_question_number}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-[#0b49d0]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-4 text-xs space-y-1 border-t md:border-t-0 md:border-l border-neutral-100 pt-2 md:pt-0 md:pl-4">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Deadline Server:</span>
                      <span className="font-bold text-[#151515] tabular-nums">
                        {formatDateTimeID(ses.deadline_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">
                        Aktivitas Terakhir:
                      </span>
                      <span className="font-semibold text-neutral-700 tabular-nums">
                        {formatDateTimeID(ses.last_activity_at)}
                      </span>
                    </div>
                    {extMins > 0 && (
                      <div className="flex items-center justify-between text-emerald-700 font-bold">
                        <span>Ekstensi Waktu:</span>
                        <span>+{extMins} Menit</span>
                      </div>
                    )}
                  </div>

                  {/* Tombol Aksi Pemulihan Individu */}
                  <div className="md:col-span-3 flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setExtendTarget(ses);
                        setExtendMinutes(10);
                        setAuditReason(
                          "Kompensasi kendala teknis/jaringan pada perangkat peserta"
                        );
                      }}
                      leftIcon={<PlusCircle className="h-3.5 w-3.5 text-[#0b49d0]" />}
                    >
                      + Waktu
                    </Button>

                    {ses.status === "in_progress" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setActionModal({ session: ses, mode: "pause" })
                          }
                          leftIcon={<PauseCircle className="h-3.5 w-3.5 text-amber-600" />}
                        >
                          Jeda
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            setActionModal({
                              session: ses,
                              mode: "force_submit",
                            })
                          }
                          leftIcon={<Send className="h-3.5 w-3.5" />}
                        >
                          Submit
                        </Button>
                      </>
                    )}

                    {ses.status === "paused" && (
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() =>
                          setActionModal({ session: ses, mode: "resume" })
                        }
                        leftIcon={<PlayCircle className="h-3.5 w-3.5" />}
                      >
                        Lanjutkan
                      </Button>
                    )}

                    {(ses.status === "submitted" ||
                      ses.status === "timed_out") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setActionModal({ session: ses, mode: "reopen" })
                        }
                        leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                      >
                        Buka Kembali
                      </Button>
                    )}

                    <button
                      type="button"
                      onClick={() => setDeleteSessionTarget(ses)}
                      title="Hapus sesi peserta ini"
                      aria-label="Hapus sesi peserta ini"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50/70 text-red-600 transition-colors hover:bg-red-600 hover:text-white cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredSessions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-[#fcfbf7] p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
              <p className="text-sm font-bold text-[#151515]">
                Belum Ada Data Sesi Pengerjaan Peserta
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Data monitoring realtime akan otomatis muncul saat peserta mulai mengerjakan ujian.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Dialog Tambah Waktu Sesi Individu */}
      <ConfirmDialog
        open={Boolean(extendTarget)}
        onClose={() => setExtendTarget(null)}
        onConfirm={handleExtendTime}
        variant="primary"
        title="Tambah Waktu Sesi Peserta (Perpanjangan Deadline)"
        description="Perpanjangan waktu akan langsung menggeser deadline_at server peserta tanpa mengacak ulang urutan soal."
        confirmLabel={`Simpan +${extendMinutes} Menit`}
      >
        <div className="space-y-3">
          <FormField
            id="ext-minutes"
            label="Tambahan Waktu (Menit)"
            required
          >
            <div className="flex gap-2">
              {[5, 10, 15, 30].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setExtendMinutes(m)}
                  className={`flex-1 rounded-xl border py-2 text-xs font-extrabold tabular-nums cursor-pointer ${
                    extendMinutes === m
                      ? "border-[#0b49d0] bg-[#0b49d0] text-white"
                      : "border-neutral-300 bg-white text-[#151515]"
                  }`}
                >
                  +{m} Menit
                </button>
              ))}
            </div>
          </FormField>

          <FormField
            id="ext-reason"
            label="Alasan Audit (Wajib diisi)"
            required
          >
            <input
              id="ext-reason"
              type="text"
              value={auditReason}
              onChange={(e) => setAuditReason(e.target.value)}
              className={inputBaseClasses}
              placeholder="Contoh: Kompensasi putus koneksi jaringan peserta"
            />
          </FormField>
        </div>
      </ConfirmDialog>

      {/* Dialog Jeda / Lanjutkan / Buka Kembali / Force Submit */}
      <ConfirmDialog
        open={Boolean(actionModal)}
        onClose={() => setActionModal(null)}
        onConfirm={handleConfirmSessionAction}
        variant="primary"
        title={
          actionModal?.mode === "pause"
            ? "Jeda Sesi Peserta"
            : actionModal?.mode === "resume"
            ? "Lanjutkan Sesi Peserta"
            : actionModal?.mode === "reopen"
            ? "Buka Kembali Sesi Peserta (+10 Menit)"
            : "Selesaikan & Nilai Sesi Peserta"
        }
        description="Tindakan sensitif ini akan langsung diterapkan pada sesi peserta dan dicatat ke dalam Audit Log."
        confirmLabel="Ya, Jalankan Tindakan"
      >
        <FormField
          id="act-reason"
          label="Alasan Tindakan Audit (Wajib diisi)"
          required
        >
          <input
            id="act-reason"
            type="text"
            value={auditReason}
            onChange={(e) => setAuditReason(e.target.value)}
            className={inputBaseClasses}
          />
        </FormField>
      </ConfirmDialog>

      {/* Dialog Konfirmasi Reset / Bersihkan Semua Data Monitoring */}
      <ConfirmDialog
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={() => void handleResetAllMonitoring()}
        variant="danger"
        title="Reset & Bersihkan Seluruh Data Monitoring?"
        description={`Tindakan ini akan menghapus seluruh ${sessions.length} sesi pengerjaan peserta beserta hasil ujian terkait di seluruh perangkat hingga kembali kosong (0 data).`}
        confirmLabel="Ya, Bersihkan Semua Data"
      />

      {/* Dialog Konfirmasi Hapus 1 Sesi Peserta */}
      <ConfirmDialog
        open={Boolean(deleteSessionTarget)}
        onClose={() => setDeleteSessionTarget(null)}
        onConfirm={() => void handleDeleteSingleSession()}
        variant="danger"
        title="Hapus Sesi Pengerjaan Peserta?"
        description="Data sesi pengerjaan dan hasil ujian peserta ini akan dihapus secara permanen dari Monitoring Realtime maupun Hasil & Analitik."
        confirmLabel="Ya, Hapus Sesi"
      />
    </AppShell>
  );
}
