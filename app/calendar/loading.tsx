import { Skeleton } from "@/components/ui/skeleton"

export default function CalendarLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-lg border">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="p-2 text-center">
              <Skeleton className="h-4 w-8 mx-auto" />
            </div>
          ))}
        </div>
        {/* Week rows */}
        {Array.from({ length: 5 }).map((_, week) => (
          <div key={week} className="grid grid-cols-7 border-b last:border-0">
            {Array.from({ length: 7 }).map((_, day) => (
              <div key={day} className="min-h-24 border-r last:border-0 p-2">
                <Skeleton className="h-4 w-6 mb-1" />
                {day % 3 === 0 && <Skeleton className="h-5 w-full" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  )
}
