"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Image as ImageIcon,
  Eye,
  Trash2,
  CheckCircle2,
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
import {
  getQuestions,
  saveQuestions,
  appendAuditLog,
} from "@/lib/admin-store";
import { INITIAL_CATEGORIES } from "@/lib/mock-store";
import { validateQuestionInput } from "@/lib/validation";
import {
  OptionKey,
  QuestionOptionItem,
  QuestionRow,
  QuestionStatus,
  QuestionType,
  TkpScoresMap,
} from "@/types/database";

const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D", "E"];

function QuestionEditorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [existingQuestions, setExistingQuestions] = useState<QuestionRow[]>([]);
  const [questionCode, setQuestionCode] = useState("TIU002");
  const [categoryId, setCategoryId] = useState("cat-cpns");
  const [institutionLabel, setInstitutionLabel] = useState("");
  const [subtestKey, setSubtestKey] = useState("TIU");
  const [questionType, setQuestionType] =
    useState<QuestionType>("multiple_choice");
  const [prompt, setPrompt] = useState("");
  const [promptImageUrl, setPromptImageUrl] = useState<string | null>(null);

  const [options, setOptions] = useState<QuestionOptionItem[]>(
    OPTION_KEYS.map((key) => ({ key, text: "", asset_url: null }))
  );

  const [correctOption, setCorrectOption] = useState<OptionKey>("A");
  const [tkpScores, setTkpScores] = useState<TkpScoresMap>({
    A: 1,
    B: 2,
    C: 5,
    D: 3,
    E: 4,
  });
  const [explanation, setExplanation] = useState("");
  // Sesuai Bab 6.3 PRD: Soal baru tidak otomatis aktif
  const [status, setStatus] = useState<QuestionStatus>("ready_for_review");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const all = getQuestions();
    setExistingQuestions(all);

    if (editId) {
      const target = all.find((q) => q.id === editId);
      if (target) {
        setQuestionCode(target.question_code || target.id);
        setCategoryId(target.category_id);
        setInstitutionLabel(target.institution_label || "");
        setSubtestKey(target.subtest_key);
        setQuestionType(target.question_type);
        setPrompt(target.prompt);
        setOptions(
          OPTION_KEYS.map((k) => {
            const match = target.options.find((o) => o.key === k);
            return {
              key: k,
              text: match?.text || "",
              asset_url: match?.asset_url || null,
            };
          })
        );
        if (target.correct_option) setCorrectOption(target.correct_option);
        if (target.tkp_scores) setTkpScores(target.tkp_scores);
        setExplanation(target.explanation || "");
        setStatus(target.status);
      }
    }
  }, [editId]);

  function handleOptionTextChange(key: OptionKey, text: string) {
    setOptions((prev) =>
      prev.map((o) => (o.key === key ? { ...o, text } : o))
    );
  }

  function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    target: "prompt" | OptionKey
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setValidationErrors([
        "Format gambar harus berupa PNG, JPG/JPEG, atau WebP.",
      ]);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setValidationErrors(["Ukuran file gambar maksimal 5 MB."]);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      if (target === "prompt") {
        setPromptImageUrl(dataUrl);
      } else {
        setOptions((prev) =>
          prev.map((o) =>
            o.key === target ? { ...o, asset_url: dataUrl } : o
          )
        );
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationErrors([]);

    const check = validateQuestionInput({
      questionCode,
      categoryId,
      subtestKey,
      questionType,
      prompt,
      options,
      correctOption: questionType === "multiple_choice" ? correctOption : null,
      tkpScores: questionType === "tkp" ? tkpScores : null,
      existingQuestions,
      editingQuestionId: editId,
    });

    if (!check.valid) {
      setValidationErrors(check.errors);
      return;
    }

    const now = new Date().toISOString();
    const code = questionCode.trim().toUpperCase();

    if (editId) {
      const updated = existingQuestions.map((q) =>
        q.id === editId
          ? {
              ...q,
              question_code: code,
              category_id: categoryId,
              institution_label: institutionLabel.trim() || null,
              subtest_key: subtestKey.trim().toUpperCase(),
              question_type: questionType,
              prompt: prompt.trim(),
              options,
              correct_option:
                questionType === "multiple_choice" ? correctOption : null,
              tkp_scores: questionType === "tkp" ? tkpScores : null,
              explanation: explanation.trim() || null,
              status,
              updated_at: now,
            }
          : q
      );
      saveQuestions(updated);
      appendAuditLog({
        action: "UPDATE_QUESTION",
        entity_type: "questions",
        entity_id: editId,
        reason: `Pembaruan butir soal ${code}`,
        details: { question_code: code, status },
      });
    } else {
      const newQuestion: QuestionRow = {
        id: `q-${Date.now()}`,
        question_code: code,
        category_id: categoryId,
        institution_label: institutionLabel.trim() || null,
        subtest_key: subtestKey.trim().toUpperCase(),
        question_type: questionType,
        prompt: prompt.trim(),
        options,
        correct_option:
          questionType === "multiple_choice" ? correctOption : null,
        tkp_scores: questionType === "tkp" ? tkpScores : null,
        explanation: explanation.trim() || null,
        status: status === "active" ? "ready_for_review" : status,
        created_by: "usr-admin-01",
        reviewed_by: null,
        reviewed_at: null,
        created_at: now,
        updated_at: now,
      };
      const updated = [newQuestion, ...existingQuestions];
      saveQuestions(updated);
      appendAuditLog({
        action: "CREATE_QUESTION",
        entity_type: "questions",
        entity_id: newQuestion.id,
        reason: `Input manual soal baru ${code}`,
        details: { question_code: code, status: newQuestion.status },
      });
    }

    setSavedSuccess(true);
    setTimeout(() => {
      router.push("/admin/bank-soal");
    }, 900);
  }

  return (
    <AppShell
      role="admin"
      userName="Admin CATARA"
      userSubtitle="Editor Bank Soal"
    >
      <PageHeader
        title={editId ? "Edit Butir Soal" : "Tambah Soal Baru"}
        description="Editor soal mendukung teks, gambar pertanyaan maupun gambar pada pilihan A–E, kunci jawaban pilihan ganda, bobot skor TKP (1–5), dan pembahasan."
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
            variant="review"
            label="Wajib Tinjau Sebelum Aktif"
          />
        }
      />

      {savedSuccess && (
        <div className="mb-6">
          <ToastNotification
            type="success"
            title="Soal Berhasil Disimpan"
            description="Mengalihkan kembali ke daftar Bank Soal..."
          />
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-xs sm:text-sm text-red-900 space-y-1.5">
          <p className="font-bold">Periksa Kembali Input Soal Anda:</p>
          <ul className="list-disc pl-5 space-y-1">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Form Editor Soal */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-xs space-y-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              id="q-code"
              label="ID / Kode Soal Unik"
              required
              hint="Contoh: TWK002, TIU005, TKP010"
            >
              <input
                id="q-code"
                type="text"
                required
                value={questionCode}
                onChange={(e) => setQuestionCode(e.target.value.toUpperCase())}
                className={`${inputBaseClasses} font-mono uppercase`}
              />
            </FormField>

            <FormField id="q-category" label="Kategori Seleksi" required>
              <select
                id="q-category"
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

            <FormField
              id="q-subtest"
              label="Subtes / Bagian Ujian"
              required
              hint="Contoh: TWK, TIU, TKP, Akademik"
            >
              <input
                id="q-subtest"
                type="text"
                required
                value={subtestKey}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setSubtestKey(val);
                  if (val === "TKP") setQuestionType("tkp");
                }}
                className={inputBaseClasses}
              />
            </FormField>

            <FormField
              id="q-inst"
              label="Institusi Sekdin (Opsional)"
              hint="Isi jika soal khusus instansi Sekdin"
            >
              <select
                id="q-inst"
                value={institutionLabel}
                onChange={(e) => setInstitutionLabel(e.target.value)}
                className={inputBaseClasses}
              >
                <option value="">Umum (Semua Instansi)</option>
                <option value="IPDN">IPDN</option>
                <option value="PKN STAN">PKN STAN</option>
                <option value="STIS">Politeknik STIS</option>
                <option value="STMKG">STMKG</option>
              </select>
            </FormField>
          </div>

          {/* Tipe Penilaian */}
          <FormField id="q-type" label="Skema Penilaian Soal" required>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setQuestionType("multiple_choice")}
                className={`min-h-[46px] rounded-xl border px-4 py-2.5 text-left text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  questionType === "multiple_choice"
                    ? "border-[#0b49d0] bg-[#eef4ff] text-[#0b49d0]"
                    : "border-neutral-300 bg-white text-[#151515]"
                }`}
              >
                Pilihan Ganda Standar (1 Kunci Benar A–E)
              </button>
              <button
                type="button"
                onClick={() => setQuestionType("tkp")}
                className={`min-h-[46px] rounded-xl border px-4 py-2.5 text-left text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  questionType === "tkp"
                    ? "border-[#0b49d0] bg-[#eef4ff] text-[#0b49d0]"
                    : "border-neutral-300 bg-white text-[#151515]"
                }`}
              >
                Bobot Bertingkat TKP (Skor 1–5 Tiap Opsi)
              </button>
            </div>
          </FormField>

          {/* Teks Pertanyaan & Upload Gambar Pertanyaan */}
          <div className="space-y-2">
            <FormField id="q-prompt" label="Teks Pertanyaan" required>
              <textarea
                id="q-prompt"
                rows={4}
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Tuliskan isi pertanyaan secara lengkap dan jelas..."
                className={inputBaseClasses}
              />
            </FormField>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-neutral-300 bg-[#fcfbf7] p-3 text-xs">
              <div className="flex items-center gap-2 text-neutral-600">
                <ImageIcon className="h-4 w-4 text-[#0b49d0]" />
                <span>
                  Gambar Pertanyaan (Disimpan di Private Bucket{" "}
                  <code>question-assets</code>):
                </span>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#eef4ff] px-3 py-1.5 font-bold text-[#0b49d0] hover:bg-[#0b49d0] hover:text-white transition-colors">
                <span>Pilih Gambar</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, "prompt")}
                />
              </label>
            </div>

            {promptImageUrl && (
              <div className="relative rounded-xl border border-neutral-200 bg-white p-3">
                <img
                  src={promptImageUrl}
                  alt="Preview gambar pertanyaan"
                  className="max-h-56 w-auto rounded-lg object-contain mx-auto"
                />
                <button
                  type="button"
                  onClick={() => setPromptImageUrl(null)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Hapus Gambar Pertanyaan
                </button>
              </div>
            )}
          </div>

          {/* Opsi Jawaban A-E */}
          <div className="space-y-3 border-t border-neutral-100 pt-4">
            <h3 className="text-sm font-bold text-[#151515]">
              Pilihan Jawaban A – E &amp; Kunci / Bobot Skor
            </h3>

            {options.map((opt) => (
              <div
                key={opt.key}
                className="rounded-xl border border-neutral-200 bg-[#fcfbf7] p-3.5 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-[#151515]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0b49d0] text-white">
                      {opt.key}
                    </span>
                    <span>Pilihan {opt.key}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    {questionType === "multiple_choice" ? (
                      <label className="inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="correct_option"
                          checked={correctOption === opt.key}
                          onChange={() => setCorrectOption(opt.key)}
                          className="h-4 w-4 accent-[#0b49d0]"
                        />
                        <span
                          className={
                            correctOption === opt.key
                              ? "text-emerald-700"
                              : "text-neutral-600"
                          }
                        >
                          {correctOption === opt.key
                            ? "Kunci Benar"
                            : "Jadikan Kunci"}
                        </span>
                      </label>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-semibold text-neutral-600">
                          Bobot TKP:
                        </span>
                        <select
                          value={tkpScores[opt.key]}
                          onChange={(e) =>
                            setTkpScores((prev) => ({
                              ...prev,
                              [opt.key]: Number(e.target.value),
                            }))
                          }
                          className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs font-bold text-[#151515]"
                        >
                          {[1, 2, 3, 4, 5].map((pt) => (
                            <option key={pt} value={pt}>
                              Skor {pt}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#151515] hover:border-[#0b49d0]">
                      <ImageIcon className="h-3 w-3 text-[#0b49d0]" />
                      <span>Gambar {opt.key}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, opt.key)}
                      />
                    </label>
                  </div>
                </div>

                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) =>
                    handleOptionTextChange(opt.key, e.target.value)
                  }
                  placeholder={`Teks pilihan jawaban ${opt.key}...`}
                  className={inputBaseClasses}
                />

                {opt.asset_url && (
                  <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-2">
                    <img
                      src={opt.asset_url}
                      alt={`Gambar opsi ${opt.key}`}
                      className="max-h-24 w-auto object-contain rounded"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setOptions((prev) =>
                          prev.map((o) =>
                            o.key === opt.key ? { ...o, asset_url: null } : o
                          )
                        )
                      }
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pembahasan & Status */}
          <FormField
            id="q-explanation"
            label="Pembahasan / Penjelasan Jawaban"
            hint="Hanya ditampilkan kepada peserta apabila Admin telah mempublikasikan pembahasan."
          >
            <textarea
              id="q-explanation"
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Tuliskan penjelasan mengapa opsi tersebut benar..."
              className={inputBaseClasses}
            />
          </FormField>

          <FormField id="q-status" label="Status Peninjauan Soal">
            <select
              id="q-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as QuestionStatus)}
              className={inputBaseClasses}
            >
              <option value="draft">Draft (Masih disusun)</option>
              <option value="ready_for_review">
                Siap Ditinjau (Menunggu persetujuan Admin)
              </option>
              {editId && (
                <option value="active">
                  Aktif (Telah ditinjau &amp; siap dipilih ujian)
                </option>
              )}
              {editId && <option value="archived">Arsip</option>}
            </select>
          </FormField>

          <div className="flex justify-end gap-2.5 border-t border-neutral-100 pt-4">
            <Link href="/admin/bank-soal">
              <Button variant="outline">Batal</Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Save className="h-4 w-4" />}
            >
              Simpan Butir Soal
            </Button>
          </div>
        </form>

        {/* Live Mobile CAT Preview Column */}
        <aside className="lg:col-span-5 space-y-4">
          <div className="sticky top-24 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-sm font-bold text-[#151515] flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#0b49d0]" />
                <span>Pratinjau Tampilan Ruang CAT (HP Peserta)</span>
              </h2>
              <span className="rounded bg-[#eef4ff] px-2 py-0.5 font-mono text-xs font-bold text-[#0b49d0]">
                {questionCode || "SOAL"}
              </span>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-[#fcfbf7] p-4 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="rounded-lg bg-[#0b49d0] px-2.5 py-1 font-bold text-white">
                  Soal No. 1 • {subtestKey || "SUBTES"}
                </span>
                <span className="font-mono font-bold text-[#151515] tabular-nums">
                  01:39:59
                </span>
              </div>

              <div className="text-sm text-[#151515] leading-relaxed space-y-2">
                <p>
                  {prompt ||
                    "Teks pertanyaan akan tampil di sini sesuai yang Anda ketikkan..."}
                </p>
                {promptImageUrl && (
                  <img
                    src={promptImageUrl}
                    alt="Gambar soal"
                    className="max-h-48 w-auto rounded-xl border border-neutral-200 object-contain"
                  />
                )}
              </div>

              <div className="space-y-2">
                {options.map((opt) => (
                  <div
                    key={opt.key}
                    className="flex items-start gap-2.5 rounded-xl border border-neutral-300 bg-white p-3 text-xs"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-neutral-300 font-bold text-[#151515]">
                      {opt.key}
                    </span>
                    <div className="space-y-1">
                      <span className="text-[#151515]">
                        {opt.text || `Teks pilihan ${opt.key}...`}
                      </span>
                      {opt.asset_url && (
                        <img
                          src={opt.asset_url}
                          alt={`Opsi ${opt.key}`}
                          className="max-h-24 w-auto rounded object-contain"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>
                  Catatan Keamanan: Kunci jawaban dan skor TKP tidak pernah
                  dikirimkan ke layar peserta.
                </span>
              </p>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

export default function TambahSoalPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm">Memuat editor soal...</div>}>
      <QuestionEditorInner />
    </Suspense>
  );
}
