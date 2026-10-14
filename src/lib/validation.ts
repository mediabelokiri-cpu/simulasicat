/**
 * VALIDATION & BULK IMPORT ENGINE — CATARA DIGITAL ASSESSMENT PLATFORM
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
  question_code?: string;
  category_slug: string; // Supports "CPNS", "SEKDIN", "POLRI"
  institution_label?: string; // Or subtopic
  subtopic?: string;
  difficulty?: string; // "easy" | "medium" | "hard"
  subtest_key: string; // Or section_key ("TWK", "TIU", "TKP")
  question_type: string; // Supports "single_correct", "weighted_options", "multiple_choice", "tkp"
  prompt: string; // Or question_text
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_option?: string;
  score_a?: string | number;
  score_b?: string | number;
  score_c?: string | number;
  score_d?: string | number;
  score_e?: string | number;
  tkp_scores?: string; // Format mis. "A:1,B:2,C:5,D:3,E:4"
  explanation?: string;
  prompt_image?: string; // Or image_url
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

  // Counter untuk auto-generate question_code jika kolom question_code dikosongkan di Excel
  const autoCodeCounters: Record<string, number> = {};

  return rows.map((row) => {
    const errors: string[] = [];
    const fixSuggestions: string[] = [];
    const subtestUpper = (row.subtest_key || "SOAL")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    let code = (row.question_code || "").trim().toUpperCase();
    if (!code) {
      // Buat kode otomatis unik berdasarkan subtest_key (mis. TWK001, TIU002, TKP003)
      let seq = (autoCodeCounters[subtestUpper] || 0) + 1;
      let candidate = `${subtestUpper}${String(seq).padStart(3, "0")}`;
      while (existingCodes.has(candidate) || seenCodesInBatch.has(candidate)) {
        seq++;
        candidate = `${subtestUpper}${String(seq).padStart(3, "0")}`;
      }
      autoCodeCounters[subtestUpper] = seq;
      code = candidate;
    } else {
      if (seenCodesInBatch.has(code)) {
        errors.push(`ID soal ganda "${code}" ditemukan di dalam file Excel.`);
        fixSuggestions.push(
          `Ubah salah satu baris yang menggunakan kode "${code}" atau kosongkan kolom question_code agar dibuat otomatis.`
        );
      }
      if (existingCodes.has(code)) {
        errors.push(`ID soal "${code}" sudah terdaftar di Bank Soal.`);
        fixSuggestions.push(
          `Gunakan kode baru atau kosongkan kolom question_code agar sistem membuat ID unik otomatis.`
        );
      }
    }
    seenCodesInBatch.add(code);

    // 2. Cek kategori (mendukung CPNS, SEKDIN, POLRI, cat-cpns, dll.)
    const rawCat = (row.category_slug || "")
      .trim()
      .toLowerCase()
      .replace(/^cat-/, "");
    const catMap: Record<string, string> = {
      cpns: "cat-cpns",
      skd: "cat-cpns",
      sekdin: "cat-sekdin",
      kedinasan: "cat-sekdin",
      polri: "cat-polri",
    };
    const categoryId = catMap[rawCat];
    if (!categoryId) {
      errors.push(`Kategori "${row.category_slug}" tidak dikenali.`);
      fixSuggestions.push(
        "Isi kolom category dengan salah satu nilai: CPNS, SEKDIN, atau POLRI."
      );
    }

    // 3. Cek subtes
    if (!row.subtest_key || !row.subtest_key.trim()) {
      errors.push("Kolom section_key / subtest_key belum diisi.");
      fixSuggestions.push(
        "Isi kolom section_key dengan kode subtes seperti TWK, TIU, atau TKP."
      );
    }

    // 4. Cek pertanyaan & opsi A-E
    if (!row.prompt || row.prompt.trim().length < 5) {
      errors.push("Teks pertanyaan (question_text) kosong atau terlalu pendek.");
      fixSuggestions.push(
        "Pastikan kolom question_text berisi naskah soal minimal 5 karakter."
      );
    }

    const optEntries: { key: OptionKey; val: string }[] = [
      { key: "A", val: String(row.option_a ?? "") },
      { key: "B", val: String(row.option_b ?? "") },
      { key: "C", val: String(row.option_c ?? "") },
      { key: "D", val: String(row.option_d ?? "") },
      { key: "E", val: String(row.option_e ?? "") },
    ];
    for (const o of optEntries) {
      if (!o.val || !o.val.trim()) {
        errors.push(`Opsi jawaban ${o.key} belum diisi.`);
        fixSuggestions.push(
          `Lengkapi teks pilihan jawaban pada kolom option_${o.key.toLowerCase()}.`
        );
      }
    }

    // 5. Cek mode penilaian (single_correct vs weighted_options / TKP)
    const rawMode = (row.question_type || "").trim().toLowerCase();
    const hasIndividualScores =
      row.score_a !== undefined &&
      String(row.score_a).trim() !== "" &&
      row.score_b !== undefined &&
      String(row.score_b).trim() !== "";

    const isTkpMode =
      rawMode === "tkp" ||
      rawMode === "weighted_options" ||
      rawMode === "weighted" ||
      (subtestUpper === "TKP" && !row.correct_option) ||
      (hasIndividualScores && !row.correct_option);

    const qType: QuestionType = isTkpMode ? "tkp" : "multiple_choice";
    let correctOption: OptionKey | null = null;
    let tkpScores: TkpScoresMap | null = null;

    if (qType === "multiple_choice") {
      const key = (row.correct_option || "").trim().toUpperCase() as OptionKey;
      if (!["A", "B", "C", "D", "E"].includes(key)) {
        errors.push(
          `Kunci jawaban "${row.correct_option || ""}" tidak valid untuk soal Pilihan Ganda (${subtestUpper}).`
        );
        fixSuggestions.push(
          "Isi kolom correct_option dengan salah satu huruf: A, B, C, D, atau E."
        );
      } else {
        correctOption = key;
      }
    } else {
      // Cek apakah menggunakan 5 kolom terpisah (score_a s.d. score_e) atau string gabungan tkp_scores
      const parsedMap: Partial<TkpScoresMap> = {};
      if (hasIndividualScores) {
        parsedMap.A = Number(row.score_a);
        parsedMap.B = Number(row.score_b);
        parsedMap.C = Number(row.score_c);
        parsedMap.D = Number(row.score_d);
        parsedMap.E = Number(row.score_e);
      } else if (row.tkp_scores && row.tkp_scores.trim()) {
        row.tkp_scores
          .trim()
          .split(",")
          .forEach((pair) => {
            const [k, v] = pair.split(":").map((s) => s.trim().toUpperCase());
            if (
              ["A", "B", "C", "D", "E"].includes(k) &&
              !Number.isNaN(Number(v))
            ) {
              parsedMap[k as OptionKey] = Number(v);
            }
          });
      }

      const vals = (["A", "B", "C", "D", "E"] as OptionKey[]).map(
        (k) => parsedMap[k] ?? 0
      );
      const validSet = new Set(vals);
      if (
        vals.some((v) => v < 1 || v > 5 || !Number.isInteger(v)) ||
        validSet.size !== 5
      ) {
        errors.push(
          `Bobot skor TKP (A=${vals[0]}, B=${vals[1]}, C=${vals[2]}, D=${vals[3]}, E=${vals[4]}) tidak lengkap atau belum bernilai unik 1 sampai 5.`
        );
        fixSuggestions.push(
          "Isi kolom score_a, score_b, score_c, score_d, dan score_e dengan angka bulat 1, 2, 3, 4, dan 5 tanpa angka kembar."
        );
      } else {
        tkpScores = parsedMap as TkpScoresMap;
      }
    }

    // 6. Cek referensi gambar (jika bukan URL http/https atau path /... maka cek di paket gambar jika ada)
    const rawImg = (row.prompt_image || "").trim();
    const isDirectUrl =
      rawImg.startsWith("http://") ||
      rawImg.startsWith("https://") ||
      rawImg.startsWith("/") ||
      rawImg.startsWith("data:image/");

    if (rawImg && !isDirectUrl && normalizedImages.size > 0) {
      const imgName = rawImg.toUpperCase();
      if (!normalizedImages.has(imgName)) {
        errors.push(
          `File gambar "${rawImg}" belum dipilih pada tombol Pilih File Gambar Pendukung.`
        );
        fixSuggestions.push(
          `Pilih file "${rawImg}" pada tombol gambar, atau isi kolom image_url dengan URL langsung (https://...).`
        );
      }
    }

    const isValid = errors.length === 0;

    return {
      rowNumber: row.rowNumber,
      raw: {
        ...row,
        question_code: code,
      },
      isValid,
      errors,
      fixSuggestions,
      parsedQuestion: isValid
        ? {
            question_code: code,
            category_id: categoryId,
            institution_label:
              row.institution_label?.trim() || row.subtopic?.trim() || null,
            subtest_key: subtestUpper,
            question_type: qType,
            prompt: row.prompt.trim(),
            prompt_image_url: rawImg || null,
            assets: rawImg
              ? [
                  {
                    id: `asset-${code}-prompt`,
                    question_id: code,
                    placement: "prompt",
                    option_key: null,
                    storage_path: rawImg,
                    mime_type: "image/png",
                    byte_size: 0,
                    alt_text: "Gambar pertanyaan",
                    display_order: 1,
                    created_at: new Date().toISOString(),
                  },
                ]
              : undefined,
            options: optEntries.map((o) => ({
              key: o.key,
              text: o.val.trim(),
            })),
            correct_option: correctOption,
            tkp_scores: tkpScores,
            explanation: row.explanation?.trim() || null,
            status: "active",
            created_by: "usr-admin-01",
            reviewed_by: "usr-admin-01",
            reviewed_at: new Date().toISOString(),
          }
        : undefined,
    };
  });
}
