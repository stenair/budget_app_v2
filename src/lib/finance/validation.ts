import { categories, people } from "./ledger-types";
import type { LedgerMutation } from "./ledger-types";

export function validateMutation(body: unknown, customCategories: string[] = []): LedgerMutation {
  const fail = () => { throw new Error("Invalid household change."); };
  if (!body || typeof body !== "object") return fail();
  const { kind, id, value } = body as Record<string, unknown>;
  if (typeof id !== "string" || !/^[a-zA-Z0-9_:-]{1,180}$/.test(id) || !value || typeof value !== "object") return fail();
  const v = value as Record<string, unknown>;
  const validPerson = (person: unknown) => typeof person === "string" && people.includes(person as typeof people[number]);
  const validCategory = (category: unknown) => typeof category === "string" && [...categories, ...customCategories].includes(category);
  const money = (amount: unknown) => typeof amount === "number" && Number.isSafeInteger(amount) && Math.abs(amount) <= 100000000;
  if (kind === "transaction") {
    if (Object.keys(v).some((key) => !["category", "person", "isTransfer"].includes(key))) return fail();
    if (v.category !== undefined && !validCategory(v.category)) return fail();
    if (v.person !== undefined && !validPerson(v.person)) return fail();
    if (v.isTransfer !== undefined && typeof v.isTransfer !== "boolean") return fail();
  } else if (kind === "budget") {
    if (Object.keys(v).some((key) => !["limit", "allocation"].includes(key))) return fail();
    if (!money(v.limit) || (v.limit as number) < 0) return fail();
    if (v.allocation !== null) {
      if (!v.allocation || typeof v.allocation !== "object") return fail();
      const { stefan, partner } = v.allocation as Record<string, unknown>;
      if (!Number.isInteger(stefan) || !Number.isInteger(partner) || (stefan as number) < 0 || (partner as number) < 0 || (stefan as number) + (partner as number) !== 100) return fail();
    }
  } else if (kind === "rule") {
    if (Object.keys(v).some((key) => !["match", "category", "person"].includes(key))) return fail();
    if (typeof v.match !== "string" || v.match.trim().length < 3 || v.match.length > 120 || !validCategory(v.category) || !validPerson(v.person)) return fail();
  } else if (kind === "recurring") {
    if (Object.keys(v).some((key) => !["id", "name", "category", "amount", "day", "person", "active"].includes(key))) return fail();
    if (v.id !== id || typeof v.name !== "string" || !v.name.trim() || v.name.length > 80 || !validCategory(v.category) || !validPerson(v.person) || !money(v.amount) || v.amount === 0 || !Number.isInteger(v.day) || (v.day as number) < 1 || (v.day as number) > 31 || typeof v.active !== "boolean") return fail();
    if (v.category === "Transfer") return fail();
    if ((v.amount as number) > 0 && v.category !== "Income" || (v.amount as number) < 0 && v.category === "Income") return fail();
  } else if (kind === "category") {
    if (Object.keys(v).some((key) => !["name", "hidden"].includes(key)) || typeof v.name !== "string" || !v.name.trim() || v.name !== v.name.trim() || v.name.length > 40 || /[\x00-\x1f]/.test(v.name) || typeof v.hidden !== "boolean" || ["income", "transfer"].includes(v.name.toLowerCase())) return fail();
  } else if (kind === "classification") {
    if (Object.keys(v).some((key) => !["category", "transactionIds", "active"].includes(key)) || !validCategory(v.category) || ["Transfer", "Uncategorised"].includes(v.category as string) || typeof v.active !== "boolean" || !Array.isArray(v.transactionIds) || v.transactionIds.length < 1 || v.transactionIds.length > 100 || new Set(v.transactionIds).size !== v.transactionIds.length || v.transactionIds.some((id) => typeof id !== "string" || id.length > 180 || !id)) return fail();
  } else if (kind === "household") {
    if (id !== "names" || Object.keys(v).some((key) => !["stefan", "partner"].includes(key)) || [v.stefan, v.partner].some((name) => typeof name !== "string" || !name.trim() || name.length > 40 || /[\x00-\x1f]/.test(name))) return fail();
  } else return fail();
  return { kind, id, value } as LedgerMutation;
}
