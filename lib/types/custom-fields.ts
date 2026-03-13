export type CustomFieldType = "text" | "number" | "date" | "select" | "boolean"

export interface CustomFieldDefinition {
  id: string
  agentId: string
  fieldName: string
  fieldKey: string
  fieldType: CustomFieldType
  options: string[] | null
  displayOrder: number
  isRequired: boolean
  createdAt: string
}

export interface CustomFieldValue {
  id: string
  leadId: string
  fieldDefinitionId: string
  value: string | null
  createdAt: string
  updatedAt: string
}

/** Map of field_definition_id → value for a single lead */
export type CustomFieldValuesMap = Record<string, string | null>

/** Reserved keys that cannot be used as custom field keys */
const RESERVED_KEYS = new Set([
  "firstname", "lastname", "email", "phone", "state", "age", "gender",
  "dateofbirth", "maritalstatus", "coverageamount", "termlength",
  "tobaccostatus", "duihistory", "status", "address", "city", "zipcode",
  "occupation", "incomerange", "notes", "source",
])

export function isReservedFieldKey(key: string): boolean {
  return RESERVED_KEYS.has(key.toLowerCase().replace(/[^a-z]/g, ""))
}

export function nameToKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60)
}

export const MAX_CUSTOM_FIELDS = 20

export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  boolean: "Yes / No",
}
