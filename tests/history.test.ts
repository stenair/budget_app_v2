import test from "node:test";
import assert from "node:assert/strict";
import { getDemoSnapshot } from "../src/lib/finance/demo";
import { monthlyHistory, activityLink } from "../src/lib/finance/history";
import { applyLedger } from "../src/lib/finance/project";
import { validateMutation } from "../src/lib/finance/validation";
import type { LedgerState } from "../src/lib/finance/ledger-types";

test("unknown credits cannot hide expenses or become assumed income", () => {
  const source = getDemoSnapshot();
  const base = source.transactions[0];
  source.transactions = [{ ...base, amount: -2293 }, { ...base, id: "unknown-credit", amount: 4000, category: "Other" }];
  const projected = applyLedger(source, { corrections: {}, budgets: {}, rules: {}, recurring: {} });
  const month = monthlyHistory(projected.transactions, "2026-10")[0];
  assert.equal(month.spending, 2293);
  assert.equal(month.income, 0);
  assert.equal(month.unclassifiedCredits, 4000);
  assert.equal(month.netMovement, 1707);
  assert.equal(projected.metrics.spentThisMonth, 2293);
});

test("approved historical batches change only selected categories, preserve manual edits and can be undone", () => {
  const source = getDemoSnapshot();
  source.transactions = source.transactions.slice(0, 3).map((item) => ({ ...item, category: "Other" }));
  const state: LedgerState = { corrections: { t1: { category: "Health", person: "Partner" } }, budgets: {}, rules: {}, recurring: {}, classifications: { batch: { category: "Groceries", transactionIds: ["t1", "t3"], active: true } } };
  const approved = applyLedger(source, state);
  assert.equal(approved.transactions[0].category, "Health");
  assert.equal(approved.transactions[1].category, "Uncategorised");
  assert.equal(approved.transactions[2].category, "Groceries");
  assert.equal(approved.transactions[2].person, source.transactions[2].person);
  assert.equal(approved.transactions[2].isTransfer, source.transactions[2].isTransfer);
  state.classifications!.batch.active = false;
  assert.equal(applyLedger(source, state).transactions[2].category, "Uncategorised");
  assert.throws(() => validateMutation({ kind: "classification", id: "batch", value: { category: "Transfer", transactionIds: ["t1"], active: true } }));
  assert.throws(() => validateMutation({ kind: "classification", id: "batch", value: { category: "Groceries", transactionIds: ["t1", "t1"], active: true } }));
});

test("monthly history excludes transfers and pending, nets refunds and isolates people", () => {
  const base = getDemoSnapshot().transactions[0];
  const rows = [
    { ...base, id: "buy", date: "2026-09-10", amount: -10000, category: "Groceries", person: "Stefan" as const, status: "posted" as const, isTransfer: false },
    { ...base, id: "refund", date: "2026-09-11", amount: 2000, category: "Groceries", person: "Stefan" as const, status: "posted" as const, isTransfer: false },
    { ...base, id: "income", date: "2026-09-01", amount: 50000, category: "Income", person: "Stefan" as const, status: "posted" as const, isTransfer: false },
    { ...base, id: "transfer", date: "2026-09-02", amount: -99999, category: "Transfer", isTransfer: true },
    { ...base, id: "pending", date: "2026-09-03", amount: -99999, status: "pending" as const },
    { ...base, id: "partner", date: "2026-09-03", amount: -99999, person: "Partner" as const },
  ];
  const history = monthlyHistory(rows, "2026-10", "Stefan");
  assert.deepEqual(history[0], { month: "2026-09", income: 50000, spending: 8000, surplus: 42000, unclassifiedCredits: 0, netMovement: 42000, count: 3, current: false });
  assert.equal(history[1].current, true);
  assert.equal(history[1].count, 0);
});

test("custom categories work with rules, budgets and recurring plans while hiding preserves history", () => {
  const source = getDemoSnapshot();
  const state: LedgerState = { corrections: {}, budgets: { pets: { limit: 20000, allocation: null } }, rules: { pet: { match: "fresh market", category: "Pets", person: "Shared" } }, recurring: {}, categories: { pets: { name: "Pets", hidden: false } }, household: { names: { stefan: "Stefan", partner: "Ritu" } } };
  const result = applyLedger(source, state);
  assert.equal(result.transactions[0].category, "Pets");
  assert.equal(result.budgets.find((item) => item.id === "pets")?.limit, 20000);
  assert.equal(result.householdNames?.partner, "Ritu");
  assert.equal(result.transactions[0].person, "Shared");
  state.categories!.pets.hidden = true;
  const hidden = applyLedger(source, state);
  assert.equal(hidden.budgets.some((item) => item.id === "pets"), false);
  assert.equal(hidden.transactions[0].category, "Pets");
  assert.equal(hidden.metrics.spentThisMonth, result.metrics.spentThisMonth);
});

test("custom categories must exist before transactions can use them, and drill links preserve report filters", () => {
  const change = { kind: "transaction", id: "tx", value: { category: "Pets" } };
  assert.throws(() => validateMutation(change));
  assert.equal(validateMutation(change, ["Pets"]).kind, "transaction");
  assert.throws(() => validateMutation({ kind: "category", id: "cat", value: { name: "Income", hidden: false } }));
  const link = new URL(activityLink({ month: "2026-09", person: "Partner", category: "Eating out", status: "posted", flow: "spending" }), "https://example.test");
  assert.equal(link.searchParams.get("category"), "Eating out");
  assert.equal(link.searchParams.get("person"), "Partner");
  assert.equal(link.searchParams.get("status"), "posted");
});
