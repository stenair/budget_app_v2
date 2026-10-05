import type { FinanceSnapshot } from "./types";

// Keep navigation independent of bank API latency once a saved snapshot exists.
export async function resolveSnapshot(
  previous: FinanceSnapshot | undefined,
  refresh: () => Promise<FinanceSnapshot>,
  schedule: (work: () => Promise<void>) => void,
  now = Date.now(),
  nextAttemptAt = 0,
): Promise<FinanceSnapshot> {
  if (!previous) return refresh();
  const age = now - Date.parse(previous.generatedAt);
  if (now >= nextAttemptAt && (!Number.isFinite(age) || age < 0 || age >= 60000)) {
    schedule(async () => { await refresh(); });
  }
  return previous;
}
