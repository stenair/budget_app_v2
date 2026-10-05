import "server-only";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import { after } from "next/server";
import type { FinanceSnapshot } from "./types";
import { getDemoSnapshot } from "./demo";
import { householdAccess } from "./access";
import { readLedger } from "./ledger";
import { applyLedger } from "./project";
import { readBankCache, transactBankCache } from "./store";
import { resolveSnapshot } from "./snapshot-cache";
import { coordinatedBankRefresh, type RefreshResult } from "./bank-refresh";
import { getLiveSnapshot, firstDayThreeMonthsAgo } from "./bank-provider";
export { getLiveSnapshot } from "./bank-provider";

const refreshes = new Map<string, Promise<RefreshResult>>();
export async function refreshBankFeed(scope: string): Promise<RefreshResult> {
  const existing = refreshes.get(scope);
  if (existing) return existing;
  const work = coordinatedBankRefresh((update) => transactBankCache(scope, update), () => getLiveSnapshot(), randomUUID(), firstDayThreeMonthsAgo());
  refreshes.set(scope, work);
  try { return await work; } finally { if (refreshes.get(scope) === work) refreshes.delete(scope); }
}

async function refreshSnapshot(scope: string): Promise<FinanceSnapshot> {
  const result = await refreshBankFeed(scope);
  if (result.snapshot) return result.snapshot;
  // Only the first-ever import waits. Another instance may already own it.
  if (result.status === "busy") {
    const deadline = Date.now() + 95_000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const current = await readBankCache(scope);
      if (current.snapshot) return current.snapshot;
      if (!current.refresh?.token || current.refresh.leaseUntil <= Date.now()) break;
    }
  }
  throw new Error("The Redbark feed could not be loaded. Check the server key and account consent.");
}

export const getFinanceSnapshot = cache(async (): Promise<FinanceSnapshot> => {
  const access = await householdAccess();
  const [ledger, bank] = await Promise.all([
    readLedger(access.scope),
    access.live ? readBankCache(access.scope) : Promise.resolve({ snapshot: undefined, refresh: undefined }),
  ]);
  if (!access.live) return applyLedger(getDemoSnapshot(), ledger);
  const snapshot = await resolveSnapshot(bank.snapshot, () => refreshSnapshot(access.scope), (work) => {
    after(async () => {
      try { await work(); } catch { console.error("Harbour background bank refresh failed."); }
    });
  }, Date.now(), bank.refresh?.nextAttemptAt ?? 0);
  return applyLedger(snapshot, ledger);
});
