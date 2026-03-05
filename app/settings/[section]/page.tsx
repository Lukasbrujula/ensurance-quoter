import { notFound } from "next/navigation"
import type { Metadata } from "next"
import type { LucideIcon } from "lucide-react"
import {
  Building2,
  CreditCard,
  Users,
  Settings,
  Shield,
} from "lucide-react"
import { SettingsPlaceholder } from "@/components/settings/settings-placeholder"
import { SecuritySettingsSection } from "@/components/settings/security-settings-section"
import { BusinessKnowledgePage } from "@/components/settings/business-knowledge-page"

interface SectionConfig {
  title: string
  description: string
  icon: LucideIcon
  features: readonly string[]
  component?: "business" | "security"
}

const SECTIONS: Record<string, SectionConfig> = {
  // "licenses" has a dedicated page at /settings/licenses/page.tsx
  business: {
    title: "Business Knowledge",
    description:
      "What your AI agents know about your business.",
    icon: Building2,
    features: [],
    component: "business",
  },
  // "integrations" has a dedicated page at /settings/integrations/page.tsx
  billing: {
    title: "Billing & Subscription",
    description:
      "Manage your subscription plan, payment methods, and billing history.",
    icon: CreditCard,
    features: [
      "Current plan details",
      "Usage statistics",
      "Payment method management",
      "Invoice history",
    ],
  },
  team: {
    title: "Team Management",
    description: "Invite team members and manage roles and permissions.",
    icon: Users,
    features: [
      "Team member invitations",
      "Role-based access control",
      "Activity logs",
      "Shared lead pools",
    ],
  },
  preferences: {
    title: "Preferences",
    description: "Customize your Ensurance experience.",
    icon: Settings,
    features: [
      "Default quote parameters",
      "Notification preferences",
      "Display settings",
      "Keyboard shortcuts",
    ],
  },
  security: {
    title: "Security",
    description: "Your account and data are protected.",
    icon: Shield,
    features: [],
    component: "security",
  },
}

const VALID_SECTIONS = Object.keys(SECTIONS)

export function generateStaticParams() {
  return VALID_SECTIONS.map((section) => ({ section }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>
}): Promise<Metadata> {
  const { section } = await params
  const config = SECTIONS[section]
  if (!config) return { title: "Settings | Ensurance" }
  return { title: `${config.title} | Ensurance` }
}

export default async function SettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  const config = SECTIONS[section]

  if (!config) {
    notFound()
  }

  if (config.component === "business") {
    return <BusinessKnowledgePage />
  }

  if (config.component === "security") {
    return <SecuritySettingsSection />
  }

  return (
    <SettingsPlaceholder
      title={config.title}
      description={config.description}
      icon={config.icon}
      features={config.features}
    />
  )
}
