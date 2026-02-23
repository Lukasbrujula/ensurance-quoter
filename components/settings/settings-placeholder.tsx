import type { LucideIcon } from "lucide-react"
import { Clock } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SettingsPageHeader } from "./settings-page-header"

interface SettingsPlaceholderProps {
  title: string
  description: string
  icon: LucideIcon
  features: readonly string[]
}

export function SettingsPlaceholder({
  title,
  description,
  icon: Icon,
  features,
}: SettingsPlaceholderProps) {
  return (
    <div>
      <SettingsPageHeader title={title} description={description} />

      <Card>
        <CardHeader className="items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f5f9]">
            <Icon className="h-6 w-6 text-[#64748b]" />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
          <Badge variant="secondary" className="mt-2 gap-1.5">
            <Clock className="h-3 w-3" />
            Coming Soon
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="mx-auto max-w-sm">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-[#94a3b8]">
              Planned Features
            </p>
            <ul className="space-y-2">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-[#64748b]"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#cbd5e1]" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
