import { create } from "zustand"
import type { Lead, LeadQuoteSnapshot } from "@/lib/types/lead"
import type { EnrichmentResult, EnrichmentAutoFillData } from "@/lib/types/ai"
import type { QuoteRequest, QuoteResponse } from "@/lib/types/quote"
import {
  fetchLeads as fetchLeadsAction,
  fetchLead as fetchLeadAction,
  updateLeadFields as updateLeadFieldsAction,
  persistEnrichment as persistEnrichmentAction,
  persistQuoteSnapshot as persistQuoteSnapshotAction,
} from "@/lib/actions/leads"

/* ------------------------------------------------------------------ */
/*  LeadStore — domain state for leads + active quote session          */
/* ------------------------------------------------------------------ */

interface LeadState {
  leads: Lead[]
  activeLead: Lead | null
  isLoading: boolean
  dirtyFields: Set<string>
}

interface QuoteSessionState {
  intakeData: QuoteRequest | null
  quoteResponse: QuoteResponse | null
  selectedCarrierIds: Set<string>
  coverageAmount: number
  termLength: number
  isQuoteLoading: boolean
  autoFillVersion: number
}

interface LeadActions {
  // Lead CRUD
  setLeads: (leads: Lead[]) => void
  addLead: (lead: Lead) => void
  addLeads: (leads: Lead[]) => void
  setActiveLead: (lead: Lead | null) => void
  updateActiveLead: (fields: Partial<Lead>) => void
  removeLead: (id: string) => void

  // Enrichment
  setActiveLeadEnrichment: (enrichment: EnrichmentResult) => void

  // Quotes
  addActiveLeadQuote: (snapshot: LeadQuoteSnapshot) => void

  // Dirty field tracking (for enrichment auto-fill protection)
  markFieldDirty: (field: string) => void
  clearDirtyFields: () => void
  isFieldDirty: (field: string) => boolean

  // Loading
  setIsLoading: (loading: boolean) => void
}

interface QuoteSessionActions {
  setIntakeData: (data: QuoteRequest | null) => void
  setQuoteResponse: (response: QuoteResponse | null) => void
  toggleCarrierSelection: (carrierId: string) => void
  clearCarrierSelection: () => void
  setCoverageAmount: (amount: number) => void
  setTermLength: (length: number) => void
  setIsQuoteLoading: (loading: boolean) => void
  fetchQuotes: (request: QuoteRequest) => Promise<void>
  clearQuoteSession: () => void
  applyAutoFill: (data: EnrichmentAutoFillData) => number
  switchToLead: (lead: Lead) => void
}

interface PersistenceActions {
  // Hydrate from Supabase
  hydrateLeads: () => Promise<void>
  hydrateLead: (id: string) => Promise<Lead | null>

  // Save to Supabase
  saveActiveLead: () => Promise<boolean>
  persistEnrichment: (leadId: string, enrichment: EnrichmentResult) => Promise<boolean>
  persistQuote: (leadId: string, snapshot: LeadQuoteSnapshot) => Promise<boolean>

  // Persistence state
  isSaving: boolean
  setIsSaving: (saving: boolean) => void
  lastSaveError: string | null
}

export type LeadStore = LeadState &
  QuoteSessionState &
  LeadActions &
  QuoteSessionActions &
  PersistenceActions

function createQuoteSessionDefaults(): QuoteSessionState {
  return {
    intakeData: null,
    quoteResponse: null,
    selectedCarrierIds: new Set<string>(),
    coverageAmount: 1000000,
    termLength: 20,
    isQuoteLoading: false,
    autoFillVersion: 0,
  }
}

function updateLeadInList(leads: Lead[], updated: Lead): Lead[] {
  return leads.map((l) => (l.id === updated.id ? updated : l))
}

