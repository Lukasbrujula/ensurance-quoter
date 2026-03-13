import { Skeleton } from "@/components/ui/skeleton"

export default function QuoteLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] gap-4 p-4">
      {/* Left column — intake form */}
      <div className="w-80 shrink-0 space-y-4 rounded-lg border p-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Center column — results */}
      <div className="flex-1 space-y-4 rounded-lg border p-4">
        <Skeleton className="h-6 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>

      {/* Right column — AI panel */}
      <div className="w-80 shrink-0 space-y-4 rounded-lg border p-4">
        <Skeleton className="h-6 w-36" />
        <div className="flex-1 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <Skeleton className="mt-auto h-10 w-full" />
      </div>
    </div>
  )
}
