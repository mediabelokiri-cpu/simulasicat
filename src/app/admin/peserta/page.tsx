"use client";

import React, { useEffect, useState } from "react";
import {
  Eye,
  UserCheck,
  UserX,
  MailCheck,
  UsersRound,
  History,
  X,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  StatusBadge,
  Button,
  SearchInput,
  FilterPanel,
  FormField,
  inputBaseClasses,
  DataTable,
  MobileRecordCard,
  ConfirmDialog,
  ToastNotification,
} from "@/components/ui";
import {
  getStoredProfiles,
  saveStoredProfiles,
  syncProfilesFromSupabase,
} from "@/lib/auth";
import {
  getGroups,
  getGroupMembers,
  saveGroupMembers,
  getResults,
  getExamRuns,
  toggleUserActiveStatus,
  appendAuditLog,
} from "@/lib/admin-store";
import {
  ProfileRow,
  GroupRow,
  GroupMemberRow,
  ResultRow,
  ExamRunRow,
} from "@/types/database";
import { formatDateTimeID } from "@/lib/utils";

export default function ManajemenPesertaPage() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMemberRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [runs, setRuns] = useState<ExamRunRow[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [targetFilter, setTargetFilter] = useState("ALL");

  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null);
  const [toggleTarget, setToggleTarget] = useState<ProfileRow | null>(null);
  const [auditReason, setAuditReason] = useState("");
  const [selectedGroupIdToAdd, setSelectedGroupIdToAdd] = useState("");
  const [toast, setToast] = useState<{
    type: "success" | "warning" | "error";
    title: string;
    desc: string;
  } | null>(null);

  useEffect(() => {
    setProfiles(getStoredProfiles());
    setGroups(getGroups());
    setGroupMembers(getGroupMembers());
    setResults(getResults());
    setRuns(getExamRuns());

    const refreshProfiles = () => {
      void syncProfilesFromSupabase().then((synced) => {
        setProfiles(synced);
      });
    };

    refreshProfiles();
    const intervalId = window.setInterval(refreshProfiles, 8000);
    window.addEventListener("focus", refreshProfiles);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshProfiles);
    };
  }, []);

  async function handleManualSync() {
    setIsSyncing(true);
    try {
      const synced = await syncProfilesFromSupabase();
      setProfiles(synced);
      const totalUsers = synced.filter((p) => p.role === "user").length;
      setToast({
        type: "success",
        title: "Sinkronisasi Peserta Selesai",
        desc: `Berhasil memuat ${totalUsers} akun peserta dari database Supabase & penyimpanan lokal.`,
      });
    } finally {
      setIsSyncing(false);
    }
  }

  const participants = profiles.filter((p) => p.role === "user");

  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.institution || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && p.is_active) ||
      (statusFilter === "INACTIVE" && !p.is_active);
    const matchesTarget =
      targetFilter === "ALL" ||
      (p.target_selection || "").toLowerCase().includes(targetFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesTarget;
  });

  function getUserGroups(userId: string): GroupRow[] {
    const memberIds = groupMembers
      .filter((gm) => gm.user_id === userId)
      .map((gm) => gm.group_id);
    return groups.filter((g) => memberIds.includes(g.id));
  }

  function handleConfirmToggleStatus() {
    if (!toggleTarget) return;
    const reason =
      auditReason.trim() ||
      (toggleTarget.is_active
        ? "Penonaktifan akun peserta oleh Admin"
        : "Pengaktifan kembali akun peserta oleh Admin");

    const updated = toggleUserActiveStatus(
      toggleTarget.id,
      !toggleTarget.is_active,
      reason
    );

    if (updated) {
      const nextList = getStoredProfiles();
      setProfiles(nextList);
      if (selectedUser?.id === updated.id) {
        setSelectedUser(updated);
      }
      setToast({
        type: updated.is_active ? "success" : "warning",
        title: updated.is_active
          ? "Akun Peserta Diaktifkan"
          : "Akun Peserta Dinonaktifkan",
        desc: `Status akun ${updated.full_name} berhasil diperbarui (riwayat ujian tetap tersimpan) dan tercatat di Audit Log.`,
      });
    }

    setToggleTarget(null);
    setAuditReason("");
  }

  function handleVerifyEmailByAdmin(user: ProfileRow) {
    const all = getStoredProfiles();
    const idx = all.findIndex((p) => p.id === user.id);
    if (idx === -1) return;
    all[idx] = {
      ...all[idx],
      email_verified: true,
      updated_at: new Date().toISOString(),
    };
    saveStoredProfiles(all);
    setProfiles(all);
    setSelectedUser(all[idx]);
    void fetch("/api/profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        email_verified: true,
      }),
    }).catch(() => {});
    appendAuditLog({
      action: "VERIFY_USER_EMAIL_MANUAL",
      entity_type: "profiles",
      entity_id: user.id,
      reason: "Verifikasi email manual oleh Admin",
      details: { email: user.email },
    });
    setToast({
      type: "success",
      title: "Email Peserta Diverifikasi",
      desc: `Status verifikasi email ${user.email} telah diaktifkan dan dicatat di Audit Log.`,
    });
  }

  function handleAddUserToGroup(userId: string, groupId: string) {
    if (!groupId) return;
    if (
      groupMembers.some(
        (gm) => gm.user_id === userId && gm.group_id === groupId
      )
    ) {
      return;
    }
    const newMember: GroupMemberRow = {
      id: `gm-${Date.now()}`,
      group_id: groupId,
      user_id: userId,
      joined_at: new Date().toISOString(),
    };
    const next = [...groupMembers, newMember];
    saveGroupMembers(next);
    setGroupMembers(next);
    setSelectedGroupIdToAdd("");

    appendAuditLog({
      action: "ADD_GROUP_MEMBER",
      entity_type: "group_members",
      entity_id: newMember.id,
      reason: "Penambahan anggota kelompok melalui Manajemen Peserta",
      details: { user_id: userId, group_id: groupId },
    });
  }

  function handleRemoveUserFromGroup(userId: string, groupId: string) {
    const next = groupMembers.filter(
      (gm) => !(gm.user_id === userId && gm.group_id === groupId)
    );
    saveGroupMembers(next);
    setGroupMembers(next);

    appendAuditLog({
      action: "REMOVE_GROUP_MEMBER",
      entity_type: "group_members",
      entity_id: groupId,
      reason: "Pengeluaran anggota dari kelompok oleh Admin",
      details: { user_id: userId, group_id: groupId },
    });
  }

  const activeFilterCount =
    (statusFilter !== "ALL" ? 1 : 0) + (targetFilter !== "ALL" ? 1 : 0);

  return (
    <AppShell
      role="admin"
      userName="Admin Prima RIB"
      userSubtitle="Manajemen Peserta"
    >
      <PageHeader
        title="Manajemen Peserta"
        description="Kelola akun peserta, verifikasi email, keanggotaan kelompok, riwayat ujian, serta status aktif/nonaktif akun tanpa menghapus data historis."
        badge={
          <StatusBadge
            variant="ongoing"
            label={`${participants.length} Peserta Terdaftar`}
          />
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSync}
            disabled={isSyncing}
            leftIcon={
              <RefreshCw
                className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
              />
            }
          >
            {isSyncing ? "Menyinkronkan..." : "Sinkronkan Data Peserta"}
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

      {/* Search & Filter Bar */}
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
        <div className="md:col-span-5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari nama peserta, email, atau institusi..."
          />
        </div>
        <div className="md:col-span-7">
          <FilterPanel
            activeCount={activeFilterCount}
            onReset={() => {
              setStatusFilter("ALL");
              setTargetFilter("ALL");
            }}
            title="Filter Peserta"
          >
            <div className="w-full md:w-44">
              <FormField id="filter-status" label="Status Akun">
                <select
                  id="filter-status"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as "ALL" | "ACTIVE" | "INACTIVE"
                    )
                  }
                  className={inputBaseClasses}
                >
                  <option value="ALL">Semua Status</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Nonaktif</option>
                </select>
              </FormField>
            </div>

            <div className="w-full md:w-48">
              <FormField id="filter-target" label="Target Seleksi">
                <select
                  id="filter-target"
                  value={targetFilter}
                  onChange={(e) => setTargetFilter(e.target.value)}
                  className={inputBaseClasses}
                >
                  <option value="ALL">Semua Seleksi</option>
                  <option value="CPNS">CPNS</option>
                  <option value="Sekdin">Sekdin</option>
                  <option value="Polri">Polri</option>
                </select>
              </FormField>
            </div>
          </FilterPanel>
        </div>
      </div>

      {/* Data Table / Mobile Record Cards */}
      <DataTable
        data={filteredParticipants}
        keyExtractor={(row) => row.id}
        emptyTitle="Peserta Tidak Ditemukan"
        emptyDescription="Tidak ada data peserta yang sesuai dengan kata kunci atau filter yang dipilih."
        columns={[
          {
            key: "name",
            header: "Identitas Peserta",
            render: (row) => (
              <div>
                <p className="font-bold text-[#151515]">{row.full_name}</p>
                <p className="text-xs text-neutral-500">{row.email}</p>
              </div>
            ),
          },
          {
            key: "institution",
            header: "Institusi & Target",
            render: (row) => (
              <div className="text-xs">
                <p className="font-semibold text-[#151515]">
                  {row.institution || "-"}
                </p>
                <p className="text-neutral-500">
                  Target: {row.target_selection || "CPNS"}
                </p>
              </div>
            ),
          },
          {
            key: "groups",
            header: "Kelompok",
            render: (row) => {
              const uGroups = getUserGroups(row.id);
              return uGroups.length === 0 ? (
                <span className="text-xs text-neutral-400">Umum</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {uGroups.map((g) => (
                    <span
                      key={g.id}
                      className="rounded-md bg-[#eef4ff] px-2 py-0.5 text-[11px] font-semibold text-[#0b49d0]"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              );
            },
          },
          {
            key: "email_verified",
            header: "Verifikasi Email",
            render: (row) =>
              row.email_verified !== false ? (
                <StatusBadge variant="active" label="Terverifikasi" size="sm" />
              ) : (
                <StatusBadge
                  variant="warning"
                  label="Belum Verifikasi"
                  size="sm"
                />
              ),
          },
          {
            key: "status",
            header: "Status Akun",
            render: (row) =>
              row.is_active ? (
                <StatusBadge variant="active" label="Aktif" size="sm" />
              ) : (
                <StatusBadge variant="danger" label="Nonaktif" size="sm" />
              ),
          },
          {
            key: "actions",
            header: "Aksi",
            className: "text-right",
            render: (row) => (
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUser(row)}
                  leftIcon={<Eye className="h-3.5 w-3.5" />}
                >
                  Detail
                </Button>
                <Button
                  variant={row.is_active ? "danger" : "primary"}
                  size="sm"
                  onClick={() => setToggleTarget(row)}
                  leftIcon={
                    row.is_active ? (
                      <UserX className="h-3.5 w-3.5" />
                    ) : (
                      <UserCheck className="h-3.5 w-3.5" />
                    )
                  }
                >
                  {row.is_active ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </div>
            ),
          },
        ]}
        renderMobileCard={(row) => {
          const uGroups = getUserGroups(row.id);
          return (
            <MobileRecordCard
              title={row.full_name}
              subtitle={row.email}
              badge={
                row.is_active ? (
                  <StatusBadge variant="active" label="Aktif" size="sm" />
                ) : (
                  <StatusBadge variant="danger" label="Nonaktif" size="sm" />
                )
              }
              fields={[
                { label: "Target Seleksi", value: row.target_selection || "CPNS" },
                { label: "Institusi", value: row.institution || "-" },
                {
                  label: "Email",
                  value:
                    row.email_verified !== false
                      ? "Terverifikasi"
                      : "Belum Verifikasi",
                },
                {
                  label: "Kelompok",
                  value:
                    uGroups.length > 0
                      ? uGroups.map((g) => g.name).join(", ")
                      : "Umum",
                },
              ]}
              actions={
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUser(row)}
                    leftIcon={<Eye className="h-3.5 w-3.5" />}
                  >
                    Detail Peserta
                  </Button>
                  <Button
                    variant={row.is_active ? "danger" : "primary"}
                    size="sm"
                    onClick={() => setToggleTarget(row)}
                  >
                    {row.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                </>
              }
            />
          );
        }}
      />

      {/* Modal Detail Peserta (Bab 6 Rancangan UI/UX) */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-peserta-title"
        >
          <div className="my-8 w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="detail-peserta-title"
                    className="text-lg sm:text-xl font-bold text-[#151515]"
                  >
                    {selectedUser.full_name}
                  </h2>
                  {selectedUser.is_active ? (
                    <StatusBadge variant="active" label="Akun Aktif" size="sm" />
                  ) : (
                    <StatusBadge
                      variant="danger"
                      label="Akun Nonaktif"
                      size="sm"
                    />
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  ID Peserta: {selectedUser.id} • Terdaftar:{" "}
                  {formatDateTimeID(selectedUser.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100"
                aria-label="Tutup detail peserta"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Grid Informasi Peserta */}
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-xl border border-neutral-200 bg-[#fcfbf7] p-4 text-xs sm:text-sm">
              <div>
                <dt className="text-xs text-neutral-500">Alamat Email</dt>
                <dd className="font-semibold text-[#151515] mt-0.5">
                  {selectedUser.email}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Nomor Telepon</dt>
                <dd className="font-semibold text-[#151515] mt-0.5">
                  {selectedUser.phone || "Belum diisi"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Institusi / Sekolah</dt>
                <dd className="font-semibold text-[#151515] mt-0.5">
                  {selectedUser.institution || "Belum diisi"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Target Seleksi</dt>
                <dd className="font-semibold text-[#0b49d0] mt-0.5">
                  {selectedUser.target_selection || "CPNS"}
                </dd>
              </div>
              <div className="sm:col-span-2 flex items-center justify-between border-t border-neutral-200/70 pt-2.5">
                <span className="text-xs text-neutral-500">
                  Status Verifikasi Email:
                </span>
                {selectedUser.email_verified !== false ? (
                  <StatusBadge
                    variant="active"
                    label="Email Terverifikasi"
                    size="sm"
                  />
                ) : (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => handleVerifyEmailByAdmin(selectedUser)}
                    leftIcon={<MailCheck className="h-3.5 w-3.5" />}
                  >
                    Verifikasi Manual (Admin)
                  </Button>
                )}
              </div>
            </dl>

            {/* Keanggotaan Kelompok */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-[#151515] flex items-center gap-2">
                <UsersRound className="h-4 w-4 text-[#0b49d0]" />
                <span>Keanggotaan Kelompok Peserta</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {getUserGroups(selectedUser.id).map((g) => (
                  <span
                    key={g.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#0b49d0]/25 bg-[#eef4ff] px-3 py-1.5 text-xs font-bold text-[#0b49d0]"
                  >
                    <span>{g.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveUserFromGroup(selectedUser.id, g.id)
                      }
                      className="text-red-600 hover:underline ml-1"
                      title="Keluarkan dari kelompok"
                    >
                      &times;
                    </button>
                  </span>
                ))}
                {getUserGroups(selectedUser.id).length === 0 && (
                  <span className="text-xs text-neutral-500">
                    Belum bergabung ke kelompok mana pun.
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row pt-1">
                <select
                  value={selectedGroupIdToAdd}
                  onChange={(e) => setSelectedGroupIdToAdd(e.target.value)}
                  className={inputBaseClasses}
                >
                  <option value="">-- Pilih Kelompok untuk Ditambahkan --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() =>
                    handleAddUserToGroup(selectedUser.id, selectedGroupIdToAdd)
                  }
                  disabled={!selectedGroupIdToAdd}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Tambah ke Kelompok
                </Button>
              </div>
            </div>

            {/* Riwayat Ujian & Hasil */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[#151515] flex items-center gap-2">
                <History className="h-4 w-4 text-[#0b49d0]" />
                <span>Riwayat Hasil Ujian (Tetap Terjaga Saat Akun Nonaktif)</span>
              </h3>
              {results.filter((r) => r.user_id === selectedUser.id).length ===
              0 ? (
                <p className="rounded-xl border border-dashed border-neutral-200 p-3 text-xs text-neutral-500">
                  Peserta ini belum memiliki hasil ujian yang telah diselesaikan.
                </p>
              ) : (
                <div className="space-y-2">
                  {results
                    .filter((r) => r.user_id === selectedUser.id)
                    .map((res) => {
                      const run = runs.find((rn) => rn.id === res.exam_run_id);
                      return (
                        <div
                          key={res.id}
                          className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 text-xs"
                        >
                          <div>
                            <p className="font-bold text-[#151515]">
                              {run?.name || res.exam_run_id}
                            </p>
                            <p className="text-neutral-500">
                              Skor Total: {res.total_score}
                            </p>
                          </div>
                          <StatusBadge
                            variant={res.thresholds_met ? "completed" : "warning"}
                            label={
                              res.thresholds_met
                                ? "Memenuhi PG"
                                : "Belum Memenuhi PG"
                            }
                            size="sm"
                          />
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-4">
              <Button
                variant={selectedUser.is_active ? "danger" : "primary"}
                size="sm"
                onClick={() => setToggleTarget(selectedUser)}
              >
                {selectedUser.is_active
                  ? "Nonaktifkan Akun Peserta"
                  : "Aktifkan Kembali Akun"}
              </Button>
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Aktif/Nonaktif dengan Alasan Audit */}
      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onClose={() => {
          setToggleTarget(null);
          setAuditReason("");
        }}
        onConfirm={handleConfirmToggleStatus}
        variant={toggleTarget?.is_active ? "danger" : "primary"}
        title={
          toggleTarget?.is_active
            ? "Nonaktifkan Akun Peserta?"
            : "Aktifkan Kembali Akun Peserta?"
        }
        description={
          toggleTarget?.is_active
            ? `Akun ${toggleTarget.full_name} tidak akan dapat memulai ujian baru, namun seluruh riwayat ujian dan hasil lama tetap tersimpan utuh.`
            : `Akun ${toggleTarget?.full_name} akan diizinkan kembali mengakses dashboard dan mengikuti ujian sesuai hak aksesnya.`
        }
        confirmLabel={
          toggleTarget?.is_active ? "Ya, Nonaktifkan" : "Ya, Aktifkan"
        }
      >
        <FormField
          id="audit-reason-input"
          label="Alasan Tindakan (Dicatat di Audit Log)"
          required
        >
          <input
            id="audit-reason-input"
            type="text"
            value={auditReason}
            onChange={(e) => setAuditReason(e.target.value)}
            placeholder="Contoh: Masa bimbingan batch 1 telah berakhir"
            className={inputBaseClasses}
          />
        </FormField>
      </ConfirmDialog>
    </AppShell>
  );
}
