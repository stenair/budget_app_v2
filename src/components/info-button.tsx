"use client";

import { Info } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

export function InfoButton({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <Sheet><SheetTrigger asChild><button type="button" aria-label={`About ${title}`} title={`About ${title}`} className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full opacity-70 transition hover:bg-current/10 hover:opacity-100 focus-visible:outline-2 ${className}`}><Info className="size-4" /></button></SheetTrigger><SheetContent side="bottom" className="mx-auto max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-2xl"><SheetHeader className="pr-12"><SheetTitle>{title}</SheetTitle><SheetDescription>How Harbour calculates this</SheetDescription></SheetHeader><div className="space-y-3 px-4 pb-6 text-sm leading-6 text-muted-foreground">{children}</div></SheetContent></Sheet>;
}
