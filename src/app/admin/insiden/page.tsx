"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  PauseCircle,
  PlayCircle,
  Plus,
  ShieldAlert,
  Clock,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  StatCard,
  StatusBadge,
  Button,
  FormField,
  inputBaseClasses,
  selectBaseClasses,
  textareaBaseClasses,
  ConfirmDialog,
  ToastNotification,
} from "@/components/ui";
import {
  appendAuditLog,
  getAuditLogs,
  getExamRuns,
  getExamSessions,
  getIncidents,
  saveExamRuns,
  saveExamSessions,
  saveIncidents,
} from "@/lib/admin-store";
import {
  ExamAuditLogRow,
  ExamIncidentRow,
  ExamRunRow,
  IncidentSeverity,
} from "@/types/database";
import { formatDateTimeID } from "@/lib/utils";

export default function AdminInsidenAuditPage() {
  const [runs, setRuns] = useState<ExamRunRow[]>([]);
  const [incidents, setIncidents] = useState<ExamIncidentRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<ExamAuditLogRow[]>([]);

  // Modal Global Pause / Resume
  const [pauseModalRun, setPauseModalRun] = useState<ExamRunRow | null>(null);
  const [pauseReason, setPauseReason] = useState<string>(
    "Pemeliharaan darurat sinkronisasi server ujian"
  );

  // Modal Tambah Insiden Baru
  const [newIncidentOpen, setNewIncidentOpen] = useState<boolean>(false);
  const [incRunId, setIncRunId] = useState<string>("run-cpns-pagi");
  const [incType, setIncType] = useState<string>("NETWORK_INTERRUPTION");
  const [incSeverity, setIncSeverity] = useState<IncidentSeverity>("medium");
  const [incNote, setIncNote] = useState<string>("");

  // Modal Resolve Insiden
  const [resolveTarget, setResolveTarget] = useState<ExamIncidentRow | null>(
    null
  );
  const [resolutionNote, setResolutionNote] = useState<string>(
    "Koneksi telah pulih dan batas waktu peserta telah disesuaikan."
  );

  const [toast, setToast] = useState<{
    type: "success" | "warning" | "info";
    title: string;
    desc: string;
  } | null>(null);

  const loadAll = () => {
    const rns = getExamRuns();
    setRuns(rns);
    if (rns.length > 0) setIncRunId(rns[0].id);
    setIncidents(getIncidents());
    setAuditLogs(getAuditLogs());
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Jeda Massal (Global Pause) — Bab 10.3 PRD
  function handleConfirmGlobalPause() {
    if (!pauseModalRun || !pauseReason.trim()) return;
    const nowIso = new Date().toISOString();

    const updatedRuns = runs.map((r) =>
      r.id === pauseModalRun.id
        ? {
            ...r,
            status: "paused" as const,
            paused_at: nowIso,
            pause_reason: pauseReason,
          }
        : r
    );
    saveExamRuns(updatedRuns);
    setRuns(updatedRuns);

    // Jedakan seluruh sesi in_progress pada run tersebut
    const allSessions = getExamSessions();
    let affectedCount = 0;
    const updatedSessions = allSessions.map((s) => {
      if (s.exam_run_id === pauseModalRun.id && s.status === "in_progress") {
        affectedCount++;
        return { ...s, status: "paused" as const, updated_at: nowIso };
      }
      return s;
    });
    saveExamSessions(updatedSessions);

    // Catat insiden otomatis
    const newInc: ExamIncidentRow = {
      id: `inc-${Date.now()}`,
      exam_run_id: pauseModalRun.id,
      exam_session_id: null,
      incident_type: "GLOBAL_PAUSE",
      severity: "high",
      status: "open",
      details: {
        note: pauseReason,
        affected_sessions: affectedCount,
      },
      created_by: "usr-admin-01",
      resolved_by: null,
      resolution_note: null,
      created_at: nowIso,
      resolved_at: null,
    };
    const nextIncs = [newInc, ...incidents];
    saveIncidents(nextIncs);
    setIncidents(nextIncs);

    appendAuditLog({
      action: "GLOBAL_PAUSE_EXAM_RUN",
      entity_type: "exam_runs",
      entity_id: pauseModalRun.id,
      reason: pauseReason,
      details: {
        run_name: pauseModalRun.name,
        affected_sessions: affectedCount,
      },
    });
    setAuditLogs(getAuditLogs());
    setPauseModalRun(null);

    setToast({
      type: "warning",
      title: `Jeda Massal (Global Pause) Diaktifkan`,
      desc: `Sesi "${pauseModalRun.name}" beserta ${affectedCount} sesi peserta aktif telah dijeda sementara.`,
    });
  }

  // Lanjutkan Sesi Massal (Global Resume) + Geser Deadline Otomatis (Bab 10.3 PRD)
  function handleGlobalResume(run: ExamRunRow) {
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const pausedStartMs = run.paused_at
      ? new Date(run.paused_at).getTime()
      : nowMs - 300 * 1000;
    const pausedSeconds = Math.max(60, Math.round((nowMs - pausedStartMs) / 1000));

    const updatedRuns = runs.map((r) =>
      r.id === run.id
        ? {
            ...r,
            status: "active" as const,
            paused_at: null,
            total_paused_seconds:
              (r.total_paused_seconds || 0) + pausedSeconds,
          }
        : r
    );
    saveExamRuns(updatedRuns);
    setRuns(updatedRuns);

    // Geser deadline_at seluruh sesi peserta pada run ini sebesar durasi jeda (pausedSeconds)
    const allSessions = getExamSessions();
    let resumedCount = 0;
    const updatedSessions = allSessions.map((s) => {
      if (
        s.exam_run_id === run.id &&
        (s.status === "paused" || s.status === "in_progress")
      ) {
        resumedCount++;
        const prevDeadlineMs = new Date(s.deadline_at).getTime();
        const shiftedDeadlineIso = new Date(
          prevDeadlineMs + pausedSeconds * 1000
        ).toISOString();
        return {
          ...s,
          status: "in_progress" as const,
          deadline_at: shiftedDeadlineIso,
          time_extension_seconds:
            (s.time_extension_seconds || 0) + pausedSeconds,
          updated_at: nowIso,
        };
      }
      return s;
    });
    saveExamSessions(updatedSessions);

    appendAuditLog({
      action: "GLOBAL_RESUME_EXAM_RUN",
      entity_type: "exam_runs",
      entity_id: run.id,
      reason: `Melanjutkan sesi "${run.name}" setelah jeda ${Math.round(
        pausedSeconds / 60
      )} menit`,
      details: {
        paused_seconds_compensated: pausedSeconds,
        resumed_sessions: resumedCount,
      },
    });
    setAuditLogs(getAuditLogs());

    setToast({
      type: "success",
      title: "Sesi Massal Dilanjutkan & Deadline Disesuaikan",
      desc: `Sesi "${run.name}" kembali aktif. Batas waktu ${resumedCount} peserta digeser maju +${Math.round(
        pausedSeconds / 60
      )} menit secara atomik.`,
    });
  }

  function handleCreateIncident(e: React.FormEvent) {
    e.preventDefault();
    if (!incNote.trim()) return;
    const nowIso = new Date().toISOString();
    const newInc: ExamIncidentRow = {
      id: `inc-${Date.now()}`,
      exam_run_id: incRunId,
      exam_session_id: null,
      incident_type: incType,
      severity: incSeverity,
      status: "open",
      details: { note: incNote },
      created_by: "usr-admin-01",
      resolved_by: null,
      resolution_note: null,
      created_at: nowIso,
      resolved_at: null,
    };

    const updated = [newInc, ...incidents];
    saveIncidents(updated);
    setIncidents(updated);

    appendAuditLog({
      action: "CREATE_EXAM_INCIDENT",
      entity_type: "exam_incidents",
      entity_id: newInc.id,
      reason: incNote,
      details: { incident_type: incType, severity: incSeverity },
    });
    setAuditLogs(getAuditLogs());
    setNewIncidentOpen(false);
    setIncNote("");

    setToast({
      type: "info",
      title: "Insiden Teknis Dicatat",
      desc: "Laporan gangguan telah ditambahkan ke daftar insiden dan Audit Log.",
    });
  }

  function handleResolveIncident() {
    if (!resolveTarget || !resolutionNote.trim()) return;
    const nowIso = new Date().toISOString();

    const updated = incidents.map((inc) =>
      inc.id === resolveTarget.id
        ? {
            ...inc,
            status: "resolved" as const,
            resolved_by: "usr-admin-01",
            resolution_note: resolutionNote,
            resolved_at: nowIso,
          }
        : inc
    );
    saveIncidents(updated);
    setIncidents(updated);

    appendAuditLog({
      action: "RESOLVE_EXAM_INCIDENT",
      entity_type: "exam_incidents",
      entity_id: resolveTarget.id,
      reason: resolutionNote,
      details: { incident_type: resolveTarget.incident_type },
    });
    setAuditLogs(getAuditLogs());
    setResolveTarget(null);

    setToast({
      type: "success",
      title: "Insiden Ditandai Selesai",
      desc: "Catatan penyelesaian insiden telah disimpan.",
    });
  }

  const openIncidentsCount = incidents.filter(
    (i) => i.status !== "resolved"
  ).length;
  const pausedRunsCount = runs.filter((r) => r.status === "paused").length;

  return (
    <AppShell
      role="admin"
      userName="Administrator Utama"
      userSubtitle="Insiden, Global Pause & Audit Log"
    >
      <PageHeader
        title="Pemulihan Gangguan, Global Pause & Audit Log"
        description="Kendalikan jeda massal (Global Pause) saat terjadi gangguan sistem, kelola catatan insiden teknis, dan tinjau jejak audit tindakan sensitif."
        badge={
          openIncidentsCount > 0 ? (
            <StatusBadge
              variant="warning"
              label={`${openIncidentsCount} Insiden Terbuka`}
            />
          ) : (
            <StatusBadge variant="active" label="Sistem Normal" />
          )
        }
        actions={
          <Button
            variant="primary"
            onClick={() => setNewIncidentOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Catat Insiden Baru
          </Button>
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

      {/* Ringkasan Metrik Insiden & Audit */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <StatCard
          title="Insiden Belum Selesai"
          value={openIncidentsCount}
          subtitle="Memerlukan tindak lanjut Admin"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          title="Sesi Dijeda Massal"
          value={pausedRunsCount}
          subtitle="Status exam_runs = paused"
          icon={<PauseCircle className="h-5 w-5" />}
        />
        <StatCard
          title="Total Jejak Audit"
          value={auditLogs.length}
          subtitle="Rekam tindakan sensitif Admin"
          icon={<FileText className="h-5 w-5" />}
        />
      </div>

      {/* 1. Panel Kendali Jeda Massal (Global Pause / Resume) */}
      <section className="rounded-2xl border border-[#ffc63d] bg-[#fff9e6] p-5 sm:p-6 shadow-xs space-y-4 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ffc63d] text-[#151515]">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#151515]">
                Kendali Darurat: Jeda Massal (Global Pause) & Kompensasi Waktu
              </h2>
              <p className="text-xs sm:text-sm text-neutral-700">
                Saat sesi dijeda massal lalu dilanjutkan, sistem otomatis
                menggeser <code>deadline_at</code> seluruh peserta sebesar durasi
                jeda secara atomik.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {runs.map((run) => {
            const isPaused = run.status === "paused";
            const pausedMinutes = Math.round(
              (run.total_paused_seconds || 0) / 60
            );

            return (
              <div
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#151515]">
                      {run.name}
                    </span>
                    {isPaused ? (
                      <StatusBadge
                        variant="warning"
                        label="DIJEDA MASSAL"
                        size="sm"
                      />
                    ) : run.status === "active" ? (
                      <StatusBadge
                        variant="ongoing"
                        label="Berlangsung"
                        size="sm"
                      />
                    ) : (
                      <StatusBadge
                        variant="scheduled"
                        label={run.status.toUpperCase()}
                        size="sm"
                      />
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-[#0b49d0]" />
                    <span>
                      Total Kompensasi Jeda: <strong>{pausedMinutes} Menit</strong>
                    </span>
                  </p>
                </div>

                <div>
                  {isPaused ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleGlobalResume(run)}
                      leftIcon={<PlayCircle className="h-4 w-4" />}
                    >
                      Lanjutkan Sesi Massal
                    </Button>
                  ) : (
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => setPauseModalRun(run)}
                      leftIcon={<PauseCircle className="h-4 w-4" />}
                    >
                      Global Pause
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Daftar Insiden Teknis (exam_incidents) */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4 mb-6">
        <h2 className="text-base font-extrabold text-[#151515] flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span>Daftar Insiden Teknis Sesi Ujian (`exam_incidents`)</span>
        </h2>

        <div className="space-y-3">
          {incidents.map((inc) => {
            const runObj = runs.find((r) => r.id === inc.exam_run_id);
            const note =
              (inc.details as { note?: string })?.note ||
              "Gangguan teknis tercatat pada sesi ujian.";

            return (
              <div
                key={inc.id}
                className="rounded-xl border border-neutral-200 bg-[#fcfbf7] p-4 flex flex-wrap items-start justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-[#0b49d0] px-2.5 py-0.5 text-xs font-extrabold text-white">
                      {inc.incident_type}
                    </span>
                    <StatusBadge
                      variant={
                        inc.severity === "critical" || inc.severity === "high"
                          ? "danger"
                          : inc.severity === "medium"
                          ? "warning"
                          : "scheduled"
                      }
                      label={`Severity: ${inc.severity.toUpperCase()}`}
                      size="sm"
                    />
                    {inc.status === "resolved" ? (
                      <StatusBadge
                        variant="completed"
                        label="Selesai Ditangani"
                        size="sm"
                      />
                    ) : (
                      <StatusBadge
                        variant="warning"
                        label="Terbuka (Open)"
                        size="sm"
                      />
                    )}
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-[#151515]">
                    {note}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Sesi: <strong>{runObj?.name || inc.exam_run_id}</strong> •
                    Tercatat: {formatDateTimeID(inc.created_at)}
                  </p>
                  {inc.resolution_note && (
                    <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 mt-1">
                      <strong>Resolusi:</strong> {inc.resolution_note}
                    </p>
                  )}
                </div>

                {inc.status !== "resolved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResolveTarget(inc)}
                    leftIcon={
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    }
                  >
                    Tandai Selesai
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Tabel Jejak Audit Lengkap (exam_audit_logs) */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-extrabold text-[#151515] flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#0b49d0]" />
            <span>Jejak Audit Tindakan Sensitif (`exam_audit_logs`)</span>
          </h2>
          <p className="text-xs text-neutral-500">
            Seluruh tindakan sensitif Admin dan sistem tercatat secara permanen
            beserta alasan dan stempel waktu.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-[#fcfbf7] text-neutral-600 font-bold">
                <th className="py-3 px-3">Waktu</th>
                <th className="py-3 px-3">Aksi (`action`)</th>
                <th className="py-3 px-3">Entitas Target</th>
                <th className="py-3 px-3">Alasan Audit (`reason`)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50">
                  <td className="py-3 px-3 tabular-nums text-xs text-neutral-500 whitespace-nowrap">
                    {formatDateTimeID(log.created_at)}
                  </td>
                  <td className="py-3 px-3">
                    <span className="rounded-md bg-[#eef4ff] px-2 py-1 font-mono text-xs font-bold text-[#0b49d0]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs font-semibold text-[#151515]">
                    {log.entity_type} ({log.entity_id})
                  </td>
                  <td className="py-3 px-3 text-xs text-neutral-700">
                    {log.reason || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dialog Konfirmasi Global Pause */}
      <ConfirmDialog
        open={Boolean(pauseModalRun)}
        onClose={() => setPauseModalRun(null)}
        onConfirm={handleConfirmGlobalPause}
        variant="danger"
        title="Konfirmasi Jeda Massal (Global Pause)"
        description={`Seluruh sesi peserta yang sedang berlangsung pada "${pauseModalRun?.name}" akan dijeda sementara hingga Anda menekan tombol Lanjutkan.`}
        confirmLabel="Ya, Jedakan Sesi Massal"
      >
        <FormField
          id="gp-reason"
          label="Alasan Jeda Massal (Wajib diisi untuk Audit Log)"
          required
        >
          <input
            id="gp-reason"
            type="text"
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            className={inputBaseClasses}
          />
        </FormField>
      </ConfirmDialog>

      {/* Dialog Catat Insiden Baru */}
      <ConfirmDialog
        open={newIncidentOpen}
        onClose={() => setNewIncidentOpen(false)}
        onConfirm={() => {
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
          handleCreateIncident(fakeEvent);
        }}
        variant="primary"
        title="Catat Insiden Teknis Baru"
        description="Gunakan formulir ini untuk mendokumentasikan kendala teknis yang terjadi selama sesi ujian."
        confirmLabel="Simpan Insiden"
      >
        <div className="space-y-3">
          <FormField id="inc-run" label="Sesi Pelaksanaan Terkait">
            <select
              id="inc-run"
              value={incRunId}
              onChange={(e) => setIncRunId(e.target.value)}
              className={selectBaseClasses}
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-2.5">
            <FormField id="inc-type" label="Jenis Insiden">
              <select
                id="inc-type"
                value={incType}
                onChange={(e) => setIncType(e.target.value)}
                className={selectBaseClasses}
              >
                <option value="NETWORK_INTERRUPTION">Gangguan Jaringan</option>
                <option value="LATENCY_SPIKE">Lonjakan Latensi</option>
                <option value="DEVICE_FREEZE">Perangkat Peserta Freeze</option>
                <option value="LATE_RECOVERY">Pemulihan Terlambat</option>
              </select>
            </FormField>

            <FormField id="inc-sev" label="Tingkat Keparahan">
              <select
                id="inc-sev"
                value={incSeverity}
                onChange={(e) =>
                  setIncSeverity(e.target.value as IncidentSeverity)
                }
                className={selectBaseClasses}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </FormField>
          </div>

          <FormField id="inc-note" label="Kronologi / Catatan Insiden" required>
            <textarea
              id="inc-note"
              rows={3}
              value={incNote}
              onChange={(e) => setIncNote(e.target.value)}
              className={textareaBaseClasses}
              placeholder="Tuliskan deskripsi gangguan dan peserta yang terdampak..."
            />
          </FormField>
        </div>
      </ConfirmDialog>

      {/* Dialog Selesaikan Insiden */}
      <ConfirmDialog
        open={Boolean(resolveTarget)}
        onClose={() => setResolveTarget(null)}
        onConfirm={handleResolveIncident}
        variant="primary"
        title="Tandai Insiden Selesai (Resolve)"
        description="Masukkan catatan tindakan pemulihan yang telah dilakukan."
        confirmLabel="Simpan & Selesaikan"
      >
        <FormField id="res-note" label="Catatan Penyelesaian" required>
          <textarea
            id="res-note"
            rows={3}
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            className={textareaBaseClasses}
          />
        </FormField>
      </ConfirmDialog>
    </AppShell>
  );
}
