"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  CalendarClock,
  PlayCircle,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Clock,
  BookOpen,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  StatCard,
  StatusBadge,
  Button,
} from "@/components/ui";
import { getStoredProfiles, syncProfilesFromSupabase } from "@/lib/auth";
import {
  getExams,
  getExamRuns,
  getExamSessions,
  getIncidents,
  getAuditLogs,
  syncAdminStoreFromSupabase,
} from "@/lib/admin-store";
import { formatDateTimeID } from "@/lib/utils";
import {
  ProfileRow,
  ExamRow,
  ExamRunRow,
  ExamSessionRow,
  ExamIncidentRow,
  ExamAuditLogRow,
} from "@/types/database";

export default function AdminDashboardPage() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [runs, setRuns] = useState<ExamRunRow[]>([]);
  const [sessions, setSessions] = useState<ExamSessionRow[]>([]);
  const [incidents, setIncidents] = useState<ExamIncidentRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<ExamAuditLogRow[]>([]);

  useEffect(() => {
    const refreshFromLocal = () => {
      setProfiles(getStoredProfiles());
      setExams(getExams());
      setRuns(getExamRuns());
      setSessions(getExamSessions());
      setIncidents(getIncidents());
      setAuditLogs(getAuditLogs());
    };

    const syncRemote = async () => {
      const [, synced] = await Promise.all([
        syncAdminStoreFromSupabase(),
        syncProfilesFromSupabase(),
      ]);
      refreshFromLocal();
      setProfiles(synced);
    };

    refreshFromLocal();
    void syncRemote();

    const interval = window.setInterval(() => {
      void syncRemote();
    }, 6000);

    const handleFocus = () => {
      void syncRemote();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", refreshFromLocal);
    window.addEventListener("prima-store-synced", refreshFromLocal);
    window.addEventListener("prima-profiles-synced", refreshFromLocal);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", refreshFromLocal);
      window.removeEventListener("prima-store-synced", refreshFromLocal);
      window.removeEventListener("prima-profiles-synced", refreshFromLocal);
    };
  }, []);

  const participants = profiles.filter((p) => p.role === "user");
  const activeParticipants = participants.filter((p) => p.is_active);
  const scheduledRuns = runs.filter((r) => r.status === "scheduled");
  const ongoingRuns = runs.filter(
    (r) => r.status === "active" || r.status === "paused"
  );
  const activeSessions = sessions.filter((s) => s.status === "in_progress");
  const completedSessionsCount = sessions.filter(
    (s) => s.status === "submitted" || s.status === "timed_out"
  ).length;
  const completedExamsCount =
    exams.filter((e) => e.status === "completed").length +
    runs.filter((r) => r.status === "completed").length +
    completedSessionsCount;
  const openIncidents = incidents.filter((i) => i.status !== "resolved");

  return (
    <AppShell
      role="admin"
      userName="Admin Prima RIB"
      userSubtitle="Panel Administrator"
    >
      <PageHeader
        title="Dashboard Administrator"
        description="Ringkasan operasional penyelenggaraan ujian simulasi CAT CPNS, Sekolah Kedinasan (Sekdin), dan Polri."
        badge={<StatusBadge variant="featured" label="Realtime Ready" />}
        actions={
          <div className="flex flex-wrap gap-2.5">
            <Link href="/admin/bank-soal">
              <Button
                variant="outline"
                leftIcon={<BookOpen className="h-4 w-4" />}
              >
                Bank Soal
              </Button>
            </Link>
            <Link href="/admin/ujian">
              <Button
                variant="primary"
                leftIcon={<PlayCircle className="h-4 w-4" />}
              >
                Kelola Ujian &amp; Sesi
              </Button>
            </Link>
          </div>
        }
      />

      {/* Bagian A: 7 Ringkasan Statistik Wajib (Bab 5 Rancangan UI/UX) */}
      <section aria-label="Ringkasan Statistik" className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-[#151515]">
          A. Ringkasan Statistik Operasional
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="1. Total Peserta Terdaftar"
            value={participants.length}
            subtitle="Akun dengan role User"
            accent="blue"
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="2. Peserta Aktif"
            value={activeParticipants.length}
            subtitle={`${
              participants.length - activeParticipants.length
            } akun dinonaktifkan`}
            accent="green"
            icon={<UserCheck className="h-5 w-5" />}
            badge={<StatusBadge variant="active" label="Aktif" size="sm" />}
          />
          <StatCard
            title="3. Sesi Ujian Terjadwal"
            value={scheduledRuns.length}
            subtitle="Menunggu waktu pelaksanaan"
            accent="yellow"
            icon={<CalendarClock className="h-5 w-5" />}
            badge={
              <StatusBadge variant="scheduled" label="Terjadwal" size="sm" />
            }
          />
          <StatCard
            title="4. Sesi Ujian Berlangsung"
            value={ongoingRuns.length}
            subtitle="Sedang dibuka / aktif"
            accent="blue"
            icon={<PlayCircle className="h-5 w-5" />}
            badge={<StatusBadge variant="ongoing" label="Aktif" size="sm" />}
          />
          <StatCard
            title="5. Peserta Sedang Mengerjakan"
            value={activeSessions.length}
            subtitle="Attempt aktif di ruang CAT"
            accent="blue"
            icon={<Activity className="h-5 w-5" />}
          />
          <StatCard
            title="6. Ujian / Sesi Selesai"
            value={completedExamsCount}
            subtitle="Rekam historis tersimpan"
            accent="green"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <StatCard
            title="7. Insiden Belum Ditangani"
            value={openIncidents.length}
            subtitle={
              openIncidents.length === 0
                ? "Semua sesi terkendali"
                : "Perlu tindakan Admin"
            }
            accent={openIncidents.length > 0 ? "red" : "neutral"}
            icon={<AlertTriangle className="h-5 w-5" />}
            badge={
              openIncidents.length > 0 ? (
                <StatusBadge variant="danger" label="Perlu Tinjau" size="sm" />
              ) : (
                <StatusBadge variant="completed" label="Normal" size="sm" />
              )
            }
          />
        </div>
      </section>

      {/* Bagian B & C: Ujian Berlangsung & Jadwal Terdekat */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* C. Ujian yang Sedang Berlangsung & D. Monitoring Peserta Aktif */}
        <section className="lg:col-span-7 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#151515]">
                B &amp; C. Sesi Pelaksanaan Aktif &amp; Terdekat (`exam_runs`)
              </h2>
              <p className="text-xs text-neutral-600">
                Pantau pelaksanaan sesi pagi/siang beserta status pengerjaan.
              </p>
            </div>
            <Link
              href="/admin/monitoring"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#0b49d0] hover:underline"
            >
              <span>Buka Monitoring</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {runs.map((run) => {
              const parentExam = exams.find((e) => e.id === run.exam_id);
              return (
                <div
                  key={run.id}
                  className="rounded-xl border border-neutral-200 bg-[#fcfbf7] p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#151515]">
                        {run.name}
                      </span>
                      <StatusBadge
                        variant={
                          run.status === "active"
                            ? "ongoing"
                            : run.status === "paused"
                            ? "paused"
                            : "scheduled"
                        }
                        label={
                          run.status === "active"
                            ? "Sedang Berlangsung"
                            : run.status === "paused"
                            ? "Dijeda"
                            : "Terjadwal"
                        }
                        size="sm"
                      />
                    </div>
                    <p className="text-xs text-neutral-600 truncate">
                      Ujian: {parentExam?.title || run.exam_id} • Durasi:{" "}
                      {parentExam?.duration_minutes || 100} Menit
                    </p>
                    <p className="text-xs text-neutral-500 flex items-center gap-1.5 tabular-nums">
                      <Clock className="h-3.5 w-3.5 text-[#0b49d0]" />
                      <span>
                        Jadwal Mulai: {formatDateTimeID(run.scheduled_start)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href="/admin/jadwal-sesi">
                      <Button variant="outline" size="sm">
                        Detail Sesi
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* E. Aktivitas Admin (Audit Log) & F. Insiden */}
        <section className="lg:col-span-5 space-y-6">
          {/* F. Insiden dan Peringatan */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-base font-bold text-[#151515] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>D &amp; F. Catatan Insiden Sesi</span>
              </h2>
              <Link
                href="/admin/insiden"
                className="text-xs font-bold text-[#0b49d0] hover:underline"
              >
                Kelola Insiden
              </Link>
            </div>
            {incidents.length === 0 ? (
              <p className="text-xs text-neutral-500">
                Tidak ada catatan insiden.
              </p>
            ) : (
              <div className="space-y-2.5">
                {incidents.slice(0, 3).map((inc) => (
                  <div
                    key={inc.id}
                    className="rounded-xl border border-neutral-200 bg-[#fcfbf7] p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#151515]">
                        {inc.incident_type}
                      </span>
                      <StatusBadge
                        variant={
                          inc.status === "resolved" ? "completed" : "warning"
                        }
                        label={
                          inc.status === "resolved" ? "Selesai" : "Perlu Tinjau"
                        }
                        size="sm"
                      />
                    </div>
                    <p className="text-neutral-600">
                      {inc.resolution_note ||
                        String(inc.details?.note || "Insiden tercatat")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* E. Aktivitas Admin (Audit Log) */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-base font-bold text-[#151515] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#0b49d0]" />
                <span>E. Audit Log Aktivitas Admin</span>
              </h2>
              <span className="text-xs font-semibold text-neutral-500 tabular-nums">
                {auditLogs.length} Rekaman
              </span>
            </div>
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {auditLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-neutral-200 bg-[#fcfbf7] p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-[#0b49d0]">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-neutral-500 tabular-nums">
                      {formatDateTimeID(log.created_at)}
                    </span>
                  </div>
                  {log.reason && (
                    <p className="text-[#151515] font-medium">
                      Alasan: &ldquo;{log.reason}&rdquo;
                    </p>
                  )}
                  <p className="text-[11px] text-neutral-500">
                    Entitas: {log.entity_type} ({log.entity_id})
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
