import type { PlannedEvent, RecurringItem } from "./ledger-types";
import type { FinanceTransaction } from "./types";
import { expenseContribution, isCashFlowMovement, monthLabel } from "./history";

export function planForecast({ month, asOf, balance, surplus, months, events = [], monthlyChange = 0 }: { month: string; asOf: string; balance: number; surplus: number; months: number; events?: PlannedEvent[]; monthlyChange?: number }) {
  const [year, number] = month.split("-").map(Number);
  return Array.from({ length: months + 1 }, (_, index) => {
    const first = new Date(Date.UTC(year, number - 1 + index, 1));
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const date = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(Number(asOf.slice(8,10)), lastDay))).toISOString().slice(0,10);
    const oneOff = index === 0 ? 0 : events.filter((event) => event.active && event.date > asOf && event.date <= date).reduce((sum, event) => sum + event.amount, 0);
    const baseline = balance + surplus * index + oneOff;
    return { month: date.slice(0, 7), label: monthLabel(date.slice(0, 7)), baseline, value: baseline + monthlyChange * index };
  });
}

export function upcomingPlan(recurring: RecurringItem[], events: PlannedEvent[], asOf: string, days = 30) {
  const start = new Date(`${asOf}T00:00:00Z`);
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + days);
  const result: Array<{ id: string; name: string; category: string; date: string; amount: number; oneOff: boolean }> = [];
  for (let offset = 0; offset <= 2; offset++) {
    const first = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    for (const item of recurring.filter((item) => item.active)) {
      const date = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(item.day, lastDay)));
      if (date > start && date <= end) result.push({ ...item, id: `${item.id}-${date.toISOString().slice(0, 10)}`, date: date.toISOString().slice(0, 10), oneOff: false });
    }
  }
  for (const event of events.filter((event) => event.active && event.date > asOf && event.date <= end.toISOString().slice(0, 10))) result.push({ ...event, oneOff: true });
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export function reviewSummary(transactions: FinanceTransaction[]) {
  const external = transactions.filter((item) => isCashFlowMovement(item) && item.status === "posted");
  const outflows = external.filter((item) => item.amount < 0);
  const unclassified = outflows.filter((item) => item.category === "Uncategorised");
  const total = -outflows.reduce((sum, item) => sum + item.amount, 0);
  const unknownSpend = -unclassified.reduce((sum, item) => sum + item.amount, 0);
  return { total, unknownSpend, coverage: total ? Math.round((total - unknownSpend) / total * 100) : 100, unclassifiedCount: unclassified.length, unknownCredits: external.filter((item) => item.amount > 0 && item.category === "Uncategorised").reduce((sum, item) => sum + item.amount, 0), transferReview: transactions.filter((item) => item.reviewReason).length, unknownPeople: external.filter((item) => item.person === "Unknown").length };
}

export function categoryChange(transactions: FinanceTransaction[], month: string, person = "all", cutoffDay = 31) {
  const [year, number] = month.split("-").map(Number);
  const previousMonth = new Date(Date.UTC(year, number - 2, 1)).toISOString().slice(0, 7);
  const day = cutoffDay;
  const rows = transactions.filter((item) => isCashFlowMovement(item) && item.status === "posted" && (person === "all" || item.person === person));
  const totals = (period: string) => {
    const result = new Map<string, number>();
    for (const item of rows.filter((item) => item.date.startsWith(period) && Number(item.date.slice(8, 10)) <= day && expenseContribution(item) !== 0)) result.set(item.category, (result.get(item.category) ?? 0) + expenseContribution(item));
    return result;
  };
  const current = totals(month); const previous = totals(previousMonth);
  return { previousMonth, day, rows: [...new Set([...current.keys(), ...previous.keys()])].map((category) => ({ category, current: current.get(category) ?? 0, previous: previous.get(category) ?? 0, change: (current.get(category) ?? 0) - (previous.get(category) ?? 0) })).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)) };
}
