/* ------------------------------------------------------------------ */
/*  Telnyx Toll-Free Verification API                                  */
/*  Submits toll-free verification requests via Telnyx v2 REST API.    */
/* ------------------------------------------------------------------ */

const TELNYX_BASE = "https://api.telnyx.com/v2"

interface TelnyxApiError {
  errors?: Array<{ title?: string; detail?: string }>
}

function getApiKey(): string {
  const key = process.env.TELNYX_API_KEY
  if (!key) throw new Error("TELNYX_API_KEY is not configured")
  return key
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TollFreeVerificationInput {
  phoneNumber: string
  businessName: string
  businessEin: string
  businessWebsite?: string
  useCase: string
  sampleMessage: string
  optInDescription: string
}

/* ------------------------------------------------------------------ */
/*  Submit verification request                                        */
/* ------------------------------------------------------------------ */

export async function submitTollFreeVerification(
  input: TollFreeVerificationInput,
): Promise<void> {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://ensurance-quoter.vercel.app"

  const body = {
    businessName: input.businessName,
    corporateWebsite: input.businessWebsite || appUrl,
    businessAddr1: "On file",
    businessCity: "On file",
    businessState: "On file",
    businessZip: "00000",
    businessContactFirstName: "Account",
    businessContactLastName: "Holder",
    businessContactEmail: "support@ensurance-quoter.vercel.app",
    businessContactPhone: input.phoneNumber,
    messageVolume: "1,000",
    phoneNumbers: [{ phoneNumber: input.phoneNumber }],
    useCase: "Account Notifications",
    useCaseSummary: input.useCase,
    productionMessageContent: input.sampleMessage,
    optInWorkflow: input.optInDescription,
    optInWorkflowImageURLs: [],
    businessRegistrationNumber: input.businessEin,
    businessRegistrationType: "EIN",
    businessRegistrationCountry: "US",
    isvReseller: "No",
    additionalInformation:
      "Insurance agent platform — client follow-ups, appointment reminders, and quote notifications.",
  }

  const url = `${TELNYX_BASE}/messaging_tollfree/verification/requests`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    let detail = text
    try {
      const parsed = JSON.parse(text) as TelnyxApiError
      detail =
        parsed.errors?.[0]?.detail ?? parsed.errors?.[0]?.title ?? text
    } catch {
      /* use raw text */
    }
    throw new Error(`Telnyx API error (${response.status}): ${detail}`)
  }
}
