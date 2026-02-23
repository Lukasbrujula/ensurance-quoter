/* ------------------------------------------------------------------ */
/*  Telnyx AI Assistants API — TypeScript Interfaces                   */
/*  Adapted from: growthlywhatsapp/src/voice/services/telnyx.service.ts */
/*  API Docs: https://developers.telnyx.com/docs/voice-ai/ai-assistants */
/* ------------------------------------------------------------------ */

// Voice settings — matches Telnyx API format
export interface TelnyxVoiceSettings {
  voice?: string
  voice_speed?: number
  background_audio?: {
    type?: "predefined_media" | "custom"
    value?: string
    volume?: number
  }
  similarity_boost?: number
  style?: number
  use_speaker_boost?: boolean
}

// Transcription settings — matches Telnyx API format
export interface TelnyxTranscriptionSettings {
  model?: string
  language?: string
  settings?: {
    smart_format?: boolean | null
    numerals?: boolean | null
    eot_threshold?: number
    eot_timeout_ms?: number
    eager_eot_threshold?: number
  }
}

// Telephony settings (WebRTC/phone support)
export interface TelnyxTelephonySettings {
  supports_unauthenticated_web_calls?: boolean
  noise_suppression?: string
  time_limit_secs?: number
}

// Widget settings (required for embedded UI and WebRTC test calls)
export interface TelnyxWidgetSettings {
  theme?: "light" | "dark"
  start_call_text?: string
  default_state?: "collapsed" | "expanded"
  position?: "fixed" | "static"
}

// Tool definitions — name and description go at TOP LEVEL
export interface TelnyxTool {
  type: "hangup" | "webhook" | "transfer" | "handoff" | "send_message" | "send_dtmf"
  name?: string
  description?: string
  timeout_ms?: number
  hangup?: { description?: string }
  transfer?: {
    to_number: string
    from_number: string
  }
  webhook?: {
    url: string
    method: "GET" | "POST"
    body_parameters?: {
      type: "object"
      properties: Record<string, { type: string; description: string }>
      required?: string[]
    }
    headers?: Array<{ name: string; value: string }>
  }
  handoff?: {
    description?: string
    voice_mode?: "unified" | "separate"
    ai_assistants: Array<{ name: string; id: string }>
  }
}

// Assistant creation payload — matches Telnyx API format
export interface TelnyxAssistantCreateDto {
  name: string
  model: string
  instructions: string
  greeting?: string
  tools?: TelnyxTool[]
  voice_settings?: TelnyxVoiceSettings
  transcription?: TelnyxTranscriptionSettings
  telephony_settings?: TelnyxTelephonySettings
  widget_settings?: TelnyxWidgetSettings
  enabled_features?: string[]
}

// Assistant update payload — all optional + promote_to_main
// WARNING: tools array is a full overwrite — send ALL tools or unincluded ones get removed
export interface TelnyxAssistantUpdateDto {
  name?: string
  model?: string
  instructions?: string
  greeting?: string
  tools?: TelnyxTool[]
  voice_settings?: TelnyxVoiceSettings
  transcription?: TelnyxTranscriptionSettings
  telephony_settings?: TelnyxTelephonySettings
  widget_settings?: TelnyxWidgetSettings
  enabled_features?: string[]
  promote_to_main?: boolean
}

// Assistant response from Telnyx API
export interface TelnyxAssistant {
  id: string
  name: string
  description: string
  model: string
  instructions: string
  tools: TelnyxTool[]
  greeting: string
  voice_settings: TelnyxVoiceSettings | null
  transcription: TelnyxTranscriptionSettings | null
  telephony_settings: TelnyxTelephonySettings | null
  widget_settings: TelnyxWidgetSettings | null
  enabled_features: string[]
  created_at: string
  version_id: string
  version_created_at: string | null
}

// Conversation record (AI call log from Telnyx)
export interface TelnyxConversation {
  id: string
  assistant_id: string
  status: "active" | "completed" | "failed"
  caller_number?: string
  called_number?: string
  direction?: "inbound" | "outbound"
  duration_seconds?: number
  started_at?: string
  ended_at?: string
  created_at: string
  recording_url?: string
  summary?: string
  metadata?: Record<string, unknown>
}

// Individual transcript message
export interface TelnyxTranscriptMessage {
  id: string
  role: "assistant" | "user" | "system"
  content: string
  timestamp?: string
  created_at?: string
}

// API response wrappers
export interface TelnyxConversationsResponse {
  data: TelnyxConversation[]
  meta?: {
    page_number: number
    page_size: number
    total_pages: number
    total_results: number
  }
}

export interface TelnyxTranscriptResponse {
  data: TelnyxTranscriptMessage[]
}
