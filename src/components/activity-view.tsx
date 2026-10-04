"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CheckCircle2, Filter, Search, SlidersHorizontal, UserRoundCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryIcon } from "@/components/category-icon";
import { PageHeading } from "@/components/page-heading";
import { formatMoney, formatShortDate } from "@/lib/finance/format";
import type { FinanceSnapshot, FinanceTransaction, Person } from "@/lib/finance/types";
import { useLedgerSave } from "@/components/use-ledger-save";
import { people } from "@/lib/finance/ledger-types";
import { useHousehold } from "@/components/household-context";
import { monthLabel, expenseContribution } from "@/lib/finance/history";

import { CategorisationReview } from "./categorisation-review";

export function ActivityView({ initialTransactions, mode, month, batches = [], filters = {} }: { initialTransactions: FinanceTransaction[]; mode: "preview" | "live"; month: string; batches?: NonNullable<FinanceSnapshot["classificationBatches"]>; filters?: Record<string, string> }) {
  const { categoryNames: categories, personLabel } = useHousehold();
  const [query, setQuery] = useState(filters.search ?? "");
  const [category, setCategory] = useState(filters.category ?? "all");
  const [person, setPerson] = useState(filters.person ?? "all");
  const [status, setStatus] = useState(filters.status ?? "all");
  const [selectedMonth, setSelectedMonth] = useState(filters.month ?? month);
  const [flow, setFlow] = useState(filters.flow ?? "all");
  const [merchant, setMerchant] = useState(filters.merchant ?? "");
  const [visibleCount, setVisibleCount] = useState(40);
  const [optimistic, setOptimistic] = useState<{ source: FinanceTransaction[]; rows: FinanceTransaction[] } | null>(null);
  const { save, pending, message, error } = useLedgerSave();
  const deferredQuery = useDeferredValue(query);

  const transactions = optimistic?.source === initialTransactions ? optimistic.rows : initialTransactions;
  const months = [...new Set([month, ...transactions.map((item) => item.date.slice(0, 7))])].sort().reverse();

  const filtered = useMemo(() => {
    const search = deferredQuery.trim().toLowerCase();
    return transactions.filter((item) => {
      if (search && !`${item.merchantName ?? ""} ${item.description} ${item.category}`.toLowerCase().includes(search)) return false;
      if (category !== "all" && item.category !== category) return false;
      if (person !== "all" && item.person !== person) return false;
      if (status !== "all" && item.status !== status) return false;
      if (selectedMonth !== "all" && !item.date.startsWith(selectedMonth)) return false;
      if (flow !== "all" && item.isTransfer) return false;
      if (flow === "income" && item.category !== "Income") return false;
      if (flow === "spending" && expenseContribution(item) === 0) return false;
      if (merchant && (item.merchantName ?? item.description) !== merchant) return false;
      return true;
    });
  }, [category, deferredQuery, person, status, transactions, selectedMonth, flow, merchant]);

  function update(id: string, value: Partial<{ category: string; person: Person }>) {
    const item = transactions.find((transaction) => transaction.id === id);
    if (!item) return;
    const correction = { category: item.category, person: item.person, isTransfer: value.category ? value.category === "Transfer" : item.isTransfer, ...value };
    setOptimistic({ source: initialTransactions, rows: transactions.map((row) => row.id === id ? { ...row, ...correction } : row) });
    void save({ kind: "transaction", id, value: correction }, undefined, () => setOptimistic(null));
  }

  const reviewCount = transactions.filter((item) => item.person === "Unknown" && !item.isTransfer).length;

  return (
    <div>
      <PageHeading
        eyebrow="Transactions"
        title="Activity"
        description="Review every movement once, then teach the household ledger how it should be treated."
        action={<Badge variant="outline" className="w-fit gap-2 rounded-full bg-card px-3 py-1.5 font-normal"><span className={mode === "live" ? "size-2 rounded-full bg-emerald-500" : "size-2 rounded-full bg-amber-500"} />{mode === "live" ? "Live Redbark feed" : "Preview data"}</Badge>}
      />

      <p role="status" className={`mb-3 text-xs ${error ? "text-destructive" : "text-primary"}`}>{error || message}</p>
      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatusCard icon={<CheckCircle2 />} label="Categorised" value={`${Math.round((transactions.filter((item) => item.category !== "Uncategorised").length / Math.max(1, transactions.length)) * 100)}%`} detail="of imported activity" />
        <StatusCard icon={<UserRoundCheck />} label="Needs person" value={String(reviewCount)} detail="transactions to review" />
        <StatusCard icon={<Filter />} label="Showing" value={String(filtered.length)} detail={`of ${transactions.length} transactions`} />
      </section>

      <CategorisationReview transactions={transactions} categories={categories} batches={batches} />

      <Card className="shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search merchant or description" className="pl-9" aria-label="Search transactions" />
            </div>
            <FilterSelect value={category} onChange={setCategory} label="All categories" items={categories} />
            <Select value={selectedMonth} onValueChange={(value) => { setSelectedMonth(value); setVisibleCount(40); }}><SelectTrigger aria-label="Activity month"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All months</SelectItem>{months.map((value) => <SelectItem key={value} value={value}>{monthLabel(value)}</SelectItem>)}</SelectContent></Select>
            <FilterSelect value={person} onChange={setPerson} label="Everyone" items={people} itemLabel={personLabel} />
            <FilterSelect value={status} onChange={setStatus} label="All statuses" items={["posted", "pending"]} />
            <FilterSelect value={flow} onChange={setFlow} label="All movements" items={["income", "spending", "external"]} itemLabel={(value) => value === "external" ? "Exclude transfers" : value} />
          </div>
          {merchant ? <p className="mt-3 text-xs font-medium">Merchant: {merchant}</p> : null}
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setQuery(""); setCategory("all"); setPerson("all"); setStatus("all"); setFlow("all"); setMerchant(""); setSelectedMonth("all"); }}>Clear filters</Button>
          <p className="mt-2 text-xs text-muted-foreground">Matching net movement: {formatMoney(filtered.reduce((sum, item) => sum + item.amount, 0))}. All movements includes transfers.</p>
        </CardContent>
      </Card>

      <div className="mt-4 space-y-3">
        {filtered.length ? filtered.slice(0, visibleCount).map((item) => (
          <Card key={item.id} className="shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CategoryIcon name={categoryIcon(item.category)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.merchantName ?? item.description}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.accountName} · {formatShortDate(item.date)}</p>
                      {item.categorySource === "suggested" ? <p className="mt-1 text-[11px] text-muted-foreground">Suggested category · check before relying on it</p> : null}
                      {item.reviewReason ? <p className="mt-1 max-w-lg text-[11px] text-amber-700">{item.reviewReason}</p> : null}
                    </div>
                    <div className="text-right">
                      <p className={item.amount > 0 ? "font-semibold text-emerald-700" : "font-semibold"}>{formatMoney(item.amount)}</p>
                      {item.status === "pending" ? <span className="text-[10px] font-medium text-amber-700">PENDING</span> : null}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[190px_150px_1fr] sm:items-center">
                    <select disabled={pending} value={item.category} onChange={(event) => update(item.id, { category: event.target.value })} className="h-8 rounded-lg border bg-background px-2 text-xs" aria-label={`Category for ${item.merchantName ?? item.description}`}>
                      {categories.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <select disabled={pending} value={item.person} onChange={(event) => update(item.id, { person: event.target.value as Person })} className="h-8 rounded-lg border bg-background px-2 text-xs" aria-label={`Person for ${item.merchantName ?? item.description}`}>
                      {people.map((value) => <option key={value} value={value}>{personLabel(value)}</option>)}
                    </select>
                    <div className="flex justify-end">
                      <Button disabled={pending} variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" onClick={() => save({ kind: "rule", id: `merchant-${item.id}`, value: { match: (item.merchantName ?? item.description).slice(0, 120), category: item.category, person: item.person } })}><SlidersHorizontal className="size-3.5" /> Use for this merchant</Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )) : (
          <Card className="border-dashed shadow-none"><CardContent className="grid min-h-48 place-items-center text-center"><div><Search className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No matching transactions</p><p className="mt-1 text-xs text-muted-foreground">Try clearing one of the filters.</p></div></CardContent></Card>
        )}
      </div>
      {filtered.length > visibleCount ? <Button variant="outline" className="mt-4" onClick={() => setVisibleCount((count) => count + 40)}>Show more ({filtered.length - visibleCount} remaining)</Button> : null}
    </div>
  );
}

function FilterSelect({ value, onChange, label, items, itemLabel = (item) => item }: { value: string; onChange: (value: string) => void; label: string; items: readonly string[]; itemLabel?: (item: string) => string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent><SelectItem value="all">{label}</SelectItem>{items.map((item) => <SelectItem key={item} value={item}>{itemLabel(item)}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function StatusCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <Card className="shadow-xs"><CardContent className="flex items-center gap-3 p-4"><span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary [&>svg]:size-4">{icon}</span><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 text-lg font-semibold leading-none">{value} <span className="text-xs font-normal text-muted-foreground">{detail}</span></p></div></CardContent></Card>;
}

function categoryIcon(category: string) {
  const mapping: Record<string, string> = { Groceries: "basket", "Eating out": "utensils", Transport: "car", Clothing: "shirt", Utilities: "zap", Entertainment: "ticket", Health: "health", Mortgage: "mortgage", Transfer: "transfer" };
  return mapping[category] ?? "other";
}
