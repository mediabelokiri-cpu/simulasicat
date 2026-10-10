"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FolderArchive,
  Image as ImageIcon,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  StatusBadge,
  Button,
  ToastNotification,
} from "@/components/ui";
import {
  getQuestions,
  saveQuestions,
  appendAuditLog,
} from "@/lib/admin-store";
import {
  BulkImportRowRaw,
  BulkImportValidatedRow,
  validateBulkImportRows,
} from "@/lib/validation";
import { QuestionRow } from "@/types/database";

export default function ImportSoalPage() {
  const [rawRows, setRawRows] = useState<BulkImportRowRaw[]>([]);
  const [validatedRows, setValidatedRows] = useState<BulkImportValidatedRow[]>(
    []
  );
  const [bundleImages, setBundleImages] = useState<string[]>([]);
  const [importReport, setImportReport] = useState<{
    importedCount: number;
    skippedCount: number;
    timestamp: string;
  } | null>(null);

  const validRows = validatedRows.filter((r) => r.isValid);
  const invalidRows = validatedRows.filter((r) => !r.isValid);

  function handleDownloadTemplate() {
    const headers = [
      "question_code",
      "category_slug",
      "institution_label",
      "subtest_key",
      "question_type",
      "prompt",
      "option_a",
      "option_b",
      "option_c",
      "option_d",
      "option_e",
      "correct_option",
      "tkp_scores",
      "explanation",
      "prompt_image",
    ];
    const sampleRow = [
      "TWK001",
      "cpns",
      "",
      "TWK",
      "multiple_choice",
      "Tuliskan teks pertanyaan di sini...",
      "Pilihan A",
      "Pilihan B",
      "Pilihan C",
      "Pilihan D",
      "Pilihan E",
      "C",
      "",
      "Penjelasan jawaban benar...",
      "",
    ];
    const csvContent = `${headers.join(",")}\n${sampleRow
      .map((v) => `"${v}"`)
      .join(",")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Template_Impor_Soal_Prima_RIB.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCsvFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) return;

      const parsedRows: BulkImportRowRaw[] = lines.slice(1).map((line, idx) => {
        const cols = line
          .split(",")
          .map((c) => c.replace(/^"|"$/g, "").trim());
        return {
          rowNumber: idx + 2,
          question_code: cols[0] || "",
          category_slug: cols[1] || "",
          institution_label: cols[2] || "",
          subtest_key: cols[3] || "",
          question_type: cols[4] || "multiple_choice",
          prompt: cols[5] || "",
          option_a: cols[6] || "",
          option_b: cols[7] || "",
          option_c: cols[8] || "",
          option_d: cols[9] || "",
          option_e: cols[10] || "",
          correct_option: cols[11] || "",
          tkp_scores: cols[12] || "",
          explanation: cols[13] || "",
          prompt_image: cols[14] || "",
        };
      });

      setRawRows(parsedRows);
      const existing = getQuestions();
      setValidatedRows(
        validateBulkImportRows(parsedRows, existing, bundleImages)
      );
      setImportReport(null);
    };
    reader.readAsText(file);
  }

  function handleImageFilesSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const names = Array.from(
      new Set([...bundleImages, ...files.map((f) => f.name)])
    );
    setBundleImages(names);

    if (rawRows.length > 0) {
      const existing = getQuestions();
      setValidatedRows(validateBulkImportRows(rawRows, existing, names));
    }
  }

  function handleConfirmImportValidRows() {
    if (validRows.length === 0) return;

    const existing = getQuestions();
    const now = new Date().toISOString();

    const newQuestions: QuestionRow[] = validRows
      .filter((r) => Boolean(r.parsedQuestion))
      .map((r, idx) => ({
        ...r.parsedQuestion!,
        id: `q-imp-${Date.now()}-${idx}`,
        created_at: now,
        updated_at: now,
      }));

    const combined = [...newQuestions, ...existing];
    saveQuestions(combined);

    appendAuditLog({
      action: "BULK_IMPORT_QUESTIONS",
      entity_type: "questions",
      entity_id: `batch-${Date.now()}`,
      reason: `Impor massal ${newQuestions.length} butir soal (status Siap Ditinjau)`,
      details: {
        imported_count: newQuestions.length,
        rejected_count: invalidRows.length,
        imported_codes: newQuestions.map((q) => q.question_code),
      },
    });

    setImportReport({
      importedCount: newQuestions.length,
      skippedCount: invalidRows.length,
      timestamp: now,
    });
  }

  return (
    <AppShell
      role="admin"
      userName="Admin Prima RIB"
      userSubtitle="Impor Massal Bank Soal"
    >
      <PageHeader
        title="Impor Massal Bank Soal (CSV / Excel & Aset Gambar)"
        description="Impor soal sekaligus menggunakan template resmi Prima RIB. Sistem memeriksa kolom wajib, mendeteksi ID ganda, memverifikasi kecocokan nama file gambar, dan menampilkan pratinjau sebelum disimpan."
        backLink={
          <Link
            href="/admin/bank-soal"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b49d0] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Bank Soal</span>
          </Link>
        }
        badge={
          <StatusBadge variant="featured" label="Validasi 9 Tahap Aktif" />
        }
      />

      {/* Langkah 1 & 2: Unduh Template & Upload File */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-[#0b49d0]" />
            <h2 className="text-base font-bold text-[#151515]">
              1. Template &amp; Konvensi Nama Gambar
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
            Gunakan template resmi agar struktur kolom sesuai standar. Untuk
            soal bergambar, beri nama file sesuai ID soal:
          </p>
          <ul className="rounded-xl border border-neutral-200 bg-[#fcfbf7] p-3.5 font-mono text-xs text-[#151515] space-y-1">
            <li>• TIU001.png (Gambar pertanyaan utama)</li>
            <li>• TIU003_A.png (Gambar pada pilihan A)</li>
            <li>• TIU003_B.png (Gambar pada pilihan B)</li>
          </ul>
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            leftIcon={<Download className="h-4 w-4" />}
            className="w-full"
          >
            Unduh Template Resmi (.CSV)
          </Button>
        </div>

        <div className="lg:col-span-7 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <FolderArchive className="h-5 w-5 text-[#0b49d0]" />
            <h2 className="text-base font-bold text-[#151515]">
              2. Unggah File CSV Soal &amp; Aset Gambar
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
            Unggah file CSV yang telah diisi sesuai template. Jika soal
            menyertakan referensi gambar pada kolom <code>prompt_image</code>,
            pilih juga file gambar pendukungnya untuk pencocokan nama otomatis.
          </p>

          <div className="flex flex-wrap gap-3">
            <label className="inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0b49d0] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#093db0] transition-colors">
              <Upload className="h-4 w-4" />
              <span>Unggah File CSV Soal</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFileUpload}
                className="hidden"
              />
            </label>

            <label className="inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-bold text-[#151515] hover:bg-neutral-50 transition-colors">
              <ImageIcon className="h-4 w-4 text-[#0b49d0]" />
              <span>Pilih File Gambar Pendukung (Opsional)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleImageFilesSelect}
                className="hidden"
              />
            </label>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-[#fcfbf7] p-3 text-xs flex flex-wrap items-center justify-between gap-2">
            <span className="text-neutral-600">
              File gambar terlampir:{" "}
              <strong className="font-mono text-[#151515]">
                {bundleImages.length > 0
                  ? bundleImages.join(", ")
                  : "Belum ada file gambar dipilih"}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Laporan Hasil Impor */}
      {importReport && (
        <div className="mt-6">
          <ToastNotification
            type="success"
            title={`Laporan Hasil Impor: ${importReport.importedCount} Soal Berhasil Disimpan`}
            description={`${importReport.importedCount} soal valid telah masuk ke Bank Soal dengan status "Siap Ditinjau" (menunggu aktivasi Admin). ${importReport.skippedCount} baris bermasalah tidak disimpan agar integritas bank soal terjaga.`}
          />
        </div>
      )}

      {/* Langkah 3–8: Preview & Ringkasan Validasi Baris */}
      {validatedRows.length > 0 && (
        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#151515]">
                3. Pratinjau &amp; Laporan Validasi Pra-Simpan
              </h2>
              <p className="text-xs text-neutral-600">
                Sesuai Bab 6.5 PRD: kegagalan pada sebagian baris ditampilkan
                secara transparan beserta cara memperbaikinya.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                variant="active"
                label={`${validRows.length} Baris Valid`}
              />
              <StatusBadge
                variant={invalidRows.length > 0 ? "danger" : "neutral"}
                label={`${invalidRows.length} Baris Bermasalah`}
              />
            </div>
          </div>

          <div className="space-y-3">
            {validatedRows.map((item) => (
              <div
                key={item.rowNumber}
                className={`rounded-xl border p-4 text-xs sm:text-sm space-y-2 ${
                  item.isValid
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-red-300 bg-red-50/60"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#151515] px-2 py-0.5 font-mono text-xs font-bold text-white">
                      Baris #{item.rowNumber}
                    </span>
                    <span className="font-mono font-bold text-[#0b49d0]">
                      {item.raw.question_code || "(Tanpa Kode)"}
                    </span>
                    <span className="font-semibold text-[#151515]">
                      [{item.raw.subtest_key} •{" "}
                      {item.raw.category_slug.toUpperCase()}]
                    </span>
                  </div>
                  {item.isValid ? (
                    <StatusBadge
                      variant="active"
                      label="Valid & Siap Impor"
                      size="sm"
                    />
                  ) : (
                    <StatusBadge
                      variant="danger"
                      label="Baris Bermasalah"
                      size="sm"
                    />
                  )}
                </div>

                <p className="text-[#151515]">{item.raw.prompt}</p>

                {!item.isValid && (
                  <div className="rounded-lg border border-red-200 bg-white p-3 space-y-1.5 text-xs">
                    <p className="font-bold text-red-800 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Penyebab Kesalahan:</span>
                    </p>
                    <ul className="list-disc pl-5 text-red-700 space-y-0.5">
                      {item.errors.map((e, idx) => (
                        <li key={idx}>{e}</li>
                      ))}
                    </ul>
                    <p className="font-bold text-[#0b49d0] pt-1">
                      Cara Memperbaiki:
                    </p>
                    <ul className="list-disc pl-5 text-[#151515] space-y-0.5">
                      {item.fixSuggestions.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
            <p className="text-xs text-neutral-600">
              Soal yang diimpor akan masuk dengan status{" "}
              <strong>Siap Ditinjau</strong> dan memerlukan persetujuan Admin
              sebelum aktif.
            </p>
            <Button
              variant="primary"
              disabled={validRows.length === 0 || Boolean(importReport)}
              onClick={handleConfirmImportValidRows}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              Konfirmasi &amp; Simpan {validRows.length} Baris Valid
            </Button>
          </div>
        </section>
      )}
    </AppShell>
  );
}
