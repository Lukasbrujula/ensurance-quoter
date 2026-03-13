import { Skeleton } from "@/components/ui/skeleton"

export default function InboxLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Conversation list */}
      <div className="w-80 shrink-0 border-r p-4 space-y-3">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Message thread */}
      <div className="flex-1 flex flex-col p-4">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="flex-1 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className={`h-12 w-2/3 ${i % 2 === 1 ? "ml-auto" : ""}`} />
          ))}
        </div>
        <Skeleton className="h-10 w-full mt-4" />
      </div>

      {/* Contact panel */}
      <div className="w-72 shrink-0 border-l p-4 space-y-3">
        <Skeleton className="h-12 w-12 rounded-full mx-auto" />
        <Skeleton className="h-5 w-32 mx-auto" />
        <Skeleton className="h-4 w-24 mx-auto" />
        <Skeleton className="h-9 w-full mt-4" />
      </div>
    </div>
  )
}
