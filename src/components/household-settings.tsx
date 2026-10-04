"use client";
import { useState } from "react";
import { useHousehold } from "@/components/household-context";
import { useLedgerSave } from "@/components/use-ledger-save";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function HouseholdSettings() {
  const { names } = useHousehold();
  const [draft, setDraft] = useState(names);
  const { save, pending, message, error } = useLedgerSave();
  return <Card className="mt-4 shadow-xs"><CardHeader><CardTitle className="text-base">Household display names</CardTitle><p className="text-xs text-muted-foreground">These labels appear in budgets, transaction assignments and reports. Signing up does not change them automatically.</p></CardHeader><CardContent><form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void save({ kind: "household", id: "names", value: { stefan: draft.stefan.trim(), partner: draft.partner.trim() } }); }}><label className="text-xs font-medium">Your name<Input required maxLength={40} className="mt-1" value={draft.stefan} onChange={(event) => setDraft({ ...draft, stefan: event.target.value })} /></label><label className="text-xs font-medium">Partner’s name<Input required maxLength={40} className="mt-1" value={draft.partner} onChange={(event) => setDraft({ ...draft, partner: event.target.value })} /></label><div className="sm:col-span-2"><Button disabled={pending} type="submit">{pending ? "Saving…" : "Save names"}</Button><p role="status" className={`mt-2 text-xs ${error ? "text-destructive" : "text-primary"}`}>{error || message}</p></div></form></CardContent></Card>;
}
