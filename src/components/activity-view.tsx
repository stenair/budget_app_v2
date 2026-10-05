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

import { monthLabel, expenseContribution, isCashFlowMovement } from "@/lib/finance/history";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { CategorisationReview } from "./categorisation-review";

export function ActivityView({ initialTransactions, mode, month, batches = [], filters = {} }: { initialTransactions: FinanceTransaction[]; mode: "preview" | "live"; month: string; batches?: NonNullable<FinanceSnapshot["classificationBatches"]>; filters?: Record<string, string> }) {

  const { categoryNames: categories, personLabel } = useHousehold();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [from, setFrom] = useState(filters.from ?? "");
  const [to, setTo] = useState(filters.to ?? "");
  const [account, setAccount] = useState(filters.account ?? "all");
  const [review, setReview] = useState(filters.review ?? "all");
  const [ruleDraft, setRuleDraft] = useState<FinanceTransaction | null>(null);
  const [query, setQuery] = useState(filters.search ?? "");

  const [category, setCategory] = useState(filters.category ?? "all");

  const [person, setPerson] = useState(filters.person ?? "all");

  const [status, setStatus] = useState(filters.status ?? "all");

  const [selectedMonth, setSelectedMonth] = useState(filters.month ?? month);

  const [flow, setFlow] = useState(filters.flow ?? (filters.account ? "all" : "external"));

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

      if (from && item.date < from || to && item.date > to) return false;
      if (account !== "all" && item.accountId !== account) return false;
      if (review === "category" && (item.category !== "Uncategorised" || !isCashFlowMovement(item))) return false;
      if (review === "person" && (item.person !== "Unknown" || !isCashFlowMovement(item))) return false;
      if (review === "transfer" && !item.reviewReason) return false;
      if (search && !`${item.merchantName ?? ""} ${item.description} ${item.category}`.toLowerCase().includes(search)) return false;

      if (category !== "all" && item.category !== category) return false;

      if (person !== "all" && item.person !== person) return false;

      if (status !== "all" && item.status !== status) return false;

      if (selectedMonth !== "all" && !item.date.startsWith(selectedMonth)) return false;

      if (flow !== "all" && !isCashFlowMovement(item)) return false;

      if (flow === "income" && item.category !== "Income") return false;

      if (flow === "spending" && expenseContribution(item) === 0) return false;

      if (merchant && (item.merchantName ?? item.description) !== merchant) return false;

      return true;

    });

  }, [from, to, account, review, category, deferredQuery, person, status, transactions, selectedMonth, flow, merchant]);

  function update(id: string, value: Partial<{ category: string; person: Person }>) {

    const item = transactions.find((transaction) => transaction.id === id);

    if (!item) return;

    const correction = { category: item.category, person: item.person, isTransfer: value.category ? value.category === "Transfer" : item.isTransfer, ...value };

    setOptimistic({ source: initialTransactions, rows: transactions.map((row) => row.id === id ? { ...row, ...correction } : row) });

    void save({ kind: "transaction", id, value: { ...value, ...(value.category ? { isTransfer: value.category === "Transfer" } : {}) } }, undefined, () => setOptimistic(null));

  }

  const reviewCount = transactions.filter((item) => item.person === "Unknown" && isCashFlowMovement(item)).length;

  return (

    <div>

      <PageHeading

        eyebrow="Transactions"

        title="Activity"

        description="Review and categorise your household transactions."

        action={<Badge variant="outline" className="w-fit gap-2 rounded-full bg-card px-3 py-1.5 font-normal"><span className={mode === "live" ? "size-2 rounded-full bg-emerald-500" : "size-2 rounded-full bg-amber-500"} />{mode === "live" ? "Live Redbark feed" : "Preview data"}</Badge>}

      />

      <p role="status" className={`mb-3 text-xs ${error ? "text-destructive" : "text-primary"}`}>{error || message}</p>

      <section className="mb-4 grid gap-3 sm:grid-cols-3">

        <StatusCard icon={<CheckCircle2 />} label="Categorised" value={`${Math.round((transactions.filter((item) => isCashFlowMovement(item) && item.category !== "Uncategorised").length / Math.max(1, transactions.filter(isCashFlowMovement).length)) * 100)}%`} detail="of everyday activity" />

        <StatusCard icon={<UserRoundCheck />} label="Needs person" value={String(reviewCount)} detail="transactions to review" />

        <StatusCard icon={<Filter />} label="Showing" value={String(filtered.length)} detail={`of ${transactions.length} transactions`} />

      </section>

      <div className="mb-3 flex flex-wrap gap-2"><Button size="sm" variant={review === "category" ? "default" : "outline"} onClick={() => { setReview("category"); setSelectedMonth("all"); setCategory("all"); setFlow("external"); }}>Uncategorised</Button><Button size="sm" variant={review === "person" ? "default" : "outline"} onClick={() => { setReview("person"); setSelectedMonth("all"); }}>Needs person</Button><Button size="sm" variant={review === "transfer" ? "default" : "outline"} onClick={() => { setReview("transfer"); setSelectedMonth("all"); setFlow("all"); }}>Check transfers</Button></div>
      <CategorisationReview transactions={transactions} categories={categories} batches={batches} />

      <Button className="mb-3 w-full sm:hidden" variant="outline" aria-expanded={filtersOpen} aria-controls="activity-filters" onClick={() => setFiltersOpen(!filtersOpen)}>Filters · {selectedMonth === "all" ? "all months" : monthLabel(selectedMonth)}{category !== "all" ? ` · ${category}` : ""}</Button>
      <Card id="activity-filters" className={`shadow-xs ${filtersOpen ? "block" : "hidden sm:block"}`}>

        <CardContent className="p-4 sm:p-5">

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            <div className="relative">

              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search merchant or description" className="pl-9" aria-label="Search transactions" />

            </div>

            <select aria-label="Activity account" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={account} onChange={(event) => { setAccount(event.target.value); if (transactions.some((item) => item.accountId === event.target.value && item.accountType === "loan")) setFlow("all"); }}><option value="all">All accounts</option>{[...new Map(transactions.map((item) => [item.accountId, item.accountName]))].map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select>
            <select aria-label="Review filter" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={review} onChange={(event) => setReview(event.target.value)}><option value="all">All review states</option><option value="category">Uncategorised</option><option value="person">Needs person</option><option value="transfer">Check transfers</option></select>
            <FilterSelect value={category} onChange={setCategory} label="All categories" items={categories} />

            <Select value={selectedMonth} onValueChange={(value) => { setSelectedMonth(value); setVisibleCount(40); }}><SelectTrigger aria-label="Activity month"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All months</SelectItem>{months.map((value) => <SelectItem key={value} value={value}>{monthLabel(value)}</SelectItem>)}</SelectContent></Select>

            <FilterSelect value={person} onChange={setPerson} label="Everyone" items={people} itemLabel={personLabel} />

            <FilterSelect value={status} onChange={setStatus} label="All statuses" items={["posted", "pending"]} />

            <FilterSelect value={flow} onChange={setFlow} label="All movements" items={["income", "spending", "external"]} itemLabel={(value) => value === "external" ? "Everyday activity" : value} />

          </div>

          <details className="mt-3 text-xs"><summary className="cursor-pointer text-muted-foreground">Custom date range</summary><div className="mt-2 grid gap-2 sm:grid-cols-2"><label>From<Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>To<Input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div></details>
          {from || to ? <p className="mt-2 text-xs">Date range: {from || "start"} to {to || "latest"}</p> : null}
          {merchant ? <p className="mt-3 text-xs font-medium">Merchant: {merchant}</p> : null}

          <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setFrom(""); setTo(""); setAccount("all"); setReview("all"); setQuery(""); setCategory("all"); setPerson("all"); setStatus("all"); setFlow("external"); setMerchant(""); setSelectedMonth("all"); }}>Clear filters</Button>

          <p className="mt-2 text-xs text-muted-foreground">Cash flow in selection: {formatMoney(filtered.filter(isCashFlowMovement).reduce((sum, item) => sum + item.amount, 0))}. Transfers and loan-account entries excluded.</p>

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

                      {item.categorySource === "suggested" && isCashFlowMovement(item) ? <p className="mt-1 text-[11px] text-muted-foreground">Suggested category · check before relying on it</p> : null}

                      {item.reviewReason ? <p className="mt-1 max-w-lg text-[11px] text-amber-700">{item.reviewReason}</p> : null}

                    </div>

                    <div className="text-right">

                      <p className={!isCashFlowMovement(item) ? "font-semibold text-muted-foreground" : item.amount > 0 && item.category === "Income" ? "font-semibold text-emerald-700" : "font-semibold"}>{formatMoney(item.amount)}</p>

                      {!isCashFlowMovement(item) ? <span className="block text-[10px] text-muted-foreground">{item.repayment ? "REPAYMENT · EXCLUDED" : item.accountType === "loan" ? "LOAN LEDGER · EXCLUDED" : "TRANSFER · EXCLUDED"}</span> : null}
                      {item.status === "pending" ? <span className="text-[10px] font-medium text-amber-700">PENDING</span> : null}

                    </div>

                  </div>

                  <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Bank details and transfer status</summary><p className="mt-2 break-words">{item.description}</p><p className="mt-1">{item.accountName} · {item.date} · {item.status} · {item.currency.toUpperCase()}</p><p className="mt-1">Category source: {item.categorySource ?? "suggested"}. {item.accountType === "loan" ? "Loan-account entry: excluded from household income and spending." : item.isTransfer ? "Internal transfer: excluded from income and spending." : item.repayment === "mortgage" ? "Mortgage payment: counted once from the offset account." : "Household cash movement: included in reports."}</p>{item.accountType !== "loan" && item.repayment !== "credit-card" ? <Button disabled={pending} size="sm" variant="outline" className="mt-2" onClick={() => save({ kind: "transaction", id: item.id, value: { isTransfer: !item.isTransfer, category: item.isTransfer ? "Uncategorised" : "Transfer" } })}>{item.isTransfer ? "Count as external movement" : "Mark as internal transfer"}</Button> : null}</details>
                  {isCashFlowMovement(item) ? <div className="mt-3 grid gap-2 sm:grid-cols-[190px_150px_1fr] sm:items-center">

                    <select disabled={pending || item.accountType === "loan" || item.repayment === "credit-card"} value={item.category} onChange={(event) => update(item.id, { category: event.target.value })} className="h-10 rounded-lg border bg-background px-2 text-xs" aria-label={`Category for ${item.merchantName ?? item.description}`}>

                      {categories.map((value) => <option key={value} value={value}>{value}</option>)}

                    </select>

                    <select disabled={pending} value={item.person} onChange={(event) => update(item.id, { person: event.target.value as Person })} className="h-10 rounded-lg border bg-background px-2 text-xs" aria-label={`Person for ${item.merchantName ?? item.description}`}>

                      {people.map((value) => <option key={value} value={value}>{personLabel(value)}</option>)}

                    </select>

                    <div className="flex justify-end">

                      <Button disabled={pending || item.accountType === "loan" || ["Uncategorised", "Transfer"].includes(item.category) || (item.merchantName ?? item.description).length > 120} variant="ghost" size="sm" className="h-10 gap-1.5 text-xs text-muted-foreground" onClick={() => setRuleDraft(item)}><SlidersHorizontal className="size-3.5" /> Create merchant rule</Button>

                    </div>

                  </div> : null}

                </div>

              </div>

            </CardContent>

          </Card>

        )) : (

          <Card className="border-dashed shadow-none"><CardContent className="grid min-h-48 place-items-center text-center"><div><Search className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No matching transactions</p><p className="mt-1 text-xs text-muted-foreground">Try clearing one of the filters.</p></div></CardContent></Card>

        )}

      </div>

      <Sheet open={Boolean(ruleDraft)} onOpenChange={(open) => { if (!open) setRuleDraft(null); }}><SheetContent className="overflow-y-auto"><SheetHeader><SheetTitle>Create merchant rule</SheetTitle><SheetDescription>Apply the selected category to this exact merchant and direction. Existing manual categories and people stay unchanged.</SheetDescription></SheetHeader>{ruleDraft ? <div className="space-y-4 p-4"><p className="break-words text-sm font-medium">{ruleDraft.merchantName ?? ruleDraft.description} → {ruleDraft.category}</p><p className="text-xs text-muted-foreground">{transactions.filter((item) => (item.merchantName ?? item.description).toLowerCase() === (ruleDraft.merchantName ?? ruleDraft.description).toLowerCase() && Math.sign(item.amount) === Math.sign(ruleDraft.amount) && !item.isTransfer).length} matching imported transactions. Future matches also use this rule. Pause or edit it in Settings.</p><Button disabled={pending} onClick={() => save({ kind: "rule", id: `merchant-${ruleDraft.id}`, value: { match: ruleDraft.merchantName ?? ruleDraft.description, category: ruleDraft.category, person: "Unknown", applyPerson: false, matchMode: "exact", enabled: true, direction: ruleDraft.amount > 0 ? "incoming" : "outgoing" } }, () => setRuleDraft(null))}>Create category rule</Button></div> : null}</SheetContent></Sheet>
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
