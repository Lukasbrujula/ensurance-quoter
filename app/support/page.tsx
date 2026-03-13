import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Support — Ensurance",
  description: "Get help with Ensurance.",
}

export default function SupportPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl w-full py-16">
        <h1 className="text-3xl font-bold mb-6">Support</h1>
        <div className="prose prose-neutral dark:prose-invert">
          <p>
            Need help? Use the support widget (bottom-right corner of any page) to send
            us a message, or reach out directly.
          </p>
          <h2 className="text-xl font-semibold mt-8 mb-3">Common Topics</h2>
          <p>
            For carrier data questions, check the underwriting assistant at /assistant —
            it has detailed carrier intelligence including tobacco rules, medical conditions,
            and state availability.
          </p>
          <p>
            For technical issues, please include which page you were on and what you
            were trying to do when the issue occurred.
          </p>
        </div>
      </div>
    </main>
  )
}
