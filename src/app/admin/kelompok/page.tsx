"use client";

import React, { useEffect, useState } from "react";
import {
  UsersRound,
  Plus,
  Edit3,
  UserPlus,
  Trash2,
  ClipboardList,
  X,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  StatusBadge,
  Button,
  FormField,
  inputBaseClasses,
  ToastNotification,
} from "@/components/ui";
import { getStoredProfiles, syncProfilesFromSupabase } from "@/lib/auth";
import {
  getGroups,
  saveGroups,
  getGroupMembers,
  saveGroupMembers,
  getAccessGrants,
  getRunAssignments,
  getExams,
  getExamRuns,
  appendAuditLog,
  syncAdminStoreFromSupabase,
} from "@/lib/admin-store";
import {
  GroupRow,
  GroupMemberRow,
  ProfileRow,
  ExamAccessGrantRow,
  ExamRunAssignmentRow,
  ExamRow,
  ExamRunRow,
} from "@/types/database";

export default function ManajemenKelompokPage() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [members, setMembers] = useState<GroupMemberRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [grants, setGrants] = useState<ExamAccessGrantRow[]>([]);
  const [assignments, setAssignments] = useState<ExamRunAssignmentRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [runs, setRuns] = useState<ExamRunRow[]>([]);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupRow | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");

  const [activeGroupForMembers, setActiveGroupForMembers] =
    useState<GroupRow | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");

  const [toast, setToast] = useState<{
    type: "success" | "warning" | "error";
    title: string;
    desc: string;
  } | null>(null);

  useEffect(() => {
    const refreshFromLocal = () => {
      setGroups(getGroups());
      setMembers(getGroupMembers());
      setProfiles(getStoredProfiles().filter((p) => p.role === "user"));
      setGrants(getAccessGrants());
      setAssignments(getRunAssignments());
      setExams(getExams());
      setRuns(getExamRuns());
    };
    refreshFromLocal();

    void Promise.all([
      syncAdminStoreFromSupabase(),
      syncProfilesFromSupabase(),
    ]).then(([, synced]) => {
      refreshFromLocal();
      setProfiles(synced.filter((p) => p.role === "user"));
    });
  }, []);

  function openCreateModal() {
    setEditingGroup(null);
    setGroupName("");
    setGroupDesc("");
    setShowFormModal(true);
  }

  function openEditModal(group: GroupRow) {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupDesc(group.description || "");
    setShowFormModal(true);
  }

  function handleSaveGroup(e: React.FormEvent) {
    e.preventDefault();
    if (groupName.trim().length < 3) {
      setToast({
        type: "error",
        title: "Nama Kelompok Terlalu Pendek",
        desc: "Masukkan nama kelompok minimal 3 karakter.",
      });
      return;
    }

    if (editingGroup) {
      const updated = groups.map((g) =>
        g.id === editingGroup.id
          ? {
              ...g,
              name: groupName.trim(),
              description: groupDesc.trim() || null,
            }
          : g
      );
      saveGroups(updated);
      setGroups(updated);
      appendAuditLog({
        action: "UPDATE_GROUP",
        entity_type: "groups",
        entity_id: editingGroup.id,
        reason: "Perubahan identitas kelompok peserta",
        details: { name: groupName.trim() },
      });
      setToast({
        type: "success",
        title: "Kelompok Diperbarui",
        desc: `Kelompok "${groupName.trim()}" berhasil disimpan.`,
      });
    } else {
      const newGroup: GroupRow = {
        id: `grp-${Date.now()}`,
        name: groupName.trim(),
        description: groupDesc.trim() || null,
        is_active: true,
        created_by: "usr-admin-01",
        created_at: new Date().toISOString(),
      };
      const updated = [newGroup, ...groups];
      saveGroups(updated);
      setGroups(updated);
      appendAuditLog({
        action: "CREATE_GROUP",
        entity_type: "groups",
        entity_id: newGroup.id,
        reason: "Pembuatan kelompok peserta baru",
        details: { name: newGroup.name },
      });
      setToast({
        type: "success",
        title: "Kelompok Baru Dibuat",
        desc: `Kelompok "${newGroup.name}" siap menerima anggota dan penugasan ujian.`,
      });
    }

    setShowFormModal(false);
  }

  function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!activeGroupForMembers || !selectedUserId) return;

    if (
      members.some(
        (m) =>
          m.group_id === activeGroupForMembers.id &&
          m.user_id === selectedUserId
      )
    ) {
      setToast({
        type: "warning",
        title: "Sudah Terdaftar",
        desc: "Peserta tersebut sudah menjadi anggota kelompok ini.",
      });
      return;
    }

    const newMember: GroupMemberRow = {
      id: `gm-${Date.now()}`,
      group_id: activeGroupForMembers.id,
      user_id: selectedUserId,
      joined_at: new Date().toISOString(),
    };
    const next = [...members, newMember];
    saveGroupMembers(next);
    setMembers(next);
    setSelectedUserId("");

    appendAuditLog({
      action: "ADD_GROUP_MEMBER",
      entity_type: "group_members",
      entity_id: newMember.id,
      reason: `Menambahkan peserta ke ${activeGroupForMembers.name}`,
      details: { group_id: activeGroupForMembers.id, user_id: selectedUserId },
    });
  }

  function handleRemoveMember(memberRowId: string) {
    const next = members.filter((m) => m.id !== memberRowId);
    saveGroupMembers(next);
    setMembers(next);
    appendAuditLog({
      action: "REMOVE_GROUP_MEMBER",
      entity_type: "group_members",
      entity_id: memberRowId,
      reason: "Mengeluarkan anggota dari kelompok",
    });
  }

  return (
    <AppShell
      role="admin"
      userName="Admin Prima RIB"
      userSubtitle="Manajemen Kelompok"
    >
      <PageHeader
        title="Manajemen Kelompok Peserta"
        description="Buat dan kelola kelompok belajar (Kelas CPNS, Sekdin, Polri, atau Sekolah Mitra) untuk mempermudah distribusi akses ujian dan penugasan sesi."
        badge={
          <StatusBadge
            variant="featured"
            label={`${groups.length} Kelompok Aktif`}
          />
        }
        actions={
          <Button
            variant="primary"
            onClick={openCreateModal}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Buat Kelompok Baru
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

      {/* Grid Kartu Kelompok */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((grp) => {
          const grpMembers = members.filter((m) => m.group_id === grp.id);
          const grpGrants = grants.filter((g) => g.group_id === grp.id);
          const grpAssigns = assignments.filter((a) => a.group_id === grp.id);

          return (
            <div
              key={grp.id}
              className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef4ff] text-[#0b49d0]">
                      <UsersRound className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#151515]">
                        {grp.name}
                      </h2>
                      <p className="text-xs text-neutral-500 tabular-nums">
                        {grpMembers.length} Anggota Terdaftar
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    variant={grp.is_active ? "active" : "archived"}
                    label={grp.is_active ? "Aktif" : "Arsip"}
                    size="sm"
                  />
                </div>

                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  {grp.description || "Tidak ada deskripsi tambahan."}
                </p>

                {/* Riwayat Penugasan Ujian / Sesi */}
                <div className="rounded-xl border border-neutral-100 bg-[#fcfbf7] p-3 text-xs space-y-1.5">
                  <p className="font-bold text-[#151515] flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5 text-[#0b49d0]" />
                    <span>Distribusi Akses &amp; Sesi:</span>
                  </p>
                  {grpGrants.length === 0 && grpAssigns.length === 0 ? (
                    <p className="text-neutral-500">
                      Belum ada penugasan ujian khusus.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-neutral-700">
                      {grpGrants.map((gr) => {
                        const ex = exams.find((e) => e.id === gr.exam_id);
                        return (
                          <li key={gr.id} className="truncate">
                            • Akses Ujian: <strong>{ex?.title || gr.exam_id}</strong>
                          </li>
                        );
                      })}
                      {grpAssigns.map((asg) => {
                        const rn = runs.find((r) => r.id === asg.exam_run_id);
                        return (
                          <li key={asg.id} className="truncate">
                            • Sesi: <strong>{rn?.name || asg.exam_run_id}</strong>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(grp)}
                  leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                >
                  Ubah Nama
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveGroupForMembers(grp)}
                  leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                >
                  Kelola Anggota ({grpMembers.length})
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Tambah / Edit Kelompok */}
      {showFormModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveGroup}
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold text-[#151515]">
                {editingGroup ? "Ubah Kelompok Peserta" : "Buat Kelompok Baru"}
              </h2>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <FormField id="grp-name" label="Nama Kelompok / Kelas" required>
              <input
                id="grp-name"
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Contoh: Kelas SKD CPNS Batch 2"
                className={inputBaseClasses}
              />
            </FormField>

            <FormField id="grp-desc" label="Deskripsi Kelompok">
              <textarea
                id="grp-desc"
                rows={3}
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                placeholder="Keterangan angkatan, sekolah mitra, atau fokus seleksi..."
                className={inputBaseClasses}
              />
            </FormField>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowFormModal(false)}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary">
                Simpan Kelompok
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Kelola Anggota Kelompok */}
      {activeGroupForMembers && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="my-8 w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-[#151515]">
                  Anggota Kelompok: {activeGroupForMembers.name}
                </h2>
                <p className="text-xs text-neutral-500">
                  Tambah atau keluarkan peserta dari kelompok ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveGroupForMembers(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleAddMember}
              className="flex flex-col gap-2.5 sm:flex-row"
            >
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className={inputBaseClasses}
              >
                <option value="">-- Pilih Peserta untuk Ditambahkan --</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.email})
                  </option>
                ))}
              </select>
              <Button
                type="submit"
                variant="primary"
                disabled={!selectedUserId}
                leftIcon={<UserPlus className="h-4 w-4" />}
              >
                Tambah
              </Button>
            </form>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {members
                .filter((m) => m.group_id === activeGroupForMembers.id)
                .map((m) => {
                  const p = profiles.find((usr) => usr.id === m.user_id);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-xl border border-neutral-200 bg-[#fcfbf7] p-3 text-xs sm:text-sm"
                    >
                      <div>
                        <p className="font-bold text-[#151515]">
                          {p?.full_name || m.user_id}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {p?.email || "-"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(m.id)}
                        leftIcon={<Trash2 className="h-4 w-4 text-red-600" />}
                      >
                        Keluarkan
                      </Button>
                    </div>
                  );
                })}
              {members.filter((m) => m.group_id === activeGroupForMembers.id)
                .length === 0 && (
                <p className="text-center text-xs text-neutral-500 py-4">
                  Belum ada anggota di kelompok ini.
                </p>
              )}
            </div>

            <div className="flex justify-end border-t border-neutral-100 pt-3">
              <Button
                variant="outline"
                onClick={() => setActiveGroupForMembers(null)}
              >
                Selesai
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
