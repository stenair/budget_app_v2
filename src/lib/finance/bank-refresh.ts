import type { FinanceSnapshot } from "./types";

export const refreshInterval = 60_000;
export const refreshLease = 120_000;
export type BankRefreshState = { token: string | null; leaseUntil: number; nextAttemptAt: number; failures: number };
export type BankCache = { snapshot?: FinanceSnapshot; refresh?: BankRefreshState };
export type RefreshResult = { status: "updated" | "busy" | "cooldown" | "failed" | "superseded"; snapshot?: FinanceSnapshot; nextAttemptAt: number };
export type CacheChange<T> = { changes?: Partial<BankCache>; result: T };
export type BankCacheTransaction = <T>(update: (cache: BankCache, now: number) => CacheChange<T>) => Promise<T>;

export function claimBankRefresh(cache: BankCache, now: number, token: string): CacheChange<RefreshResult & { claimed?: boolean }> {
  const state = cache.refresh;
  if (state?.token && state.leaseUntil > now) return { result: { status: "busy", snapshot: cache.snapshot, nextAttemptAt: state.leaseUntil } };
  const nextAttemptAt = Math.max(state?.nextAttemptAt ?? 0, cache.snapshot ? Date.parse(cache.snapshot.generatedAt) + refreshInterval || 0 : 0);
  if (nextAttemptAt > now) return { result: { status: "cooldown", snapshot: cache.snapshot, nextAttemptAt } };
  return { changes: { refresh: { token, leaseUntil: now + refreshLease, nextAttemptAt: now + refreshLease, failures: state?.failures ?? 0 } }, result: { status: "busy", claimed: true, snapshot: cache.snapshot, nextAttemptAt: now + refreshLease } };
}

export function finishBankRefresh(cache: BankCache, now: number, token: string, snapshot: FinanceSnapshot | undefined, historyStart: string, retryAfterMs = 0): CacheChange<RefreshResult> {
  if (cache.refresh?.token !== token || cache.refresh.leaseUntil <= now) return { result: { status: "superseded", snapshot: cache.snapshot, nextAttemptAt: cache.refresh?.nextAttemptAt ?? now } };
  const failures = snapshot ? 0 : (cache.refresh.failures + 1);
  const nextAttemptAt = now + (snapshot ? refreshInterval : Math.max(Math.min(300_000, refreshInterval * 2 ** Math.min(4, failures - 1)), retryAfterMs));
  const refresh: BankRefreshState = { token: null, leaseUntil: 0, nextAttemptAt, failures };
  if (!snapshot) {
    const fallback = cache.snapshot ? { ...cache.snapshot, connection: { ...cache.snapshot.connection, status: "error" as const, message: "Redbark could not be reached. Showing the last successful snapshot." } } : undefined;
    return { changes: { refresh, ...(fallback ? { snapshot: fallback } : {}) }, result: { status: "failed", snapshot: fallback, nextAttemptAt } };
  }
  const currentIds = new Set(snapshot.transactions.map((item) => item.id));
  const merged = { ...snapshot, transactions: [...snapshot.transactions, ...(cache.snapshot?.transactions ?? []).filter((item) => item.status === "posted" && item.date < historyStart && !currentIds.has(item.id))].toSorted((a,b) => b.date.localeCompare(a.date)) };
  return { changes: { refresh, snapshot: merged }, result: { status: "updated", snapshot: merged, nextAttemptAt } };
}

// Network work runs outside the database transaction. Only the current lease
// owner can commit; a crashed or expired worker cannot overwrite newer data.
export async function coordinatedBankRefresh(transact: BankCacheTransaction, fetchSnapshot: () => Promise<FinanceSnapshot>, token: string, historyStart: string): Promise<RefreshResult> {
  const claim = await transact((cache, now) => claimBankRefresh(cache, now, token));
  if (!claim.claimed) return claim;
  let snapshot: FinanceSnapshot | undefined;
  let retryAfterMs = 0;
  try { snapshot = await fetchSnapshot(); } catch (error) {
    if (error && typeof error === "object" && "retryAfterMs" in error && typeof error.retryAfterMs === "number" && Number.isFinite(error.retryAfterMs)) retryAfterMs = Math.max(0, error.retryAfterMs);
  }
  return transact((cache, now) => finishBankRefresh(cache, now, token, snapshot, historyStart, retryAfterMs));
}
