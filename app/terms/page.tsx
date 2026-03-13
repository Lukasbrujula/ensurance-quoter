import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service — Ensurance",
  description: "Terms and conditions for using Ensurance.",
}

export default function TermsPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl w-full py-16">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <div className="prose prose-neutral dark:prose-invert">
          <p className="text-muted-foreground mb-4">
            Last updated: March 2026
          </p>
          <h2 className="text-xl font-semibold mt-8 mb-3">Service Description</h2>
          <p>
            Ensurance provides insurance quoting, carrier intelligence, and agent
            management tools for licensed insurance professionals. The platform is
            designed to assist agents in identifying suitable carriers for their clients.
          </p>
          <h2 className="text-xl font-semibold mt-8 mb-3">Quotes and Pricing</h2>
          <p>
            All rates displayed on the platform are for illustration purposes only and
            are subject to carrier underwriting approval. Ensurance does not guarantee
            the availability, accuracy, or binding nature of any quoted premium. Final
            rates are determined by the issuing carrier upon completion of the
            underwriting process.
          </p>
          <h2 className="text-xl font-semibold mt-8 mb-3">Licensing Requirement</h2>
          <p>
            Users must hold a valid insurance license in the states where they conduct
            business. Ensurance is a tool for licensed agents and does not provide
            insurance advice directly to consumers.
          </p>
          <h2 className="text-xl font-semibold mt-8 mb-3">Data Accuracy</h2>
          <p>
            While we strive to maintain accurate carrier intelligence data, underwriting
            guidelines change periodically. Agents are responsible for verifying eligibility
            and product details with the issuing carrier before submitting applications.
          </p>
        </div>
      </div>
    </main>
  )
}
