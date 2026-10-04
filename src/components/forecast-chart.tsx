"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/finance/format";
import type { ForecastPoint } from "@/lib/finance/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ForecastChart({ points, comparison }: { points: Array<ForecastPoint & { value: number }>; comparison: boolean }) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const selected = points.find((point) => point.month === selectedMonth) ?? points.at(-1);
  const width = 760;
  const height = 260;
  const pad = 18;
  const values = points.flatMap((point) => comparison ? [point.baseline, point.value] : [point.baseline]);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const margin = Math.max(10000, (high - low) * 0.08);
  const min = low - margin;
  const max = high + margin;
  const y = (value: number) => height - pad - ((value - min) / (max - min)) * (height - pad * 2);
  const coords = points.map((point, index) => ({ x: pad + index / Math.max(1, points.length - 1) * (width - pad * 2), baseline: y(point.baseline), scenario: y(point.value) }));
  const line = (field: "baseline" | "scenario") => coords.map((point, index) => `${index ? "L" : "M"}${point.x},${point[field]}`).join(" ");
  const gap = `${line("baseline")} ${coords.toReversed().map((point) => `L${point.x},${point.scenario}`).join(" ")} Z`;
  const delta = (selected?.value ?? 0) - (selected?.baseline ?? 0);
  return <div className="rounded-xl bg-secondary/45 p-3">
    <div className="mb-3 flex flex-wrap gap-4 text-xs"><span className="flex items-center gap-2"><i className="h-0.5 w-5 bg-emerald-700" />Saved plan · sliders at zero</span>{comparison ? <span className="flex items-center gap-2"><i className="h-0.5 w-5 bg-blue-600" />Your scenario · shaded gap is the difference</span> : null}</div>
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full sm:h-64" style={{ minWidth: Math.max(320, points.length * 32) }} role="group" aria-label={`Monthly net liquid forecast from ${points[0]?.label} to ${points.at(-1)?.label}`}>
        {[0, 0.5, 1].map((fraction) => <g key={fraction}><line x1={pad} x2={width - pad} y1={pad + fraction * (height - pad * 2)} y2={pad + fraction * (height - pad * 2)} stroke="var(--border)" strokeDasharray="4 6" /><text x={pad} y={pad + fraction * (height - pad * 2) - 4} fontSize="10" fill="var(--muted-foreground)">{formatMoney(max - fraction * (max - min), { compact: true })}</text></g>)}
        {comparison ? <path d={gap} fill="#2563eb" fillOpacity="0.13" /> : null}
        <path d={line("baseline")} fill="none" stroke="#047857" strokeWidth="3" strokeLinecap="round" />
        {comparison ? <path d={line("scenario")} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeDasharray="7 4" /> : null}
        {points.map((point, index) => {
          const coordinate = coords[index];
          const difference = point.value - point.baseline;
          const label = `${point.label}: baseline ${formatMoney(point.baseline)}${comparison ? `, scenario ${formatMoney(point.value)}, difference ${formatMoney(difference, { showSign: true })}` : ""}`;
          const choose = () => setSelectedMonth(point.month);
          return <Tooltip key={point.month}><TooltipTrigger asChild><g role="button" tabIndex={0} aria-label={label} onClick={choose} onFocus={choose} onMouseEnter={choose} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(); } }} className="cursor-pointer outline-none">
            <rect x={coordinate.x - (width - pad * 2) / Math.max(1, points.length - 1) / 2} y={0} width={(width - pad * 2) / Math.max(1, points.length - 1)} height={height} fill="transparent" />
            {selected?.month === point.month ? <line x1={coordinate.x} x2={coordinate.x} y1={pad} y2={height - pad} stroke="var(--muted-foreground)" strokeDasharray="3 4" opacity="0.5" /> : null}
            <circle cx={coordinate.x} cy={coordinate.baseline} r={selected?.month === point.month ? 5 : 3.5} fill="var(--card)" stroke="#047857" strokeWidth="2" />
            {comparison ? <circle cx={coordinate.x} cy={coordinate.scenario} r={selected?.month === point.month ? 5 : 3.5} fill="var(--card)" stroke="#2563eb" strokeWidth="2" /> : null}
          </g></TooltipTrigger><TooltipContent><p>{point.label}</p><p>Baseline {formatMoney(point.baseline)}</p>{comparison ? <><p>Scenario {formatMoney(point.value)}</p><p>Difference {formatMoney(difference, { showSign: true })}</p></> : null}</TooltipContent></Tooltip>;
        })}
      </svg>
    </div>
    <div className="mt-3 border-t pt-3">
      <label className="flex items-center gap-2 text-xs">Inspect month<select aria-label="Inspect forecast month" className="min-w-0 flex-1 rounded-md border bg-background p-2" value={selected?.month ?? ""} onChange={(event) => setSelectedMonth(event.target.value)}>{points.map((point) => <option key={point.month} value={point.month}>{point.label}</option>)}</select></label>
      <div role="status" className="mt-3 grid gap-2 text-xs sm:grid-cols-3"><p>Baseline <strong className="block text-sm text-emerald-700">{formatMoney(selected?.baseline ?? 0)}</strong></p>{comparison ? <><p>Your scenario <strong className="block text-sm text-blue-600">{formatMoney(selected?.value ?? 0)}</strong></p><p>Difference <strong className={`block text-sm ${delta < 0 ? "text-orange-700" : "text-emerald-700"}`}>{formatMoney(delta, { showSign: true })}</strong></p></> : null}</div>
      <p className="mt-3 text-[11px] text-muted-foreground">Hover, focus or tap any monthly point. On longer forecasts, scroll the chart or select a month above.</p>
    </div>
  </div>;
}
