import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { writeRecord, readRecords } from "../src/lib/finance/store";

test("server records survive a read, remain encrypted, and are isolated by household scope", async () => {
  const scope = `test-${randomUUID()}`;
  const value = { category: "Groceries", person: "Shared", privateMarker: `private-${randomUUID()}` };
  await writeRecord(scope, "edit:transaction:test1", value, "test-member");
  const records = await readRecords<typeof value>(scope, "edit:");
  assert.deepEqual(records[0].value, value);
  assert.equal((await readRecords(`${scope}-other`, "edit:")).length, 0);
  assert.equal((await readRecords(scope, "audit:")).length, 1);
  const directory = path.join(process.cwd(), ".harbour-data", createHash("sha256").update(scope).digest("hex"));
  const files = await readdir(directory);
  for (const file of files) assert.ok(!(await readFile(path.join(directory, file), "utf8")).includes(value.privateMarker));
});
