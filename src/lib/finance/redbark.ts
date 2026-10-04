import "server-only";
import { cache } from "react";
import type { FinanceAccount, FinanceSnapshot, FinanceTransaction } from "./types";
import { buildBudgets, getDemoSnapshot } from "./demo";
import { householdAccess } from "./access";
import { readLedger } from "./ledger";
import { applyLedger, perthDate } from "./project";
import { readRecords, writeRecord } from "./store";
import { matchOwnedTransfers } from "./transfers";

const baseUrl = "https://api.redbark.com/v2";

type RedbarkList<T> = { data: T[]; next_page_url: string | null };
type RedbarkMoney = { amount: number; currency: string } | null;
type RedbarkAccount = {
  id: string;
  name: string;
  type: string;
  currency: string;
  connection: string;
};
type RedbarkBalance = {
  account: string;
  current: RedbarkMoney;
  available: RedbarkMoney;
  observed_at: string | null;
  freshness: string | null;
};
type RedbarkConnection = { id: string; institution: { name: string }; status: string; last_refreshed_at: string | null; consent: { expires_at: string | null } | null };
type RedbarkTransaction = {
  id: string;
  account: string;
  status: string;
  date: string;
  description: string;
  amount: { amount: number; currency: string };
  provider_category: string | null;
  category: string | null;
  merchant_name: string | null;
  merchant_category_code: string | null;
};

function headers() {
  return {
    Authorization: `Bearer ${process.env.REDBARK_API_KEY}`,
    "Redbark-Version": process.env.REDBARK_VERSION ?? "2026-10-01.wattle",
  };
}

