interface SettingsPageHeaderProps {
  title: string
  description: string
}

export function SettingsPageHeader({
  title,
  description,
}: SettingsPageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-lg font-bold text-[#0f172a]">{title}</h1>
      <p className="mt-1 text-sm text-[#64748b]">{description}</p>
    </div>
  )
}
