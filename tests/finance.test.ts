import test from "node:test";
import assert from "node:assert/strict";
import { getDemoSnapshot } from "../src/lib/finance/demo";
import { applyLedger, perthDate } from "../src/lib/finance/project";
import { validateMutation } from "../src/lib/finance/validation";
import type { LedgerState } from "../src/lib/finance/ledger-types";
import { matchOwnedTransfers } from "../src/lib/finance/transfers";

const empty: LedgerState = { corrections: {}, budgets: {}, rules: {}, recurring: {} };

test("a purchase and the two sides of card repayment count spending once", () => {
  const source = getDemoSnapshot();
  const purchase = { ...source.transactions[0], amount: -100000 };
  source.transactions = [purchase, ...source.transactions.filter((item) => item.isTransfer).map((item) => ({ ...item, date: "2026-10-04" }))];
  const result = applyLedger(source, empty);
  assert.equal(result.metrics.spentThisMonth, 100000);
  assert.equal(result.metrics.incomeThisMonth, 0);
  assert.equal(result.metrics.savingsRate, null);
});

test("refunds reduce spending without becoming salary income", () => {
  const source = getDemoSnapshot();
  source.transactions = [{ ...source.transactions[0], amount: -100000 }, { ...source.transactions[0], id: "refund", amount: 25000 }];
  const result = applyLedger(source, empty);
  assert.equal(result.metrics.spentThisMonth, 75000);
  assert.equal(result.metrics.incomeThisMonth, 0);
  assert.equal(result.budgets.find((item) => item.id === "groceries")?.spent, 75000);
});

test("corrections change budgets and merchant rules yield to manual corrections", () => {
  const source = getDemoSnapshot();
  const state: LedgerState = { ...empty, rules: { fresh: { match: "fresh market", category: "Transport", person: "Stefan" } }, corrections: { t1: { category: "Clothing", person: "Partner" } }, budgets: { clothing: { limit: 110000, allocation: { stefan: 30, partner: 70 } } } };
  const result = applyLedger(source, state);
  assert.equal(result.transactions[0].category, "Clothing");
  assert.equal(result.transactions[0].person, "Partner");
  assert.equal(result.budgets.find((item) => item.id === "clothing")?.spent, 12840);
  assert.equal(result.budgets.find((item) => item.id === "clothing")?.limit, 110000);
});

test("scheduled bills do not add a second copy of a category budget", () => {
  const source = getDemoSnapshot();
  const baseline = applyLedger(source, empty);
  const result = applyLedger(source, { ...empty, recurring: { grocery: { id: "grocery", name: "Groceries", amount: -50000, day: 1, category: "Groceries", person: "Shared", active: true } } });
  assert.equal(result.plannedSurplus, baseline.plannedSurplus);
  assert.equal(result.forecast[12].baseline, result.metrics.netLiquid + (result.plannedSurplus ?? 0) * 12);
});

test("Perth reporting date handles the UTC month boundary", () => {
  assert.equal(perthDate(new Date("2026-09-30T17:00:00Z")), "2026-10-01");
});

test("invalid ledger writes are rejected before storage", () => {
  assert.throws(() => validateMutation({ kind: "budget", id: "clothing", value: { limit: 100000, allocation: { stefan: 30, partner: 80 } } }));
  assert.throws(() => validateMutation({ kind: "transaction", id: "t1", value: { person: "Stranger" } }));
  assert.throws(() => validateMutation({ kind: "recurring", id: "bill", value: { id: "bill", name: "Bill", category: "Other", amount: 12.5, day: 32, person: "Shared", active: true } }));
});

test("ambiguous payment matches are kept for review rather than silently excluded", () => {
  const source = getDemoSnapshot();
  const debit = { ...source.transactions[0], accountId: "offset", amount: -100000, description: "Credit card payment" };
  const credit = { ...debit, id: "credit", accountId: "card", amount: 100000, description: "Payment received" };
  assert.ok(matchOwnedTransfers([debit, credit]).every((item) => item.isTransfer));
  const ambiguous = matchOwnedTransfers([debit, credit, { ...credit, id: "second-credit" }]);
  assert.ok(ambiguous.every((item) => !item.isTransfer));
  assert.ok(ambiguous.every((item) => item.reviewReason));
});
