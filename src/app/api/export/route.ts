import { AccessError, householdAccess } from "@/lib/finance/access";
import { getFinanceSnapshot } from "@/lib/finance/redbark";
import { readLedger } from "@/lib/finance/ledger";
import { readRecords } from "@/lib/finance/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const access = await householdAccess();
    const snapshot = await getFinanceSnapshot();
    const csv = new URL(request.url).searchParams.get("format") === "csv";
    const headers = { "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="harbour-${csv ? "transactions.csv" : "backup.json"}"`, "Content-Type": csv ? "text/csv; charset=utf-8" : "application/json" };
    if (csv) {
      const cell = (value: unknown) => {
        if (typeof value === "number") return value.toFixed(2);
        let text = String(value ?? "");
        if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
        return `"${text.replaceAll('"', '""')}"`;
      };
      const rows = [["Date", "Account", "Description", "Amount (AUD)", "Category", "Person", "Status", "Internal transfer"], ...snapshot.transactions.map((item) => [item.date, item.accountName, item.description, item.amount / 100, item.category, item.person, item.status, item.isTransfer ? "Yes" : "No"])];
      return new Response(rows.map((row) => row.map(cell).join(",")).join("\r\n"), { headers });
    }
    const [ledger, audit] = await Promise.all([readLedger(access.scope), readRecords(access.scope, "audit:")]);
    return Response.json({ version: 1, exportedAt: new Date().toISOString(), snapshot, ledger, audit: audit.map((row) => row.value) }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof AccessError ? error.message : "The household export could not be created." }, { status: error instanceof AccessError ? error.status : 500, headers: { "Cache-Control": "no-store" } });
  }
}
