"use client"

import { useReducer, useCallback, useMemo } from "react"
import { RefreshCw, ArrowLeft, ArrowRight, Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/auth-provider"
import type { AgentTemplate } from "@/lib/telnyx/agent-templates"
import type {
  CollectFieldId,
  PostCallActionId,
  BusinessHours,
} from "@/lib/types/database"

import { PurposeStep } from "./wizard-steps/purpose-step"
import { BusinessStep } from "./wizard-steps/business-step"
import { PersonalityStep } from "./wizard-steps/personality-step"
import { CollectionStep } from "./wizard-steps/collection-step"
import { ReviewStep } from "./wizard-steps/review-step"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STEP_COUNT = 5

const STEP_LABELS = [
  "Purpose",
  "Business",
  "Personality",
  "Info & Actions",
  "Review",
] as const

const DEFAULT_COLLECT_FIELDS: CollectFieldId[] = [
  "name", "phone", "reason", "callback_time",
]

const DEFAULT_POST_CALL_ACTIONS: PostCallActionId[] = [
  "save_lead", "book_calendar", "send_notification",
]

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

interface WizardState {
  step: number
  templateId: string | null
  // Step 2: Business
  businessName: string
  agentName: string
  state: string
  phoneNumber: string
  // Step 3: Personality
  tonePreset: string
  voice: string
  // Step 4: Collection
  collectFields: CollectFieldId[]
  postCallActions: PostCallActionId[]
  businessHours: BusinessHours | null
  afterHoursGreeting: string
  showBusinessHoursExpanded: boolean
  // Step 5: Review
  agentDisplayName: string
  // Greeting template (with placeholders)
  greetingTemplate: string
  // Submission
  creating: boolean
  error: string | null
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

type WizardAction =
  | { type: "SET_STEP"; step: number }
  | { type: "APPLY_TEMPLATE"; template: AgentTemplate }
  | { type: "START_FROM_SCRATCH" }
  | { type: "SET_BUSINESS_NAME"; value: string }
  | { type: "SET_AGENT_NAME"; value: string }
  | { type: "SET_STATE"; value: string }
  | { type: "SET_PHONE_NUMBER"; value: string }
  | { type: "SET_TONE_PRESET"; value: string }
  | { type: "SET_VOICE"; value: string }
  | { type: "TOGGLE_COLLECT_FIELD"; fieldId: CollectFieldId }
  | { type: "TOGGLE_POST_CALL_ACTION"; actionId: PostCallActionId }
  | { type: "SET_BUSINESS_HOURS"; hours: BusinessHours | null }
  | { type: "SET_AFTER_HOURS_GREETING"; value: string }
  | { type: "SET_AGENT_DISPLAY_NAME"; value: string }
  | { type: "SET_CREATING"; value: boolean }
  | { type: "SET_ERROR"; value: string | null }
  | { type: "RESET" }

function createInitialState(meta: Record<string, unknown>): WizardState {
  return {
    step: 1,
    templateId: null,
    businessName: (meta.brokerage_name as string) || "",
    agentName: [meta.first_name, meta.last_name].filter(Boolean).join(" ") || "",
    state: (meta.licensed_state as string) || "",
    phoneNumber: "",
    tonePreset: "warm",
    voice: "Telnyx.NaturalHD.astra",
    collectFields: [...DEFAULT_COLLECT_FIELDS],
    postCallActions: [...DEFAULT_POST_CALL_ACTIONS],
    businessHours: null,
    afterHoursGreeting: "",
    showBusinessHoursExpanded: false,
    agentDisplayName: "",
    greetingTemplate: "",
    creating: false,
    error: null,
  }
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step, error: null }

    case "APPLY_TEMPLATE": {
      const t = action.template
      const displayName = state.businessName
        ? `${state.businessName} ${t.suggestedName}`
        : t.suggestedName
      return {
        ...state,
        step: 2,
        templateId: t.id,
        tonePreset: t.defaultTonePreset,
        voice: t.voice,
        collectFields: [...t.collectFields],
        postCallActions: [...t.postCallActions],
        businessHours: t.defaultBusinessHours ? { ...t.defaultBusinessHours, schedule: { ...t.defaultBusinessHours.schedule } } : null,
        afterHoursGreeting: "",
        showBusinessHoursExpanded: t.defaultBusinessHours !== null,
        agentDisplayName: displayName,
        greetingTemplate: t.greeting,
        error: null,
      }
    }

    case "START_FROM_SCRATCH":
      return {
        ...state,
        step: 2,
        templateId: null,
        tonePreset: "warm",
        voice: "Telnyx.NaturalHD.astra",
        collectFields: [...DEFAULT_COLLECT_FIELDS],
        postCallActions: [...DEFAULT_POST_CALL_ACTIONS],
        businessHours: null,
        afterHoursGreeting: "",
        showBusinessHoursExpanded: false,
        agentDisplayName: state.businessName ? `${state.businessName} Agent` : "",
        greetingTemplate:
          "Hi, you've reached {agent}'s office. How can I help you today?",
        error: null,
      }

    case "SET_BUSINESS_NAME":
      return { ...state, businessName: action.value }

    case "SET_AGENT_NAME":
      return { ...state, agentName: action.value }

    case "SET_STATE":
      return { ...state, state: action.value }

    case "SET_PHONE_NUMBER":
      return { ...state, phoneNumber: action.value }

    case "SET_TONE_PRESET":
      return { ...state, tonePreset: action.value }

    case "SET_VOICE":
      return { ...state, voice: action.value }

    case "TOGGLE_COLLECT_FIELD": {
      const fields = state.collectFields.includes(action.fieldId)
        ? state.collectFields.filter((f) => f !== action.fieldId)
        : [...state.collectFields, action.fieldId]
      return { ...state, collectFields: fields }
    }

    case "TOGGLE_POST_CALL_ACTION": {
      const actions = state.postCallActions.includes(action.actionId)
        ? state.postCallActions.filter((a) => a !== action.actionId)
        : [...state.postCallActions, action.actionId]
      return { ...state, postCallActions: actions }
    }

    case "SET_BUSINESS_HOURS":
      return { ...state, businessHours: action.hours }

    case "SET_AFTER_HOURS_GREETING":
      return { ...state, afterHoursGreeting: action.value }

    case "SET_AGENT_DISPLAY_NAME":
      return { ...state, agentDisplayName: action.value }

    case "SET_CREATING":
      return { ...state, creating: action.value }

    case "SET_ERROR":
      return { ...state, error: action.value }

    case "RESET":
      return createInitialState({})

    default:
      return state
  }
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CreateAgentWizardProps {
  onCreated: () => void
  onClose: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CreateAgentWizard({ onCreated, onClose }: CreateAgentWizardProps) {
  const { user } = useAuth()
  const meta = user?.user_metadata ?? {}

  const [state, dispatch] = useReducer(
    wizardReducer,
    meta,
    createInitialState,
  )

  /* ---- Navigation ---- */

  const canGoNext = useMemo(() => {
    switch (state.step) {
      case 1:
        return false // navigation via card click
      case 2:
        return true // all fields optional except handled by template
      case 3:
        return !!state.tonePreset && !!state.voice
      case 4:
        return state.collectFields.length >= 3 // at least the 3 required
      case 5:
        return !!state.agentDisplayName.trim()
      default:
        return false
    }
  }, [state.step, state.tonePreset, state.voice, state.collectFields, state.agentDisplayName])

  const handleNext = useCallback(() => {
    if (state.step === 4) {
      // Auto-generate display name if empty when entering review
      if (!state.agentDisplayName.trim()) {
        const template = state.templateId
          ? `Agent`
          : "Agent"
        const name = state.businessName
          ? `${state.businessName} ${template}`
          : template
        dispatch({ type: "SET_AGENT_DISPLAY_NAME", value: name })
      }
    }
    if (state.step < STEP_COUNT) {
      dispatch({ type: "SET_STEP", step: state.step + 1 })
    }
  }, [state.step, state.agentDisplayName, state.businessName, state.templateId])

  const handleBack = useCallback(() => {
    if (state.step > 1) {
      dispatch({ type: "SET_STEP", step: state.step - 1 })
    }
  }, [state.step])

  /* ---- Resolve greeting ---- */

  const resolvedGreeting = useMemo(() => {
    const business = state.businessName || `${state.agentName}'s office`
    return state.greetingTemplate
      .replace(/\{agent\}/g, state.agentName || "your agent")
      .replace(/\{business\}/g, business)
  }, [state.greetingTemplate, state.agentName, state.businessName])

  /* ---- Submit ---- */

  const handleSubmit = useCallback(async () => {
    if (!state.agentDisplayName.trim()) return

    dispatch({ type: "SET_CREATING", value: true })
    dispatch({ type: "SET_ERROR", value: null })

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.agentDisplayName.trim(),
          phone_number: state.phoneNumber.trim() || undefined,
          voice: state.voice,
          greeting: resolvedGreeting,
          personality: undefined, // tone preset handles this
          collect_fields: state.collectFields,
          post_call_actions: state.postCallActions,
          template_id: state.templateId ?? undefined,
          business_name: state.businessName.trim() || undefined,
          tone_preset: state.tonePreset || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create agent")
      }

      if (data.warning) {
        toast.warning(data.warning)
      } else {
        toast.success("Agent created successfully")
      }

      onCreated()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create agent"
      dispatch({ type: "SET_ERROR", value: message })
    } finally {
      dispatch({ type: "SET_CREATING", value: false })
    }
  }, [state, resolvedGreeting, onCreated])

  /* ---- Render ---- */

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Stepper */}
      {state.step > 1 && (
        <div className="flex items-center justify-center gap-1 pb-4">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1
            const isActive = stepNum === state.step
            const isCompleted = stepNum < state.step
            return (
              <div key={label} className="flex items-center gap-1">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-colors",
                      isActive && "bg-[#1773cf] text-white",
                      isCompleted && "bg-[#1773cf]/15 text-[#1773cf]",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      stepNum
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-0.5 text-[9px]",
                      isActive ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div
                    className={cn(
                      "mb-3 h-[2px] w-6",
                      stepNum < state.step ? "bg-[#1773cf]/30" : "bg-muted",
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Step content */}
      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="pb-2">
          {state.step === 1 && (
            <PurposeStep
              onSelectTemplate={(t) => dispatch({ type: "APPLY_TEMPLATE", template: t })}
              onStartFromScratch={() => dispatch({ type: "START_FROM_SCRATCH" })}
            />
          )}

          {state.step === 2 && (
            <BusinessStep
              businessName={state.businessName}
              agentName={state.agentName}
              state={state.state}
              phoneNumber={state.phoneNumber}
              onBusinessNameChange={(v) => dispatch({ type: "SET_BUSINESS_NAME", value: v })}
              onAgentNameChange={(v) => dispatch({ type: "SET_AGENT_NAME", value: v })}
              onStateChange={(v) => dispatch({ type: "SET_STATE", value: v })}
              onPhoneNumberChange={(v) => dispatch({ type: "SET_PHONE_NUMBER", value: v })}
            />
          )}

          {state.step === 3 && (
            <PersonalityStep
              tonePreset={state.tonePreset}
              voice={state.voice}
              onTonePresetChange={(v) => dispatch({ type: "SET_TONE_PRESET", value: v })}
              onVoiceChange={(v) => dispatch({ type: "SET_VOICE", value: v })}
            />
          )}

          {state.step === 4 && (
            <CollectionStep
              collectFields={state.collectFields}
              postCallActions={state.postCallActions}
              businessHours={state.businessHours}
              afterHoursGreeting={state.afterHoursGreeting}
              onToggleCollectField={(id) => dispatch({ type: "TOGGLE_COLLECT_FIELD", fieldId: id })}
              onTogglePostCallAction={(id) => dispatch({ type: "TOGGLE_POST_CALL_ACTION", actionId: id })}
              onBusinessHoursChange={(h) => dispatch({ type: "SET_BUSINESS_HOURS", hours: h })}
              onAfterHoursGreetingChange={(v) => dispatch({ type: "SET_AFTER_HOURS_GREETING", value: v })}
              showBusinessHoursExpanded={state.showBusinessHoursExpanded}
            />
          )}

          {state.step === 5 && (
            <ReviewStep
              agentDisplayName={state.agentDisplayName}
              businessName={state.businessName}
              agentName={state.agentName}
              state={state.state}
              tonePreset={state.tonePreset}
              voice={state.voice}
              greeting={state.greetingTemplate}
              collectFields={state.collectFields}
              postCallActions={state.postCallActions}
              businessHours={state.businessHours}
              onAgentDisplayNameChange={(v) => dispatch({ type: "SET_AGENT_DISPLAY_NAME", value: v })}
            />
          )}

          {/* Error */}
          {state.error && (
            <p className="mt-3 text-sm text-red-600">{state.error}</p>
          )}
        </div>
      </ScrollArea>

      {/* Footer nav */}
      {state.step > 1 && (
        <div className="flex items-center justify-between border-t pt-4 mt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={state.creating}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={state.creating}
            >
              Cancel
            </Button>

            {state.step < STEP_COUNT ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                disabled={!canGoNext}
              >
                Next
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={state.creating || !state.agentDisplayName.trim()}
              >
                {state.creating ? (
                  <>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Create Agent
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
