import test from "node:test";
import assert from "node:assert/strict";
import { getDemoSnapshot } from "../src/lib/finance/demo";
import { claimBankRefresh, finishBankRefresh, coordinatedBankRefresh, type BankCache, type BankCacheTransaction } from "../src/lib/finance/bank-refresh";
import { resolveSnapshot } from "../src/lib/finance/snapshot-cache";

test("two independent refresh workers make one bank request and share the committed result", async () => {
  let cache: BankCache = {};
  const now = Date.now();
  const transact: BankCacheTransaction = async (update) => {
    const change = update(cache, now);
    cache = { ...cache, ...change.changes };
    return change.result;
  };
  let complete!: (value: ReturnType<typeof getDemoSnapshot>) => void;
  const bank = new Promise<ReturnType<typeof getDemoSnapshot>>((resolve) => { complete = resolve; });
  let calls = 0;
  const fetchBank = () => { calls++; return bank; };
  const first = coordinatedBankRefresh(transact, fetchBank, "first", "2026-07-01");
  const second = await coordinatedBankRefresh(transact, fetchBank, "second", "2026-07-01");
  assert.equal(second.status, "busy");
  assert.equal(calls, 1);
  complete({ ...getDemoSnapshot(), generatedAt: new Date(now).toISOString() });
  assert.equal((await first).status, "updated");
  assert.equal((await coordinatedBankRefresh(transact, fetchBank, "third", "2026-07-01")).status, "cooldown");
  assert.equal(calls, 1);
});

test("expired workers cannot overwrite a newer success or mark it failed", () => {
  let cache: BankCache = {};
  cache = { ...cache, ...claimBankRefresh(cache, 1, "old").changes };
  const late = 120_002;
  cache = { ...cache, ...claimBankRefresh(cache, late, "new").changes };
  const newer = { ...getDemoSnapshot(), generatedAt: new Date(late).toISOString() };
  cache = { ...cache, ...finishBankRefresh(cache, late + 1, "new", newer, "2026-07-01").changes };
  for (const value of [getDemoSnapshot(), undefined]) {
    const old = finishBankRefresh(cache, late + 2, "old", value, "2026-07-01");
    assert.equal(old.result.status, "superseded");
    assert.equal(old.changes, undefined);
    assert.equal(old.result.snapshot?.generatedAt, newer.generatedAt);
  }
});

test("failed refreshes preserve last good data, back off, and respect provider retry timing", async () => {
  const previous = getDemoSnapshot();
  let cache: BankCache = { snapshot: previous };
  let now = Date.parse(previous.generatedAt) + 60_001;
  const transact: BankCacheTransaction = async (update) => { const change = update(cache, now); cache = { ...cache, ...change.changes }; return change.result; };
  const fail = async () => { throw new Error("Feed unavailable"); };
  const first = await coordinatedBankRefresh(transact, fail, "first", "2026-07-01");
  assert.equal(first.status, "failed");
  assert.equal(first.snapshot?.generatedAt, previous.generatedAt);
  assert.deepEqual(first.snapshot?.transactions, previous.transactions);
  assert.equal(first.nextAttemptAt, now + 60_000);
  now = first.nextAttemptAt;
  const second = await coordinatedBankRefresh(transact, fail, "second", "2026-07-01");
  assert.equal(second.nextAttemptAt, now + 120_000);
  now = second.nextAttemptAt;
  const third = await coordinatedBankRefresh(transact, async () => { throw Object.assign(new Error("Rate limited"), { retryAfterMs: 600_000 }); }, "third", "2026-07-01");
  assert.equal(third.nextAttemptAt, now + 600_000);
  let scheduled = false;
  assert.equal(await resolveSnapshot(cache.snapshot, fail, () => { scheduled = true; }, now, third.nextAttemptAt), cache.snapshot);
  assert.equal(scheduled, false);
});

test("refresh retains older posted history but removes obsolete pending and authoritative-window records", () => {
  const source = getDemoSnapshot();
  const item = source.transactions[0];
  const previous = { ...source, transactions: [
    { ...item, id: "old-posted", date: "2026-06-01", status: "posted" as const },
    { ...item, id: "old-pending", date: "2026-06-02", status: "pending" as const },
    { ...item, id: "removed-by-bank", date: "2026-08-02", status: "posted" as const },
  ] };
  const cache: BankCache = { snapshot: previous, refresh: { token: "owner", leaseUntil: 100, nextAttemptAt: 100, failures: 0 } };
  const fresh = { ...source, transactions: [{ ...item, id: "new", date: "2026-10-05" }] };
  assert.deepEqual(finishBankRefresh(cache, 1, "owner", fresh, "2026-07-01").result.snapshot?.transactions.map((row) => row.id), ["new", "old-posted"]);
});
