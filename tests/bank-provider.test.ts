import test from "node:test";
import assert from "node:assert/strict";
import { getLiveSnapshot } from "../src/lib/finance/bank-provider";

test("provider rate limits retain Retry-After and cancel other in-flight requests", async (context) => {
  let otherCancelled = false;
  context.mock.method(globalThis, "fetch", async (url: URL, options: RequestInit) => {
    if (url.pathname === "/v2/accounts") return new Response(null, { status: 429, headers: { "Retry-After": "180" } });
    return new Promise<Response>((_resolve, reject) => {
      options.signal!.addEventListener("abort", () => { otherCancelled = true; reject(new Error("Cancelled")); }, { once: true });
    });
  });
  await assert.rejects(getLiveSnapshot(), (error: Error & { retryAfterMs?: number }) => error.retryAfterMs === 180_000);
  assert.equal(otherCancelled, true);
});

test("pagination refuses a foreign host before transmitting the API credential", async (context) => {
  let requests = 0;
  context.mock.method(globalThis, "fetch", async (url: URL) => {
    requests++;
    return Response.json({ data: [], next_page_url: url.pathname === "/v2/accounts" ? "https://foreign.example/v2/accounts" : null });
  });
  await assert.rejects(getLiveSnapshot(), /Invalid Redbark pagination URL/);
  assert.equal(requests, 2);
});
