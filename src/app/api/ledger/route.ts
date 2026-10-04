import { AccessError, assertSameOrigin, householdAccess } from "@/lib/finance/access";
import { readLedger, saveLedger } from "@/lib/finance/ledger";
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
    try { mutation = validateMutation(JSON.parse(text)); } catch { throw new AccessError(400, "Check the amounts and selections in this change."); }
    await saveLedger(access.scope, access.actor, mutation);
    return Response.json({ saved: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
