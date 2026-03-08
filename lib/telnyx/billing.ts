/* ------------------------------------------------------------------ */
/*  Telnyx Billing Groups API                                         */
/*  Wraps Telnyx v2 REST API for billing group CRUD.                  */
/*  Follows the same patterns as phone-numbers.ts.                    */
/* ------------------------------------------------------------------ */

const TELNYX_BASE = "https://api.telnyx.com/v2"

function getApiKey(): string {
  const key = process.env.TELNYX_API_KEY
  if (!key) throw new Error("TELNYX_API_KEY is not configured")
  return key
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TelnyxBillingGroup {
  id: string
  record_type: string
  organization_id: string
  name: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

interface BillingGroupResponse {
  data: TelnyxBillingGroup
}

interface BillingGroupListResponse {
  data: TelnyxBillingGroup[]
}

/* ------------------------------------------------------------------ */
/*  Core request helper                                                */
/* ------------------------------------------------------------------ */

async function billingRequest<T>(
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
      const parsed = JSON.parse(text) as { errors?: Array<{ title?: string; detail?: string }> }
      detail = parsed.errors?.[0]?.detail ?? parsed.errors?.[0]?.title ?? text
    } catch { /* use raw text */ }
    throw new Error(`Telnyx API error (${response.status}): ${detail}`)
  }

  const text = await response.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}

/* ------------------------------------------------------------------ */
/*  Create billing group                                               */
/* ------------------------------------------------------------------ */

export async function createBillingGroup(
  name: string,
): Promise<TelnyxBillingGroup> {
  const result = await billingRequest<BillingGroupResponse>(
    "POST",
    "/billing_groups",
    { name },
  )
  return result.data
}

/* ------------------------------------------------------------------ */
/*  Get billing group by ID                                            */
/* ------------------------------------------------------------------ */

export async function getBillingGroup(
  id: string,
): Promise<TelnyxBillingGroup> {
  const result = await billingRequest<BillingGroupResponse>(
    "GET",
    `/billing_groups/${id}`,
  )
  return result.data
}

/* ------------------------------------------------------------------ */
/*  List all billing groups                                            */
/* ------------------------------------------------------------------ */

export async function listBillingGroups(): Promise<TelnyxBillingGroup[]> {
  const result = await billingRequest<BillingGroupListResponse>(
    "GET",
    "/billing_groups",
  )
  return result.data ?? []
}

/* ------------------------------------------------------------------ */
/*  Update billing group name                                          */
/* ------------------------------------------------------------------ */

export async function updateBillingGroup(
  id: string,
  name: string,
): Promise<TelnyxBillingGroup> {
  const result = await billingRequest<BillingGroupResponse>(
    "PATCH",
    `/billing_groups/${id}`,
    { name },
  )
  return result.data
}

/* ------------------------------------------------------------------ */
/*  Delete billing group                                               */
/* ------------------------------------------------------------------ */

export async function deleteBillingGroup(id: string): Promise<void> {
  await billingRequest<unknown>(
    "DELETE",
    `/billing_groups/${id}`,
  )
}
