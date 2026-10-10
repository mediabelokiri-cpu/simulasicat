"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  CalendarClock,
  Settings2,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Lock,
  Globe,
  X,
  Edit3,
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
  ToastNotification,
} from "@/components/ui";
import {
  getExams,
  saveExams,
  getExamSections,
  saveExamSections,
  getScoringSnapshots,
  saveScoringSnapshots,
  getAccessGrants,
  saveAccessGrants,
  getGroups,
  getQuestions,
  appendAuditLog,
} from "@/lib/admin-store";
import { INITIAL_CATEGORIES, SKD_CPNS_2024_PRESET } from "@/lib/mock-store";
import {
  ExamAccessGrantRow,
  ExamAccessMode,
  ExamRow,
  ExamScoringSnapshotRow,
  ExamSectionRow,
  ExamStatus,
  GroupRow,
  QuestionRow,
  SectionScoringConfig,
} from "@/types/database";
import { formatDuration } from "@/lib/utils";

export default function ManajemenUjianPage() {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [sections, setSections] = useState<ExamSectionRow[]>([]);
  const [snapshots, setSnapshots] = useState<ExamScoringSnapshotRow[]>([]);
  const [grants, setGrants] = useState<ExamAccessGrantRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamRow | null>(null);

  // Form States
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("cat-cpns");
  const [institutionLabel, setInstitutionLabel] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(100);
  const [accessMode, setAccessMode] = useState<ExamAccessMode>("open");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [status, setStatus] = useState<ExamStatus>("draft");
  const [latePolicy, setLatePolicy] = useState<
    "allow_full_time" | "deduct_time" | "require_admin_approval"
  >("require_admin_approval");
  const [shufflePerSection, setShufflePerSection] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(false);

  // Publication config
  const [pubScoreImmediate, setPubScoreImmediate] = useState(true);
  const [pubExplanation, setPubExplanation] = useState(false);
  const [pubAnswerKey, setPubAnswerKey] = useState(false);
  const [pubLeaderboard, setPubLeaderboard] = useState(true);

  // Subtes & Scoring config
  const [sectionConfigs, setSectionConfigs] = useState<SectionScoringConfig[]>(
    SKD_CPNS_2024_PRESET.sections
  );

  const [toast, setToast] = useState<{
    type: "success" | "warning" | "error";
    title: string;
    desc: string;
  } | null>(null);

  useEffect(() => {
    setExams(getExams());
    setSections(getExamSections());
    setSnapshots(getScoringSnapshots());
    setGrants(getAccessGrants());
    setGroups(getGroups());
    setQuestions(getQuestions());
  }, []);

  const activeQuestionsCount = questions.filter(
    (q) => q.status === "active"
  ).length;

  const filteredExams = exams.filter((ex) => {
    const matchesSearch =
      ex.title.toLowerCase().includes(search.toLowerCase()) ||
      (ex.institution_label || "").toLowerCase().includes(search.toLowerCase());
    const matchesCat = catFilter === "ALL" || ex.category_id === catFilter;
    const matchesStatus =
      statusFilter === "ALL" || ex.status === statusFilter;
    return matchesSearch && matchesCat && matchesStatus;
  });

  function openCreateExamModal() {
    setEditingExam(null);
    setTitle("");
    setCategoryId("cat-cpns");
    setInstitutionLabel("");
    setDescription("");
    setDurationMinutes(100);
    setAccessMode("open");
    setSelectedGroupIds([]);
    setStatus("draft");
    setLatePolicy("require_admin_approval");
    setShufflePerSection(true);
    setShuffleOptions(false);
    setPubScoreImmediate(true);
    setPubExplanation(false);
    setPubAnswerKey(false);
    setPubLeaderboard(true);
    setSectionConfigs(SKD_CPNS_2024_PRESET.sections);
    setModalOpen(true);
  }

  function openEditExamModal(exam: ExamRow) {
    setEditingExam(exam);
    setTitle(exam.title);
    setCategoryId(exam.category_id);
    setInstitutionLabel(exam.institution_label || "");
    setDescription(exam.description || "");
    setDurationMinutes(exam.duration_minutes);
    setAccessMode(exam.access_mode);
    setStatus(exam.status);
    setLatePolicy(exam.settings.late_policy);
    setShufflePerSection(exam.settings.shuffle_questions_per_section);
    setShuffleOptions(exam.settings.shuffle_options);
    setPubScoreImmediate(exam.publication_config.publish_score_immediately);
    setPubExplanation(exam.publication_config.publish_explanations);
    setPubAnswerKey(exam.publication_config.publish_answer_key);
    setPubLeaderboard(exam.publication_config.show_leaderboard);

    const exGrants = grants
      .filter((g) => g.exam_id === exam.id && g.group_id)
      .map((g) => g.group_id!);
    setSelectedGroupIds(exGrants);

    const exSecs = sections
      .filter((s) => s.exam_id === exam.id)
      .sort((a, b) => a.display_order - b.display_order)
      .map((s) => s.scoring_config);
    setSectionConfigs(
      exSecs.length > 0 ? exSecs : SKD_CPNS_2024_PRESET.sections
    );
    setModalOpen(true);
  }

  function handleApplyPreset(presetType: "skd_cpns" | "polri_akademik") {
    if (presetType === "skd_cpns") {
      setDurationMinutes(100);
      setSectionConfigs(SKD_CPNS_2024_PRESET.sections);
    } else {
      setDurationMinutes(90);
      setSectionConfigs([
        {
          section_key: "PU",
          title: "Pengetahuan Umum (PU)",
          question_count: 40,
          max_score: 200,
          passing_grade: 120,
          scoring_mode: "standard",
          points_correct: 5,
          points_wrong: 0,
          points_blank: 0,
        },
        {
          section_key: "WK",
          title: "Wawasan Kebangsaan (WK)",
          question_count: 30,
          max_score: 150,
          passing_grade: 90,
          scoring_mode: "standard",
          points_correct: 5,
          points_wrong: 0,
          points_blank: 0,
        },
        {
          section_key: "NUM",
          title: "Kemampuan Numerik",
          question_count: 30,
          max_score: 150,
          passing_grade: 90,
          scoring_mode: "standard",
          points_correct: 5,
          points_wrong: 0,
          points_blank: 0,
        },
      ]);
    }
  }

  function handleUpdateSectionConfig(
    index: number,
    patch: Partial<SectionScoringConfig>
  ) {
    setSectionConfigs((prev) =>
      prev.map((sec, idx) => (idx === index ? { ...sec, ...patch } : sec))
    );
  }

  function handleSaveExam(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 5) {
      setToast({
        type: "error",
        title: "Nama Ujian Belum Lengkap",
        desc: "Masukkan nama ujian minimal 5 karakter.",
      });
      return;
    }

    // Validasi Bab 7 PRD: Cegah aktivasi ujian jika konfigurasi penting belum lengkap
    const totalQuestions = sectionConfigs.reduce(
      (sum, s) => sum + Number(s.question_count || 0),
      0
    );
    if (
      (status === "active" || status === "scheduled") &&
      (durationMinutes <= 0 || totalQuestions <= 0)
    ) {
      setToast({
        type: "error",
        title: "Gagal Mengaktifkan Ujian",
        desc: "Durasi pengerjaan dan jumlah soal per subtes wajib lebih dari 0 sebelum ujian dijadwalkan atau diaktifkan.",
      });
      return;
    }

    const now = new Date().toISOString();
    const examId = editingExam ? editingExam.id : `ex-${Date.now()}`;

    const examRecord: ExamRow = {
      id: examId,
      category_id: categoryId,
      title: title.trim(),
      description: description.trim() || null,
      institution_label:
        categoryId === "cat-sekdin" ? institutionLabel.trim() || "IPDN" : null,
      status,
      access_mode: accessMode,
      duration_minutes: Number(durationMinutes),
      settings: {
        shuffle_questions_per_section: shufflePerSection,
        shuffle_options: shuffleOptions,
        late_policy: latePolicy,
        late_grace_minutes: 15,
        allow_retake: false,
        max_attempts: 1,
        require_verified_email: true,
      },
      publication_config: {
        publish_score_immediately: pubScoreImmediate,
        publish_explanations: pubExplanation,
        publish_answer_key: pubAnswerKey,
        show_leaderboard: pubLeaderboard,
        allow_provisional_admin_score: true,
      },
      created_by: "usr-admin-01",
      created_at: editingExam ? editingExam.created_at : now,
      updated_at: now,
    };

    const nextExams = editingExam
      ? exams.map((ex) => (ex.id === examId ? examRecord : ex))
      : [examRecord, ...exams];
    saveExams(nextExams);
    setExams(nextExams);

    // Simpan EXAM_SECTIONS
    const otherSections = sections.filter((s) => s.exam_id !== examId);
    const newSections: ExamSectionRow[] = sectionConfigs.map((sc, idx) => ({
      id: `sec-${examId}-${sc.section_key}`,
      exam_id: examId,
      section_key: sc.section_key,
      title: sc.title,
      display_order: idx + 1,
      question_count: Number(sc.question_count),
      shuffle_questions: shufflePerSection,
      scoring_config: sc,
    }));
    const nextSections = [...otherSections, ...newSections];
    saveExamSections(nextSections);
    setSections(nextSections);

    // Buat Snapshot Penilaian Baru (EXAM_SCORING_SNAPSHOTS) untuk menjaga konsistensi historis
    const existingSnaps = snapshots.filter((s) => s.exam_id === examId);
    const nextVersion = existingSnaps.length + 1;
    const newSnap: ExamScoringSnapshotRow = {
      id: `snap-${examId}-v${nextVersion}`,
      exam_id: examId,
      version_no: nextVersion,
      scoring_config: {
        preset_name: `${title.trim()} (v${nextVersion})`,
        sections: sectionConfigs,
        total_max_score: sectionConfigs.reduce(
          (sum, s) => sum + Number(s.max_score || 0),
          0
        ),
        total_passing_grade: null,
        require_all_section_thresholds: true,
      },
      created_by: "usr-admin-01",
      created_at: now,
    };
    const nextSnapshots = [newSnap, ...snapshots];
    saveScoringSnapshots(nextSnapshots);
    setSnapshots(nextSnapshots);

    // Simpan EXAM_ACCESS_GRANTS untuk mode Restricted
    const otherGrants = grants.filter((g) => g.exam_id !== examId);
    const newGrants: ExamAccessGrantRow[] =
      accessMode === "restricted"
        ? selectedGroupIds.map((gid) => ({
            id: `grant-${examId}-${gid}`,
            exam_id: examId,
            user_id: null,
            group_id: gid,
            granted_by: "usr-admin-01",
            created_at: now,
          }))
        : [];
    const nextGrants = [...otherGrants, ...newGrants];
    saveAccessGrants(nextGrants);
    setGrants(nextGrants);

    appendAuditLog({
      action: editingExam ? "UPDATE_EXAM_CONFIG" : "CREATE_EXAM",
      entity_type: "exams",
      entity_id: examId,
      reason: `Penyimpanan konfigurasi ujian & snapshot penilaian v${nextVersion}`,
      details: {
        title: examRecord.title,
        status: examRecord.status,
        access_mode: examRecord.access_mode,
        snapshot_version: nextVersion,
      },
    });

    setModalOpen(false);
    setToast({
      type: "success",
      title: editingExam
        ? "Konfigurasi Ujian & Snapshot Diperbarui"
        : "Ujian Baru Berhasil Dibuat",
      desc: `Ujian "${examRecord.title}" telah disimpan dengan Snapshot Penilaian v${nextVersion}.`,
    });
  }

  function renderExamStatus(st: ExamStatus) {
    switch (st) {
      case "active":
        return <StatusBadge variant="ongoing" label="Aktif" size="sm" />;
      case "scheduled":
        return <StatusBadge variant="scheduled" label="Terjadwal" size="sm" />;
      case "completed":
        return <StatusBadge variant="completed" label="Selesai" size="sm" />;
      case "cancelled":
        return <StatusBadge variant="danger" label="Dibatalkan" size="sm" />;
      default:
        return <StatusBadge variant="draft" label="Draft" size="sm" />;
    }
  }

  return (
    <AppShell
      role="admin"
      userName="Admin Prima RIB"
      userSubtitle="Manajemen Ujian"
    >
      <PageHeader
        title="Manajemen Ujian & Konfigurasi Penilaian"
        description="Atur definisi ujian, blok subtes (TWK, TIU, TKP), preset penilaian, ambang batas (passing grade), mode akses, serta kebijakan publikasi hasil."
        badge={
          <StatusBadge
            variant="featured"
            label={`${activeQuestionsCount} Soal Aktif Siap Pakai`}
          />
        }
        actions={
          <div className="flex flex-wrap gap-2.5">
            <Link href="/admin/jadwal-sesi">
              <Button
                variant="outline"
                leftIcon={<CalendarClock className="h-4 w-4" />}
              >
                Jadwal &amp; Sesi (`exam_runs`)
              </Button>
            </Link>
            <Button
              variant="primary"
              onClick={openCreateExamModal}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Buat Ujian Baru
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

      {/* Search & Filter */}
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
        <div className="md:col-span-5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari nama ujian atau instansi Sekdin..."
          />
        </div>
        <div className="md:col-span-7">
          <FilterPanel
            activeCount={
              (catFilter !== "ALL" ? 1 : 0) + (statusFilter !== "ALL" ? 1 : 0)
            }
            onReset={() => {
              setCatFilter("ALL");
              setStatusFilter("ALL");
            }}
            title="Filter Ujian"
          >
            <div className="w-full md:w-48">
              <FormField id="ex-cat" label="Kategori">
                <select
                  id="ex-cat"
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  className={inputBaseClasses}
                >
                  <option value="ALL">Semua Kategori</option>
                  {INITIAL_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <div className="w-full md:w-44">
              <FormField id="ex-stat" label="Status Ujian">
                <select
                  id="ex-stat"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={inputBaseClasses}
                >
                  <option value="ALL">Semua Status</option>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Terjadwal</option>
                  <option value="active">Aktif</option>
                  <option value="completed">Selesai</option>
                </select>
              </FormField>
            </div>
          </FilterPanel>
        </div>
      </div>

      <DataTable
        data={filteredExams}
        keyExtractor={(row) => row.id}
        columns={[
          {
            key: "title",
            header: "Definisi Ujian",
            render: (row) => (
              <div className="space-y-1">
                <p className="font-bold text-[#151515]">{row.title}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span className="rounded bg-[#eef4ff] px-2 py-0.5 font-bold text-[#0b49d0]">
                    {INITIAL_CATEGORIES.find((c) => c.id === row.category_id)
                      ?.name || row.category_id}
                  </span>
                  {row.institution_label && (
                    <span>• Instansi: {row.institution_label}</span>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "sections",
            header: "Blok Subtes & Passing Grade",
            render: (row) => {
              const exSecs = sections.filter((s) => s.exam_id === row.id);
              const secsToShow =
                exSecs.length > 0
                  ? exSecs.map((s) => s.scoring_config)
                  : SKD_CPNS_2024_PRESET.sections;
              return (
                <div className="flex flex-wrap gap-1.5">
                  {secsToShow.map((sc) => (
                    <span
                      key={sc.section_key}
                      className="rounded-lg border border-neutral-200 bg-[#fcfbf7] px-2 py-1 text-xs font-semibold text-[#151515] tabular-nums"
                    >
                      {sc.section_key}: {sc.question_count} Soal (PG{" "}
                      {sc.passing_grade})
                    </span>
                  ))}
                </div>
              );
            },
          },
          {
            key: "duration",
            header: "Durasi & Akses",
            render: (row) => (
              <div className="space-y-1 text-xs">
                <p className="font-bold text-[#151515] tabular-nums">
                  {formatDuration(row.duration_minutes)}
                </p>
                <span className="inline-flex items-center gap-1 text-neutral-600">
                  {row.access_mode === "open" ? (
                    <>
                      <Globe className="h-3.5 w-3.5 text-emerald-600" /> Terbuka
                      (Open)
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5 text-amber-600" /> Terbatas
                      (Restricted)
                    </>
                  )}
                </span>
              </div>
            ),
          },
          {
            key: "publication",
            header: "Publikasi Hasil",
            render: (row) => (
              <div className="space-y-1 text-xs text-neutral-600">
                <div>
                  Nilai:{" "}
                  <strong>
                    {row.publication_config.publish_score_immediately
                      ? "Langsung"
                      : "Ditunda"}
                  </strong>
                </div>
                <div>
                  Pembahasan:{" "}
                  <strong>
                    {row.publication_config.publish_explanations
                      ? "Dibuka"
                      : "Terkunci"}
                  </strong>
                </div>
              </div>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (row) => renderExamStatus(row.status),
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
                  onClick={() => openEditExamModal(row)}
                  leftIcon={<Settings2 className="h-3.5 w-3.5" />}
                >
                  Konfigurasi
                </Button>
              </div>
            ),
          },
        ]}
        renderMobileCard={(row) => (
          <MobileRecordCard
            title={row.title}
            subtitle={
              INITIAL_CATEGORIES.find((c) => c.id === row.category_id)?.name
            }
            badge={renderExamStatus(row.status)}
            fields={[
              {
                label: "Durasi",
                value: formatDuration(row.duration_minutes),
              },
              {
                label: "Mode Akses",
                value:
                  row.access_mode === "open"
                    ? "Terbuka (Open)"
                    : "Terbatas (Restricted)",
              },
              {
                label: "Publikasi Skor",
                value: row.publication_config.publish_score_immediately
                  ? "Langsung"
                  : "Ditunda",
              },
              {
                label: "Pembahasan",
                value: row.publication_config.publish_explanations
                  ? "Dibuka"
                  : "Terkunci",
              },
            ]}
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditExamModal(row)}
                leftIcon={<Edit3 className="h-3.5 w-3.5" />}
              >
                Konfigurasi Ujian &amp; Penilaian
              </Button>
            }
          />
        )}
      />

      {/* Modal Pembuatan / Konfigurasi Ujian & Penilaian */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveExam}
            className="my-8 w-full max-w-4xl rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7 shadow-xl space-y-6 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#151515]">
                  {editingExam
                    ? `Konfigurasi Ujian: ${editingExam.title}`
                    : "Buat Definisi Ujian Baru"}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Perubahan pada aturan penilaian otomatis membuat versi baru di{" "}
                  <code>exam_scoring_snapshots</code> tanpa mengubah hasil lama.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 1. Identitas Ujian */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                id="ex-title"
                label="Nama Ujian"
                required
                className="sm:col-span-2"
              >
                <input
                  id="ex-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Tryout SKD CPNS Prima RIB Batch 2"
                  className={inputBaseClasses}
                />
              </FormField>

              <FormField id="ex-status-field" label="Status Ujian" required>
                <select
                  id="ex-status-field"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ExamStatus)}
                  className={inputBaseClasses}
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Terjadwal</option>
                  <option value="active">Aktif</option>
                  <option value="completed">Selesai</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </FormField>

              <FormField id="ex-cat-field" label="Kategori Seleksi" required>
                <select
                  id="ex-cat-field"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={inputBaseClasses}
                >
                  {INITIAL_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FormField>

              {categoryId === "cat-sekdin" && (
                <FormField id="ex-inst-field" label="Instansi Sekdin">
                  <select
                    id="ex-inst-field"
                    value={institutionLabel}
                    onChange={(e) => setInstitutionLabel(e.target.value)}
                    className={inputBaseClasses}
                  >
                    <option value="IPDN">IPDN</option>
                    <option value="PKN STAN">PKN STAN</option>
                    <option value="STIS">Politeknik STIS</option>
                    <option value="STMKG">STMKG</option>
                  </select>
                </FormField>
              )}

              <FormField id="ex-duration" label="Durasi (Menit)" required>
                <input
                  id="ex-duration"
                  type="number"
                  min={10}
                  max={300}
                  required
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className={`${inputBaseClasses} tabular-nums`}
                />
              </FormField>

              <FormField
                id="ex-desc"
                label="Deskripsi Ujian"
                className="sm:col-span-3"
              >
                <textarea
                  id="ex-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informasi cakupan materi dan instruksi ujian..."
                  className={inputBaseClasses}
                />
              </FormField>
            </div>

            {/* 2. Preset & Konfigurasi Subtes / Passing Grade */}
            <div className="rounded-2xl border border-neutral-200 bg-[#fcfbf7] p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#151515]">
                    Blok Subtes, Jumlah Soal &amp; Passing Grade (`exam_sections`)
                  </h3>
                  <p className="text-xs text-neutral-600">
                    Pengacakan soal hanya dilakukan di dalam batas blok subtes
                    masing-masing.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    onClick={() => handleApplyPreset("skd_cpns")}
                    leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                  >
                    Preset SKD CPNS 2024 (110 Soal)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyPreset("polri_akademik")}
                  >
                    Preset Simulasi Polri (100 Soal)
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {sectionConfigs.map((sec, idx) => (
                  <div
                    key={sec.section_key}
                    className="rounded-xl border border-neutral-200 bg-white p-3.5 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-[#0b49d0] px-2 py-0.5 font-bold text-white">
                        Blok #{idx + 1}: {sec.section_key}
                      </span>
                      <span className="font-semibold text-neutral-500">
                        {sec.scoring_mode === "tkp"
                          ? "Bobot TKP 1–5"
                          : `Benar +${sec.points_correct || 5}`}
                      </span>
                    </div>
                    <p className="font-bold text-[#151515]">{sec.title}</p>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-neutral-500">
                          Jumlah Soal
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={sec.question_count}
                          onChange={(e) => {
                            const count = Number(e.target.value);
                            handleUpdateSectionConfig(idx, {
                              question_count: count,
                              max_score: count * 5,
                            });
                          }}
                          className="mt-0.5 w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 font-bold tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-neutral-500">
                          Passing Grade
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={sec.passing_grade}
                          onChange={(e) =>
                            handleUpdateSectionConfig(idx, {
                              passing_grade: Number(e.target.value),
                            })
                          }
                          className="mt-0.5 w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 font-bold tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Kebijakan Akses, Keterlambatan, Pengacakan & Publikasi */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 p-4 space-y-3">
                <h3 className="text-sm font-bold text-[#151515]">
                  Kebijakan Akses &amp; Keterlambatan
                </h3>
                <FormField id="ex-access-mode" label="Mode Akses Ujian">
                  <select
                    id="ex-access-mode"
                    value={accessMode}
                    onChange={(e) =>
                      setAccessMode(e.target.value as ExamAccessMode)
                    }
                    className={inputBaseClasses}
                  >
                    <option value="open">
                      Ujian Terbuka (Semua Peserta Aktif &amp; Terverifikasi)
                    </option>
                    <option value="restricted">
                      Ujian Terbatas (Hanya Kelompok / Sesi Ditugaskan)
                    </option>
                  </select>
                </FormField>

                {accessMode === "restricted" && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[#151515]">
                      Pilih Kelompok yang Diberi Akses (`exam_access_grants`):
                    </p>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto rounded-lg border border-neutral-200 bg-[#fcfbf7] p-2.5">
                      {groups.map((g) => (
                        <label
                          key={g.id}
                          className="flex items-center gap-2 text-xs cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedGroupIds.includes(g.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGroupIds((prev) => [...prev, g.id]);
                              } else {
                                setSelectedGroupIds((prev) =>
                                  prev.filter((id) => id !== g.id)
                                );
                              }
                            }}
                            className="h-4 w-4 accent-[#0b49d0]"
                          />
                          <span className="font-medium text-[#151515]">
                            {g.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <FormField id="ex-late-policy" label="Aturan Peserta Terlambat">
                  <select
                    id="ex-late-policy"
                    value={latePolicy}
                    onChange={(e) =>
                      setLatePolicy(
                        e.target.value as
                          | "allow_full_time"
                          | "deduct_time"
                          | "require_admin_approval"
                      )
                    }
                    className={inputBaseClasses}
                  >
                    <option value="require_admin_approval">
                      Wajib Izin Khusus Admin (Tercatat di Audit Log)
                    </option>
                    <option value="deduct_time">
                      Izinkan Masuk (Sisa Waktu Mengikuti Batas Sesi)
                    </option>
                    <option value="allow_full_time">
                      Izinkan Masuk dengan Durasi Penuh
                    </option>
                  </select>
                </FormField>
              </div>

              <div className="rounded-xl border border-neutral-200 p-4 space-y-3">
                <h3 className="text-sm font-bold text-[#151515]">
                  Pengacakan &amp; Publikasi Hasil (`publication_config`)
                </h3>
                <div className="space-y-2.5 text-xs sm:text-sm">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shufflePerSection}
                      onChange={(e) => setShufflePerSection(e.target.checked)}
                      className="h-4 w-4 accent-[#0b49d0]"
                    />
                    <span>
                      Acak urutan soal di dalam setiap blok subtes (TWK/TIU/TKP)
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={(e) => setShuffleOptions(e.target.checked)}
                      className="h-4 w-4 accent-[#0b49d0]"
                    />
                    <span>Acak urutan opsi jawaban A–E</span>
                  </label>
                  <hr className="border-neutral-200" />
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pubScoreImmediate}
                      onChange={(e) => setPubScoreImmediate(e.target.checked)}
                      className="h-4 w-4 accent-[#0b49d0]"
                    />
                    <span>Publikasikan nilai langsung setelah submit</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pubExplanation}
                      onChange={(e) => setPubExplanation(e.target.checked)}
                      className="h-4 w-4 accent-[#0b49d0]"
                    />
                    <span>Buka akses pembahasan soal kepada peserta</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pubAnswerKey}
                      onChange={(e) => setPubAnswerKey(e.target.checked)}
                      className="h-4 w-4 accent-[#0b49d0]"
                    />
                    <span>Buka kunci jawaban &amp; bobot TKP setelah selesai</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pubLeaderboard}
                      onChange={(e) => setPubLeaderboard(e.target.checked)}
                      className="h-4 w-4 accent-[#0b49d0]"
                    />
                    <span>Tampilkan peringkat resmi (Leaderboard)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-neutral-100 pt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                Simpan Ujian &amp; Buat Snapshot Penilaian
              </Button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
