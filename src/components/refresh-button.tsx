"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  async function refresh() {
    setSyncing(true); setMessage("");
    try {
      const response = await fetch("/api/refresh", { method: "POST", signal: AbortSignal.timeout(100_000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Refresh failed. Try again.");
      const seconds = Math.max(1, Math.ceil((result.nextAttemptAt - Date.now()) / 1000));
      setMessage(result.status === "failed" ? `Feed unavailable · retry in ${seconds}s` : result.status === "busy" ? "Bank sync already in progress" : result.status === "cooldown" ? `Using latest saved data · next sync in ${seconds}s` : result.status === "preview" ? "Sample data refreshed" : result.status === "superseded" ? "A newer bank sync took over" : "Bank snapshot updated");
      startTransition(() => router.refresh());
    } catch (error) { setMessage(error instanceof Error && error.name !== "TimeoutError" ? error.message : "Sync is taking longer than expected. Saved data is still available."); }
    finally { setSyncing(false); }
  }
  return <div className="flex max-w-60 flex-col items-end gap-1"><Button variant="outline" size="sm" className="h-8 gap-2 rounded-full bg-card" disabled={syncing || pending} onClick={() => void refresh()}><RefreshCw className={`size-3.5 ${syncing || pending ? "animate-spin" : ""}`} />{syncing ? "Syncing bank…" : pending ? "Updating…" : "Refresh"}</Button>{message ? <p role="status" className="max-w-44 text-right text-[11px] text-muted-foreground">{message}</p> : null}</div>;
}
