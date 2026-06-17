export default function PortalRouteLoading() {
  return (
    <div className="space-y-4 p-1 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-white/5" />
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
        <div className="h-4 w-full rounded bg-white/5" />
        <div className="h-4 w-5/6 rounded bg-white/5" />
        <div className="h-4 w-2/3 rounded bg-white/5" />
      </div>
    </div>
  );
}
