import type { Person } from "./types";

export const categories = ["Groceries", "Eating out", "Transport", "Utilities", "Health", "Subscriptions", "Entertainment", "Clothing", "Shopping", "Mortgage", "Insurance", "Travel", "Income", "Transfer", "Other", "Uncategorised"];
export const people: Person[] = ["Stefan", "Partner", "Shared", "Unknown"];

export type TransactionCorrection = { category?: string; person?: Person; isTransfer?: boolean };
export type BudgetPlan = { limit: number; allocation: { stefan: number; partner: number } | null };
export type MerchantRule = { match: string; category: string; person: Person };
export type RecurringItem = { id: string; name: string; category: string; amount: number; day: number; person: Person; active: boolean };
export type CategoryDefinition = { name: string; hidden: boolean };
export type HouseholdNames = { stefan: string; partner: string };
export type ClassificationBatch = { category: string; transactionIds: string[]; active: boolean };
export type LedgerState = {
  corrections: Record<string, TransactionCorrection>;
  budgets: Record<string, BudgetPlan>;
  rules: Record<string, MerchantRule>;
  recurring: Record<string, RecurringItem>;
  categories?: Record<string, CategoryDefinition>;
  household?: Record<string, HouseholdNames>;
  classifications?: Record<string, ClassificationBatch>;
};

export type LedgerMutation =
  | { kind: "transaction"; id: string; value: TransactionCorrection }
  | { kind: "budget"; id: string; value: BudgetPlan }
  | { kind: "rule"; id: string; value: MerchantRule }
  | { kind: "recurring"; id: string; value: RecurringItem }
  | { kind: "category"; id: string; value: CategoryDefinition }
  | { kind: "household"; id: string; value: HouseholdNames }
  | { kind: "classification"; id: string; value: ClassificationBatch };
