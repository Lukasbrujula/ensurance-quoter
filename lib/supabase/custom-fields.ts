import { createClerkSupabaseClient } from "./clerk-client"
import type { Json } from "@/lib/types/database.generated"
import type {
  CustomFieldDefinition,
  CustomFieldType,
  CustomFieldValuesMap,
} from "@/lib/types/custom-fields"

/* ------------------------------------------------------------------ */
/*  Field Definitions                                                   */
/* ------------------------------------------------------------------ */

interface CreateFieldInput {
  fieldName: string
  fieldKey: string
  fieldType: CustomFieldType
  options?: string[] | null
  isRequired?: boolean
  displayOrder?: number
}

function rowToDefinition(row: {
  id: string
  agent_id: string
  field_name: string
  field_key: string
  field_type: string
  options: Json | null
  display_order: number
  is_required: boolean
  created_at: string
}): CustomFieldDefinition {
  return {
    id: row.id,
    agentId: row.agent_id,
    fieldName: row.field_name,
    fieldKey: row.field_key,
    fieldType: row.field_type as CustomFieldType,
    options: Array.isArray(row.options)
      ? (row.options as string[])
      : null,
    displayOrder: row.display_order,
    isRequired: row.is_required,
    createdAt: row.created_at,
  }
}

export async function getCustomFieldDefinitions(
  agentId: string,
): Promise<CustomFieldDefinition[]> {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("custom_field_definitions")
    .select("*")
    .eq("agent_id", agentId)
    .order("display_order", { ascending: true })

  if (error) {
    throw new Error("Failed to load custom field definitions")
  }

  return (data ?? []).map(rowToDefinition)
}

export async function createCustomFieldDefinition(
  agentId: string,
  input: CreateFieldInput,
): Promise<CustomFieldDefinition> {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("custom_field_definitions")
    .insert({
      agent_id: agentId,
      field_name: input.fieldName,
      field_key: input.fieldKey,
      field_type: input.fieldType,
      options: (input.options ?? null) as unknown as Json,
      is_required: input.isRequired ?? false,
      display_order: input.displayOrder ?? 0,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      throw new Error("A field with this key already exists")
    }
    throw new Error("Failed to create custom field")
  }

  return rowToDefinition(data)
}

export async function updateCustomFieldDefinition(
  id: string,
  updates: Partial<{
    fieldName: string
    fieldType: CustomFieldType
    options: string[] | null
    isRequired: boolean
    displayOrder: number
  }>,
): Promise<void> {
  const supabase = await createClerkSupabaseClient()

  const dbUpdates: Record<string, unknown> = {}
  if (updates.fieldName !== undefined) dbUpdates.field_name = updates.fieldName
  if (updates.fieldType !== undefined) dbUpdates.field_type = updates.fieldType
  if (updates.options !== undefined) dbUpdates.options = updates.options as unknown as Json
  if (updates.isRequired !== undefined) dbUpdates.is_required = updates.isRequired
  if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder

  const { error } = await supabase
    .from("custom_field_definitions")
    .update(dbUpdates)
    .eq("id", id)

  if (error) {
    throw new Error("Failed to update custom field")
  }
}

export async function deleteCustomFieldDefinition(id: string): Promise<void> {
  const supabase = await createClerkSupabaseClient()
  const { error } = await supabase
    .from("custom_field_definitions")
    .delete()
    .eq("id", id)

  if (error) {
    throw new Error("Failed to delete custom field")
  }
}

export async function reorderCustomFieldDefinitions(
  orderedIds: string[],
): Promise<void> {
  const supabase = await createClerkSupabaseClient()

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("custom_field_definitions")
      .update({ display_order: index })
      .eq("id", id),
  )

  await Promise.all(updates)
}

/* ------------------------------------------------------------------ */
/*  Field Values                                                        */
/* ------------------------------------------------------------------ */

export async function getCustomFieldValues(
  leadId: string,
): Promise<CustomFieldValuesMap> {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("custom_field_values")
    .select("field_definition_id, value")
    .eq("lead_id", leadId)

  if (error) {
    throw new Error("Failed to load custom field values")
  }

  const map: CustomFieldValuesMap = {}
  for (const row of data ?? []) {
    map[row.field_definition_id] = row.value
  }
  return map
}

export async function upsertCustomFieldValue(
  leadId: string,
  fieldDefinitionId: string,
  value: string | null,
): Promise<void> {
  const supabase = await createClerkSupabaseClient()
  const { error } = await supabase
    .from("custom_field_values")
    .upsert(
      {
        lead_id: leadId,
        field_definition_id: fieldDefinitionId,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lead_id,field_definition_id" },
    )

  if (error) {
    throw new Error("Failed to save custom field value")
  }
}
