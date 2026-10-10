/**
 * VALIDATION & BULK IMPORT ENGINE — SIMULASI CAT PRIMA RIB
 * Sesuai Bab 6.1–6.5 PRD Final v1.0 & Bab 8 Rancangan UI/UX
 */

import {
  OptionKey,
  QuestionOptionItem,
  QuestionRow,
  QuestionType,
  TkpScoresMap,
} from "@/types/database";

export interface QuestionValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateQuestionInput(input: {
  questionCode: string;
  categoryId: string;
  subtestKey: string;
  questionType: QuestionType;
  prompt: string;
  options: QuestionOptionItem[];
  correctOption: OptionKey | null;
  tkpScores: TkpScoresMap | null;
  existingQuestions?: QuestionRow[];
  editingQuestionId?: string | null;
}): QuestionValidationResult {
  const errors: string[] = [];
  const code = input.questionCode.trim().toUpperCase();

  if (!code || code.length < 3) {
    errors.push(
      "ID / Kode Soal wajib diisi minimal 3 karakter (mis. TWK001, TIU002)."
    );
  }

  if (input.existingQuestions) {
    const duplicate = input.existingQuestions.find(
      (q) =>
        (q.question_code || "").toUpperCase() === code &&
        q.id !== input.editingQuestionId
    );
    if (duplicate) {
      errors.push(
        `Kode soal "${code}" sudah digunakan pada bank soal. Gunakan kode unik.`
      );
    }
  }

  if (!input.categoryId) {
    errors.push("Kategori seleksi wajib dipilih.");
  }

  if (!input.subtestKey.trim()) {
    errors.push("Subtes / bagian ujian wajib diisi (mis. TWK, TIU, TKP).");
  }

  if (!input.prompt.trim() || input.prompt.trim().length < 10) {
    errors.push("Teks pertanyaan wajib diisi minimal 10 karakter.");
  }

  const requiredKeys: OptionKey[] = ["A", "B", "C", "D", "E"];
  for (const key of requiredKeys) {
    const opt = input.options.find((o) => o.key === key);
    if (!opt || (!opt.text.trim() && !opt.asset_url)) {
      errors.push(
        `Pilihan jawaban ${key} wajib memiliki teks atau gambar pendukung.`
      );
    }
  }

  if (input.questionType === "multiple_choice") {
    if (!input.correctOption || !requiredKeys.includes(input.correctOption)) {
      errors.push(
        "Soal Pilihan Ganda wajib memiliki satu kunci jawaban benar (A, B, C, D, atau E)."
      );
    }
  } else if (input.questionType === "tkp") {
    if (!input.tkpScores) {
      errors.push("Soal tipe TKP wajib memiliki bobot skor 1–5 untuk opsi A–E.");
    } else {
      const scores = requiredKeys.map((k) => Number(input.tkpScores?.[k] ?? 0));
      const allInRange = scores.every(
        (s) => Number.isInteger(s) && s >= 1 && s <= 5
      );
      const uniqueScores = new Set(scores);
      if (!allInRange || uniqueScores.size !== 5) {
        errors.push(
          "Bobot skor TKP untuk opsi A–E harus berisi angka bulat 1, 2, 3, 4, dan 5 secara lengkap tanpa duplikasi."
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface BulkImportRowRaw {
  rowNumber: number;
  question_code: string;
  category_slug: string;
  institution_label?: string;
  subtest_key: string;
  question_type: string;
  prompt: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_option?: string;
  tkp_scores?: string; // Format mis. "A:1,B:2,C:5,D:3,E:4"
  explanation?: string;
  prompt_image?: string;
  option_images?: string;
}

export interface BulkImportValidatedRow {
  rowNumber: number;
  raw: BulkImportRowRaw;
  isValid: boolean;
  errors: string[];
  fixSuggestions: string[];
  parsedQuestion?: Omit<QuestionRow, "id" | "created_at" | "updated_at">;
}

export function validateBulkImportRows(
  rows: BulkImportRowRaw[],
  existingQuestions: QuestionRow[],
  availableImageFiles: string[]
): BulkImportValidatedRow[] {
  const seenCodesInBatch = new Set<string>();
  const existingCodes = new Set(
    existingQuestions.map((q) => (q.question_code || "").toUpperCase())
  );
  const normalizedImages = new Set(
    availableImageFiles.map((f) => f.trim().toUpperCase())
  );

  return rows.map((row) => {
    const errors: string[] = [];
    const fixSuggestions: string[] = [];
    const code = (row.question_code || "").trim().toUpperCase();

    // 1. Cek kode soal & duplikasi
    if (!code) {
      errors.push("Kolom question_code kosong.");
      fixSuggestions.push(
        "Isi kolom question_code dengan ID unik seperti TWK005 atau TIU012."
      );
    } else {
      if (seenCodesInBatch.has(code)) {
        errors.push(`ID soal ganda "${code}" ditemukan di dalam file impor.`);
        fixSuggestions.push(
          `Ubah salah satu baris yang menggunakan kode "${code}" agar tidak duplikat.`
        );
      }
      if (existingCodes.has(code)) {
        errors.push(`ID soal "${code}" sudah terdaftar di Bank Soal.`);
        fixSuggestions.push(
          `Gunakan kode baru atau edit soal "${code}" langsung melalui menu Bank Soal.`
        );
      }
      seenCodesInBatch.add(code);
    }

    // 2. Cek kategori
    const catSlug = (row.category_slug || "").trim().toLowerCase();
    const catMap: Record<string, string> = {
      cpns: "cat-cpns",
      sekdin: "cat-sekdin",
      polri: "cat-polri",
    };
    const categoryId = catMap[catSlug];
    if (!categoryId) {
      errors.push(`Kategori "${row.category_slug}" tidak dikenali.`);
      fixSuggestions.push(
        "Gunakan salah satu nilai kategori resmi: cpns, sekdin, atau polri."
      );
    }

    // 3. Cek pertanyaan & opsi A-E
    if (!row.prompt || row.prompt.trim().length < 10) {
      errors.push("Teks pertanyaan (prompt) kosong atau terlalu pendek.");
      fixSuggestions.push("Pastikan kolom prompt berisi teks soal minimal 10 karakter.");
    }

    const optEntries: { key: OptionKey; val: string }[] = [
      { key: "A", val: row.option_a },
      { key: "B", val: row.option_b },
      { key: "C", val: row.option_c },
      { key: "D", val: row.option_d },
      { key: "E", val: row.option_e },
    ];
    for (const o of optEntries) {
      if (!o.val || !o.val.trim()) {
        errors.push(`Opsi jawaban ${o.key} belum diisi.`);
        fixSuggestions.push(`Lengkapi teks pilihan jawaban pada kolom option_${o.key.toLowerCase()}.`);
      }
    }

    // 4. Cek tipe soal & penilaian
    const qType =
      (row.question_type || "").trim().toLowerCase() === "tkp"
        ? "tkp"
        : "multiple_choice";
    let correctOption: OptionKey | null = null;
    let tkpScores: TkpScoresMap | null = null;

    if (qType === "multiple_choice") {
      const key = (row.correct_option || "").trim().toUpperCase() as OptionKey;
      if (!["A", "B", "C", "D", "E"].includes(key)) {
        errors.push(
          `Kunci jawaban "${row.correct_option || ""}" tidak valid untuk soal Pilihan Ganda.`
        );
        fixSuggestions.push(
          "Isi kolom correct_option dengan salah satu huruf: A, B, C, D, atau E."
        );
      } else {
        correctOption = key;
      }
    } else {
      // Parse TKP scores e.g. "A:1,B:2,C:5,D:3,E:4"
      const rawTkp = (row.tkp_scores || "").trim();
      const parsedMap: Partial<TkpScoresMap> = {};
      rawTkp.split(",").forEach((pair) => {
        const [k, v] = pair.split(":").map((s) => s.trim().toUpperCase());
        if (["A", "B", "C", "D", "E"].includes(k) && !Number.isNaN(Number(v))) {
          parsedMap[k as OptionKey] = Number(v);
        }
      });
      const vals = (["A", "B", "C", "D", "E"] as OptionKey[]).map(
        (k) => parsedMap[k] ?? 0
      );
      const validSet = new Set(vals);
      if (
        vals.some((v) => v < 1 || v > 5 || !Number.isInteger(v)) ||
        validSet.size !== 5
      ) {
        errors.push(
          `Format skor TKP "${rawTkp}" tidak lengkap atau tidak bernilai 1–5.`
        );
        fixSuggestions.push(
          "Gunakan format lengkap 1 sampai 5, contoh: A:1,B:2,C:5,D:3,E:4"
        );
      } else {
        tkpScores = parsedMap as TkpScoresMap;
      }
    }

    // 5. Cek referensi gambar di paket ZIP
    if (row.prompt_image && row.prompt_image.trim()) {
      const imgName = row.prompt_image.trim().toUpperCase();
      if (!normalizedImages.has(imgName)) {
        errors.push(
          `File gambar pertanyaan "${row.prompt_image}" tidak ditemukan di paket gambar.`
        );
        fixSuggestions.push(
          `Pastikan file "${row.prompt_image}" disertakan dalam folder gambar ZIP sesuai ID soal (mis. ${code}.png).`
        );
      }
    }

    const isValid = errors.length === 0;

    return {
      rowNumber: row.rowNumber,
      raw: row,
      isValid,
      errors,
      fixSuggestions,
      parsedQuestion: isValid
        ? {
            question_code: code,
            category_id: categoryId,
            institution_label: row.institution_label?.trim() || null,
            subtest_key: row.subtest_key.trim().toUpperCase(),
            question_type: qType,
            prompt: row.prompt.trim(),
            options: optEntries.map((o) => ({
              key: o.key,
              text: o.val.trim(),
            })),
            correct_option: correctOption,
            tkp_scores: tkpScores,
            explanation: row.explanation?.trim() || null,
            // Sesuai Bab 6.3 PRD: Soal hasil impor TIDAK otomatis aktif!
            status: "ready_for_review",
            created_by: "usr-admin-01",
            reviewed_by: null,
            reviewed_at: null,
          }
        : undefined,
    };
  });
}
