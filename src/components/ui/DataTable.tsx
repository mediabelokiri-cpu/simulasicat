import React from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./States";

export interface ColumnDef<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface MobileRecordCardField {
  label: string;
  value: React.ReactNode;
}

interface MobileRecordCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  fields?: MobileRecordCardField[];
  actions?: React.ReactNode;
  className?: string;
}

export function MobileRecordCard({
  title,
  subtitle,
  badge,
  fields = [],
  actions,
  className,
}: MobileRecordCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs space-y-3",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-sm sm:text-base font-bold text-[#151515] break-words">
            {title}
          </div>
          {subtitle && (
            <div className="mt-0.5 text-xs text-neutral-600 break-words">
              {subtitle}
            </div>
          )}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {fields.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-neutral-100 pt-2.5 text-xs">
          {fields.map((f, idx) => (
            <div key={idx} className="min-w-0">
              <dt className="text-neutral-500 font-medium">{f.label}</dt>
              <dd className="mt-0.5 font-semibold text-[#151515] break-words">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {actions && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-100 pt-3">
          {actions}
        </div>
      )}
    </div>
  );
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (row: T) => string;
  renderMobileCard: (row: T) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  renderMobileCard,
  emptyTitle = "Belum ada data",
  emptyDescription = "Data yang Anda cari belum tersedia atau tidak ditemukan.",
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile Card List (No horizontal scroll) */}
      <div className="space-y-3 md:hidden">
        {data.map((row) => (
          <React.Fragment key={keyExtractor(row)}>
            {renderMobileCard(row)}
          </React.Fragment>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/80 text-xs font-bold uppercase tracking-wider text-neutral-600">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn("px-4 py-3.5", col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="transition-colors hover:bg-[#eef4ff]/40"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3.5 align-middle text-[#151515]",
                      col.className
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
