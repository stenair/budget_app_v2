"use client";
import { monthLabel } from "@/lib/finance/history";
import { formatMoney } from "@/lib/finance/format";

export function MonthlyChart({ rows, onSelect }: { rows: Array<{ month: string; income: number; spending: number; surplus: number; current: boolean }>; onSelect?: (month: string) => void }) {
  const max = Math.max(1, ...rows.flatMap((row) => [row.income, row.spending]));
  return <div>
    <div className="mb-4 flex flex-wrap gap-4 text-xs"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-emerald-600" />Income</span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-orange-500" />Expenses</span><span className="text-muted-foreground">Scale {formatMoney(max)} · posted only</span></div>
    <div className="overflow-x-auto"><div className="flex min-w-full items-end gap-3 border-b pb-2" style={{ minWidth: rows.length * 90 }}>
      {rows.map((row) => <button key={row.month} type="button" disabled={!onSelect} onClick={() => onSelect?.(row.month)} className="group min-w-20 flex-1 rounded-lg p-1 text-center transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-100" aria-label={`${monthLabel(row.month)}: income ${formatMoney(row.income)}, expenses ${formatMoney(row.spending)}, surplus ${formatMoney(row.surplus)}${onSelect ? ". View this month" : ""}`}>
        <div className="flex h-44 items-end justify-center gap-2 border-t border-dashed border-border" aria-hidden="true"><div title={formatMoney(row.income)} className="w-5 rounded-t bg-emerald-600" style={{ height: `${Math.max(0, row.income) / max * 100}%` }} /><div title={formatMoney(row.spending)} className="w-5 rounded-t bg-orange-500" style={{ height: `${Math.max(0, row.spending) / max * 100}%` }} /></div>
        <p className="mt-2 text-xs font-medium">{monthLabel(row.month)}</p><p className="text-[10px] text-muted-foreground">{row.current ? "Month to date" : "Imported history"}</p>
        <p className={`mt-1 text-xs font-semibold ${row.surplus < 0 ? "text-orange-700" : "text-emerald-700"}`}>{formatMoney(row.surplus, { showSign: true })}</p>
      </button>)}
    </div></div>
  </div>;
}
