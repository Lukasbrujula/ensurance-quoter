import { jsPDF } from "jspdf"
import "jspdf-autotable"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ProposalCarrier {
  carrierName: string
  monthlyPremium: number
  annualPremium: number
  riskClass: string
  amBestRating: string
  livingBenefits: boolean
  eSign: boolean
  keyFeatures: string[]
}

export interface ProposalData {
  agentName: string
  agentEmail: string
  agentPhone?: string
  agencyName?: string
  clientName: string
  clientAge: number
  clientState: string
  coverageAmount: number
  termLength: number
  carriers: ProposalCarrier[]
  generatedAt: string
  disclaimer: string
  includeRecommendation: boolean
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatCoverage(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  return `$${(amount / 1_000).toFixed(0)}K`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

/* ------------------------------------------------------------------ */
/*  PDF Generator                                                      */
/* ------------------------------------------------------------------ */

export function generateProposalPDF(data: ProposalData): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = 20

  // Colors
  const brandColor: [number, number, number] = [23, 115, 207]
  const textColor: [number, number, number] = [15, 23, 42]
  const grayColor: [number, number, number] = [100, 116, 139]

  // ── Header ──────────────────────────────────────────────────────
  doc.setFillColor(...brandColor)
  doc.rect(0, 0, pageWidth, 38, "F")

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.text("Life Insurance Proposal", margin, 18)

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Prepared for ${data.clientName}`, margin, 26)
  doc.text(formatDate(data.generatedAt), margin, 32)

  // Agent info (top right)
  doc.setFontSize(9)
  const agentLines = [data.agentName]
  if (data.agencyName) agentLines.push(data.agencyName)
  agentLines.push(data.agentEmail)
  if (data.agentPhone) agentLines.push(data.agentPhone)
  const rightX = pageWidth - margin
  let agentY = 16
  for (const line of agentLines) {
    doc.text(line, rightX, agentY, { align: "right" })
    agentY += 4.5
  }

  y = 48

  // ── Coverage Summary ────────────────────────────────────────────
  doc.setTextColor(...textColor)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("Coverage Summary", margin, y)
  y += 8

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  const summaryData = [
    ["Client", `${data.clientName}, Age ${data.clientAge}`],
    ["State", data.clientState],
    ["Coverage Amount", formatCoverage(data.coverageAmount)],
    ["Term Length", `${data.termLength} Years`],
  ]

  for (const [label, value] of summaryData) {
    doc.setTextColor(...grayColor)
    doc.text(label, margin, y)
    doc.setTextColor(...textColor)
    doc.setFont("helvetica", "bold")
    doc.text(value, margin + 45, y)
    doc.setFont("helvetica", "normal")
    y += 6
  }

  y += 6

  // ── Carrier Comparison Table ────────────────────────────────────
  doc.setTextColor(...textColor)
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("Carrier Comparison", margin, y)
  y += 4

  const tableHeaders = [
    "Carrier",
    "Monthly",
    "Annual",
    "AM Best",
    "Living Benefits",
    "E-Sign",
  ]

  const tableRows = data.carriers.map((c) => [
    c.carrierName,
    formatCurrency(c.monthlyPremium),
    formatCurrency(c.annualPremium),
    c.amBestRating,
    c.livingBenefits ? "Yes" : "No",
    c.eSign ? "Yes" : "No",
  ])

  ;(doc as jsPDF & { autoTable: (opts: Record<string, unknown>) => void }).autoTable({
    startY: y,
    head: [tableHeaders],
    body: tableRows,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: brandColor,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: textColor,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45 },
      1: { halign: "right", cellWidth: 25 },
      2: { halign: "right", cellWidth: 25 },
      3: { halign: "center", cellWidth: 20 },
      4: { halign: "center", cellWidth: 28 },
      5: { halign: "center", cellWidth: 18 },
    },
  })

  // Get the y position after the table
  const autoTablePlugin = doc as jsPDF & { lastAutoTable?: { finalY?: number } }
  y = (autoTablePlugin.lastAutoTable?.finalY ?? y + 40) + 10

  // ── Key Features ────────────────────────────────────────────────
  if (data.carriers.some((c) => c.keyFeatures.length > 0)) {
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...textColor)
    doc.text("Key Features", margin, y)
    y += 7

    for (const carrier of data.carriers) {
      if (carrier.keyFeatures.length === 0) continue

      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...brandColor)
      doc.text(carrier.carrierName, margin, y)
      y += 5

      doc.setFont("helvetica", "normal")
      doc.setTextColor(...grayColor)
      doc.setFontSize(9)
      for (const feature of carrier.keyFeatures.slice(0, 3)) {
        doc.text(`  •  ${feature}`, margin, y)
        y += 4.5
      }
      y += 3
    }
  }

  // ── Recommendation ──────────────────────────────────────────────
  if (data.includeRecommendation && data.carriers.length > 0) {
    y += 2
    const cheapest = [...data.carriers].sort(
      (a, b) => a.monthlyPremium - b.monthlyPremium,
    )[0]!

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...textColor)
    doc.text("Recommendation", margin, y)
    y += 7

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...grayColor)
    const recText = `Based on the comparison above, ${cheapest.carrierName} offers the most competitive rate at ${formatCurrency(cheapest.monthlyPremium)}/month with an AM Best rating of ${cheapest.amBestRating}. I recommend reviewing each option to find the best fit for your specific needs.`
    const recLines = doc.splitTextToSize(recText, contentWidth) as string[]
    doc.text(recLines, margin, y)
    y += recLines.length * 5
  }

  // ── Next Steps ──────────────────────────────────────────────────
  y += 8
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...textColor)
  doc.text("Next Steps", margin, y)
  y += 7

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...grayColor)
  const steps = [
    "Review the carrier options and features above",
    "Let me know which option interests you most",
    "We'll complete the application together — most carriers offer e-signature",
    "Coverage can be active within days of approval",
  ]
  for (let i = 0; i < steps.length; i++) {
    doc.text(`${i + 1}. ${steps[i]}`, margin, y)
    y += 5.5
  }

  // ── Disclaimer ──────────────────────────────────────────────────
  y += 8
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 5

  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  const disclaimerLines = doc.splitTextToSize(
    data.disclaimer,
    contentWidth,
  ) as string[]
  doc.text(disclaimerLines, margin, y)

  // ── Footer ──────────────────────────────────────────────────────
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `Generated by Ensurance  •  ${formatDate(data.generatedAt)}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" },
  )

  return Buffer.from(doc.output("arraybuffer"))
}
