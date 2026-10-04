import type { RecurringItem, HouseholdNames } from "./ledger-types";

export type Money = {
  amount: number;
  currency: string;
};

export type FinanceAccount = {
  id: string;
  name: string;
  type: "transaction" | "credit-card" | "loan" | "other";
  current: number;
  available: number | null;
  currency: string;
  observedAt: string | null;
  freshness?: string | null;
};

export type Person = "Stefan" | "Partner" | "Shared" | "Unknown";

export type FinanceTransaction = {
  id: string;
  accountId: string;
  accountName: string;
  status: "pending" | "posted";
  date: string;
  description: string;
  merchantName: string | null;
  amount: number;
  currency: string;
  category: string;
  categorySource?: "unclassified" | "suggested" | "manual" | "rule";
  person: Person;
  merchantCategoryCode: string | null;
  isTransfer: boolean;
  reviewReason?: string;
};

export type BudgetLine = {
  id: string;
  name: string;
  icon: string;
  color: string;
  limit: number;
  spent: number;
  pending: number;
  allocation: { stefan: number; partner: number } | null;
};

export type ForecastPoint = {
  month: string;
  label: string;
  baseline: number;
};

export type FinanceSnapshot = {
  classificationBatches?: Array<{ id: string; category: string; transactionIds: string[]; active: boolean }>;
  categoryNames?: string[];
  budgetCategories?: Array<{ id: string; name: string; hidden: boolean }>;
  householdNames?: HouseholdNames;
  plannedIncome?: number;
  plannedSpending?: number;
  expensePlan?: Array<{ category: string; budget: number; recurring: number; total: number }>;
  month?: string;
  recurring?: RecurringItem[];
  plannedSurplus?: number;
  forecastReady?: boolean;
  mode: "preview" | "live";
  generatedAt: string;
  connection: {
    status: "active" | "preview" | "error";
    institution: string;
    lastRefreshedAt: string | null;
    consentExpiresAt: string | null;
    message: string;
  };
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  budgets: BudgetLine[];
  forecast: ForecastPoint[];
  metrics: {
    offsetBalance: number;
    cardOwing: number;
    mortgageBalance: number;
    netLiquid: number;
    incomeThisMonth: number;
    spentThisMonth: number;
    savedThisMonth: number;
    savingsRate: number | null;
    overallBudget: number;
    overallBudgetSpent: number;
  };
};
