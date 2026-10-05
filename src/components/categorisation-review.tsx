"use client";
import { isCashFlowMovement } from "@/lib/finance/history";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLedgerSave } from "./use-ledger-save";
import { formatMoney, formatShortDate } from "@/lib/finance/format";
import type { FinanceSnapshot, FinanceTransaction } from "@/lib/finance/types";

export function CategorisationReview({ transactions, categories, batches }: { transactions: FinanceTransaction[]; categories: string[]; batches: NonNullable<FinanceSnapshot["classificationBatches"]> }) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [count, setCount] = useState(8);
  const { save, pending, message, error } = useLedgerSave();
  const groups = new Map<string, FinanceTransaction[]>();
  for (const item of transactions) {
    if (item.category !== "Uncategorised" || item.categorySource === "manual" || !isCashFlowMovement(item) || item.status !== "posted" || item.currency.toLowerCase() !== "aud") continue;
    // Keep incoming and outgoing money separate, using exact merchant text.
    const key = JSON.stringify([item.merchantName ?? item.description, item.amount > 0]);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const rows = [...groups].sort((a, b) => b[1].length - a[1].length).filter(([, items]) => (items[0].merchantName ?? items[0].description).toLowerCase().includes(search.toLowerCase()));
  return <details className="mb-4 rounded-xl border bg-card p-4">
    <summary className="cursor-pointer text-sm font-semibold">Review historical categories · {groups.size} merchant groups</summary>
    <p className="mt-3 text-xs text-muted-foreground">Across all imported months. Inspect each group before approving. This changes only the listed transactions’ categories; people and transfer flags stay as they are. Pending transactions and existing manual category decisions are excluded. No future merchant rule is created.</p>
    <input aria-label="Search review merchants" placeholder="Find a merchant to review" value={search} onChange={(event) => { setSearch(event.target.value); setCount(8); }} className="mt-3 h-9 w-full rounded-md border px-3 text-sm" />
    <p role="status" className={`mt-2 text-xs ${error ? "text-destructive" : "text-primary"}`}>{error || message}</p>
    <div className="mt-3 space-y-3">{rows.slice(0, count).map(([key, items]) => {
      const chunk = items.slice(0, 100);
      const incoming = items[0].amount > 0;
      return <div key={key} className="rounded-lg border p-3">
        <p className="break-words text-sm font-medium">{items[0].merchantName ?? items[0].description}</p>
        <p className="mt-1 text-xs text-muted-foreground">{items.length} {incoming ? "incoming" : "outgoing"} transactions · {formatMoney(items.reduce((sum, item) => sum + Math.abs(item.amount), 0))}</p>
        <details className="mt-2 text-xs"><summary className="cursor-pointer">Inspect transactions before applying</summary><ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">{chunk.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-1"><span>{formatShortDate(item.date)} · {item.accountName}</span><span>{formatMoney(item.amount)}</span></li>)}</ul></details>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select aria-label={`Review category for ${items[0].merchantName ?? items[0].description} ${incoming ? "incoming" : "outgoing"}`} value={choices[key] ?? ""} onChange={(event) => setChoices({ ...choices, [key]: event.target.value })} className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs"><option value="">Choose a category after reviewing</option>{categories.filter((category) => !["Transfer", "Uncategorised"].includes(category) && (incoming || category !== "Income")).map((category) => <option key={category}>{category}</option>)}</select>
          <Button size="sm" disabled={pending || !choices[key]} onClick={() => save({ kind: "classification", id: `review-${crypto.randomUUID()}`, value: { category: choices[key], transactionIds: chunk.map((item) => item.id), active: true } })}>Apply to these {chunk.length}</Button>
        </div>
        {incoming ? <p className="mt-2 text-xs text-muted-foreground">Choose Income only for genuine income. Choosing an expense category treats this credit as a refund.</p> : null}
        {items.length > 100 ? <p className="mt-2 text-xs">Reviewing the first 100. The remainder will stay in the queue.</p> : null}
      </div>;
    })}</div>
    {!rows.length ? <p className="mt-3 text-sm">No uncategorised posted transactions match.</p> : null}
    {rows.length > count ? <Button variant="outline" size="sm" className="mt-3" onClick={() => setCount(count + 8)}>Show more merchants</Button> : null}
    {batches.some((batch) => batch.active) ? <details className="mt-4 text-xs"><summary className="cursor-pointer font-medium">Undo an approved batch</summary><div className="mt-2 space-y-2">{batches.filter((batch) => batch.active).map((batch) => <div key={batch.id} className="flex items-center justify-between gap-3"><span>{batch.category} · {batch.transactionIds.length} transactions</span><Button size="sm" variant="outline" disabled={pending} onClick={() => save({ kind: "classification", id: batch.id, value: { category: batch.category, transactionIds: batch.transactionIds, active: false } })}>Undo</Button></div>)}</div></details> : null}
  </details>;
}
