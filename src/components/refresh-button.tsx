"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <Button variant="outline" size="sm" className="h-8 gap-2 rounded-full bg-card" disabled={pending} onClick={() => startTransition(() => router.refresh())}><RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} />{pending ? "Refreshing" : "Refresh"}</Button>;
}
