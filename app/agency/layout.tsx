import { TopNav } from "@/components/navigation/top-nav"

export default function AgencyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen flex-col">
      <TopNav />
      <div className="flex flex-1 flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
