import { AccessError, assertSameOrigin, householdAccess } from "@/lib/finance/access";
import { refreshBankFeed } from "@/lib/finance/redbark";

export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const access = await householdAccess();
    if (!access.live) return Response.json({ status: "preview", nextAttemptAt: 0 }, { headers: { "Cache-Control": "no-store" } });
    const result = await refreshBankFeed(access.scope);
    return Response.json({ status: result.status, nextAttemptAt: result.nextAttemptAt, checkedAt: result.snapshot?.generatedAt ?? null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof AccessError ? error.message : "The bank feed could not be refreshed. Your saved data is unchanged." }, { status: error instanceof AccessError ? error.status : 503, headers: { "Cache-Control": "no-store" } });
  }
}
