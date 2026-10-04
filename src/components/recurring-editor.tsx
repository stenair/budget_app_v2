"use client";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLedgerSave } from "@/components/use-ledger-save";
import { formatMoney } from "@/lib/finance/format";
import { useHousehold } from "@/components/household-context";
import type { RecurringItem } from "@/lib/finance/ledger-types";

export function RecurringEditor({ items }: { items: RecurringItem[] }) {
  const { categoryNames: categories } = useHousehold();
  const [draft, setDraft] = useState<RecurringItem | null>(null);
  const [direction, setDirection] = useState("expense");
  const [dollars, setDollars] = useState("");
  const { save, pending, error, message } = useLedgerSave();
  function edit(item?: RecurringItem) {
    setDraft(item ?? { id: crypto.randomUUID(), name: "", category: "Mortgage", amount: -10000, day: 1, person: "Shared", active: true });
    setDollars(String(Math.abs(item?.amount ?? 10000) / 100)); setDirection(item && item.amount > 0 ? "income" : "expense");
  }
  return <Card className="mt-4 shadow-xs"><CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle className="text-base">Recurring income and bills</CardTitle><p className="mt-1 text-xs text-muted-foreground">Monthly schedule. Choose income or expense and enter a positive amount.</p></div><Button variant="outline" size="sm" className="gap-1.5" onClick={() => edit()}><Plus className="size-3.5" />Add</Button></CardHeader><CardContent>
    <p role="status" className={`mb-3 text-xs ${error ? "text-destructive" : "text-primary"}`}>{error || message}</p>
    {draft ? <form className="mb-5 grid gap-3 rounded-xl border bg-background p-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); save({ kind: "recurring", id: draft.id, value: { ...draft, category: direction === "income" ? "Income" : draft.category === "Income" ? "Other" : draft.category, amount: Math.round(Number(dollars) * 100) * (direction === "expense" ? -1 : 1) } }, () => setDraft(null)); }}>
      <label className="text-xs font-medium">Name<Input required maxLength={80} className="mt-1" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label className="text-xs font-medium">Monthly amount ($)<Input required className="mt-1" type="number" min="0.01" max="1000000" step="0.01" value={dollars} onChange={(event) => setDollars(event.target.value)} /></label>
      <label className="text-xs font-medium">Income or expense<select className="mt-1 h-10 w-full rounded-md border px-2" value={direction} onChange={(event) => { setDirection(event.target.value); if(event.target.value === "expense" && draft.category === "Income") setDraft({ ...draft, category: "Other" }); }}><option value="expense">Expense</option><option value="income">Income</option></select></label>
      <div><p className="mb-1 text-xs font-medium">Category</p><Select value={direction === "income" ? "Income" : draft.category} onValueChange={(category) => setDraft({ ...draft, category })}><SelectTrigger aria-label="Recurring category"><SelectValue /></SelectTrigger><SelectContent>{categories.filter((category) => category !== "Transfer" && (direction === "income" ? category === "Income" : category !== "Income")).map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div>
      <label className="text-xs font-medium">Day of month<Input required className="mt-1" type="number" min={1} max={31} value={draft.day} onChange={(event) => setDraft({ ...draft, day: Number(event.target.value) })} /></label>
      <p className="text-[11px] leading-5 text-muted-foreground sm:col-span-2">A scheduled bill uses its category budget where available. Harbour uses the larger of the category budget or scheduled bills, so they are not counted twice in the forecast.</p>
      <div className="flex flex-wrap gap-2 sm:col-span-2"><Button disabled={pending} type="submit" size="sm">{pending ? "Saving" : "Save schedule"}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button><Button disabled={pending} type="button" size="sm" variant="outline" onClick={() => save({ kind: "recurring", id: draft.id, value: { ...draft, active: false } }, () => setDraft(null))}>Stop recurring</Button></div>
    </form> : null}
    <details className="mb-3 text-xs"><summary className="cursor-pointer">Restore stopped schedules</summary>{items.filter((item) => !item.active).map((item) => <div key={item.id} className="mt-2 flex justify-between gap-2"><span>{item.name}</span><Button disabled={pending} size="sm" variant="outline" onClick={() => save({ kind: "recurring", id: item.id, value: { ...item, active: true } })}>Restore schedule</Button></div>)}</details>
    <div className="divide-y">{items.some((item) => item.active) ? items.filter((item) => item.active).map((item) => <div key={item.id} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="mt-0.5 text-xs text-muted-foreground">Day {item.day} · {item.category}</p></div><span className={`text-sm font-semibold ${item.amount > 0 ? "text-emerald-700" : ""}`}>{formatMoney(item.amount)}</span><Button variant="ghost" size="icon" aria-label={`Edit ${item.name}`} onClick={() => edit(item)}><Pencil className="size-3.5" /></Button></div>) : <p className="py-5 text-sm text-muted-foreground">Add your salary schedule and regular bills to build a forecast.</p>}</div>
  </CardContent></Card>;
}
