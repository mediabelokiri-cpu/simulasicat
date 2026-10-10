"use client";

import React from "react";
import Link from "next/link";
import {
  Clock,
  BookOpen,
  CalendarClock,
  PlayCircle,
  Lock,
  Globe,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { StatusBadge, Button } from "@/components/ui";
import { ExamRow, ExamRunRow } from "@/types/database";
import { ExamEligibilityEvaluation } from "@/lib/exam";
import { formatDateTimeID, formatDuration } from "@/lib/utils";
import { INITIAL_CATEGORIES } from "@/lib/mock-store";

interface ExamCardProps {
  exam: ExamRow;
  run: ExamRunRow;
  questionCount: number;
  eligibility: ExamEligibilityEvaluation;
  onStartOrResume: (run: ExamRunRow) => void;
  onViewDetail?: (exam: ExamRow, run: ExamRunRow) => void;
}

export function ExamCard({
  exam,
  run,
  questionCount,
  eligibility,
  onStartOrResume,
  onViewDetail,
}: ExamCardProps) {
  const categoryName =
    INITIAL_CATEGORIES.find((c) => c.id === exam.category_id)?.name ||
    exam.category_id;

  function renderStatusBadge() {
    switch (eligibility.displayStatus) {
      case "in_progress":
        return (
          <StatusBadge
            variant="ongoing"
            label={eligibility.statusLabel}
            size="sm"
          />
        );
      case "ready_to_start":
        return (
          <StatusBadge
            variant="active"
            label={eligibility.statusLabel}
            size="sm"
          />
        );
      case "waiting_schedule":
      case "not_activated":
        return (
          <StatusBadge
            variant="scheduled"
            label={eligibility.statusLabel}
            size="sm"
          />
        );
      case "completed":
        return (
          <StatusBadge
            variant="completed"
            label={eligibility.statusLabel}
            size="sm"
          />
        );
      default:
        return (
          <StatusBadge
            variant="locked"
            label={eligibility.statusLabel}
            size="sm"
          />
        );
    }
  }

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition-colors hover:border-[#0b49d0]/40 space-y-4">
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-lg bg-[#eef4ff] px-2.5 py-1 text-xs font-bold text-[#0b49d0]">
              {categoryName}
            </span>
            {exam.institution_label && (
              <span className="rounded-lg bg-[#ffc63d] px-2.5 py-1 text-xs font-bold text-[#151515]">
                {exam.institution_label}
              </span>
            )}
          </div>
          {renderStatusBadge()}
        </div>

        {/* Title & Run Name */}
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#151515] leading-snug">
            {run.name}
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500">{exam.title}</p>
        </div>

        {exam.description && (
          <p className="text-xs sm:text-sm text-neutral-600 line-clamp-2 leading-relaxed">
            {exam.description}
          </p>
        )}

        {/* Metadata Grid */}
        <dl className="grid grid-cols-2 gap-2.5 rounded-xl border border-neutral-100 bg-[#fcfbf7] p-3 text-xs">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 shrink-0 text-[#0b49d0]" />
            <div>
              <dt className="text-neutral-500">Jumlah Soal</dt>
              <dd className="font-bold text-[#151515] tabular-nums">
                {questionCount} Butir
              </dd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-[#0b49d0]" />
            <div>
              <dt className="text-neutral-500">Durasi</dt>
              <dd className="font-bold text-[#151515] tabular-nums">
                {formatDuration(exam.duration_minutes)}
              </dd>
            </div>
          </div>

          <div className="flex items-center gap-2 col-span-2 border-t border-neutral-200/70 pt-2">
            <CalendarClock className="h-4 w-4 shrink-0 text-[#0b49d0]" />
            <div className="min-w-0 flex-1">
              <dt className="text-neutral-500">Jadwal Sesi</dt>
              <dd className="font-semibold text-[#151515] tabular-nums truncate">
                {formatDateTimeID(run.scheduled_start)}
              </dd>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-600 border border-neutral-200">
              {exam.access_mode === "open" ? (
                <>
                  <Globe className="h-3 w-3 text-emerald-600" /> Terbuka
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3 text-amber-600" /> Terbatas
                </>
              )}
            </span>
          </div>
        </dl>

        {/* Reason if blocked */}
        {!eligibility.canStart && eligibility.reasonIfBlocked && (
          <div className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2.5 text-xs text-neutral-600">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <span>{eligibility.reasonIfBlocked}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
        {onViewDetail && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetail(exam, run)}
            leftIcon={<Eye className="h-3.5 w-3.5" />}
          >
            Detail Aturan
          </Button>
        )}

        {eligibility.displayStatus === "completed" &&
        eligibility.completedSession ? (
          <Link
            href={`/hasil?sessionId=${eligibility.completedSession.id}`}
            className="flex-1 sm:flex-initial"
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              leftIcon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            >
              Lihat Hasil
            </Button>
          </Link>
        ) : eligibility.canStart ? (
          <Button
            variant={eligibility.canResume ? "accent" : "primary"}
            size="sm"
            onClick={() => onStartOrResume(run)}
            className="flex-1 sm:flex-initial"
            leftIcon={<PlayCircle className="h-4 w-4" />}
          >
            {eligibility.canResume
              ? "Lanjutkan Ujian (Resume)"
              : "Mulai Ujian"}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="flex-1 sm:flex-initial"
            leftIcon={<Lock className="h-3.5 w-3.5" />}
          >
            {eligibility.statusLabel}
          </Button>
        )}
      </div>
    </article>
  );
}
