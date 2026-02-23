import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { TopNav } from "@/components/navigation/top-nav"
import { SettingsSidebar } from "@/components/settings/settings-sidebar"

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
          {/* Back link */}
          <Link
            href="/quote"
            className="mb-6 inline-flex items-center gap-1 text-sm text-[#64748b] transition-colors hover:text-[#0f172a]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Quotes
          </Link>

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
