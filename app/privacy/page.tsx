import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy — Ensurance",
  description: "How Ensurance handles and protects your data.",
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl w-full py-16">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <div className="prose prose-neutral dark:prose-invert">
          <p className="text-muted-foreground mb-4">
            Last updated: March 2026
          </p>
          <p>
            Ensurance is committed to protecting your personal information in accordance
            with the Gramm-Leach-Bliley Act (GLBA) and applicable state privacy regulations.
          </p>
          <h2 className="text-xl font-semibold mt-8 mb-3">Information We Collect</h2>
          <p>
            We collect information necessary to provide insurance quoting and agent management
            services, including contact details, licensing information, and client intake data
            entered by agents.
          </p>
          <h2 className="text-xl font-semibold mt-8 mb-3">How We Protect Your Data</h2>
          <p>
            All sensitive data is encrypted at rest using AES-256-GCM encryption.
            Access is controlled through role-based authentication. Call transcripts and
            personally identifiable information are subject to our data retention policy.
          </p>
          <h2 className="text-xl font-semibold mt-8 mb-3">Data Retention</h2>
          <p>
            Call transcripts are retained for 90 days. Coaching data is retained for 90 days.
            AI summaries and enrichment data are retained for 1 year. Agents may request
            deletion of their data at any time.
          </p>
          <h2 className="text-xl font-semibold mt-8 mb-3">Contact</h2>
          <p>
            For privacy-related inquiries, please use the support widget in the application
            or contact us directly.
          </p>
        </div>
      </div>
    </main>
  )
}
