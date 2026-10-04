import test from "node:test";
import assert from "node:assert/strict";
import { getDemoSnapshot } from "../src/lib/finance/demo";
import { resolveSnapshot } from "../src/lib/finance/snapshot-cache";

test("stale bank data renders before a slow refresh and then schedules the new snapshot", async () => {
  const previous = getDemoSnapshot();
  const updated = { ...previous, generatedAt: new Date().toISOString() };
  let complete!: (value: typeof updated) => void;
  const slowBank = new Promise<typeof updated>((resolve) => { complete = resolve; });
  let scheduled: (() => Promise<void>) | undefined;
  let called = false;
  const result = await resolveSnapshot(previous, () => { called = true; return slowBank; }, (work) => { scheduled = work; }, Date.parse(previous.generatedAt) + 60000);
  assert.equal(result, previous);
  assert.equal(called, false);
  assert.ok(scheduled);
  const background = scheduled();
  assert.equal(called, true);
  complete(updated);
  await background;
});

test("fresh snapshots do not request another bank refresh", async () => {
  const previous = getDemoSnapshot();
  const unexpected = () => { throw new Error("Unexpected bank refresh"); };
  assert.equal(await resolveSnapshot(previous, unexpected, unexpected, Date.parse(previous.generatedAt) + 59999), previous);
});

test("the first import waits for real bank data and propagates feed failures", async () => {
  const source = getDemoSnapshot();
  assert.equal(await resolveSnapshot(undefined, async () => source, () => { throw new Error("Unexpected scheduling"); }), source);
  await assert.rejects(resolveSnapshot(undefined, async () => { throw new Error("Feed unavailable"); }, () => {}), /Feed unavailable/);
});
