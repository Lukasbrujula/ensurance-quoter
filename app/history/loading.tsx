import { Skeleton } from "@/components/ui/skeleton"

export default function HistoryLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-9 flex-1 max-w-sm" />
        <Skeleton className="h-9 w-[120px]" />
      </div>

      {/* Timeline entries */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 rounded-lg border p-4">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
