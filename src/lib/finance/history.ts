import type { FinanceTransaction } from "./types";

export function monthLabel(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  return new Intl.DateTimeFormat("en-AU", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
}
export function monthlyHistory(transactions: FinanceTransaction[], currentMonth: string, person = "all") {
  const months = [...new Set([currentMonth, ...transactions.map((item) => item.date.slice(0, 7))])].filter(Boolean).sort();
  return months.map((month) => {
    const rows = transactions.filter((item) => item.date.startsWith(month) && !item.isTransfer && item.currency.toLowerCase() === "aud" && item.status === "posted" && (person === "all" || item.person === person));
    const income = rows.filter((item) => item.category === "Income").reduce((sum, item) => sum + item.amount, 0);
    const spending = -rows.filter((item) => item.category !== "Income").reduce((sum, item) => sum + item.amount, 0);
    return { month, income, spending, surplus: income - spending, count: rows.length, current: month === currentMonth };
  });
}
export function activityLink(filters: Record<string, string>) {
  return `/activity?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value && value !== "all"))}`;
}
