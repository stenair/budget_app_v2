export default function DashboardLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6 py-4">
      <p className="text-sm text-muted-foreground">Loading your household…</p>
      <div aria-hidden="true" className="grid animate-pulse gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-32 rounded-xl bg-muted" />)}
      </div>
      <div aria-hidden="true" className="h-72 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
