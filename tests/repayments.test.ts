import test from "node:test";
import assert from "node:assert/strict";
import { getDemoSnapshot } from "../src/lib/finance/demo";
import { matchOwnedTransfers } from "../src/lib/finance/transfers";
import { applyLedger } from "../src/lib/finance/project";
import { monthlyHistory, isCashFlowMovement } from "../src/lib/finance/history";
import { reviewSummary } from "../src/lib/finance/planning";
import type { FinanceTransaction } from "../src/lib/finance/types";

const base = getDemoSnapshot();
const empty = { corrections: {}, budgets: {}, rules: {}, recurring: {} };
const tx = (id: string, accountId: string, amount: number, description: string, date = "2026-10-04"): FinanceTransaction => ({ ...base.transactions[0], id, accountId, amount, description, merchantName:null, date, status:"posted", category:"Uncategorised", person:"Unknown", isTransfer:false });

test("NAB card autopay and direct debit receipt are excluded on both sides, including cached snapshots", () => {
  const rows = [tx("offset-payment","offset",-40000,"NAB CARD AUTOPAY"),tx("card-receipt","card",40000,"DIRECT DEBIT PAYMENT"),tx("purchase","card",-10000,"Weekly groceries")];
  const snapshot = applyLedger({ ...base, transactions:rows },empty);
  assert.ok(snapshot.transactions.slice(0,2).every((row) => row.isTransfer && row.repayment === "credit-card" && row.pairedTransactionId));
  assert.equal(snapshot.metrics.incomeThisMonth,0);
  assert.equal(snapshot.metrics.spentThisMonth,10000);
  assert.equal(reviewSummary(snapshot.transactions).unknownCredits,0);
  assert.equal(monthlyHistory(snapshot.transactions,"2026-10")[0].netMovement,-10000);
  assert.equal(snapshot.metrics.netLiquid,base.metrics.offsetBalance-base.metrics.cardOwing);
  // An old automatic correction must not turn a proven repayment into salary.
  const corrected=applyLedger({ ...base,transactions:rows },{ ...empty,corrections:{"card-receipt":{ category:"Income",person:"Partner" as const,isTransfer:false}}});
  assert.equal(corrected.metrics.incomeThisMonth,0);
  assert.equal(corrected.transactions[1].person,"Partner");
});

test("mortgage funding counts once from offset while the loan receipt, interest and fees stay out of cash reports", () => {
  const rows=[tx("mortgage-debit","offset",-300000,"LOAN REPAYMENT TO A/C xxx"),tx("mortgage-credit","loan",300000,"LOAN REPAYMENT FROM A/C xxx"),tx("interest","loan",-200000,"INTEREST CHARGED"),tx("fee","loan",-1200,"LOAN SERVICE FEE"),tx("notice","loan",0,"MINIMUM LOAN REPAYMENT NOTICE")];
  const snapshot=applyLedger({...base,transactions:rows},empty);
  assert.equal(snapshot.transactions[0].category,"Mortgage");
  assert.equal(snapshot.transactions[0].isTransfer,false);
  assert.equal(snapshot.transactions[1].isTransfer,true);
  assert.equal(snapshot.metrics.incomeThisMonth,0);
  assert.equal(snapshot.metrics.spentThisMonth,300000);
  assert.equal(snapshot.budgets.find((row)=>row.name==="Mortgage")?.spent,300000);
  assert.equal(snapshot.transactions.filter(isCashFlowMovement).length,1);
  assert.equal(monthlyHistory(snapshot.transactions,"2026-10")[0].netMovement,-300000);
  assert.equal(reviewSummary(snapshot.transactions).unknownCredits,0);
});

test("repayments posting across a month boundary cannot inflate either month's income or expenses", () => {
  const rows=[tx("debit","offset",-40000,"NAB CARD AUTOPAY","2026-09-30"),tx("credit","card",40000,"DIRECT DEBIT PAYMENT","2026-10-01")];
  const snapshot=applyLedger({...base,transactions:rows},empty);
  assert.ok(monthlyHistory(snapshot.transactions,"2026-10").every((row)=>row.income===0&&row.spending===0&&row.netMovement===0));
});

test("matching rejects differing currencies, settlement states, unrelated refunds and ambiguous equal payments", () => {
  const debit=tx("debit","offset",-40000,"NAB CARD AUTOPAY");
  const credit=tx("credit","card",40000,"DIRECT DEBIT PAYMENT");
  for (const mismatch of [{...credit,currency:"usd"},{...credit,status:"pending" as const},{...credit,date:"2026-10-10"}]) assert.ok(!matchOwnedTransfers([debit,mismatch],base.accounts)[0].isTransfer);
  const refund=tx("refund","card",40000,"STORE REFUND");
  const groceries=tx("groceries","offset",-40000,"Grocery shop");
  assert.ok(matchOwnedTransfers([groceries,refund],base.accounts).every((row)=>!row.isTransfer));
  const ambiguous=matchOwnedTransfers([debit,credit,{...credit,id:"duplicate"}],base.accounts);
  assert.ok(ambiguous.every((row)=>!row.isTransfer&&row.reviewReason));
});

test("a labelled offset mortgage payment and loan receipts remain safe when only one side is imported", () => {
  const snapshot=applyLedger({...base,transactions:[tx("debit","offset",-300000,"LOAN REPAYMENT TO A/C xxx"),tx("old-loan-credit","loan",90000,"LOAN REPAYMENT FROM A/C xxx","2026-09-10")]},empty);
  assert.equal(snapshot.metrics.spentThisMonth,300000);
  assert.equal(snapshot.metrics.incomeThisMonth,0);
  assert.equal(reviewSummary(snapshot.transactions).unknownCredits,0);
});


test("a recognisable card repayment receipt is not an inflow when its offset counterpart is outside history", () => {
  const snapshot=applyLedger({...base,transactions:[tx("receipt","card",40000,"DIRECT DEBIT PAYMENT")]},empty);
  assert.equal(snapshot.metrics.incomeThisMonth,0);
  assert.equal(reviewSummary(snapshot.transactions).unknownCredits,0);
  assert.equal(monthlyHistory(snapshot.transactions,"2026-10")[0].netMovement,0);
  assert.ok(snapshot.transactions[0].reviewReason);
});
