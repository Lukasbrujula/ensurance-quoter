import { TopNav } from "@/components/navigation/top-nav"
import { SettingsSidebar } from "@/components/settings/settings-sidebar"
import { BackToQuoter } from "@/components/navigation/back-to-quoter"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen flex-col">
      <TopNav />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
          <BackToQuoter className="mb-6" />

          {/* Sidebar + content */}
          <div className="flex flex-col gap-6 md:flex-row md:gap-8">
            <SettingsSidebar />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
