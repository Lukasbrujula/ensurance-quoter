import { Skeleton } from "@/components/ui/skeleton"

export default function PipelineLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, col) => (
          <div key={col} className="w-64 shrink-0 rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            {Array.from({ length: col === 0 ? 3 : 2 }).map((_, card) => (
              <div key={card} className="rounded-md border p-3 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  )
}
