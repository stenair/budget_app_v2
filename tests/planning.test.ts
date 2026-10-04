import test from "node:test";
import assert from "node:assert/strict";
import { planForecast, upcomingPlan, categoryChange, reviewSummary } from "../src/lib/finance/planning";
import { getDemoSnapshot } from "../src/lib/finance/demo";
import { applyLedger } from "../src/lib/finance/project";
import { validateMutation } from "../src/lib/finance/validation";
import type { PlannedEvent, LedgerState } from "../src/lib/finance/ledger-types";

const empty: LedgerState = { corrections: {}, budgets: {}, rules: {}, recurring: {} };
test("pending purchases affect budget commitments but not posted cash flow", () => {
  const source = getDemoSnapshot();
  source.transactions = [{ ...source.transactions[0], amount: -10000, status: "pending" }];
  const data = applyLedger(source, empty);
  assert.equal(data.metrics.spentThisMonth, 0);
  assert.equal(data.metrics.savedThisMonth, 0);
  assert.equal(data.metrics.pendingThisMonth, 10000);
  assert.equal(data.budgets.find((item) => item.id === "groceries")?.pending, 10000);
});
test("one-offs occur once, past events are excluded and expenses still project without income", () => {
  const event: PlannedEvent = { id: "trip", name: "Trip", date: "2026-11-15", amount: -100000, category: "Travel", active: true };
  const forecast = planForecast({ month:"2026-10", asOf:"2026-10-05", balance:500000, surplus:-10000, months:3, events:[event,{...event,id:"past",date:"2026-10-01"},{...event,id:"removed",active:false}],monthlyChange:-5000 });
  assert.equal(forecast[0].baseline, 500000);
  assert.equal(forecast[1].baseline, 490000);
  assert.equal(forecast[2].baseline, 380000);
  assert.equal(forecast[3].baseline, 370000);
  assert.equal(forecast[3].value, 355000);
});
test("upcoming schedule rolls into next month and clamps day 31 to February", () => {
  const rows = upcomingPlan([{ id:"bill",name:"Bill",category:"Mortgage",amount:-10000,day:31,person:"Shared",active:true }],[],"2028-02-01");
  assert.equal(rows[0].date,"2028-02-29");
  assert.equal(upcomingPlan([{ id:"bill",name:"Bill",category:"Mortgage",amount:-10000,day:3,person:"Shared",active:true }],[],"2026-10-30")[0].date,"2026-11-03");
});
test("exact category-only rules preserve people and manual edits, with a reversible pause", () => {
  const source = getDemoSnapshot();
  source.transactions = [source.transactions[0],{...source.transactions[0],id:"refund",amount:1000},{...source.transactions[0],id:"different",merchantName:"Fresh Market Bakery"}];
  const state: LedgerState = { ...empty, rules:{fresh:{match:"Fresh Market",category:"Shopping",person:"Unknown",applyPerson:false,matchMode:"exact",direction:"outgoing",enabled:true}},corrections:{different:{category:"Health"}} };
  const result=applyLedger(source,state);
  assert.equal(result.transactions[0].person,"Shared");
  assert.equal(result.transactions[0].category,"Shopping");
  assert.equal(result.transactions[1].category,"Groceries");
  assert.equal(result.transactions[2].category,"Health");
  state.rules.fresh.enabled=false;
  assert.equal(applyLedger(source,state).transactions[0].category,"Groceries");
});
test("comparison uses the same elapsed days and unknown credits never offset purchases", () => {
  const base=getDemoSnapshot().transactions[0];
  const rows=[{...base,id:"a",date:"2026-10-05",amount:-10000},{...base,id:"b",date:"2026-09-05",amount:-8000},{...base,id:"c",date:"2026-09-20",amount:-9000},{...base,id:"d",date:"2026-10-02",amount:10000,category:"Uncategorised"}];
  assert.equal(categoryChange(rows,"2026-10","all",5).rows[0].change,2000);
  assert.equal(reviewSummary(rows).unknownCredits,10000);
  assert.throws(()=>validateMutation({kind:"event",id:"bad",value:{id:"bad",name:"Bad",date:"2026-02-30",amount:-100,category:"Travel",active:true}}));
});