async function redbark<T>(path: string): Promise<T> {
  const url = new URL(path, `${baseUrl}/`);
  if (url.origin !== "https://api.redbark.com" || !url.pathname.startsWith("/v2/")) throw new Error("Invalid Redbark pagination URL.");
  const response = await fetch(url, {
    headers: headers(),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`Redbark request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

async function listAll<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  let next: string | null = `${baseUrl}${path}`;
  const visited = new Set<string>();
  while (next) {
    if (visited.has(next) || visited.size >= 100) throw new Error("Redbark history was not fully read.");
    visited.add(next);
    const page: RedbarkList<T> = await redbark(next);
    rows.push(...page.data);
    next = page.next_page_url;
  }
  return rows;
}

function normaliseType(type: string): FinanceAccount["type"] {
  if (type === "transaction") return "transaction";
  if (type === "credit-card") return "credit-card";
  if (type === "loan") return "loan";
  return "other";
}

function inferCategory(item: RedbarkTransaction) {
  const text = `${item.merchant_name ?? ""} ${item.description}`.toLowerCase();
  if (/credit card payment|internal transfer/.test(text)) return "Transfer";
  if (/salary|payroll|wages/.test(text)) return "Income";
  if (/mortgage|home loan/.test(text)) return "Mortgage";
  if (/woolworths|coles|aldi|grocer|market/.test(text)) return "Groceries";
  if (/restaurant|cafe|coffee|grill|pizza|hungry|food/.test(text)) return "Eating out";
  if (/fuel|parking|transport|uber|transperth/.test(text)) return "Transport";
  if (/pharmacy|medical|health|dental/.test(text)) return "Health";
  if (/netflix|spotify|stream|subscription/.test(text)) return "Subscriptions";
  const provider = item.provider_category?.toLowerCase();
  const providerMap: Record<string, string> = {
    food_and_drink: "Eating out",
    transportation: "Transport",
    personal_care: "Health",
    entertainment: "Entertainment",
    merchandise: "Shopping",
  };
  return provider ? providerMap[provider] ?? "Other" : "Other";
}

function firstDayThreeMonthsAgo() {
  const date = new Date();
  date.setMonth(date.getMonth() - 3, 1);
  return perthDate(date);
}

export async function getLiveSnapshot(): Promise<FinanceSnapshot> {
  const [accountList, connections] = await Promise.all([
    listAll<RedbarkAccount>("/accounts?limit=100"),
    listAll<RedbarkConnection>("/connections?limit=100"),
  ]);
  const eligible = accountList.filter((account) => ["transaction", "credit-card", "loan"].includes(account.type));
  if (!eligible.length) throw new Error("No banking accounts are available.");
  const balanceQuery = new URLSearchParams();
  for (const account of eligible) balanceQuery.append("account", account.id);
  const balanceList = await redbark<RedbarkList<RedbarkBalance>>(`${baseUrl}/balances?${balanceQuery}`);
  const balances = new Map(balanceList.data.map((item) => [item.account, item]));
  const accounts: FinanceAccount[] = eligible
    .filter((account) => ["transaction", "credit-card", "loan"].includes(account.type))
    .map((account) => {
      const balance = balances.get(account.id);
      if (!balance?.current || !Number.isSafeInteger(balance.current.amount) || balance.current.currency.toLowerCase() !== "aud") throw new Error("An AUD account balance is unavailable.");
      return {
        id: account.id,
        name: account.name,
        type: normaliseType(account.type),
        current: balance.current.amount,
        available: balance?.available?.amount ?? null,
        currency: account.currency,
        observedAt: balance?.observed_at ?? null,
        freshness: balance?.freshness ?? "unavailable",
      };
    });

  const transactionLists = await Promise.all(
    accounts
      .filter((account) => account.type !== "loan")
      .map((account) =>
        listAll<RedbarkTransaction>(
          `/transactions?account=${encodeURIComponent(account.id)}&from=${firstDayThreeMonthsAgo()}&include_pending=true&limit=100`,
        ),
      ),
  );
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  let transactions: FinanceTransaction[] = [...new Map(transactionLists.flat().map((item) => [item.id, item])).values()]
    .map((item): FinanceTransaction => ({
      id: item.id,
      accountId: item.account,
      accountName: accountNames.get(item.account) ?? "NAB account",
      status: item.status === "pending" ? "pending" : "posted",
      date: item.date,
      description: item.description,
      merchantName: item.merchant_name,
      amount: item.amount.amount,
      currency: item.amount.currency,
      category: inferCategory(item),
      person: "Unknown",
      merchantCategoryCode: item.merchant_category_code,
      isTransfer: false,
    }))
    .toSorted((a, b) => b.date.localeCompare(a.date));
  if (transactions.some((item) => item.currency.toLowerCase() !== "aud" || !Number.isSafeInteger(item.amount))) throw new Error("A transaction cannot be represented safely in the AUD ledger.");
  transactions = matchOwnedTransfers(transactions);

  const now = new Date();
  const month = perthDate(now).slice(0, 7);
  const income = transactions
    .filter((item) => item.date.startsWith(month) && item.amount > 0 && !item.isTransfer)
    .reduce((sum, item) => sum + item.amount, 0);
  const spending = Math.abs(
    transactions
      .filter((item) => item.date.startsWith(month) && item.amount < 0 && !item.isTransfer)
      .reduce((sum, item) => sum + item.amount, 0),
  );
  const offset = accounts.filter((account) => account.type === "transaction").reduce((sum, account) => sum + account.current, 0);
  const cardOwing = -accounts.filter((account) => account.type === "credit-card").reduce((sum, account) => sum + account.current, 0);
  const mortgage = -accounts.filter((account) => account.type === "loan").reduce((sum, account) => sum + account.current, 0);
  const relatedConnections = connections.filter((connection) => eligible.some((account) => account.connection === connection.id));
  const healthy = relatedConnections.every((connection) => ["active", "expiring"].includes(connection.status)) && accounts.every((account) => account.freshness === "fresh");
  const netLiquid = offset - cardOwing;
  const budgets = buildBudgets(transactions, month);
  const overallBudget = budgets.reduce((sum, item) => sum + item.limit, 0);
  const overallBudgetSpent = budgets.reduce((sum, item) => sum + item.spent + item.pending, 0);
  const monthlySurplus = income - spending;

  return {
    mode: "live",
    generatedAt: new Date().toISOString(),
    connection: {
      status: healthy ? "active" : "error",
      institution: "NAB via Redbark",
      lastRefreshedAt: relatedConnections.map((item) => item.last_refreshed_at).filter((item): item is string => Boolean(item)).sort()[0] ?? null,
      consentExpiresAt: relatedConnections.map((item) => item.consent?.expires_at).filter((item): item is string => Boolean(item)).sort()[0] ?? null,
      message: healthy ? "Live Open Banking data" : "Some balances are stale or consent needs review. Check Settings.",
    },
    accounts,
    transactions,
    budgets,
    forecast: Array.from({ length: 13 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() + index, 1);
      return {
        month: date.toISOString().slice(0, 7),
        label: new Intl.DateTimeFormat("en-AU", { month: "short" }).format(date),
        baseline: netLiquid + monthlySurplus * index,
      };
    }),
    metrics: {
      offsetBalance: offset,
      cardOwing,
      mortgageBalance: mortgage,
      netLiquid,
      incomeThisMonth: income,
      spentThisMonth: spending,
      savedThisMonth: monthlySurplus,
      savingsRate: income ? monthlySurplus / income : null,
      overallBudget,
      overallBudgetSpent,
    },
  };
}

export const getFinanceSnapshot = cache(async (): Promise<FinanceSnapshot> => {
  const access = await householdAccess();
  const ledger = await readLedger(access.scope);
  if (!access.live) return applyLedger(getDemoSnapshot(), ledger);
  const previous = (await readRecords<FinanceSnapshot>(access.scope, "snapshot:current"))[0]?.value;
  if (previous && Date.now() - new Date(previous.generatedAt).getTime() < 60000) return applyLedger(previous, ledger);
  try {
    const snapshot = await getLiveSnapshot();
    const currentIds = new Set(snapshot.transactions.map((item) => item.id));
    // Retain posted history outside the authoritative fetch window; replace pending rows on each successful read.
    const start = firstDayThreeMonthsAgo();
    snapshot.transactions = [...snapshot.transactions, ...(previous?.transactions ?? []).filter((item) => item.status === "posted" && item.date < start && !currentIds.has(item.id))].toSorted((a, b) => b.date.localeCompare(a.date));
    await writeRecord(access.scope, "snapshot:current", snapshot, "redbark-read");
    return applyLedger(snapshot, ledger);
  } catch {
    if (!previous) throw new Error("The Redbark feed could not be loaded. Check the server key and account consent.");
    return applyLedger({ ...previous, connection: { ...previous.connection, status: "error", message: "Redbark could not be reached. Showing the last successful snapshot." } }, ledger);
  }
});
