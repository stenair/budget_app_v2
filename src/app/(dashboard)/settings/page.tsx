import { CheckCircle2, CircleAlert, Database, KeyRound, Landmark, LockKeyhole, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/finance/format";
import { getFinanceSnapshot } from "@/lib/finance/redbark";
import { HouseholdSettings } from "@/components/household-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const data = await getFinanceSnapshot();
  const redbarkConfigured = Boolean(process.env.REDBARK_API_KEY);
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
  const allowlistConfigured = Boolean(process.env.HOUSEHOLD_EMAILS?.trim());
  const localBypass = process.env.NODE_ENV === "development" && process.env.ALLOW_LIVE_DATA_WITHOUT_AUTH === "true";

  return (
    <div>
      <PageHeading
        eyebrow="Private household"
        title="Settings"
        description="Review the connection and access controls that protect your financial data."
        action={<Badge variant="outline" className="w-fit gap-2 rounded-full bg-card px-3 py-1.5 font-normal"><span className={data.mode === "live" ? "size-2 rounded-full bg-emerald-500" : "size-2 rounded-full bg-amber-500"} />{data.mode === "live" ? "Live mode" : "Preview mode"}</Badge>}
      />

      <div className="mb-4"><HouseholdSettings /></div>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-xs">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Landmark className="size-4 text-primary" /> Bank connection</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Institution" value={data.connection.institution} ready={redbarkConfigured} />
            <Separator />
            <SettingRow label="Redbark API v2" value={redbarkConfigured ? "Server key configured" : "Add REDBARK_API_KEY"} ready={redbarkConfigured} />
            <Separator />
            <SettingRow label="Data status" value={data.mode === "live" ? "Balances and transactions active" : "Using private preview dataset"} ready={data.mode === "live"} />
            <Separator />
            <SettingRow label="Consent expires" value={data.connection.consentExpiresAt ? formatDateTime(data.connection.consentExpiresAt) : "Not supplied in preview"} ready={Boolean(data.connection.consentExpiresAt)} />
            <Separator />
            <div className="flex items-start justify-between gap-4"><span className="text-sm text-muted-foreground">Last checked</span><span className="text-right text-sm font-medium">{formatDateTime(data.generatedAt)}</span></div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-primary" /> Household access</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Authentication" value={clerkConfigured ? "Clerk configured" : "Add Clerk server and publishable keys"} ready={clerkConfigured} />
            <Separator />
            <SettingRow label="Member allowlist" value={allowlistConfigured ? "Household emails configured" : "Add HOUSEHOLD_EMAILS"} ready={allowlistConfigured} />
            <Separator />
            <SettingRow label="Shared storage" value={process.env.DATABASE_URL ? "Encrypted PostgreSQL ledger" : "Encrypted local development ledger"} ready={Boolean(process.env.DATABASE_URL)} />
            <Separator />
            <SettingRow label="Development bypass" value={localBypass ? "Enabled locally" : "Disabled"} ready={!localBypass} />
            <Separator />
            <div className="rounded-xl bg-secondary/65 p-4 text-xs leading-5 text-muted-foreground"><LockKeyhole className="mb-2 size-4 text-primary" />Financial credentials stay on the server. Browser code receives the household snapshot only after the server access check.</div>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-4 shadow-xs">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Database className="size-4 text-primary" /> Accounts available to Harbour</CardTitle><p className="text-xs text-muted-foreground">Names and connection timestamps from the current {data.mode} snapshot.</p></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {data.accounts.map((account) => (
            <div key={account.id} className="rounded-xl border bg-background p-4">
              <div className="flex items-center justify-between gap-2"><span className="grid size-8 place-items-center rounded-lg bg-secondary text-primary"><KeyRound className="size-3.5" /></span><Badge variant="secondary" className="font-normal capitalize">{account.type.replace("-", " ")}</Badge></div>
              <p className="mt-3 text-sm font-semibold">{account.name}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{account.observedAt ? `Observed ${formatDateTime(account.observedAt)} · ${account.freshness ?? "unknown freshness"}` : data.mode === "preview" ? "Preview account" : "Bank observation time unavailable"}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="mt-4 shadow-xs"><CardHeader><CardTitle className="text-base">Your data</CardTitle><p className="text-xs text-muted-foreground">Download your household ledger and transaction history.</p></CardHeader><CardContent className="flex flex-wrap gap-3"><Button asChild variant="outline"><a href="/api/export?format=csv" download>Export transactions</a></Button><Button asChild variant="outline"><a href="/api/export" download>Download backup</a></Button></CardContent></Card>
    </div>
  );
}

function SettingRow({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  const Icon = ready ? CheckCircle2 : CircleAlert;
  return <div className="flex items-start justify-between gap-4"><span className="text-sm text-muted-foreground">{label}</span><span className="flex max-w-[65%] items-center gap-2 text-right text-sm font-medium"><Icon className={ready ? "size-4 shrink-0 text-emerald-600" : "size-4 shrink-0 text-amber-600"} />{value}</span></div>;
}