export const useLeadStore = create<LeadStore>()((set, get) => ({
  // Lead state
  leads: [],
  activeLead: null,
  isLoading: false,
  dirtyFields: new Set<string>(),

  // Quote session state
  ...createQuoteSessionDefaults(),

  // Lead CRUD
  setLeads: (leads) => set({ leads }),

  addLead: (lead) => set((state) => ({ leads: [...state.leads, lead] })),

  addLeads: (leads) =>
    set((state) => ({ leads: [...state.leads, ...leads] })),

  setActiveLead: (lead) => set({ activeLead: lead, dirtyFields: new Set() }),

  updateActiveLead: (fields) =>
    set((state) => {
      if (!state.activeLead) return state
      const updated = { ...state.activeLead, ...fields }
      return {
        activeLead: updated,
        leads: updateLeadInList(state.leads, updated),
      }
    }),

  removeLead: (id) =>
    set((state) => ({
      leads: state.leads.filter((l) => l.id !== id),
      activeLead: state.activeLead?.id === id ? null : state.activeLead,
    })),

  // Enrichment — update store + auto-persist to Supabase
  setActiveLeadEnrichment: (enrichment) => {
    const state = get()
    if (!state.activeLead) return

    const leadId = state.activeLead.id
    const updated = { ...state.activeLead, enrichment }
    set({
      activeLead: updated,
      leads: updateLeadInList(state.leads, updated),
    })

    // Persist enrichment in background — surface error if it fails
    persistEnrichmentAction(leadId, enrichment).then((result) => {
      if (!result.success) {
        set({ lastSaveError: "Enrichment failed to save — click Save to retry" })
      }
    })
  },

  // Quotes
  addActiveLeadQuote: (snapshot) =>
    set((state) => {
      if (!state.activeLead) return state
      const updated = {
        ...state.activeLead,
        quoteHistory: [...state.activeLead.quoteHistory, snapshot],
      }
      return {
        activeLead: updated,
        leads: updateLeadInList(state.leads, updated),
      }
    }),

  // Dirty field tracking
  markFieldDirty: (field) =>
    set((state) => {
      const next = new Set(state.dirtyFields)
      next.add(field)
      return { dirtyFields: next }
    }),

  clearDirtyFields: () => set({ dirtyFields: new Set() }),

  isFieldDirty: (field) => get().dirtyFields.has(field),

  // Loading
  setIsLoading: (isLoading) => set({ isLoading }),

  // Quote session actions
  setIntakeData: (intakeData) => set({ intakeData }),

  setQuoteResponse: (quoteResponse) => set({ quoteResponse }),

  toggleCarrierSelection: (carrierId) =>
    set((state) => {
      const next = new Set(state.selectedCarrierIds)
      if (next.has(carrierId)) {
        next.delete(carrierId)
      } else if (next.size < 3) {
        next.add(carrierId)
      }
      return { selectedCarrierIds: next }
    }),

  clearCarrierSelection: () => set({ selectedCarrierIds: new Set<string>() }),

  setCoverageAmount: (coverageAmount) => set({ coverageAmount }),

  setTermLength: (termLength) => set({ termLength }),

  setIsQuoteLoading: (isQuoteLoading) => set({ isQuoteLoading }),

  fetchQuotes: async (request) => {
    set({
      isQuoteLoading: true,
      intakeData: request,
      coverageAmount: request.coverageAmount,
      termLength: request.termLength,
    })
    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      })
      if (!response.ok) throw new Error(`Quote request failed: ${response.status}`)
      const data: QuoteResponse = await response.json()
      set({ quoteResponse: data, selectedCarrierIds: new Set<string>() })

      // Auto-persist quote snapshot when a lead is active
      const activeLeadId = get().activeLead?.id
      if (activeLeadId) {
        const snapshot: LeadQuoteSnapshot = {
          id: crypto.randomUUID(),
          request,
          response: data,
          createdAt: new Date().toISOString(),
        }

        // Update store atomically — check lead hasn't changed during fetch
        set((state) => {
          if (!state.activeLead || state.activeLead.id !== activeLeadId) {
            return state
          }
          const updated = {
            ...state.activeLead,
            quoteHistory: [...state.activeLead.quoteHistory, snapshot],
          }
          return {
            activeLead: updated,
            leads: updateLeadInList(state.leads, updated),
          }
        })

        // Persist in background — surface error if it fails
        persistQuoteSnapshotAction(activeLeadId, snapshot).then((result) => {
          if (!result.success) {
            set({ lastSaveError: "Quote failed to save — click Save to retry" })
          }
        })
      }
    } catch {
      // Handled by empty state in UI
    } finally {
      set({ isQuoteLoading: false })
    }
  },

  clearQuoteSession: () => set(createQuoteSessionDefaults()),

  applyAutoFill: (data) => {
    const state = get()
    const dirty = state.dirtyFields
    let filledCount = 0

    // Build lead field updates (skip dirty fields)
    const leadUpdates: Partial<Lead> = {}
    if (data.firstName && !dirty.has("firstName")) {
      leadUpdates.firstName = data.firstName
      filledCount++
    }
    if (data.lastName && !dirty.has("lastName")) {
      leadUpdates.lastName = data.lastName
      filledCount++
    }
    if (data.age != null && !dirty.has("age")) {
      leadUpdates.age = data.age
      filledCount++
    }
    if (data.gender && !dirty.has("gender")) {
      leadUpdates.gender = data.gender
      filledCount++
    }
    if (data.state && !dirty.has("state")) {
      leadUpdates.state = data.state
      filledCount++
    }

    if (filledCount === 0) return 0

    // Update activeLead for persistence
    const updatedLead = state.activeLead
      ? { ...state.activeLead, ...leadUpdates }
      : null

    // Build name for intakeData form field
    const name = updatedLead
      ? [updatedLead.firstName, updatedLead.lastName].filter(Boolean).join(" ")
      : data.firstName && data.lastName
        ? `${data.firstName} ${data.lastName}`
        : data.firstName ?? data.lastName ?? undefined

    // Update intakeData if it exists
    const intakeUpdates: Partial<QuoteRequest> = {}
    if (name && !dirty.has("name")) intakeUpdates.name = name
    if (data.age != null && !dirty.has("age")) intakeUpdates.age = data.age
    if (data.gender && !dirty.has("gender")) intakeUpdates.gender = data.gender
    if (data.state && !dirty.has("state")) intakeUpdates.state = data.state

    set({
      ...(updatedLead
        ? {
            activeLead: updatedLead,
            leads: updateLeadInList(state.leads, updatedLead),
          }
        : {}),
      ...(state.intakeData
        ? { intakeData: { ...state.intakeData, ...intakeUpdates } }
        : {}),
      autoFillVersion: state.autoFillVersion + 1,
    })

    return filledCount
  },

  switchToLead: (lead) =>
    set(() => {
      const lastSnapshot = lead.quoteHistory.at(-1)
      return {
        activeLead: lead,
        dirtyFields: new Set<string>(),
        ...createQuoteSessionDefaults(),
        ...(lastSnapshot
          ? {
              quoteResponse: lastSnapshot.response,
              coverageAmount: lastSnapshot.request.coverageAmount,
              termLength: lastSnapshot.request.termLength,
            }
          : {}),
      }
    }),

  // Persistence state
  isSaving: false,
  lastSaveError: null,
  setIsSaving: (isSaving) => set({ isSaving }),

  // Hydrate all leads from Supabase
  hydrateLeads: async () => {
    set({ isLoading: true, lastSaveError: null })
    try {
      const result = await fetchLeadsAction()
      if (result.success && result.data) {
        set({ leads: result.data, isLoading: false })
      } else {
        set({ isLoading: false, lastSaveError: result.error ?? "Failed to load leads" })
      }
    } catch {
      set({ isLoading: false, lastSaveError: "Failed to load leads" })
    }
  },

  // Hydrate a single lead (with enrichment + quote history) from Supabase
  hydrateLead: async (id) => {
    try {
      const result = await fetchLeadAction(id)
      if (!result.success || !result.data) return null

      const lead = result.data
      // Upsert into leads array
      set((state) => {
        const exists = state.leads.some((l) => l.id === lead.id)
        return {
          leads: exists
            ? state.leads.map((l) => (l.id === lead.id ? lead : l))
            : [...state.leads, lead],
        }
      })
      return lead
    } catch {
      return null
    }
  },

  // Save active lead fields to Supabase
  saveActiveLead: async () => {
    const { activeLead } = get()
    if (!activeLead) return false

    set({ isSaving: true, lastSaveError: null })
    try {
      const result = await updateLeadFieldsAction(activeLead.id, {
        firstName: activeLead.firstName,
        lastName: activeLead.lastName,
        email: activeLead.email,
        phone: activeLead.phone,
        state: activeLead.state,
        age: activeLead.age,
        gender: activeLead.gender,
        tobaccoStatus: activeLead.tobaccoStatus,
        medicalConditions: activeLead.medicalConditions,
        duiHistory: activeLead.duiHistory,
        yearsSinceLastDui: activeLead.yearsSinceLastDui,
        coverageAmount: activeLead.coverageAmount,
        termLength: activeLead.termLength,
      })

      if (result.success && result.data) {
        const savedLead = result.data
        // Update the lead in the list with server-returned data (updatedAt, etc.)
        set((state) => ({
          isSaving: false,
          activeLead: savedLead,
          leads: updateLeadInList(state.leads, savedLead),
        }))
        return true
      }

      set({ isSaving: false, lastSaveError: result.error ?? "Save failed" })
      return false
    } catch {
      set({ isSaving: false, lastSaveError: "Save failed" })
      return false
    }
  },

  // Persist enrichment to Supabase
  persistEnrichment: async (leadId, enrichment) => {
    try {
      const result = await persistEnrichmentAction(leadId, enrichment)
      return result.success
    } catch {
      return false
    }
  },

  // Persist quote snapshot to Supabase
  persistQuote: async (leadId, snapshot) => {
    try {
      const result = await persistQuoteSnapshotAction(leadId, snapshot)
      return result.success
    } catch {
      return false
    }
  },
}))
