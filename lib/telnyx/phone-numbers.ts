/* ------------------------------------------------------------------ */
/*  Telnyx Phone Number API                                            */
/*  Wraps Telnyx v2 REST API for number search, order, and release.    */
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

async function telnyxRequest<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${TELNYX_BASE}${path}`
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const text = await response.text()
    let detail = text
    try {
      const parsed = JSON.parse(text) as TelnyxApiError
      detail = parsed.errors?.[0]?.detail ?? parsed.errors?.[0]?.title ?? text
    } catch { /* use raw text */ }
    throw new Error(`Telnyx API error (${response.status}): ${detail}`)
  }

  const text = await response.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}

/* ------------------------------------------------------------------ */
/*  Search available numbers                                           */
/* ------------------------------------------------------------------ */

export interface AvailableNumber {
  phone_number: string
  region_information?: Array<{
    region_name?: string
    region_type?: string
  }>
  cost_information?: {
    monthly_cost?: string
    upfront_cost?: string
  }
  features?: Array<{ name: string }>
}

interface SearchAvailableResponse {
  data: AvailableNumber[]
}

export interface SearchNumbersParams {
  state?: string
  areaCode?: string
  city?: string
  limit?: number
}

export async function searchAvailableNumbers(
  params: SearchNumbersParams,
): Promise<AvailableNumber[]> {
  const qs = new URLSearchParams()
  qs.set("filter[country_code]", "US")
  qs.set("filter[features][]", "sms")
  qs.set("filter[limit]", String(params.limit ?? 10))

  if (params.state) {
    qs.set("filter[administrative_area]", params.state)
  }
  if (params.areaCode) {
    qs.set("filter[national_destination_code]", params.areaCode)
  }
  if (params.city) {
    qs.set("filter[locality]", params.city)
  }

  const result = await telnyxRequest<SearchAvailableResponse>(
    "GET",
    `/available_phone_numbers?${qs.toString()}`,
  )
  return result.data ?? []
}

/* ------------------------------------------------------------------ */
/*  Order a phone number                                               */
/* ------------------------------------------------------------------ */

interface NumberOrderResponse {
  data: {
    id: string
    phone_numbers: Array<{
      id: string
      phone_number: string
      status: string
    }>
  }
}

export interface OrderResult {
  orderId: string
  phoneNumberId: string
  phoneNumber: string
  status: string
}

export async function orderPhoneNumber(
  phoneNumber: string,
  messagingProfileId?: string,
  billingGroupId?: string,
  connectionId?: string,
): Promise<OrderResult> {
  const body: Record<string, unknown> = {
    phone_numbers: [{ phone_number: phoneNumber }],
  }
  if (messagingProfileId) {
    body.messaging_profile_id = messagingProfileId
  }
  if (billingGroupId) {
    body.billing_group_id = billingGroupId
  }
  if (connectionId) {
    body.connection_id = connectionId
  }

  const result = await telnyxRequest<NumberOrderResponse>(
    "POST",
    "/number_orders",
    body,
  )

  const ordered = result.data.phone_numbers[0]
  return {
    orderId: result.data.id,
    phoneNumberId: ordered?.id ?? "",
    phoneNumber: ordered?.phone_number ?? phoneNumber,
    status: ordered?.status ?? "unknown",
  }
}

/* ------------------------------------------------------------------ */
/*  Release a phone number                                             */
/* ------------------------------------------------------------------ */

export async function releasePhoneNumber(
  telnyxPhoneNumberId: string,
): Promise<void> {
  await telnyxRequest<unknown>(
    "DELETE",
    `/phone_numbers/${telnyxPhoneNumberId}`,
  )
}

/* ------------------------------------------------------------------ */
/*  Update messaging profile on a phone number                         */
/* ------------------------------------------------------------------ */

export async function updatePhoneNumberMessagingProfile(
  telnyxPhoneNumberId: string,
  messagingProfileId: string,
): Promise<void> {
  await telnyxRequest<unknown>(
    "PATCH",
    `/phone_numbers/${telnyxPhoneNumberId}`,
    { messaging_profile_id: messagingProfileId },
  )
}
