"use client";

import React, { useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FolderArchive,
  Image as ImageIcon,
  Database,
  Table,
} from "lucide-react";
import {
  AppShell,
  PageHeader,
  StatusBadge,
  Button,
  ToastNotification,
  selectBaseClasses,
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
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { OptionKey, QuestionRow, QuestionStatus } from "@/types/database";

export default function ImportSoalPage() {
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [rawRows, setRawRows] = useState<BulkImportRowRaw[]>([]);
  const [validatedRows, setValidatedRows] = useState<BulkImportValidatedRow[]>(
    []
  );
  const [bundleImages, setBundleImages] = useState<string[]>([]);
  const [targetStatus, setTargetStatus] = useState<QuestionStatus>("active");
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [importReport, setImportReport] = useState<{
    importedCount: number;
    skippedCount: number;
    supabaseSyncedCount: number;
    timestamp: string;
  } | null>(null);

  const validRows = validatedRows.filter((r) => r.isValid);
  const invalidRows = validatedRows.filter((r) => !r.isValid);

  // Unduh Template Resmi dalam format Excel (.xlsx) lengkap 2 Sheet (Bank_Soal & Petunjuk)
  function handleDownloadExcelTemplate() {
    const sampleData = [
      {
        question_code: "TWK010",
        category: "CPNS",
        section_key: "TWK",
        subtopic: "Nasionalisme",
        difficulty: "medium",
        scoring_mode: "single_correct",
        question_text:
          "Sikap mempertahankan jati diri bangsa di tengah arus globalisasi dengan tetap terbuka pada kemajuan IPTEK mencerminkan nilai...",
        option_a: "Chauvinisme ekstrem",
        option_b: "Nasionalisme terbuka dan konstruktif",
        option_c: "Etnosentrisme kedaerahan",
        option_d: "Isolasionisme budaya",
        option_e: "Pragmatisme ekonomi",
        correct_option: "B",
        score_a: "",
        score_b: "",
        score_c: "",
        score_d: "",
        score_e: "",
        explanation:
          "Nasionalisme Indonesia bersifat terbuka dan konstruktif: menjaga jati diri Pancasila sekaligus adaptif terhadap kemajuan global.",
        image_url: "",
      },
      {
        question_code: "TIU010",
        category: "CPNS",
        section_key: "TIU",
        subtopic: "Deret Angka",
        difficulty: "easy",
        scoring_mode: "single_correct",
        question_text:
          "Tentukan angka berikutnya dari deret: 4, 9, 16, 25, 36, ...",
        option_a: "42",
        option_b: "45",
        option_c: "49",
        option_d: "56",
        option_e: "64",
        correct_option: "C",
        score_a: "",
        score_b: "",
        score_c: "",
        score_d: "",
        score_e: "",
        explanation:
          "Pola bilangan kuadrat berurutan: 2^2=4, 3^2=9, 4^2=16, 5^2=25, 6^2=36, maka 7^2=49 (C).",
        image_url: "",
      },
      {
        question_code: "TKP010",
        category: "CPNS",
        section_key: "TKP",
        subtopic: "Pelayanan Publik",
        difficulty: "medium",
        scoring_mode: "weighted_options",
        question_text:
          "Saat antrean layanan sedang padat, seorang warga lansia tampak kebingungan mengisi formulir digital. Tindakan Anda...",
        option_a:
          "Meminta warga tersebut membaca papan petunjuk mandiri agar antrean tetap berjalan.",
        option_b:
          "Mendampingi dengan ramah dan mengarahkan petugas layanan prioritas untuk membantu pengisian.",
        option_c:
          "Menyarankan warga tersebut kembali keesokan hari bersama anggota keluarganya.",
        option_d:
          "Memberikan formulir kertas seadanya tanpa penjelasan lebih lanjut.",
        option_e:
          "Mengabaikan karena bukan tugas meja layanan Anda.",
        correct_option: "",
        score_a: 3,
        score_b: 5,
        score_c: 2,
        score_d: 4,
        score_e: 1,
        explanation:
          "Opsi B memiliki skor tertinggi (5) karena menunjukkan responsivitas dan standar pelayanan publik prima bagi kelompok rentan.",
        image_url: "",
      },
    ];

    const guideData = [
      {
        Kolom: "question_code",
        Wajib: "Opsional",
        Aturan_Isi:
          "ID unik soal (mis. TWK010, TIU010). Jika dikosongkan, sistem otomatis membuat ID unik.",
      },
      {
        Kolom: "category",
        Wajib: "Wajib",
        Aturan_Isi: "Isi: CPNS, SEKDIN, atau POLRI",
      },
      {
        Kolom: "section_key",
        Wajib: "Wajib",
        Aturan_Isi: "Kode subtes: TWK, TIU, atau TKP",
      },
      {
        Kolom: "subtopic",
        Wajib: "Opsional",
        Aturan_Isi:
          "Subtopik materi atau nama instansi Sekdin (mis. Nasionalisme, Silogisme, PKN STAN)",
      },
      {
        Kolom: "difficulty",
        Wajib: "Opsional",
        Aturan_Isi: "Tingkat kesulitan: easy, medium, atau hard",
      },
      {
        Kolom: "scoring_mode",
        Wajib: "Wajib",
        Aturan_Isi:
          "Isi single_correct (untuk TWK/TIU) atau weighted_options (untuk TKP)",
      },
      {
        Kolom: "question_text",
        Wajib: "Wajib",
        Aturan_Isi: "Teks pertanyaan soal",
      },
      {
        Kolom: "option_a s.d. option_e",
        Wajib: "Wajib",
        Aturan_Isi: "Teks pilihan jawaban A, B, C, D, dan E",
      },
      {
        Kolom: "correct_option",
        Wajib: "Khusus TWK/TIU",
        Aturan_Isi:
          "Huruf kunci jawaban benar (A, B, C, D, atau E). Kosongkan untuk soal TKP.",
      },
      {
        Kolom: "score_a s.d. score_e",
        Wajib: "Khusus TKP",
        Aturan_Isi:
          "Bobot nilai 1 sampai 5 untuk masing-masing opsi A-E pada soal TKP. Kosongkan untuk TWK/TIU.",
      },
      {
        Kolom: "explanation",
        Wajib: "Wajib",
        Aturan_Isi: "Teks pembahasan lengkap",
      },
      {
        Kolom: "image_url",
        Wajib: "Opsional",
        Aturan_Isi: "URL gambar soal atau nama file gambar (jika soal bergambar)",
      },
    ];

    const wb = XLSX.utils.book_new();
    const wsQuestions = XLSX.utils.json_to_sheet(sampleData);
    const wsGuide = XLSX.utils.json_to_sheet(guideData);

    XLSX.utils.book_append_sheet(wb, wsQuestions, "Bank_Soal");
    XLSX.utils.book_append_sheet(wb, wsGuide, "Petunjuk_Pengisian");

    XLSX.writeFile(wb, "Template_Bank_Soal_Prima_RIB.xlsx");
  }

  // Helper membaca kolom secara fleksibel (case-insensitive & mendukung format baru maupun lama)
  function pickCol(rowObj: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
      const foundKey = Object.keys(rowObj).find(
        (rk) => rk.trim().toLowerCase() === k.toLowerCase()
      );
      if (
        foundKey !== undefined &&
        rowObj[foundKey] !== undefined &&
        rowObj[foundKey] !== null
      ) {
        return String(rowObj[foundKey]).trim();
      }
    }
    return "";
  }

  function handleSpreadsheetUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        if (!buffer) return;

        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) return;

        const sheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          sheet,
          { defval: "" }
        );

        const parsedRows: BulkImportRowRaw[] = jsonRows
          .map((rowObj, idx) => ({
            rowNumber: idx + 2,
            question_code: pickCol(rowObj, [
              "question_code",
              "kode_soal",
              "id_soal",
              "code",
            ]),
            category_slug: pickCol(rowObj, [
              "category",
              "category_slug",
              "kategori",
            ]),
            subtest_key: pickCol(rowObj, [
              "section_key",
              "subtest_key",
              "subtes",
              "section",
            ]),
            subtopic: pickCol(rowObj, [
              "subtopic",
              "institution_label",
              "subtopik",
              "instansi",
            ]),
            institution_label: pickCol(rowObj, [
              "institution_label",
              "subtopic",
              "subtopik",
              "instansi",
            ]),
            difficulty:
              pickCol(rowObj, ["difficulty", "kesulitan"]) || "medium",
            question_type: pickCol(rowObj, [
              "scoring_mode",
              "question_type",
              "tipe_soal",
              "mode",
            ]),
            prompt: pickCol(rowObj, [
              "question_text",
              "prompt",
              "pertanyaan",
              "soal",
            ]),
            option_a: pickCol(rowObj, ["option_a", "opsi_a", "pilihan_a", "a"]),
            option_b: pickCol(rowObj, ["option_b", "opsi_b", "pilihan_b", "b"]),
            option_c: pickCol(rowObj, ["option_c", "opsi_c", "pilihan_c", "c"]),
            option_d: pickCol(rowObj, ["option_d", "opsi_d", "pilihan_d", "d"]),
            option_e: pickCol(rowObj, ["option_e", "opsi_e", "pilihan_e", "e"]),
            correct_option: pickCol(rowObj, [
              "correct_option",
              "kunci",
              "kunci_jawaban",
            ]),
            score_a: pickCol(rowObj, ["score_a", "bobot_a", "skor_a"]),
            score_b: pickCol(rowObj, ["score_b", "bobot_b", "skor_b"]),
            score_c: pickCol(rowObj, ["score_c", "bobot_c", "skor_c"]),
            score_d: pickCol(rowObj, ["score_d", "bobot_d", "skor_d"]),
            score_e: pickCol(rowObj, ["score_e", "bobot_e", "skor_e"]),
            tkp_scores: pickCol(rowObj, ["tkp_scores", "bobot_tkp"]),
            explanation: pickCol(rowObj, [
              "explanation",
              "pembahasan",
              "penjelasan",
            ]),
            prompt_image: pickCol(rowObj, [
              "image_url",
              "prompt_image",
              "gambar",
            ]),
          }))
          .filter(
            (r) =>
              Boolean(r.prompt) ||
              Boolean(r.question_code) ||
              Boolean(r.option_a)
          );

        setRawRows(parsedRows);
        const existing = getQuestions();
        setValidatedRows(
          validateBulkImportRows(parsedRows, existing, bundleImages)
        );
        setImportReport(null);
      } catch (err) {
        console.error("Gagal membaca file Excel/CSV:", err);
      }
    };
    reader.readAsArrayBuffer(file);
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

  async function handleConfirmImportValidRows() {
    if (validRows.length === 0) return;
    setIsSyncingSupabase(true);

    const existing = getQuestions();
    const now = new Date().toISOString();

    const newQuestions: QuestionRow[] = validRows
      .filter((r) => Boolean(r.parsedQuestion))
      .map((r, idx) => ({
        ...r.parsedQuestion!,
        id: `q-imp-${Date.now()}-${idx}`,
        status: targetStatus,
        reviewed_by: targetStatus === "active" ? "usr-admin-01" : null,
        reviewed_at: targetStatus === "active" ? now : null,
        created_at: now,
        updated_at: now,
      }));

    // 1. Simpan ke Bank Soal Aplikasi (langsung tampil di tabel Bank Soal & Ujian)
    const combined = [...newQuestions, ...existing];
    saveQuestions(combined);

    // 2. Sinkronisasi ke Tabel Supabase (public.questions + public.question_options) jika Supabase dikonfigurasi
    let supabaseSyncedCount = 0;
    if (isSupabaseConfigured()) {
      try {
        const supabase = createSupabaseBrowserClient();
        if (supabase) {
          for (const item of validRows) {
            const pq = item.parsedQuestion;
            if (!pq) continue;

            const categoryEnum = pq.category_id
              .replace("cat-", "")
              .toUpperCase();
            const difficultyVal = ["easy", "medium", "hard"].includes(
              (item.raw.difficulty || "").toLowerCase()
            )
              ? (item.raw.difficulty || "medium").toLowerCase()
              : "medium";
            const scoringMode =
              pq.question_type === "tkp"
                ? "weighted_options"
                : "single_correct";

            const { data: insertedQ, error: qErr } = await supabase
              .from("questions")
              .insert({
                category: categoryEnum,
                section_key: pq.subtest_key,
                subtopic: pq.institution_label || "Umum",
                difficulty: difficultyVal,
                scoring_mode: scoringMode,
                question_text: pq.prompt,
                image_url: item.raw.prompt_image || null,
                explanation: pq.explanation || "Pembahasan resmi CATARA.",
                source_ref: pq.question_code || null,
                is_active: targetStatus === "active",
              })
              .select("id")
              .single();

            if (!qErr && insertedQ?.id) {
              const optionPayloads = pq.options.map((opt) => {
                const key = opt.key as OptionKey;
                const isCorrect =
                  scoringMode === "single_correct" &&
                  pq.correct_option === key;
                const scoreValue =
                  scoringMode === "weighted_options"
                    ? Number(pq.tkp_scores?.[key] ?? 0)
                    : isCorrect
                    ? 5
                    : 0;

                return {
                  question_id: insertedQ.id,
                  option_label: key,
                  option_text: opt.text,
                  is_correct: isCorrect,
                  score_value: scoreValue,
                };
              });

              const { error: optErr } = await supabase
                .from("question_options")
                .insert(optionPayloads);
              if (!optErr) {
                supabaseSyncedCount++;
              }
            }
          }
        }
      } catch {
        // Tetap aman tersimpan di store lokal meskipun koneksi Supabase sedang offline
      }
    }

    appendAuditLog({
      action: "BULK_IMPORT_QUESTIONS_EXCEL",
      entity_type: "questions",
      entity_id: `batch-${Date.now()}`,
      reason: `Impor Excel ${newQuestions.length} butir soal dengan status ${targetStatus}`,
      details: {
        file_name: uploadedFileName,
        imported_count: newQuestions.length,
        rejected_count: invalidRows.length,
        supabase_synced_count: supabaseSyncedCount,
        target_status: targetStatus,
        imported_codes: newQuestions.map((q) => q.question_code),
      },
    });

    setIsSyncingSupabase(false);
    setImportReport({
      importedCount: newQuestions.length,
      skippedCount: invalidRows.length,
      supabaseSyncedCount,
      timestamp: now,
    });
  }

  return (
    <AppShell
      role="admin"
      userName="Admin CATARA"
      userSubtitle="Impor Excel Bank Soal"
    >
      <PageHeader
        title="Import Bank Soal dari Excel (.xlsx / .csv)"
        description="Unggah file Excel (.xlsx) atau CSV sesuai struktur tabel CATARA. Sistem otomatis memvalidasi setiap baris dan memecahnya menjadi data soal (questions) beserta 5 opsi jawaban (question_options)."
        backLink={
          <Link
            href="/admin/bank-soal"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#494ae2] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Bank Soal</span>
          </Link>
        }
        badge={
          <StatusBadge
            variant="featured"
            label="Support .XLSX & Supabase"
          />
        }
      />

      {/* Langkah 1 & 2: Unduh Template Excel & Upload File Excel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-[#494ae2]" />
            <h2 className="text-base font-bold text-[#151515]">
              1. Unduh Template Tabel Excel (.XLSX)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
            Gunakan template resmi Excel (<strong>1 Baris = 1 Soal</strong>)
            yang sudah dilengkapi contoh pengisian soal{" "}
            <strong>TWK, TIU (Pilihan Ganda)</strong> dan{" "}
            <strong>TKP (Bobot 1–5)</strong>.
          </p>

          <div className="rounded-xl border border-neutral-200 bg-[#fcfbf7] p-3.5 text-xs text-[#151515] space-y-1.5">
            <p className="font-bold text-[#0b49d0] flex items-center gap-1.5">
              <Table className="h-3.5 w-3.5" />
              <span>Kolom Tabel Excel yang Didukung:</span>
            </p>
            <p className="font-mono text-[11px] text-neutral-700 leading-relaxed">
              question_code | category | section_key | subtopic | difficulty |
              scoring_mode | question_text | option_a..option_e |
              correct_option | score_a..score_e | explanation | image_url
            </p>
          </div>

          <Button
            variant="primary"
            onClick={handleDownloadExcelTemplate}
            leftIcon={<Download className="h-4 w-4" />}
            className="w-full justify-center"
          >
            Unduh Template Excel Resmi (.XLSX)
          </Button>
        </div>

        <div className="lg:col-span-7 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <FolderArchive className="h-5 w-5 text-[#0b49d0]" />
            <h2 className="text-base font-bold text-[#151515]">
              2. Unggah File Excel (.xlsx / .xls / .csv)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
            Pilih file Excel (<code>.xlsx</code>, <code>.xls</code>) atau{" "}
            <code>.csv</code> yang telah Anda isi. Sistem akan menampilkan
            pratinjau validasi sebelum soal disimpan ke Bank Soal &amp;
            Supabase.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0b49d0] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#093db0] transition-colors">
              <Upload className="h-4 w-4" />
              <span>Pilih File Excel / CSV Soal</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleSpreadsheetUpload}
                className="hidden"
              />
            </label>

            <label className="inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-bold text-[#151515] hover:bg-neutral-50 transition-colors">
              <ImageIcon className="h-4 w-4 text-[#0b49d0]" />
              <span>Lampirkan Gambar (Opsional)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleImageFilesSelect}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
            <div className="rounded-xl border border-neutral-200 bg-[#fcfbf7] p-3 text-xs">
              <span className="block text-neutral-500">File Terpilih:</span>
              <strong className="font-mono text-[#151515]">
                {uploadedFileName || "Belum ada file Excel dipilih"}
              </strong>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-[#fcfbf7] p-3 text-xs">
              <label
                htmlFor="target-status-select"
                className="block text-neutral-500 mb-1"
              >
                Status Soal Saat Diimpor:
              </label>
              <select
                id="target-status-select"
                value={targetStatus}
                onChange={(e) =>
                  setTargetStatus(e.target.value as QuestionStatus)
                }
                className={selectBaseClasses}
              >
                <option value="active">
                  Langsung Aktif (Siap Dipakai Ujian)
                </option>
                <option value="ready_for_review">
                  Siap Ditinjau (Review Admin Dulu)
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Laporan Hasil Impor */}
      {importReport && (
        <div className="mt-6">
          <ToastNotification
            type="success"
            title={`Berhasil Mengimpor ${importReport.importedCount} Soal dari Excel!`}
            description={`${importReport.importedCount} soal valid telah disimpan ke Bank Soal dengan status "${
              targetStatus === "active" ? "Aktif" : "Siap Ditinjau"
            }"${
              importReport.supabaseSyncedCount > 0
                ? ` dan ${importReport.supabaseSyncedCount} soal telah disinkronkan ke tabel Supabase (questions & question_options).`
                : "."
            }`}
          />
        </div>
      )}

      {/* Langkah 3: Preview & Ringkasan Validasi Baris */}
      {validatedRows.length > 0 && (
        <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#151515]">
                3. Pratinjau Baris Excel &amp; Validasi Struktur Supabase
              </h2>
              <p className="text-xs text-neutral-600">
                Setiap baris yang valid akan dipecah otomatis menjadi 1 baris{" "}
                <code>questions</code> dan 5 baris{" "}
                <code>question_options</code> (Opsi A–E).
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

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {validatedRows.map((item) => {
              const pq = item.parsedQuestion;
              return (
                <div
                  key={item.rowNumber}
                  className={`rounded-xl border p-4 text-xs sm:text-sm space-y-2 ${
                    item.isValid
                      ? "border-emerald-200 bg-emerald-50/40"
                      : "border-red-300 bg-red-50/60"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#151515] px-2 py-0.5 font-mono text-xs font-bold text-white">
                        Baris Excel #{item.rowNumber}
                      </span>
                      <span className="font-mono font-bold text-[#0b49d0]">
                        {item.raw.question_code || "(Auto ID)"}
                      </span>
                      <span className="rounded-md bg-white border border-neutral-200 px-2 py-0.5 text-xs font-bold text-[#151515]">
                        {item.raw.subtest_key.toUpperCase()} •{" "}
                        {item.raw.category_slug.toUpperCase()}
                      </span>
                      {pq && (
                        <span className="text-xs font-semibold text-emerald-800">
                          {pq.question_type === "tkp"
                            ? `Weighted Options (Bobot TKP A=${pq.tkp_scores?.A}, B=${pq.tkp_scores?.B}, C=${pq.tkp_scores?.C}, D=${pq.tkp_scores?.D}, E=${pq.tkp_scores?.E})`
                            : `Single Correct (Kunci: ${pq.correct_option})`}
                        </span>
                      )}
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

                  <p className="font-medium text-[#151515]">
                    {item.raw.prompt}
                  </p>

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
                        Cara Memperbaiki di Excel:
                      </p>
                      <ul className="list-disc pl-5 text-[#151515] space-y-0.5">
                        {item.fixSuggestions.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <Database className="h-4 w-4 text-[#0b49d0]" />
              <span>
                Siap menyimpan <strong>{validRows.length} soal valid</strong> ke
                Bank Soal &amp; tabel Supabase.
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              {importReport && (
                <Link href="/admin/bank-soal">
                  <Button variant="outline">Lihat di Bank Soal →</Button>
                </Link>
              )}
              <Button
                variant="primary"
                disabled={
                  validRows.length === 0 ||
                  Boolean(importReport) ||
                  isSyncingSupabase
                }
                onClick={() => void handleConfirmImportValidRows()}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                {isSyncingSupabase
                  ? "Menyimpan & Menyinkronkan..."
                  : `Simpan & Impor ${validRows.length} Soal ke Bank Soal`}
              </Button>
            </div>
          </div>
        </section>
      )}
    </AppShell>
  );
}
