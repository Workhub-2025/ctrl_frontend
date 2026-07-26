export default function PortalRouteLoading() {
  return (
    <div className="space-y-4 p-1 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-muted/40" />
      <div className="space-y-3 rounded-xl border border-border bg-card p-6">
        <div className="h-4 w-full rounded bg-muted/40" />
        <div className="h-4 w-5/6 rounded bg-muted/40" />
        <div className="h-4 w-2/3 rounded bg-muted/40" />
      </div>
    </div>
  );
}
