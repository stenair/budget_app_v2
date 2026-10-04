"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { useLedgerSave } from "./use-ledger-save";
import { useHousehold } from "./household-context";
import type { MerchantRule } from "@/lib/finance/ledger-types";

export function RuleManager({ rules }: { rules: Array<MerchantRule & { id: string }> }) {
  const { categoryNames, personLabel } = useHousehold();
  const { save, pending, error, message } = useLedgerSave();
  const [editing, setEditing] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  return <Card className="mt-4"><CardHeader><CardTitle className="text-base">Merchant rules</CardTitle><p className="text-xs text-muted-foreground">Rules affect matching imported history and future transactions. Manual category edits take priority. New rules created in Activity match exact merchant text and preserve people.</p></CardHeader><CardContent>
    <p role="status" className={`text-xs ${error ? "text-destructive" : "text-primary"}`}>{error || message}</p>
    {!rules.length ? <p className="py-3 text-sm text-muted-foreground">Choose a transaction category in Activity, then use “Create merchant rule”.</p> : null}
    <div className="divide-y">{rules.map((rule) => {
      const { id, ...value } = rule;
      return <div key={id} className="py-3"><p className="break-words text-sm font-medium">{rule.match} {rule.enabled === false ? "· paused" : ""}</p><p className="mt-1 text-xs text-muted-foreground">{rule.matchMode === "exact" ? "Exact merchant" : "Contains text (legacy rule)"}{rule.direction ? ` · ${rule.direction}` : " · both directions"} → {rule.category} · {rule.applyPerson === false ? "People unchanged" : `Assigns ${personLabel(rule.person)}`}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">{editing === id ? <><select aria-label={`Rule category for ${rule.match}`} className="h-9 max-w-full rounded-md border px-2 text-xs" value={category} onChange={(event) => setCategory(event.target.value)}>{categoryNames.map((name) => <option key={name}>{name}</option>)}</select><Button size="sm" disabled={pending} onClick={() => save({ kind: "rule", id, value: { ...value, category } }, () => setEditing(null))}>Save rule</Button><Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></> : <Button size="sm" variant="outline" onClick={() => { setEditing(id); setCategory(rule.category); }}>Edit category</Button>}<Button disabled={pending} size="sm" variant="outline" onClick={() => save({ kind: "rule", id, value: { ...value, enabled: rule.enabled === false } })}>{rule.enabled === false ? "Resume" : "Pause"}</Button>{rule.applyPerson !== false ? <Button disabled={pending} size="sm" variant="ghost" onClick={() => save({ kind: "rule", id, value: { ...value, applyPerson: false } })}>Keep people unchanged</Button> : null}</div>
      </div>;
    })}</div>
  </CardContent></Card>;
}
