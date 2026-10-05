import type { FinanceAccount, FinanceTransaction } from "./types";

const cardPayment = /credit card (?:payment|repayment)|card (?:payment|autopay)|payment received|direct debit payment/i;
const loanPayment = /(?:loan|mortgage) repayment|home loan|repayment (?:to|from)/i;
const transferHint = /internal transfer|transfer (?:to|from)|credit card|card (?:payment|autopay)|payment received|direct debit payment/i;

// Opposite amounts alone are not evidence of a transfer. Match the account,
// currency, settlement state, date window and repayment descriptions as well.
export function matchOwnedTransfers(transactions: FinanceTransaction[], accounts: FinanceAccount[] = []) {
  const accountTypes = new Map(accounts.map((account) => [account.id, account.type]));
  const rows = transactions.map((item) => ({ ...item, accountType: accountTypes.get(item.accountId) ?? item.accountType }));
  const byAmount = new Map<number, FinanceTransaction[]>();
  for (const item of rows) byAmount.set(item.amount, [...(byAmount.get(item.amount) ?? []), item]);
  const candidates = new Map<string, FinanceTransaction[]>();
  const kind = (a: FinanceTransaction, b: FinanceTransaction) => {
    const credit = a.amount > 0 ? a : b;
    const debit = a.amount < 0 ? a : b;
    if (/refund|reversal/i.test(credit.description) && !cardPayment.test(credit.description)) return null;
    if (credit.accountType === "credit-card" && debit.accountType === "transaction" && (cardPayment.test(credit.description) || cardPayment.test(debit.description))) return "credit-card";
    if (credit.accountType === "loan" && debit.accountType === "transaction" && (loanPayment.test(credit.description) || loanPayment.test(debit.description))) return "mortgage";
    if (a.accountType === "loan" || b.accountType === "loan") return null;
    return transferHint.test(a.description) || transferHint.test(b.description) ? "internal" : null;
  };
  for (const item of rows) {
    const matching = item.amount === 0 ? [] : (byAmount.get(-item.amount) ?? []).filter((other) => other.accountId !== item.accountId && other.currency.toLowerCase() === item.currency.toLowerCase() && other.status === item.status && Math.abs(Date.parse(other.date) - Date.parse(item.date)) <= 3 * 86400000 && kind(item, other));
    candidates.set(item.id, matching);
  }
  return rows.map((item): FinanceTransaction => {
    const matching = candidates.get(item.id) ?? [];
    const matched = matching.length === 1 && candidates.get(matching[0].id)?.length === 1;
    const repayment = matched ? kind(item, matching[0]) : null;
    if (matched) return {
      ...item,
      isTransfer: repayment !== "mortgage" || item.amount > 0,
      category: repayment === "mortgage" && item.amount < 0 ? "Mortgage" : "Transfer",
      repayment: repayment === "internal" ? undefined : repayment ?? undefined,
      pairedTransactionId: matching[0].id,
      reviewReason: undefined,
    };
    if (!matching.length && item.accountType === "credit-card" && item.amount > 0 && cardPayment.test(item.description)) return {
      ...item, isTransfer: true, category: "Transfer", repayment: "credit-card", pairedTransactionId: undefined,
      reviewReason: "Card repayment: the offset counterpart is not in imported history.",
    };
    // A clearly labelled loan debit still counts once in the cash budget if the
    // other side is outside imported history. Loan ledger entries never count.
    const mortgageDebit = item.accountType === "transaction" && item.amount < 0 && /loan repayment to|home loan repayment|mortgage repayment/i.test(item.description);
    return {
      ...item,
      category: mortgageDebit ? "Mortgage" : item.category,
      repayment: mortgageDebit ? "mortgage" : undefined,
      pairedTransactionId: undefined,
      reviewReason: !item.isTransfer && item.accountType !== "loan" && transferHint.test(item.description) ? "Possible transfer: confirm both account movements before excluding it." : undefined,
    };
  });
}
