import type { FinanceSnapshot, FinanceTransaction } from "./types";
import type { LedgerState, RecurringItem } from "./ledger-types";
import { categories } from "./ledger-types";
import { expenseContribution } from "./history";

export function perthDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Perth", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function previewRecurring(): RecurringItem[] {
  return [
    { id: "salary-stefan", name: "Stefan salary", category: "Income", amount: 624000, day: 2, person: "Stefan", active: true },
    { id: "salary-partner", name: "Partner salary", category: "Income", amount: 497500, day: 1, person: "Partner", active: true },
    { id: "home-loan", name: "Home loan", category: "Mortgage", amount: -342000, day: 7, person: "Shared", active: true },
    { id: "insurance", name: "Insurance", category: "Insurance", amount: -18600, day: 11, person: "Shared", active: true },
    { id: "subscriptions", name: "Subscriptions", category: "Subscriptions", amount: -12000, day: 18, person: "Shared", active: true },
  ];
}

export function applyLedger(snapshot: FinanceSnapshot, ledger: LedgerState): FinanceSnapshot {
  const month = snapshot.mode === "preview" ? "2026-10" : perthDate().slice(0, 7);
  const rules = Object.values(ledger.rules);
  const approved = new Map(Object.values(ledger.classifications ?? {}).filter((batch) => batch.active).flatMap((batch) => batch.transactionIds.map((id) => [id, batch.category] as const)));
  const recurringMap = new Map((snapshot.mode === "preview" ? previewRecurring() : []).map((item) => [item.id, item]));
  for (const item of Object.values(ledger.recurring)) recurringMap.set(item.id, item);
  const recurring = [...recurringMap.values()].filter((item) => item.active);
  const transactions = snapshot.transactions.map((transaction): FinanceTransaction => {
    const text = (transaction.merchantName ?? transaction.description).toLowerCase();
    const rule = rules.find((item) => text.includes(item.match.toLowerCase()));
    const correction = ledger.corrections[transaction.id];
    const classification = approved.get(transaction.id);
    const resolved = { ...transaction, category: transaction.category === "Other" && !transaction.categorySource ? "Uncategorised" : transaction.category, ...(rule ? { category: rule.category, person: rule.person, isTransfer: rule.category === "Transfer" ? true : transaction.isTransfer } : {}), ...(classification ? { category: classification } : {}), ...correction };
    return { ...resolved, categorySource: correction?.category || classification ? "manual" : rule ? "rule" : resolved.category === "Uncategorised" ? "unclassified" : "suggested", reviewReason: correction?.isTransfer !== undefined || rule?.category === "Transfer" ? undefined : transaction.reviewReason };
  });
  const baseBudgets = [...snapshot.budgets];
  if (!baseBudgets.some((item) => item.name === "Uncategorised")) baseBudgets.push({ id: "uncategorised", name: "Uncategorised", icon: "other", color: "#c19a3e", limit: 0, spent: 0, pending: 0, allocation: null });
  for (const [id, definition] of Object.entries(ledger.categories ?? {})) {
    if (!baseBudgets.some((budget) => budget.id === id)) baseBudgets.push({ id, name: definition.name, icon: "other", color: "#3f7d65", limit: 0, spent: 0, pending: 0, allocation: null });
  }
  const budgetCategories = baseBudgets.map((budget) => ({ id: budget.id, name: budget.name, hidden: ledger.categories?.[budget.id]?.hidden ?? false }));
  const budgets = baseBudgets.filter((budget) => !ledger.categories?.[budget.id]?.hidden).map((budget) => {
    const matching = transactions.filter((item) => item.date.startsWith(month) && item.category === budget.name && !item.isTransfer && item.currency.toLowerCase() === "aud");
    return {
      ...budget,
      ...ledger.budgets[budget.id],
      limit: ledger.budgets[budget.id]?.limit ?? Math.max(budget.limit, -recurring.filter((item) => item.category === budget.name && item.amount < 0).reduce((sum, item) => sum + item.amount, 0)),
      spent: matching.filter((item) => item.status === "posted").reduce((sum, item) => sum + expenseContribution(item), 0),
      pending: -matching.filter((item) => item.status === "pending" && item.amount < 0).reduce((sum, item) => sum + item.amount, 0),
    };
  });
  const current = transactions.filter((item) => item.date.startsWith(month) && !item.isTransfer && item.currency.toLowerCase() === "aud");
  const income = current.filter((item) => item.category === "Income" && item.status === "posted").reduce((sum, item) => sum + item.amount, 0);
  const spending = current.reduce((sum, item) => sum + expenseContribution(item), 0);
  const saved = income - spending;
  const plannedIncome = recurring.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0);
  const outflowByCategory = new Map<string, number>();
  for (const item of recurring.filter((item) => item.amount < 0)) outflowByCategory.set(item.category, (outflowByCategory.get(item.category) ?? 0) - item.amount);
  for (const budget of budgets) outflowByCategory.set(budget.name, Math.max(budget.limit, outflowByCategory.get(budget.name) ?? 0));
  const plannedSpending = [...outflowByCategory.values()].reduce((sum, item) => sum + item, 0);
  const expensePlan = [...outflowByCategory].map(([category, total]) => ({ category, total, budget: budgets.find((item) => item.name === category)?.limit ?? 0, recurring: -recurring.filter((item) => item.category === category && item.amount < 0).reduce((sum, item) => sum + item.amount, 0) }));
  const plannedSurplus = plannedIncome - plannedSpending;
  const netLiquid = snapshot.metrics.offsetBalance - snapshot.metrics.cardOwing;
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    ...snapshot, transactions, budgets, recurring, month, plannedSurplus, plannedIncome, plannedSpending, expensePlan, forecastReady: plannedIncome > 0,
    classificationBatches: Object.entries(ledger.classifications ?? {}).map(([id, batch]) => ({ id, ...batch })),
    budgetCategories, categoryNames: [...new Set([...categories, ...Object.values(ledger.categories ?? {}).map((item) => item.name)])],
    householdNames: ledger.household?.names ?? { stefan: "Stefan", partner: "Partner" },
    forecast: Array.from({ length: 13 }, (_, index) => {
      const date = new Date(Date.UTC(year, monthNumber - 1 + index, 1));
      return { month: date.toISOString().slice(0, 7), label: new Intl.DateTimeFormat("en-AU", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date), baseline: netLiquid + (plannedIncome > 0 ? plannedSurplus * index : 0) };
    }),
    metrics: {
      ...snapshot.metrics, netLiquid, incomeThisMonth: income, spentThisMonth: spending, savedThisMonth: saved,
      savingsRate: income > 0 ? saved / income : null,
      overallBudget: budgets.reduce((sum, item) => sum + item.limit, 0),
      overallBudgetSpent: budgets.reduce((sum, item) => sum + item.spent + item.pending, 0),
    },
  };
}
