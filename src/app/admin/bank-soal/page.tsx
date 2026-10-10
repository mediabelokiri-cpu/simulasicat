"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Upload,
  Eye,
  Edit3,
  CheckCircle2,
  Archive,
  X,
  Image as ImageIcon,
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
  getQuestions,
  saveQuestions,
  appendAuditLog,
} from "@/lib/admin-store";
import { INITIAL_CATEGORIES } from "@/lib/mock-store";
import { QuestionRow, QuestionStatus } from "@/types/database";
import { formatDateTimeID } from "@/lib/utils";

export default function BankSoalPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [subtestFilter, setSubtestFilter] = useState("ALL");
  const [institutionFilter, setInstitutionFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [previewQuestion, setPreviewQuestion] = useState<QuestionRow | null>(
    null
  );
  const [toast, setToast] = useState<{
    type: "success" | "warning" | "info";
    title: string;
    desc: string;
  } | null>(null);

  useEffect(() => {
    setQuestions(getQuestions());
  }, []);

  const subtests = Array.from(
    new Set(questions.map((q) => q.subtest_key))
  ).filter(Boolean);

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      (q.question_code || q.id).toLowerCase().includes(search.toLowerCase()) ||
      q.prompt.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "ALL" || q.category_id === categoryFilter;
    const matchesSubtest =
      subtestFilter === "ALL" || q.subtest_key === subtestFilter;
    const matchesInst =
      institutionFilter === "ALL" ||
      (q.institution_label || "").toLowerCase() ===
        institutionFilter.toLowerCase();
    const matchesStatus =
      statusFilter === "ALL" || q.status === statusFilter;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesSubtest &&
      matchesInst &&
      matchesStatus
    );
  });

  function getCategoryName(catId: string): string {
    return (
      INITIAL_CATEGORIES.find((c) => c.id === catId)?.name ||
      catId.replace("cat-", "").toUpperCase()
    );
  }

  function renderStatusBadge(status: QuestionStatus) {
    switch (status) {
      case "active":
        return <StatusBadge variant="active" label="Aktif" size="sm" />;
      case "ready_for_review":
        return <StatusBadge variant="review" label="Siap Ditinjau" size="sm" />;
      case "draft":
        return <StatusBadge variant="draft" label="Draft" size="sm" />;
      case "archived":
        return <StatusBadge variant="archived" label="Arsip" size="sm" />;
    }
  }

  function handleChangeQuestionStatus(
    question: QuestionRow,
    newStatus: QuestionStatus
  ) {
    const now = new Date().toISOString();
    const updated = questions.map((q) =>
      q.id === question.id
        ? {
            ...q,
            status: newStatus,
            reviewed_by: newStatus === "active" ? "usr-admin-01" : q.reviewed_by,
            reviewed_at: newStatus === "active" ? now : q.reviewed_at,
            updated_at: now,
          }
        : q
    );

    saveQuestions(updated);
    setQuestions(updated);
    if (previewQuestion?.id === question.id) {
      setPreviewQuestion(
        updated.find((q) => q.id === question.id) || null
      );
    }

    appendAuditLog({
      action:
        newStatus === "active"
          ? "APPROVE_AND_ACTIVATE_QUESTION"
          : `SET_QUESTION_STATUS_${newStatus.toUpperCase()}`,
      entity_type: "questions",
      entity_id: question.id,
      reason: `Perubahan status soal ${question.question_code || question.id} menjadi ${newStatus}`,
      details: {
        question_code: question.question_code,
        previous_status: question.status,
        new_status: newStatus,
      },
    });

    setToast({
      type: newStatus === "active" ? "success" : "info",
      title:
        newStatus === "active"
          ? "Soal Telah Ditinjau & Diaktifkan"
          : "Status Soal Diperbarui",
      desc: `Soal ${
        question.question_code || question.id
      } kini berstatus "${newStatus}" dan dapat dipilih untuk ujian jika Aktif.`,
    });
  }

  const activeFilterCount =
    (categoryFilter !== "ALL" ? 1 : 0) +
    (subtestFilter !== "ALL" ? 1 : 0) +
    (institutionFilter !== "ALL" ? 1 : 0) +
    (statusFilter !== "ALL" ? 1 : 0);

  return (
    <AppShell
      role="admin"
      userName="Admin Prima RIB"
      userSubtitle="Manajemen Bank Soal"
    >
      <PageHeader
        title="Manajemen Bank Soal"
        description="Kelola bank soal CPNS, Sekolah Kedinasan (Sekdin), dan Polri. Soal baru hasil input maupun impor wajib melalui peninjauan Admin sebelum berstatus Aktif."
        badge={
          <StatusBadge
            variant="featured"
            label={`${questions.length} Total Soal`}
          />
        }
        actions={
          <div className="flex flex-wrap gap-2.5">
            <Link href="/admin/bank-soal/import">
              <Button
                variant="outline"
                leftIcon={<Upload className="h-4 w-4" />}
              >
                Impor Massal (Excel/ZIP)
              </Button>
            </Link>
            <Link href="/admin/bank-soal/tambah">
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Tambah Soal Manual
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

      {/* Search & Multi-Filter Bar (Bab 8 UI/UX) */}
      <div className="mb-6 space-y-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cari kode soal (mis. TWK001, TIU001) atau kata kunci pertanyaan..."
        />

        <FilterPanel
          activeCount={activeFilterCount}
          onReset={() => {
            setCategoryFilter("ALL");
            setSubtestFilter("ALL");
            setInstitutionFilter("ALL");
            setStatusFilter("ALL");
          }}
          title="Filter Bank Soal"
        >
          <div className="w-full md:w-48">
            <FormField id="f-cat" label="Kategori">
              <select
                id="f-cat"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
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

          <div className="w-full md:w-40">
            <FormField id="f-subtest" label="Subtes">
              <select
                id="f-subtest"
                value={subtestFilter}
                onChange={(e) => setSubtestFilter(e.target.value)}
                className={inputBaseClasses}
              >
                <option value="ALL">Semua Subtes</option>
                {subtests.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="w-full md:w-44">
            <FormField id="f-inst" label="Institusi Sekdin">
              <select
                id="f-inst"
                value={institutionFilter}
                onChange={(e) => setInstitutionFilter(e.target.value)}
                className={inputBaseClasses}
              >
                <option value="ALL">Semua Institusi</option>
                <option value="IPDN">IPDN</option>
                <option value="PKN STAN">PKN STAN</option>
                <option value="STIS">Politeknik STIS</option>
                <option value="STMKG">STMKG</option>
              </select>
            </FormField>
          </div>

          <div className="w-full md:w-44">
            <FormField id="f-status" label="Status Soal">
              <select
                id="f-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={inputBaseClasses}
              >
                <option value="ALL">Semua Status</option>
                <option value="draft">Draft</option>
                <option value="ready_for_review">Siap Ditinjau</option>
                <option value="active">Aktif</option>
                <option value="archived">Arsip</option>
              </select>
            </FormField>
          </div>
        </FilterPanel>
      </div>

      {/* Tabel Bank Soal */}
      <DataTable
        data={filteredQuestions}
        keyExtractor={(row) => row.id}
        emptyTitle="Soal Tidak Ditemukan"
        emptyDescription="Belum ada butir soal yang cocok dengan filter yang Anda terapkan."
        columns={[
          {
            key: "code",
            header: "ID Soal",
            className: "w-28 font-mono text-xs font-bold text-[#0b49d0]",
            render: (row) => row.question_code || row.id,
          },
          {
            key: "category",
            header: "Kategori & Subtes",
            render: (row) => (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-md bg-[#eef4ff] px-2 py-0.5 text-xs font-bold text-[#0b49d0]">
                    {row.subtest_key}
                  </span>
                  <span className="text-xs font-semibold text-[#151515]">
                    {getCategoryName(row.category_id)}
                  </span>
                </div>
                {row.institution_label && (
                  <p className="text-[11px] text-neutral-500">
                    Instansi: {row.institution_label}
                  </p>
                )}
              </div>
            ),
          },
          {
            key: "prompt",
            header: "Cuplikan Pertanyaan",
            render: (row) => {
              const hasOptionImg = row.options.some((o) => Boolean(o.asset_url));
              return (
                <div className="max-w-md space-y-1">
                  <p className="text-xs sm:text-sm text-[#151515] line-clamp-2">
                    {row.prompt}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                    <span>
                      Tipe:{" "}
                      {row.question_type === "tkp"
                        ? "Bobot TKP (1–5)"
                        : `Pilihan Ganda (Kunci: ${row.correct_option})`}
                    </span>
                    {hasOptionImg && (
                      <span className="inline-flex items-center gap-1 text-[#0b49d0] font-semibold">
                        <ImageIcon className="h-3 w-3" /> Bergambar
                      </span>
                    )}
                  </div>
                </div>
              );
            },
          },
          {
            key: "status",
            header: "Status",
            render: (row) => renderStatusBadge(row.status),
          },
          {
            key: "updated_at",
            header: "Diperbarui",
            className: "text-xs text-neutral-500 tabular-nums",
            render: (row) => formatDateTimeID(row.updated_at),
          },
          {
            key: "actions",
            header: "Aksi",
            className: "text-right",
            render: (row) => (
              <div className="flex items-center justify-end gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewQuestion(row)}
                  leftIcon={<Eye className="h-3.5 w-3.5" />}
                >
                  Tinjau
                </Button>
                <Link href={`/admin/bank-soal/tambah?edit=${row.id}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                  >
                    Edit
                  </Button>
                </Link>
              </div>
            ),
          },
        ]}
        renderMobileCard={(row) => (
          <MobileRecordCard
            title={`${row.question_code || row.id} — ${row.subtest_key}`}
            subtitle={row.prompt}
            badge={renderStatusBadge(row.status)}
            fields={[
              { label: "Kategori", value: getCategoryName(row.category_id) },
              {
                label: "Penilaian",
                value:
                  row.question_type === "tkp"
                    ? "Skor TKP (1–5)"
                    : `Kunci: ${row.correct_option}`,
              },
              {
                label: "Diperbarui",
                value: formatDateTimeID(row.updated_at),
              },
              {
                label: "Instansi",
                value: row.institution_label || "Umum",
              },
            ]}
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewQuestion(row)}
                  leftIcon={<Eye className="h-3.5 w-3.5" />}
                >
                  Tinjau &amp; Aktifkan
                </Button>
                <Link href={`/admin/bank-soal/tambah?edit=${row.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                  >
                    Edit
                  </Button>
                </Link>
              </>
            }
          />
        )}
      />

      {/* Modal Pratinjau & Peninjauan Soal (Review Admin) */}
      {previewQuestion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="my-8 w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#0b49d0]">
                    {previewQuestion.question_code || previewQuestion.id}
                  </span>
                  <span className="rounded-md bg-[#eef4ff] px-2 py-0.5 text-xs font-bold text-[#0b49d0]">
                    {previewQuestion.subtest_key}
                  </span>
                  {renderStatusBadge(previewQuestion.status)}
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  Kategori: {getCategoryName(previewQuestion.category_id)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewQuestion(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Isi Pertanyaan */}
            <div className="rounded-xl border border-neutral-200 bg-[#fcfbf7] p-4 text-sm sm:text-base text-[#151515] leading-relaxed">
              {previewQuestion.prompt}
            </div>

            {/* Daftar Opsi A-E beserta Kunci / Bobot TKP */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Pilihan Jawaban &amp; Konfigurasi Kunci Server
              </p>
              {previewQuestion.options.map((opt) => {
                const isCorrect =
                  previewQuestion.question_type === "multiple_choice" &&
                  previewQuestion.correct_option === opt.key;
                const tkpPoint =
                  previewQuestion.question_type === "tkp"
                    ? previewQuestion.tkp_scores?.[opt.key]
                    : null;

                return (
                  <div
                    key={opt.key}
                    className={`flex items-start justify-between gap-3 rounded-xl border p-3 text-xs sm:text-sm ${
                      isCorrect
                        ? "border-emerald-400 bg-emerald-50/70 font-semibold"
                        : "border-neutral-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0b49d0] text-xs font-bold text-white">
                        {opt.key}
                      </span>
                      <div className="space-y-1.5">
                        <span className="text-[#151515]">{opt.text}</span>
                        {opt.asset_url && (
                          <img
                            src={opt.asset_url}
                            alt={`Gambar opsi ${opt.key}`}
                            className="max-h-36 w-auto rounded-lg border border-neutral-200 object-contain"
                          />
                        )}
                      </div>
                    </div>
                    {isCorrect && (
                      <StatusBadge
                        variant="active"
                        label="Kunci Benar (+5)"
                        size="sm"
                      />
                    )}
                    {tkpPoint !== null && tkpPoint !== undefined && (
                      <span className="shrink-0 rounded-md bg-[#ffc63d] px-2 py-1 text-xs font-bold text-[#151515] tabular-nums">
                        Skor TKP: {tkpPoint}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pembahasan */}
            {previewQuestion.explanation && (
              <div className="rounded-xl border border-[#0b49d0]/20 bg-[#eef4ff]/60 p-4 text-xs sm:text-sm space-y-1">
                <p className="font-bold text-[#0b49d0]">Pembahasan Soal:</p>
                <p className="text-[#151515] leading-relaxed">
                  {previewQuestion.explanation}
                </p>
              </div>
            )}

            {/* Tombol Peninjauan & Perubahan Status */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-4">
              <div className="flex flex-wrap gap-2">
                {previewQuestion.status !== "active" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      handleChangeQuestionStatus(previewQuestion, "active")
                    }
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    Setujui &amp; Aktifkan Soal
                  </Button>
                )}
                {previewQuestion.status !== "ready_for_review" && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() =>
                      handleChangeQuestionStatus(
                        previewQuestion,
                        "ready_for_review"
                      )
                    }
                  >
                    Tandai Siap Ditinjau
                  </Button>
                )}
                {previewQuestion.status !== "archived" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleChangeQuestionStatus(previewQuestion, "archived")
                    }
                    leftIcon={<Archive className="h-4 w-4" />}
                  >
                    Arsipkan
                  </Button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewQuestion(null)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
