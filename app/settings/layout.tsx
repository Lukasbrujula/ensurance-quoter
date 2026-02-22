import { TopNav } from "@/components/navigation/top-nav"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen flex-col">
      <TopNav />
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-6">
          {children}
        </div>
      </div>
    </div>
  )
}
