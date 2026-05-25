export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-pulse">
      {/* Header */}
      <div>
        <div className="h-7 w-40 bg-surface-muted rounded-lg" />
        <div className="h-4 w-72 bg-surface-muted rounded mt-2" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-raised border border-surface-border rounded-xl2 p-5">
            <div className="w-9 h-9 rounded-xl bg-surface-muted mb-3" />
            <div className="h-3 w-24 bg-surface-muted rounded mb-2" />
            <div className="h-8 w-32 bg-surface-muted rounded mb-2" />
            <div className="h-3 w-16 bg-surface-muted rounded" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-surface-raised border border-surface-border rounded-xl2 h-72" />
        <div className="bg-surface-raised border border-surface-border rounded-xl2 h-72" />
      </div>

      {/* Table */}
      <div className="bg-surface-raised border border-surface-border rounded-xl2 p-5">
        <div className="h-5 w-40 bg-surface-muted rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-surface-muted rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
