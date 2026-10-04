"use client";
import { useState } from "react";
import { monthLabel } from "@/lib/finance/history";
import { formatMoney } from "@/lib/finance/format";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export function MonthlyChart({ rows, onSelect }: { rows: Array<{ month: string; income: number; spending: number; surplus: number; current: boolean; unclassifiedCredits?: number; netMovement?: number }>; onSelect?: (month: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const max = Math.max(1, ...rows.flatMap((row) => [Math.abs(row.income), Math.abs(row.spending)]));
  return <div>
    <div className="mb-4 flex flex-wrap gap-4 text-xs"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-emerald-600" />Income</span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-orange-500" />Net expenses</span><span className="text-muted-foreground">Scale {formatMoney(max)} · posted only</span></div>
    <div className="overflow-x-auto"><div className="flex min-w-full items-end gap-3 border-b pb-2" style={{ minWidth: rows.length * 90 }}>
      {rows.map((row) => <div key={row.month} className="min-w-20 flex-1 rounded-lg p-1 text-center">
        <div className="flex h-44 items-end justify-center gap-2 border-t border-dashed border-border">
          {[{ label: "Income", value: row.income, color: "bg-emerald-600" }, { label: "Net expenses", value: row.spending, color: row.spending < 0 ? "bg-blue-500" : "bg-orange-500" }].map((bar) => {
            const label = `${monthLabel(row.month)} · ${bar.label}: ${formatMoney(bar.value)}${bar.value < 0 ? " (refunds exceed purchases)" : ""}`;
            return <Tooltip key={bar.label}><TooltipTrigger asChild><button type="button" aria-label={label} onClick={() => setSelected(label)} className={`w-7 rounded-t focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${bar.color}`} style={{ height: Math.max(bar.value === 0 ? 2 : 5, Math.abs(bar.value) / max * 176) }} /></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
          })}
        </div>
        {onSelect ? <button className="mt-2 rounded px-1 text-xs font-medium text-primary hover:underline focus-visible:outline-2" onClick={() => onSelect(row.month)} aria-label={`View transactions for ${monthLabel(row.month)}`}>{monthLabel(row.month)} →</button> : <p className="mt-2 text-xs font-medium">{monthLabel(row.month)}</p>}
        <p className="text-[10px] text-muted-foreground">{row.current ? "Month to date" : "Imported history"}</p>
        <p className={`mt-1 text-xs font-semibold ${(row.netMovement ?? row.surplus) < 0 ? "text-orange-700" : "text-emerald-700"}`}>{formatMoney(row.netMovement ?? row.surplus, { showSign: true })}</p>
        {row.unclassifiedCredits ? <p className="text-[10px] text-amber-700">{formatMoney(row.unclassifiedCredits)} inflows to review</p> : null}
      </div>)}
    </div></div>
    <p role="status" className="mt-3 min-h-4 text-xs text-muted-foreground">{selected ?? "Hover or focus a bar for its amount; tap a bar on mobile. Amounts below months show net movement."}</p>
  </div>;
}
