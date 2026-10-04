"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  CircleDollarSign,
  House,
  Landmark,
  Settings,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const nav = [
  { href: "/", label: "Home", icon: House },
  { href: "/activity", label: "Activity", icon: ArrowLeftRight },
  { href: "/budgets", label: "Budgets", icon: WalletCards },
  { href: "/forecast", label: "Forecast", icon: ChartNoAxesCombined },
  { href: "/insights", label: "Insights", icon: CircleDollarSign },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children, mode, connectionStatus, authEnabled }: { children: React.ReactNode; mode: "preview" | "live"; connectionStatus: string; authEnabled: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [router]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border/70 bg-sidebar px-4 py-5 lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-3 px-2 py-2">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Landmark className="size-5" />
          </span>
          <span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Household</span>
            <span className="block text-lg font-semibold tracking-tight">Harbour</span>
          </span>
        </Link>

        <nav className="mt-8 space-y-1" aria-label="Primary navigation">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className={mode === "preview" || connectionStatus !== "active" ? "size-2 rounded-full bg-amber-500" : "size-2 rounded-full bg-emerald-500"} />
            {mode === "preview" ? "Preview household" : connectionStatus === "active" ? "NAB connected" : "Feed needs attention"}
          </div>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            {mode === "preview" ? "Sample balances and activity." : "Secure feed through Redbark and CDR."}
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Landmark className="size-4.5" />
              </span>
              <span className="font-semibold tracking-tight">Harbour</span>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1 font-normal text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Private household
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              {authEnabled ? <UserButton /> : null}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex -space-x-2" aria-label="Household members">
                    <span className="grid size-8 place-items-center rounded-full border-2 border-background bg-[#d6e8df] text-[11px] font-semibold text-[#285846]">S</span>
                    <span className="grid size-8 place-items-center rounded-full border-2 border-background bg-[#e8d9cf] text-[11px] font-semibold text-[#754b34]">P</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Stefan and Partner</TooltipContent>
              </Tooltip>
              <div className="hidden text-right sm:block">
                <p className="text-xs font-medium">Stefan &amp; Partner</p>
                <p className="text-[11px] text-muted-foreground">Australia/Perth</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden" aria-label="Mobile navigation">
        <div className="mx-auto grid max-w-lg grid-cols-6">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "fill-primary/10")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
