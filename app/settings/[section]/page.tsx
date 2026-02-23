import { notFound } from "next/navigation"
import type { Metadata } from "next"
import type { LucideIcon } from "lucide-react"
import {
  Award,
  Building2,
  Plug,
  CreditCard,
  Users,
  Settings,
  Shield,
} from "lucide-react"
import { SettingsPlaceholder } from "@/components/settings/settings-placeholder"

interface SectionConfig {
  title: string
  description: string
  icon: LucideIcon
  features: readonly string[]
}

const SECTIONS: Record<string, SectionConfig> = {
  licenses: {
    title: "Licenses & CE Credits",
    description:
      "Manage your state licenses and track continuing education requirements.",
    icon: Award,
    features: [
      "Active license management",
      "Expiration tracking & renewal alerts",
      "CE credit progress",
      "Certificate uploads",
    ],
  },
  business: {
    title: "Business Information",
    description:
      "Configure your brokerage details and business entity information.",
    icon: Building2,
    features: [
      "Brokerage profile",
      "EIN / Tax ID",
      "E&O insurance info",
      "Carrier appointment tracking",
    ],
  },
  integrations: {
    title: "Integrations",
    description:
      "Connect third-party tools and services to streamline your workflow.",
    icon: Plug,
    features: [
      "CRM integrations (Salesforce, HubSpot)",
      "Compulife API connection",
      "E-signature providers",
      "Lead sources",
    ],
  },
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
    description: "Protect your account with security settings.",
    icon: Shield,
    features: [
      "Password management",
      "Two-factor authentication",
      "Session management",
      "API key management",
    ],
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

  return (
    <SettingsPlaceholder
      title={config.title}
      description={config.description}
      icon={config.icon}
      features={config.features}
    />
  )
}
