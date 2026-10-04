import "server-only";
import { readRecords, writeRecord } from "./store";
import type { LedgerState, LedgerMutation } from "./ledger-types";

export async function readLedger(scope: string): Promise<LedgerState> {
  const rows = await readRecords<LedgerMutation["value"]>(scope, "edit:");
  const state: LedgerState = { corrections: {}, budgets: {}, rules: {}, recurring: {} };
  for (const row of rows) {
    const [, kind, ...parts] = row.key.split(":");
    const id = parts.join(":");
    const name = { transaction: "corrections", budget: "budgets", rule: "rules", recurring: "recurring" }[kind];
    if (name) (state[name as keyof LedgerState] as Record<string, unknown>)[id] = row.value;
  }
  return state;
}

export async function saveLedger(scope: string, actor: string, mutation: LedgerMutation) {
  await writeRecord(scope, `edit:${mutation.kind}:${mutation.id}`, mutation.value, actor);
}
