import { TopNav } from "@/components/navigation/top-nav"

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen flex-col">
      <TopNav />
      <div className="flex flex-1 flex-col overflow-auto">
        {children}
      </div>
    </div>
  )
}
