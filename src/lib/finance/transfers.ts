import type { FinanceTransaction } from "./types";

export function matchOwnedTransfers(transactions: FinanceTransaction[]) {
  const byAmount = new Map<number, FinanceTransaction[]>();
  for (const item of transactions) byAmount.set(item.amount, [...(byAmount.get(item.amount) ?? []), item]);
  const candidates = new Map<string, FinanceTransaction[]>();
  const paymentHint = (item: FinanceTransaction) => /credit card|card payment|payment received|internal transfer/i.test(item.description);
  for (const item of transactions) {
    const matching = (byAmount.get(-item.amount) ?? []).filter((other) => other.accountId !== item.accountId && Math.abs(Date.parse(other.date) - Date.parse(item.date)) <= 3 * 86400000 && (paymentHint(item) || paymentHint(other)));
    candidates.set(item.id, matching);
  }
  return transactions.map((item) => {
    const matching = candidates.get(item.id) ?? [];
    const matched = matching.length === 1 && candidates.get(matching[0].id)?.length === 1;
    return {
      ...item,
      isTransfer: matched,
      category: matched ? "Transfer" : item.category,
      reviewReason: !matched && paymentHint(item) ? "Possible transfer: confirm both account movements before excluding it." : undefined,
    };
  });
}
