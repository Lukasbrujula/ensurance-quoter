/* ------------------------------------------------------------------ */
/*  Dashboard Widget Registry                                         */
/*  Single source of truth for all widget definitions.                */
/* ------------------------------------------------------------------ */

export type WidgetSize = "stat" | "half" | "full"

export type WidgetCategory =
  | "stats"
  | "pipeline"
  | "activity"
  | "communication"
  | "ai-agents"
  | "performance"
  | "planning"

export interface WidgetDefinition {
  /** Unique kebab-case identifier */
  readonly id: string
  /** Human-readable name shown in the picker */
  readonly name: string
  /** Short description for the customize sheet */
  readonly description: string
  /** Grouping category */
  readonly category: WidgetCategory
  /** Whether this widget is active for new users by default */
  readonly defaultActive: boolean
  /** Grid sizing hint */
  readonly size: WidgetSize
}

/* ------------------------------------------------------------------ */
/*  Category metadata                                                  */
/* ------------------------------------------------------------------ */

export const WIDGET_CATEGORIES: Record<WidgetCategory, string> = {
  stats: "Key Metrics",
  pipeline: "Pipeline & Leads",
  activity: "Activity & History",
  communication: "Communication",
  "ai-agents": "AI Agents",
  performance: "Performance",
  planning: "Planning & Calendar",
}

/** Display order for categories in the picker */
export const CATEGORY_ORDER: WidgetCategory[] = [
  "stats",
  "pipeline",
  "activity",
  "communication",
  "ai-agents",
  "performance",
  "planning",
]

/* ------------------------------------------------------------------ */
/*  Widget definitions (21 total)                                      */
/* ------------------------------------------------------------------ */

export const DASHBOARD_WIDGETS: readonly WidgetDefinition[] = [
  // ── Stats (4 existing) ──────────────────────────────────────────
  {
    id: "stat-leads",
    name: "Total Leads",
    description: "Total lead count with weekly trend",
    category: "stats",
    defaultActive: true,
    size: "stat",
  },
  {
    id: "stat-calls",
    name: "Calls",
    description: "Call count for this week and month",
    category: "stats",
    defaultActive: true,
    size: "stat",
  },
  {
    id: "stat-close-rate",
    name: "Close Rate",
    description: "Percentage of quoted leads that got issued",
    category: "stats",
    defaultActive: true,
    size: "stat",
  },
  {
    id: "stat-active-deals",
    name: "Active Deals",
    description: "Leads in contacted, quoted, or applied stages",
    category: "stats",
    defaultActive: true,
    size: "stat",
  },

  // ── Pipeline & Leads (2 existing + 1 new) ──────────────────────
  {
    id: "pipeline",
    name: "Pipeline Distribution",
    description: "Visual breakdown of leads across pipeline stages",
    category: "pipeline",
    defaultActive: true,
    size: "full",
  },
  {
    id: "business-profile",
    name: "Business Profile",
    description: "Quick view of your business info completeness",
    category: "pipeline",
    defaultActive: false,
    size: "half",
  },
  {
    id: "quote-to-app-rate",
    name: "Quote-to-App Rate",
    description: "Conversion rate from quoted to applied leads",
    category: "pipeline",
    defaultActive: false,
    size: "stat",
  },

  // ── Activity & History (2 existing + 1 new) ────────────────────
  {
    id: "charts",
    name: "Charts",
    description: "Activity overview and leads-by-stage charts",
    category: "activity",
    defaultActive: true,
    size: "half",
  },
  {
    id: "activity",
    name: "Recent Activity",
    description: "Latest actions across your leads",
    category: "activity",
    defaultActive: true,
    size: "half",
  },
  {
    id: "communication-breakdown",
    name: "Communication Breakdown",
    description: "Calls vs SMS vs Email distribution",
    category: "activity",
    defaultActive: false,
    size: "stat",
  },

  // ── Communication (2 new) ──────────────────────────────────────
  {
    id: "inbox-unread",
    name: "Inbox Unread",
    description: "Count of unread SMS and email messages",
    category: "communication",
    defaultActive: false,
    size: "stat",
  },
  {
    id: "avg-response-time",
    name: "Avg Response Time",
    description: "Average time to first reply on SMS threads",
    category: "communication",
    defaultActive: false,
    size: "stat",
  },

  // ── AI Agents (2 new) ──────────────────────────────────────────
  {
    id: "ai-agent-summary",
    name: "AI Agent Summary",
    description: "Active agents, total calls handled, and leads created",
    category: "ai-agents",
    defaultActive: false,
    size: "half",
  },
  {
    id: "ai-call-queue",
    name: "AI Call Queue",
    description: "Recent AI agent calls with status",
    category: "ai-agents",
    defaultActive: false,
    size: "half",
  },

  // ── Performance (3 new) ────────────────────────────────────────
  {
    id: "commission-estimate",
    name: "Commission Estimate",
    description: "Estimated commission from issued policies this month",
    category: "performance",
    defaultActive: false,
    size: "stat",
  },
  {
    id: "top-carriers",
    name: "Top Carriers",
    description: "Most-quoted carriers in your pipeline",
    category: "performance",
    defaultActive: false,
    size: "half",
  },
  {
    id: "usage-costs",
    name: "Usage & Costs",
    description: "Phone numbers, SMS, and AI agent usage summary",
    category: "performance",
    defaultActive: false,
    size: "half",
  },

  // ── Planning & Calendar (3 — 1 existing + 2 new) ──────────────
  {
    id: "follow-ups",
    name: "Follow-ups",
    description: "Upcoming and overdue follow-up reminders",
    category: "planning",
    defaultActive: true,
    size: "half",
  },
  {
    id: "goals",
    name: "Goals",
    description: "Track custom goals like commissions or calls",
    category: "planning",
    defaultActive: false,
    size: "half",
  },
  {
    id: "calendar-preview",
    name: "Calendar Preview",
    description: "Today's and tomorrow's scheduled events",
    category: "planning",
    defaultActive: false,
    size: "half",
  },
  {
    id: "overdue-tasks",
    name: "Overdue Tasks",
    description: "Leads with overdue follow-ups needing attention",
    category: "planning",
    defaultActive: false,
    size: "half",
  },
]

/* ------------------------------------------------------------------ */
/*  Lookup helpers                                                     */
/* ------------------------------------------------------------------ */

/** Map of widget ID → definition for O(1) lookups */
export const WIDGET_MAP: ReadonlyMap<string, WidgetDefinition> = new Map(
  DASHBOARD_WIDGETS.map((w) => [w.id, w]),
)

/** IDs of widgets that are active by default for new users */
export const DEFAULT_ACTIVE_WIDGET_IDS: readonly string[] = DASHBOARD_WIDGETS
  .filter((w) => w.defaultActive)
  .map((w) => w.id)

/** All valid widget IDs */
export const ALL_WIDGET_IDS: readonly string[] = DASHBOARD_WIDGETS.map((w) => w.id)

/** CSS grid column spans based on widget size */
export const WIDGET_SIZE_SPANS: Record<WidgetSize, string> = {
  stat: "col-span-1",
  half: "col-span-1 sm:col-span-2",
  full: "col-span-1 sm:col-span-2 lg:col-span-4",
}
