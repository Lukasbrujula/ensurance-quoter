/* ------------------------------------------------------------------ */
/*  OpenAI Post-Call Extraction Service                                */
/*                                                                     */
/*  Takes a call transcript + agent config, calls GPT-4o-mini to       */
/*  extract structured caller data. Parallel to (not replacing) the    */
/*  Telnyx save_caller_info webhook tool.                              */
/*                                                                     */
/*  Three exports:                                                     */
/*    buildExtractionPrompt(collectFields, customFields)               */
/*    extractFromTranscript(transcript, agentConfig)                   */
/*    validateExtraction(result, requiredFields)                       */
/* ------------------------------------------------------------------ */

import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import type { CollectFieldId } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CustomCollectField {
  name: string
  description: string
  required?: boolean
}

export interface ExtractionAgentConfig {
  collectFields: CollectFieldId[]
  customCollectFields?: CustomCollectField[]
}

export interface ExtractionResult {
  status: "success" | "partial" | "failed"
  data: Record<string, string | null>
  missingFields: string[]
  model: string
  error?: string
}

export interface ExtractionField {
  name: string
  description: string
  required: boolean
}

/* ------------------------------------------------------------------ */
/*  Field metadata — maps CollectFieldId to extraction descriptions    */
/* ------------------------------------------------------------------ */

const STANDARD_FIELD_META: Record<CollectFieldId, { description: string; required: boolean }> = {
  name: { description: "The caller's full name", required: true },
  phone: { description: "The best callback phone number", required: true },
  reason: { description: "Why the caller is calling (brief summary)", required: true },
  callback_time: { description: "When the caller prefers to be called back", required: false },
  email: { description: "The caller's email address", required: false },
  date_of_birth: { description: "The caller's date of birth or age", required: false },
  state: { description: "The caller's state of residence", required: false },
}

/* ------------------------------------------------------------------ */
/*  buildExtractionPrompt                                              */
/* ------------------------------------------------------------------ */

export function buildExtractionPrompt(
  collectFields: CollectFieldId[],
  customFields?: CustomCollectField[],
): string {
  const fields = resolveFields(collectFields, customFields)
  const requiredLines = fields
    .filter((f) => f.required)
    .map((f) => `- ${f.name}: "${f.description}" | null`)
  const optionalLines = fields
    .filter((f) => !f.required)
    .map((f) => `- ${f.name}: "${f.description}" | null`)

  let prompt = `You are a structured data extraction assistant. Extract caller information from the following phone call transcript. Return ONLY valid JSON with no explanation, no markdown fences, and no extra text.

REQUIRED FIELDS (always include, use null if not mentioned):
${requiredLines.join("\n")}`

  if (optionalLines.length > 0) {
    prompt += `

OPTIONAL FIELDS (include in output, use null if not mentioned):
${optionalLines.join("\n")}`
  }

  prompt += `

RULES:
- Output a single flat JSON object with the field names as keys
- Use null for any field not mentioned or unclear in the transcript
- For phone numbers, normalize to digits only (e.g. "5551234567")
- For names, use proper capitalization
- For dates, use ISO format (YYYY-MM-DD) when possible
- Do NOT invent or guess information — only extract what is explicitly stated`

  return prompt
}

/* ------------------------------------------------------------------ */
/*  extractFromTranscript                                              */
/* ------------------------------------------------------------------ */

const EXTRACTION_MODEL = "gpt-4o-mini"

export async function extractFromTranscript(
  transcript: string,
  agentConfig: ExtractionAgentConfig,
): Promise<ExtractionResult> {
  if (!transcript || transcript.trim().length === 0) {
    return {
      status: "failed",
      data: {},
      missingFields: [],
      model: EXTRACTION_MODEL,
      error: "Empty transcript",
    }
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return {
      status: "failed",
      data: {},
      missingFields: [],
      model: EXTRACTION_MODEL,
      error: "OPENAI_API_KEY not configured",
    }
  }

  const systemPrompt = buildExtractionPrompt(
    agentConfig.collectFields,
    agentConfig.customCollectFields,
  )

  try {
    const { text } = await generateText({
      model: openai(EXTRACTION_MODEL),
      system: systemPrompt,
      prompt: `TRANSCRIPT:\n${transcript}`,
      maxOutputTokens: 1000,
      temperature: 0,
    })

    const parsed = parseJsonResponse(text)
    if (!parsed) {
      return {
        status: "failed",
        data: {},
        missingFields: [],
        model: EXTRACTION_MODEL,
        error: "Failed to parse model response as JSON",
      }
    }

    const fields = resolveFields(agentConfig.collectFields, agentConfig.customCollectFields)
    const requiredFieldNames = fields.filter((f) => f.required).map((f) => f.name)

    return validateExtraction(parsed, requiredFieldNames)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return {
      status: "failed",
      data: {},
      missingFields: [],
      model: EXTRACTION_MODEL,
      error: `OpenAI call failed: ${message}`,
    }
  }
}

/* ------------------------------------------------------------------ */
/*  validateExtraction                                                 */
/* ------------------------------------------------------------------ */

export function validateExtraction(
  data: Record<string, string | null>,
  requiredFields: string[],
): ExtractionResult {
  const missingFields = requiredFields.filter(
    (field) => data[field] === null || data[field] === undefined,
  )

  let status: ExtractionResult["status"]
  if (missingFields.length === 0) {
    status = "success"
  } else if (missingFields.length < requiredFields.length) {
    status = "partial"
  } else {
    status = "failed"
  }

  return { status, data, missingFields, model: EXTRACTION_MODEL }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function resolveFields(
  collectFields: CollectFieldId[],
  customFields?: CustomCollectField[],
): ExtractionField[] {
  const fields: ExtractionField[] = collectFields.map((id) => {
    const meta = STANDARD_FIELD_META[id]
    return {
      name: id === "name" ? "caller_name" : id === "phone" ? "callback_number" : id,
      description: meta.description,
      required: meta.required,
    }
  })

  if (customFields) {
    for (const cf of customFields) {
      fields.push({
        name: cf.name,
        description: cf.description,
        required: cf.required ?? false,
      })
    }
  }

  return fields
}

function parseJsonResponse(text: string): Record<string, string | null> | null {
  // Try direct parse first
  try {
    const result = JSON.parse(text)
    if (typeof result === "object" && result !== null && !Array.isArray(result)) {
      return result as Record<string, string | null>
    }
  } catch {
    // Fall through to fence stripping
  }

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch?.[1]) {
    try {
      const result = JSON.parse(fenceMatch[1])
      if (typeof result === "object" && result !== null && !Array.isArray(result)) {
        return result as Record<string, string | null>
      }
    } catch {
      // Fall through
    }
  }

  // Try to find JSON object in the text
  const braceMatch = text.match(/\{[\s\S]*\}/)
  if (braceMatch?.[0]) {
    try {
      const result = JSON.parse(braceMatch[0])
      if (typeof result === "object" && result !== null && !Array.isArray(result)) {
        return result as Record<string, string | null>
      }
    } catch {
      // Give up
    }
  }

  return null
}
