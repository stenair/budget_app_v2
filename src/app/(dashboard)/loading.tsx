import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-5" aria-label="Loading household finances">
      <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-9 w-72 max-w-full" /><Skeleton className="h-4 w-96 max-w-full" /></div>
      <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-72 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}</div>
    </div>
  );
}
