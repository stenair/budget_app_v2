"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="border-amber-200 bg-amber-50 shadow-xs">
      <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
        <span className="grid size-11 place-items-center rounded-full bg-amber-100 text-amber-700"><CircleAlert className="size-5" /></span>
        <h1 className="mt-4 text-xl font-semibold">The latest data could not be loaded</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Check the Redbark connection or try the request again. Your credentials have not been exposed to the browser.</p>
        <Button className="mt-5 gap-2" onClick={reset}><RotateCcw className="size-4" /> Try again</Button>
      </CardContent>
    </Card>
  );
}
