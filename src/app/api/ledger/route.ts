import { AccessError, assertSameOrigin, householdAccess } from "@/lib/finance/access";
import { readLedger, saveLedger } from "@/lib/finance/ledger";
import { isCashFlowMovement } from "@/lib/finance/history";
import { validateMutation } from "@/lib/finance/validation";

export const runtime = "nodejs";

function failure(error: unknown) {
  const status = error instanceof AccessError ? error.status : 500;
  return Response.json({ error: error instanceof AccessError ? error.message : "The household ledger could not be saved. Try again." }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  try {
    const access = await householdAccess();
    return Response.json(await readLedger(access.scope), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const access = await householdAccess();
    const text = await request.text();
    if (text.length > 10000) throw new AccessError(413, "This change is too large.");
    let mutation;
    const ledger = await readLedger(access.scope);
    try { mutation = validateMutation(JSON.parse(text), Object.values(ledger.categories ?? {}).map((item) => item.name)); } catch { throw new AccessError(400, "Check the amounts and selections in this change."); }
    if (mutation.kind === "category") {
      const existing = ledger.categories?.[mutation.id];
      // Names are stable so transaction corrections and merchant rules keep their meaning.
      const { buildBudgets } = await import("@/lib/finance/demo");
      const builtIn = buildBudgets([]).find((item) => item.id === mutation.id);
      if ((existing && existing.name !== mutation.value.name) || (builtIn && builtIn.name !== mutation.value.name) || (!existing && !builtIn && [...buildBudgets([]).map((item) => item.name), ...Object.values(ledger.categories ?? {}).map((item) => item.name)].some((name) => name.toLowerCase() === mutation.value.name.toLowerCase()))) throw new AccessError(400, "This category already exists, or its name has changed.");
    }
    if (mutation.kind === "classification") {
      const previous = ledger.classifications?.[mutation.id];
      if (!mutation.value.active) {
        if (!previous || previous.category !== mutation.value.category || JSON.stringify(previous.transactionIds) !== JSON.stringify(mutation.value.transactionIds)) throw new AccessError(400, "This review batch could not be found.");
      } else {
        if (previous) throw new AccessError(409, "This batch has already been reviewed.");
        const { getFinanceSnapshot } = await import("@/lib/finance/redbark");
        const snapshot = await getFinanceSnapshot();
        const rows = mutation.value.transactionIds.map((id) => snapshot.transactions.find((item) => item.id === id));
        if (rows.some((item) => !item || item.category !== "Uncategorised" || ledger.corrections[item.id]?.category !== undefined || !isCashFlowMovement(item) || item.status !== "posted" || item.currency.toLowerCase() !== "aud" || (mutation.value.category === "Income" && item.amount <= 0))) throw new AccessError(409, "Some transactions have changed. Refresh and review them again.");
      }
    }
    await saveLedger(access.scope, access.actor, mutation);
    return Response.json({ saved: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
