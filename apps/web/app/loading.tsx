export default function Loading() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-pulse">
      <div>
        <div className="h-7 w-40 bg-surface-muted rounded-lg" />
        <div className="h-4 w-64 bg-surface-muted rounded mt-2" />
      </div>
      <div className="grid grid-cols-1 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface-raised border border-surface-border rounded-xl2 h-32" />
        ))}
      </div>
    </div>
  )
}
