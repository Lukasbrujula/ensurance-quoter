import { Skeleton } from "@/components/ui/skeleton"

export default function AssistantLoading() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center">
      <div className="flex w-full max-w-3xl flex-1 flex-col p-4">
        {/* Header */}
        <div className="mb-6 text-center">
          <Skeleton className="h-7 w-56 mx-auto" />
          <Skeleton className="mt-2 h-4 w-72 mx-auto" />
        </div>

        {/* Suggested questions */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-44 rounded-full" />
          ))}
        </div>

        {/* Message area */}
        <div className="flex-1" />

        {/* Input bar */}
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  )
}
