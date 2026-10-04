import type {
  BudgetLine,
  FinanceSnapshot,
  FinanceTransaction,
} from "./types";

const demoMonth = "2026-10";

const demoTransactions: FinanceTransaction[] = [
  tx("t1", "2026-10-04", "Fresh Market", -12840, "Groceries", "Shared", "posted"),
  tx("t2", "2026-10-04", "Little Bay Coffee", -1450, "Eating out", "Stefan", "pending"),
  tx("t3", "2026-10-03", "City Energy", -18620, "Utilities", "Shared", "posted"),
  tx("t4", "2026-10-03", "Garden Pharmacy", -4825, "Health", "Partner", "posted"),
  tx("t5", "2026-10-02", "Metro Fuel", -9170, "Transport", "Stefan", "posted"),
  tx("t6", "2026-10-02", "Salary deposit", 624000, "Income", "Stefan", "posted", "offset"),
  tx("t7", "2026-10-01", "Salary deposit", 497500, "Income", "Partner", "posted", "offset"),
  tx("t8", "2026-10-01", "Home loan repayment", -342000, "Mortgage", "Shared", "posted", "offset"),
  tx("t9", "2026-10-01", "Streamhouse", -2199, "Subscriptions", "Shared", "posted"),
  tx("t10", "2026-09-30", "Credit card payment", 486200, "Transfer", "Shared", "posted", "card", true),
  tx("t11", "2026-09-30", "Credit card payment", -486200, "Transfer", "Shared", "posted", "offset", true),
  tx("t12", "2026-09-29", "Neighbourhood Grocer", -16480, "Groceries", "Shared", "posted"),
  tx("t13", "2026-09-28", "Riverside Restaurant", -11200, "Eating out", "Partner", "posted"),
];

function tx(
  id: string,
  date: string,
  merchant: string,
  amount: number,
  category: string,
  person: FinanceTransaction["person"],
  status: FinanceTransaction["status"],
  account: "card" | "offset" = "card",
  isTransfer = false,
): FinanceTransaction {
  return {
    id,
    accountId: account,
    accountName: account === "card" ? "NAB Credit Card" : "NAB Offset",
    status,
    date,
    description: merchant,
    merchantName: merchant,
    amount,
    currency: "aud",
    category,
    person,
    merchantCategoryCode: null,
    isTransfer,
  };
}

const baseBudgets: Omit<BudgetLine, "spent" | "pending">[] = [
  { id: "groceries", name: "Groceries", icon: "basket", color: "#3f7d65", limit: 105000, allocation: null },
  { id: "eating", name: "Eating out", icon: "utensils", color: "#d47d56", limit: 65000, allocation: { stefan: 50, partner: 50 } },
  { id: "transport", name: "Transport", icon: "car", color: "#4b74a8", limit: 45000, allocation: null },
  { id: "clothing", name: "Clothing", icon: "shirt", color: "#9b6d9c", limit: 100000, allocation: { stefan: 30, partner: 70 } },
  { id: "utilities", name: "Utilities", icon: "zap", color: "#c19a3e", limit: 42000, allocation: null },
  { id: "entertainment", name: "Entertainment", icon: "ticket", color: "#6a7fbb", limit: 35000, allocation: { stefan: 50, partner: 50 } },
  { id: "health", name: "Health", icon: "health", color: "#9b6d9c", limit: 0, allocation: null },
  { id: "subscriptions", name: "Subscriptions", icon: "ticket", color: "#6a7fbb", limit: 0, allocation: null },
  { id: "mortgage", name: "Mortgage", icon: "mortgage", color: "#3f7d65", limit: 0, allocation: null },
  { id: "insurance", name: "Insurance", icon: "other", color: "#4b74a8", limit: 0, allocation: null },
  { id: "travel", name: "Travel", icon: "car", color: "#d47d56", limit: 0, allocation: null },
  { id: "shopping", name: "Shopping", icon: "basket", color: "#9b6d9c", limit: 0, allocation: null },
  { id: "other", name: "Other", icon: "other", color: "#718096", limit: 0, allocation: null },
];

export function buildBudgets(transactions: FinanceTransaction[], month = new Date().toISOString().slice(0, 7)): BudgetLine[] {
  return baseBudgets.map((budget) => {
    const matching = transactions.filter(
      (item) =>
        item.date.startsWith(month) &&
        item.category.toLowerCase() === budget.name.toLowerCase() &&
        item.amount < 0,
    );
    return {
      ...budget,
      spent: Math.abs(
        matching
          .filter((item) => item.status === "posted")
          .reduce((total, item) => total + item.amount, 0),
      ),
      pending: Math.abs(
        matching
          .filter((item) => item.status === "pending")
          .reduce((total, item) => total + item.amount, 0),
      ),
    };
  });
}

export function getDemoSnapshot(): FinanceSnapshot {
  const budgets = buildBudgets(demoTransactions, demoMonth);
  const income = demoTransactions
    .filter((item) => item.date.startsWith(demoMonth) && item.amount > 0 && !item.isTransfer)
    .reduce((total, item) => total + item.amount, 0);
  const spending = Math.abs(
    demoTransactions
      .filter((item) => item.date.startsWith(demoMonth) && item.amount < 0 && !item.isTransfer)
      .reduce((total, item) => total + item.amount, 0),
  );
  const overallBudget = budgets.reduce((total, item) => total + item.limit, 0);
  const overallBudgetSpent = budgets.reduce((total, item) => total + item.spent + item.pending, 0);
  const netLiquid = 7148000 - 563400;
  const monthlySurplus = 267000;

  return {
    mode: "preview",
    generatedAt: new Date().toISOString(),
    connection: {
      status: "preview",
      institution: "NAB via Redbark",
      lastRefreshedAt: null,
      consentExpiresAt: null,
      message: "Preview data · add authenticated Redbark credentials for live balances",
    },
    accounts: [
      { id: "offset", name: "NAB Offset", type: "transaction", current: 7148000, available: 7148000, currency: "aud", observedAt: null },
      { id: "card", name: "NAB Credit Card", type: "credit-card", current: -563400, available: 1436600, currency: "aud", observedAt: null },
      { id: "loan", name: "Home Loan", type: "loan", current: -53074800, available: null, currency: "aud", observedAt: null },
    ],
    transactions: demoTransactions,
    budgets,
    forecast: Array.from({ length: 13 }, (_, index) => {
      const date = new Date(2026, 9 + index, 1);
      return {
        month: date.toISOString().slice(0, 7),
        label: new Intl.DateTimeFormat("en-AU", { month: "short" }).format(date),
        baseline: netLiquid + monthlySurplus * index,
      };
    }),
    metrics: {
      offsetBalance: 7148000,
      cardOwing: 563400,
      mortgageBalance: 53074800,
      netLiquid,
      incomeThisMonth: income,
      spentThisMonth: spending,
      savedThisMonth: income - spending,
      savingsRate: income ? (income - spending) / income : null,
      overallBudget,
      overallBudgetSpent,
    },
  };
}
