"use client";

import { useState } from "react";
import { CircleDollarSign, Pencil, PiggyBank, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CategoryIcon } from "@/components/category-icon";
import { PageHeading } from "@/components/page-heading";
import { formatMoney } from "@/lib/finance/format";
import type { BudgetLine, FinanceTransaction } from "@/lib/finance/types";
import { useLedgerSave } from "@/components/use-ledger-save";

export function BudgetView({ initialBudgets, mode, transactions, month }: { initialBudgets: BudgetLine[]; mode: "preview" | "live"; transactions: FinanceTransaction[]; month: string }) {
  const { save, pending, message, error } = useLedgerSave();
  const [editing, setEditing] = useState<string | null>(null);

  const budgets = initialBudgets;
  const totalLimit = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const totalUsed = budgets.reduce((sum, budget) => sum + budget.spent + budget.pending, 0);
  const remaining = totalLimit - totalUsed;
  const usedPercent = totalLimit ? Math.round((totalUsed / totalLimit) * 100) : 0;

  function saveLimit(budget: BudgetLine, dollars: number, stefanShare: string) {
    const allocation = stefanShare === "" ? null : { stefan: Number(stefanShare), partner: 100 - Number(stefanShare) };
    save({ kind: "budget", id: budget.id, value: { limit: Math.max(0, Math.round(dollars * 100)), allocation } }, () => setEditing(null));
  }

  return (
    <div>
      <PageHeading
        eyebrow="Monthly plan"
        title="Budgets"
        description="Set practical limits for flexible household spending and see pending card purchases before they settle."
        action={<Badge variant="outline" className="w-fit rounded-full bg-card px-3 py-1.5 font-normal">Monthly household plan</Badge>}
      />

      <p role="status" className={`mb-3 text-xs ${error ? "text-destructive" : "text-primary"}`}>{error || message}</p>
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={<WalletCards />} label="Monthly plan" value={formatMoney(totalLimit)} detail={`${budgets.length} categories`} />
        <SummaryCard icon={<CircleDollarSign />} label="Used so far" value={formatMoney(totalUsed)} detail={`${usedPercent}% including pending`} />
        <SummaryCard icon={<PiggyBank />} label="Available" value={formatMoney(remaining)} detail={remaining >= 0 ? "left for the month" : "over plan"} />
      </section>

      <Card className="mt-4 shadow-xs">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Household categories</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Posted and pending purchases count toward each limit.</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {budgets.map((budget) => {
            const used = budget.spent + budget.pending;
            const percentage = budget.limit ? Math.round((used / budget.limit) * 100) : 0;
            const day = mode === "preview" ? 4 : Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Perth", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).slice(-2));
            const [year, monthNumber] = month.split("-").map(Number);
            const days = new Date(year, monthNumber, 0).getDate();
            const variable = ["Groceries", "Eating out", "Transport", "Clothing", "Entertainment", "Shopping"].includes(budget.name);
            const projected = variable ? Math.round(used / day * days) : null;
            const personSpend = (person: string) => -transactions.filter((item) => item.date.startsWith(month) && !item.isTransfer && item.category === budget.name && item.person === person).reduce((sum, item) => sum + item.amount, 0);
            return (
              <div key={budget.id} className="rounded-xl border bg-background p-4">
                <div className="flex items-start gap-3">
                  <CategoryIcon name={budget.icon} color={budget.color} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{budget.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatMoney(budget.spent)} posted{budget.pending ? ` · ${formatMoney(budget.pending)} pending` : ""}
                        </p>
                      </div>
                      {editing === budget.id ? (
                        <LimitEditor value={budget.limit / 100} share={budget.allocation?.stefan} pending={pending} onSave={(value, share) => saveLimit(budget, value, share)} onCancel={() => setEditing(null)} />
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={() => setEditing(budget.id)}>
                          <Pencil className="size-3" /> {formatMoney(budget.limit)}
                        </Button>
                      )}
                    </div>
                    <Progress value={Math.min(percentage, 100)} className="mt-3 h-2" />
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className={used > budget.limit ? "font-medium text-destructive" : "text-muted-foreground"}>{budget.limit ? `${percentage}% used` : "Set a limit"}</span>
                      <span className="text-muted-foreground">{formatMoney(budget.limit - used)} left</span>
                    </div>
                    {projected !== null ? <p className="mt-2 text-[11px] text-muted-foreground">At this pace: {formatMoney(projected)} by month end · {day < 7 ? "early estimate" : "simple daily run rate"}</p> : null}
                    {budget.allocation ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        <span className="rounded-full bg-secondary px-2 py-1">Stefan {budget.allocation.stefan}% · {formatMoney(personSpend("Stefan"))} of {formatMoney(Math.round(budget.limit * budget.allocation.stefan / 100))}</span>
                        <span className="rounded-full bg-secondary px-2 py-1">Partner {budget.allocation.partner}% · {formatMoney(personSpend("Partner"))} of {formatMoney(Math.round(budget.limit * budget.allocation.partner / 100))}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        {mode === "live" ? "Spending is calculated from your live Redbark feed." : "Preview spending is shown until authenticated Redbark access is configured."}
      </p>
    </div>
  );
}

function LimitEditor({ value, share, pending, onSave, onCancel }: { value: number; share?: number; pending: boolean; onSave: (value: number, share: string) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(String(value));
  const [allocation, setAllocation] = useState(share === undefined ? "" : String(share));
  return (
    <form
      className="flex flex-wrap items-center gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(Number(draft) || 0, allocation);
      }}
    >
      <span className="text-xs text-muted-foreground">$</span>
      <Input className="h-8 w-24 text-right text-xs" type="number" min="0" step="10" value={draft} onChange={(event) => setDraft(event.target.value)} autoFocus aria-label="Monthly budget limit" />
      <Input className="h-8 w-28 text-xs" type="number" min="0" max="100" step="1" placeholder="Shared" value={allocation} onChange={(event) => setAllocation(event.target.value)} aria-label="Stefan allocation percent, blank for shared" />
      <Button disabled={pending} type="submit" size="sm" className="h-8 px-2 text-xs">{pending ? "Saving" : "Save"}</Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onCancel}>Cancel</Button>
    </form>
  );
}

function SummaryCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <Card className="shadow-xs">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary [&>svg]:size-4.5">{icon}</span>
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p><p className="text-[11px] text-muted-foreground">{detail}</p></div>
      </CardContent>
    </Card>
  );
}
