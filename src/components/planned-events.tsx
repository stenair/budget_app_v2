"use client";
import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { useLedgerSave } from "./use-ledger-save";
import { useHousehold } from "./household-context";
import { formatMoney, formatShortDate } from "@/lib/finance/format";
import type { PlannedEvent } from "@/lib/finance/ledger-types";

export function PlannedEvents({ events, asOf }: { events: PlannedEvent[]; asOf: string }) {
  const { categoryNames } = useHousehold();
  const { save, pending, message, error } = useLedgerSave();
  const [draft, setDraft] = useState<PlannedEvent | null>(null);
  const [dollars, setDollars] = useState("");
  const [type, setType] = useState("expense");
  const tomorrowDate = new Date(`${asOf}T00:00:00Z`); tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0,10);
  const edit = (item?: PlannedEvent) => { setDraft(item ?? { id: `event-${crypto.randomUUID()}`, name: "", date: tomorrow, amount: -10000, category: "Other", active: true }); setDollars(String(Math.abs(item?.amount ?? 10000) / 100)); setType(item && item.amount > 0 ? "income" : "expense"); };
  return <Card className="mt-4"><CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle className="text-base">Known one-off income and expenses</CardTitle><p className="mt-1 text-xs text-muted-foreground">Plan a holiday, annual bill or bonus. These amounts are additional to monthly budgets; do not add a bill already covered by a budget.</p></div><Button size="sm" variant="outline" onClick={() => edit()}>Add one-off</Button></CardHeader><CardContent>
    <p role="status" className={`text-xs ${error ? "text-destructive" : "text-primary"}`}>{error || message}</p>
    {draft ? <form className="my-3 grid gap-3 rounded-lg border p-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void save({ kind: "event", id: draft.id, value: { ...draft, category: type === "income" ? "Income" : draft.category === "Income" ? "Other" : draft.category, amount: Math.round(Number(dollars) * 100) * (type === "expense" ? -1 : 1) } }, () => setDraft(null)); }}>
      <label className="text-xs">One-off name<Input required maxLength={80} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label className="text-xs">Expected date<Input type="date" required min={tomorrow} value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
      <label className="text-xs">Amount ($)<Input type="number" min="0.01" max="1000000" step="0.01" required value={dollars} onChange={(event) => setDollars(event.target.value)} /></label>
      <label className="text-xs">Direction<select className="mt-1 h-10 w-full rounded-md border px-2" value={type} onChange={(event) => setType(event.target.value)}><option value="expense">Expense</option><option value="income">Income</option></select></label>
      {type === "expense" ? <label className="text-xs">One-off category<select className="mt-1 h-10 w-full rounded-md border px-2" value={draft.category === "Income" ? "Other" : draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{categoryNames.filter((category) => !["Income", "Transfer", "Uncategorised"].includes(category)).map((category) => <option key={category}>{category}</option>)}</select></label> : null}
      <div className="flex items-end gap-2"><Button size="sm" disabled={pending}>Save one-off</Button><Button size="sm" variant="ghost" type="button" onClick={() => setDraft(null)}>Cancel</Button></div>
    </form> : null}
    <div className="divide-y">{events.filter((item) => item.active).sort((a,b) => a.date.localeCompare(b.date)).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div className="min-w-0"><p className="break-words text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{formatShortDate(item.date)} {item.date.slice(0,4)} · {item.date <= asOf ? "Past or due today · already excluded from future forecast" : "Included once in forecast"}</p></div><div className="flex items-center gap-2"><span className="text-sm font-semibold">{formatMoney(item.amount)}</span><Button size="sm" variant="ghost" onClick={() => edit(item)}>Edit</Button><Button disabled={pending} size="sm" variant="outline" onClick={() => save({ kind: "event", id: item.id, value: { ...item, active: false } })}>Remove</Button></div></div>)}</div>
    <details className="mt-3 text-xs"><summary className="cursor-pointer">Restore removed one-offs</summary>{events.filter((item) => !item.active).map((item) => <div key={item.id} className="mt-2 flex justify-between gap-2"><span>{item.name}</span><Button disabled={pending} variant="outline" size="sm" onClick={() => save({ kind: "event", id: item.id, value: { ...item, active: true } })}>Restore</Button></div>)}</details>
  </CardContent></Card>;
}
