"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  PlayCircle,
  CheckCircle2,
  UsersRound,
  Clock,
  ShieldCheck,
  X,
  Trash2,
  RotateCcw,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  StatusBadge,
  Button,
  FormField,
  inputBaseClasses,
  DataTable,
  MobileRecordCard,
  ConfirmDialog,
  ToastNotification,
} from "@/components/ui";
import { getStoredProfiles, syncProfilesFromSupabase } from "@/lib/auth";
import {
  getExams,
  saveExams,
  getExamRuns,
  saveExamRuns,
  getRunAssignments,
  saveRunAssignments,
  getGroups,
  getScoringSnapshots,
  appendAuditLog,
  syncAdminStoreFromSupabase,
} from "@/lib/admin-store";
import {
  ExamRow,
  ExamRunAssignmentRow,
  ExamRunRow,
  ExamRunStatus,
  ExamScoringSnapshotRow,
  GroupRow,
  ProfileRow,
} from "@/types/database";
import { formatDateTimeID } from "@/lib/utils";

export default function JadwalSesiPage() {
  const [runs, setRuns] = useState<ExamRunRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [assignments, setAssignments] = useState<ExamRunAssignmentRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [snapshots, setSnapshots] = useState<ExamScoringSnapshotRow[]>([]);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [scheduledStart, setScheduledStart] = useState("2026-10-12T08:00");
  const [scheduledEnd, setScheduledEnd] = useState("2026-10-12T12:00");
  const [assignedGroupId, setAssignedGroupId] = useState("");

  const [assignModalRun, setAssignModalRun] = useState<ExamRunRow | null>(null);
  const [latePermitUserId, setLatePermitUserId] = useState("");
  const [lateReason, setLateReason] = useState("");
  const [deleteTargetRun, setDeleteTargetRun] = useState<ExamRunRow | null>(
    null
  );
  const [showDeleteAllRunsConfirm, setShowDeleteAllRunsConfirm] =
    useState(false);

  const [toast, setToast] = useState<{
    type: "success" | "warning" | "error";
    title: string;
    desc: string;
  } | null>(null);

  useEffect(() => {
    const loadAll = () => {
      const exList = getExams();
      setExams(exList);
      setSelectedExamId((prev) => prev || exList[0]?.id || "");
      setRuns(getExamRuns());
      setAssignments(getRunAssignments());
      setGroups(getGroups());
      setProfiles(getStoredProfiles().filter((p) => p.role === "user"));
      setSnapshots(getScoringSnapshots());
    };

    loadAll();
    void syncAdminStoreFromSupabase().then(() => {
      loadAll();
    });
    void syncProfilesFromSupabase().then((synced) => {
      setProfiles(synced.filter((p) => p.role === "user"));
    });
  }, []);

  function handleCreateRun(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedExamId || !sessionName.trim()) return;

    const latestSnap =
      snapshots.find((s) => s.exam_id === selectedExamId) || snapshots[0];
    const now = new Date().toISOString();

    const newRun: ExamRunRow = {
      id: `run-${Date.now()}`,
      exam_id: selectedExamId,
      scoring_snapshot_id: latestSnap?.id || "snap-score-cpns-v1",
      name: sessionName.trim(),
      status: "scheduled",
      scheduled_start: new Date(scheduledStart).toISOString(),
      scheduled_end: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
      activated_at: null,
      paused_at: null,
      total_paused_seconds: 0,
      pause_reason: null,
      completed_at: null,
      created_by: "usr-admin-01",
      created_at: now,
    };

    const nextRuns = [newRun, ...runs];
    saveExamRuns(nextRuns);
    setRuns(nextRuns);

    if (assignedGroupId) {
      const newAsg: ExamRunAssignmentRow = {
        id: `asg-${Date.now()}`,
        exam_run_id: newRun.id,
        user_id: null,
        group_id: assignedGroupId,
        assigned_by: "usr-admin-01",
        created_at: now,
      };
      const nextAsg = [...assignments, newAsg];
      saveRunAssignments(nextAsg);
      setAssignments(nextAsg);
    }

    appendAuditLog({
      action: "CREATE_EXAM_RUN",
      entity_type: "exam_runs",
      entity_id: newRun.id,
      reason: `Pembuatan jadwal sesi pelaksanaan "${newRun.name}"`,
      details: {
        exam_id: selectedExamId,
        scheduled_start: newRun.scheduled_start,
        assigned_group_id: assignedGroupId || null,
      },
    });

    setCreateModalOpen(false);
    setSessionName("");
    setToast({
      type: "success",
      title: "Sesi Pelaksanaan Berhasil Dijadwalkan",
      desc: `Sesi "${newRun.name}" telah dibuat, disinkronkan ke server, dan siap diaktifkan sesuai jadwal.`,
    });
  }

  function handleChangeRunStatus(run: ExamRunRow, newStatus: ExamRunStatus) {
    const now = new Date().toISOString();
    const updated = runs.map((r) =>
      r.id === run.id
        ? {
            ...r,
            status: newStatus,
            activated_at:
              newStatus === "active" && !r.activated_at ? now : r.activated_at,
            completed_at: newStatus === "completed" ? now : r.completed_at,
          }
        : r
    );
    saveExamRuns(updated);
    setRuns(updated);

    // Jika mengaktifkan sesi, pastikan ujian induknya juga berstatus active agar langsung bisa dikerjakan peserta
    if (newStatus === "active") {
      const parentExam = exams.find((ex) => ex.id === run.exam_id);
      if (parentExam && parentExam.status === "draft") {
        const updatedExams = exams.map((ex) =>
          ex.id === run.exam_id
            ? { ...ex, status: "active" as const, updated_at: now }
            : ex
        );
        saveExams(updatedExams);
        setExams(updatedExams);
      }
    }

    appendAuditLog({
      action: `CHANGE_EXAM_RUN_STATUS_${newStatus.toUpperCase()}`,
      entity_type: "exam_runs",
      entity_id: run.id,
      reason: `Perubahan status sesi "${run.name}" menjadi ${newStatus}`,
    });

    setToast({
      type: "success",
      title: `Status Sesi: ${newStatus.toUpperCase()}`,
      desc: `Sesi "${run.name}" kini berstatus ${newStatus} dan telah disinkronkan ke seluruh perangkat peserta.`,
    });
  }

  function handleConfirmDeleteRun() {
    if (!deleteTargetRun) return;
    const target = deleteTargetRun;
    const nextRuns = runs.filter((r) => r.id !== target.id);
    saveExamRuns(nextRuns);
    setRuns(nextRuns);

    const nextAsg = assignments.filter((a) => a.exam_run_id !== target.id);
    saveRunAssignments(nextAsg);
    setAssignments(nextAsg);
    setDeleteTargetRun(null);

    appendAuditLog({
      action: "DELETE_EXAM_RUN",
      entity_type: "exam_runs",
      entity_id: target.id,
      reason: `Menghapus sesi pelaksanaan "${target.name}"`,
    });

    setToast({
      type: "warning",
      title: "Sesi Pelaksanaan Dihapus",
      desc: `Sesi "${target.name}" beserta penugasannya telah dihapus.`,
    });
  }

  function handleConfirmDeleteAllRuns() {
    const count = runs.length;
    saveExamRuns([]);
    setRuns([]);
    saveRunAssignments([]);
    setAssignments([]);
    setShowDeleteAllRunsConfirm(false);

    appendAuditLog({
      action: "DELETE_ALL_EXAM_RUNS",
      entity_type: "exam_runs",
      entity_id: "bulk-delete-runs",
      reason: `Menghapus keseluruhan ${count} sesi pelaksanaan ujian`,
    });

    setToast({
      type: "warning",
      title: "Seluruh Sesi Pelaksanaan Dihapus",
      desc: `Seluruh ${count} sesi pelaksanaan ujian telah dikosongkan.`,
    });
  }

  function handleGrantLatePermission(e: React.FormEvent) {
    e.preventDefault();
    if (!assignModalRun || !latePermitUserId) return;

    const now = new Date().toISOString();
    const newAsg: ExamRunAssignmentRow = {
      id: `late-${Date.now()}`,
      exam_run_id: assignModalRun.id,
      user_id: latePermitUserId,
      group_id: null,
      late_permission_granted: true,
      assigned_by: "usr-admin-01",
      created_at: now,
    };

    const next = [...assignments, newAsg];
    saveRunAssignments(next);
    setAssignments(next);

    const usr = profiles.find((p) => p.id === latePermitUserId);
    appendAuditLog({
      action: "GRANT_LATE_PARTICIPANT_PERMISSION",
      entity_type: "exam_run_assignments",
      entity_id: assignModalRun.id,
      reason:
        lateReason.trim() ||
        "Izin khusus peserta terlambat disetujui oleh Admin",
      details: {
        exam_run_id: assignModalRun.id,
        user_id: latePermitUserId,
        user_email: usr?.email,
      },
    });

    setLatePermitUserId("");
    setLateReason("");
    setToast({
      type: "success",
      title: "Izin Khusus Terlambat Diberikan",
      desc: `Peserta ${
        usr?.full_name || latePermitUserId
      } telah diizinkan memulai sesi "${
        assignModalRun.name
      }" dan tercatat dalam Audit Log.`,
    });
  }

  function renderRunStatusBadge(st: ExamRunStatus) {
    switch (st) {
      case "active":
        return (
          <StatusBadge variant="ongoing" label="Sedang Berlangsung" size="sm" />
        );
      case "paused":
        return (
          <StatusBadge variant="paused" label="Dijeda Massal" size="sm" />
        );
      case "completed":
        return <StatusBadge variant="completed" label="Selesai" size="sm" />;
      case "cancelled":
        return <StatusBadge variant="danger" label="Dibatalkan" size="sm" />;
      default:
        return <StatusBadge variant="scheduled" label="Terjadwal" size="sm" />;
    }
  }

  return (
    <AppShell
      role="admin"
      userName="Admin Prima RIB"
      userSubtitle="Jadwal & Sesi Ujian"
    >
      <PageHeader
        title="Jadwal & Sesi Pelaksanaan Ujian (`exam_runs`)"
        description="Satu definisi ujian dapat memiliki beberapa sesi pelaksanaan (mis. Sesi Pagi dan Sesi Siang) dengan daftar penugasan peserta serta kebijakan keterlambatan masing-masing."
        badge={
          <StatusBadge variant="ongoing" label={`${runs.length} Sesi Terdaftar`} />
        }
        actions={
          <div className="flex flex-wrap gap-2.5">
            {runs.length > 0 && (
              <Button
                variant="danger"
                onClick={() => setShowDeleteAllRunsConfirm(true)}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                Hapus Semua Sesi ({runs.length})
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => setCreateModalOpen(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Buat Sesi Pelaksanaan Baru
            </Button>
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

      <DataTable
        data={runs}
        keyExtractor={(row) => row.id}
        columns={[
          {
            key: "name",
            header: "Identitas Sesi Pelaksanaan",
            render: (row) => {
              const parentExam = exams.find((e) => e.id === row.exam_id);
              return (
                <div className="space-y-1">
                  <p className="font-bold text-[#151515]">{row.name}</p>
                  <p className="text-xs text-neutral-500">
                    Ujian Induk: {parentExam?.title || row.exam_id}
                  </p>
                </div>
              );
            },
          },
          {
            key: "schedule",
            header: "Jadwal Mulai & Batas Sesi",
            render: (row) => (
              <div className="space-y-1 text-xs tabular-nums">
                <p className="font-semibold text-[#151515] flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#0b49d0]" />
                  <span>Mulai: {formatDateTimeID(row.scheduled_start)}</span>
                </p>
                <p className="text-neutral-500">
                  Batas Sesi: {formatDateTimeID(row.scheduled_end)}
                </p>
              </div>
            ),
          },
          {
            key: "assignments",
            header: "Penugasan Peserta / Grup",
            render: (row) => {
              const runAsgs = assignments.filter(
                (a) => a.exam_run_id === row.id
              );
              return runAsgs.length === 0 ? (
                <span className="text-xs text-neutral-500">
                  Mengikuti Akses Ujian Induk
                </span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {runAsgs.map((a) => {
                    const g = groups.find((gr) => gr.id === a.group_id);
                    const u = profiles.find((pr) => pr.id === a.user_id);
                    return (
                      <span
                        key={a.id}
                        className="rounded-md bg-[#eef4ff] px-2 py-0.5 text-[11px] font-semibold text-[#0b49d0]"
                      >
                        {g
                          ? g.name
                          : `${u?.full_name || a.user_id}${
                              a.late_permission_granted ? " (Izin Terlambat)" : ""
                            }`}
                      </span>
                    );
                  })}
                </div>
              );
            },
          },
          {
            key: "status",
            header: "Status Sesi",
            render: (row) => renderRunStatusBadge(row.status),
          },
          {
            key: "actions",
            header: "Kontrol Sesi & Izin",
            className: "text-right",
            render: (row) => (
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {row.status === "scheduled" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleChangeRunStatus(row, "active")}
                    leftIcon={<PlayCircle className="h-3.5 w-3.5" />}
                  >
                    Aktifkan Sesi
                  </Button>
                )}
                {row.status === "active" && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => handleChangeRunStatus(row, "completed")}
                    leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  >
                    Selesaikan
                  </Button>
                )}
                {row.status === "completed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleChangeRunStatus(row, "active")}
                    leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  >
                    Buka Kembali
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignModalRun(row)}
                  leftIcon={<UsersRound className="h-3.5 w-3.5" />}
                >
                  Penugasan &amp; Izin Terlambat
                </Button>
                <button
                  type="button"
                  onClick={() => setDeleteTargetRun(row)}
                  title={`Hapus sesi ${row.name}`}
                  aria-label={`Hapus sesi ${row.name}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-600 hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
        renderMobileCard={(row) => {
          const parentExam = exams.find((e) => e.id === row.exam_id);
          return (
            <MobileRecordCard
              title={row.name}
              subtitle={parentExam?.title || row.exam_id}
              badge={renderRunStatusBadge(row.status)}
              fields={[
                {
                  label: "Jadwal Mulai",
                  value: formatDateTimeID(row.scheduled_start),
                },
                {
                  label: "Batas Sesi",
                  value: formatDateTimeID(row.scheduled_end),
                },
              ]}
              actions={
                <>
                  {row.status === "scheduled" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleChangeRunStatus(row, "active")}
                    >
                      Aktifkan Sesi
                    </Button>
                  )}
                  {row.status === "active" && (
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => handleChangeRunStatus(row, "completed")}
                    >
                      Selesaikan
                    </Button>
                  )}
                  {row.status === "completed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleChangeRunStatus(row, "active")}
                    >
                      Buka Kembali
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssignModalRun(row)}
                  >
                    Penugasan &amp; Izin Terlambat
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteTargetRun(row)}
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                  >
                    Hapus Sesi
                  </Button>
                </>
              }
            />
          );
        }}
      />

      {/* Modal Buat Sesi Pelaksanaan Baru */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleCreateRun}
            className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold text-[#151515]">
                Buat Sesi Pelaksanaan Ujian (`exam_runs`)
              </h2>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <FormField id="run-exam" label="Pilih Ujian Induk" required>
              <select
                id="run-exam"
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className={inputBaseClasses}
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              id="run-name"
              label="Nama Sesi Pelaksanaan"
              required
              hint="Contoh: Tryout SKD CPNS — Sesi Pagi / Gelombang 1"
            >
              <input
                id="run-name"
                type="text"
                required
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Contoh: Simulasi SKD — Sesi Siang"
                className={inputBaseClasses}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField id="run-start" label="Waktu Mulai" required>
                <input
                  id="run-start"
                  type="datetime-local"
                  required
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  className={inputBaseClasses}
                />
              </FormField>
              <FormField id="run-end" label="Batas Akhir Sesi">
                <input
                  id="run-end"
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={(e) => setScheduledEnd(e.target.value)}
                  className={inputBaseClasses}
                />
              </FormField>
            </div>

            <FormField
              id="run-group"
              label="Tugaskan Kelompok Peserta (Opsional)"
            >
              <select
                id="run-group"
                value={assignedGroupId}
                onChange={(e) => setAssignedGroupId(e.target.value)}
                className={inputBaseClasses}
              >
                <option value="">-- Semua Peserta yang Memiliki Akses --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary">
                Simpan Jadwal Sesi
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Penugasan & Izin Peserta Terlambat (Bab 5.4 PRD & Bab 10 UI/UX) */}
      {assignModalRun && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-[#151515]">
                  Penugasan &amp; Izin Keterlambatan: {assignModalRun.name}
                </h2>
                <p className="text-xs text-neutral-500">
                  Berikan izin khusus bagi peserta yang datang terlambat. Semua
                  pemberian izin tercatat di <code>exam_audit_logs</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalRun(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleGrantLatePermission} className="space-y-3">
              <FormField
                id="late-user"
                label="Pilih Peserta yang Diberi Izin Khusus / Penugasan"
                required
              >
                <select
                  id="late-user"
                  required
                  value={latePermitUserId}
                  onChange={(e) => setLatePermitUserId(e.target.value)}
                  className={inputBaseClasses}
                >
                  <option value="">-- Pilih Peserta --</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.email})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                id="late-reason"
                label="Alasan Pemberian Izin Terlambat (Wajib untuk Audit Log)"
                required
              >
                <input
                  id="late-reason"
                  type="text"
                  required
                  value={lateReason}
                  onChange={(e) => setLateReason(e.target.value)}
                  placeholder="Contoh: Kendala jaringan listrik daerah peserta"
                  className={inputBaseClasses}
                />
              </FormField>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={!latePermitUserId}
                leftIcon={<ShieldCheck className="h-4 w-4" />}
              >
                Berikan Izin Mulai Ujian &amp; Catat Audit
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus 1 Sesi Pelaksanaan */}
      <ConfirmDialog
        open={Boolean(deleteTargetRun)}
        onClose={() => setDeleteTargetRun(null)}
        onConfirm={handleConfirmDeleteRun}
        variant="danger"
        title="Hapus Sesi Pelaksanaan Ini?"
        description={
          deleteTargetRun
            ? `Apakah Anda yakin ingin menghapus sesi pelaksanaan "${deleteTargetRun.name}"? Tindakan ini akan menghapus jadwal sesi tersebut secara permanen.`
            : ""
        }
        confirmLabel="Ya, Hapus Sesi"
      />

      {/* Dialog Konfirmasi Hapus Semua Sesi */}
      <ConfirmDialog
        open={showDeleteAllRunsConfirm}
        onClose={() => setShowDeleteAllRunsConfirm(false)}
        onConfirm={handleConfirmDeleteAllRuns}
        variant="danger"
        title="Hapus Semua Sesi Pelaksanaan?"
        description={`Apakah Anda yakin ingin menghapus seluruh ${runs.length} sesi pelaksanaan ujian?`}
        confirmLabel={`Ya, Hapus Semua (${runs.length} Sesi)`}
      />
    </AppShell>
  );
}
