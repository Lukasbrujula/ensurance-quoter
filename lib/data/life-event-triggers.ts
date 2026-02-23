/* ------------------------------------------------------------------ */
/*  Life-Event Triggers — T11.1a                                        */
/*  ~25 triggers across 13 categories for cross-sell detection during   */
/*  live calls. Keywords matched by the AI coaching prompt.             */
/* ------------------------------------------------------------------ */

export interface LifeEventTrigger {
  readonly id: string
  readonly event: string
  readonly emoji: string
  readonly keywords: readonly string[]
  readonly crossSellSuggestions: readonly string[]
  readonly suggestedScript: string
  readonly priority: "high" | "medium"
}

export const LIFE_EVENT_TRIGGERS: readonly LifeEventTrigger[] = [
  /* ── HIGH PRIORITY ─────────────────────────────────────────────────── */
  {
    id: "new_baby",
    event: "New Baby",
    emoji: "\uD83D\uDC76",
    keywords: [
      "had a baby", "expecting", "pregnant", "newborn", "due date",
      "nursery", "maternity leave", "just born", "baby shower",
    ],
    crossSellSuggestions: [
      "Term policy for new parent",
      "Children's rider on existing policy",
      "Increase coverage to match new expenses",
    ],
    suggestedScript: "Congratulations! A lot of new parents don't think about life insurance right away, but this is actually the perfect time. Your expenses just went up, and coverage is cheapest when you're young and healthy. Want me to run some numbers?",
    priority: "high",
  },
  {
    id: "new_grandchild",
    event: "New Grandchild",
    emoji: "\uD83D\uDC75",
    keywords: [
      "grandchild", "grandbaby", "grandson", "granddaughter",
      "daughter had a baby", "son had a baby", "grandparent",
    ],
    crossSellSuggestions: [
      "Term policy for adult child",
      "Increase own coverage for legacy",
      "Final expense for estate planning",
    ],
    suggestedScript: "A lot of new parents don't think about life insurance until later, but this is actually the perfect time. I could help your daughter get coverage too if she's interested — it's much cheaper when you're young and healthy.",
    priority: "high",
  },
  {
    id: "marriage",
    event: "Marriage",
    emoji: "\uD83D\uDC8D",
    keywords: [
      "getting married", "engaged", "wedding", "fiance", "fiancee",
      "fiancé", "fiancée", "tying the knot", "just got married",
    ],
    crossSellSuggestions: [
      "Spousal coverage — both partners",
      "Beneficiary update",
      "Joint coverage review",
    ],
    suggestedScript: "Congratulations on the engagement! This is a great time to review coverage — most couples want to make sure both partners are protected, especially if you're combining finances or taking on a mortgage together.",
    priority: "high",
  },
  {
    id: "home_purchase",
    event: "Home Purchase",
    emoji: "\uD83C\uDFE0",
    keywords: [
      "buying a house", "mortgage", "closing on", "new home",
      "down payment", "first home", "house hunting", "realtor",
      "pre-approved", "just bought a house",
    ],
    crossSellSuggestions: [
      "Mortgage protection term policy",
      "Increase coverage to match mortgage balance",
      "Decreasing term for mortgage payoff",
    ],
    suggestedScript: "A mortgage is usually the biggest financial commitment you'll take on. A lot of my clients get a term policy that matches their mortgage length — that way if anything happens, the house is paid off and your family stays in their home.",
    priority: "high",
  },
  {
    id: "retirement",
    event: "Retirement",
    emoji: "\uD83C\uDF85",
    keywords: [
      "retiring", "last day", "pension", "social security",
      "401k rollover", "retired", "retirement party", "leaving work",
      "done working",
    ],
    crossSellSuggestions: [
      "Final expense / burial insurance",
      "Annuity for income protection",
      "Convert term to permanent before it expires",
    ],
    suggestedScript: "Now that you're retiring, your group coverage through work will likely end. A lot of my clients pick up an individual policy to bridge that gap. Have you thought about what happens to your coverage?",
    priority: "high",
  },
  {
    id: "health_scare",
    event: "Health Scare",
    emoji: "\u26A0\uFE0F",
    keywords: [
      "diagnosed", "found out I have", "doctor said", "test results",
      "biopsy", "surgery scheduled", "health scare", "tumor",
      "heart attack", "stroke",
    ],
    crossSellSuggestions: [
      "Accelerate application before ratings change",
      "Simplified issue products if standard declines",
      "Guaranteed issue as last resort",
    ],
    suggestedScript: "I understand this is a lot to process. The reason I bring up coverage now is that the sooner we apply, the better your options are. If you wait, a new diagnosis could change your rates or eligibility. Want me to check which carriers would still work?",
    priority: "high",
  },

  /* ── MEDIUM PRIORITY ───────────────────────────────────────────────── */
  {
    id: "new_job",
    event: "New Job / Promotion",
    emoji: "\uD83D\uDCBC",
    keywords: [
      "new job", "promotion", "raise", "started at", "career change",
      "got promoted", "new position", "salary increase", "bonus",
    ],
    crossSellSuggestions: [
      "Increase coverage to match higher income",
      "Review group vs individual coverage",
      "Income replacement calculation",
    ],
    suggestedScript: "With a higher income, your family's lifestyle expenses go up too. The general rule is 10-15x your annual salary in coverage. Want me to recalculate what that looks like now?",
    priority: "medium",
  },
  {
    id: "divorce",
    event: "Divorce",
    emoji: "\uD83D\uDC94",
    keywords: [
      "divorce", "separated", "custody", "ex-wife", "ex-husband",
      "splitting up", "divorce settlement", "alimony", "child support",
    ],
    crossSellSuggestions: [
      "Beneficiary update (remove ex-spouse)",
      "Coverage adequacy review as single parent",
      "Court-ordered life insurance for child support",
    ],
    suggestedScript: "A lot of people forget to update their beneficiaries after a divorce — you'd be surprised how often an ex-spouse is still listed. Also, some divorce agreements actually require maintaining life insurance for child support obligations.",
    priority: "medium",
  },
  {
    id: "kid_driving",
    event: "Kid Starting to Drive",
    emoji: "\uD83D\uDE97",
    keywords: [
      "turning 16", "driver's license", "learning to drive",
      "teenager", "first car", "permit test",
    ],
    crossSellSuggestions: [
      "Auto insurance referral",
      "Umbrella liability policy",
      "Coverage review with new driver risk",
    ],
    suggestedScript: "New drivers are exciting and nerve-wracking! This is a great time to make sure your overall coverage is solid. Have you thought about an umbrella policy? It covers liability gaps that regular auto doesn't.",
    priority: "medium",
  },
  {
    id: "parent_passed",
    event: "Parent Passed Away",
    emoji: "\uD83D\uDD4A\uFE0F",
    keywords: [
      "parent passed", "funeral", "lost my mother", "lost my father",
      "burial costs", "dad passed", "mom passed", "memorial service",
      "estate", "probate",
    ],
    crossSellSuggestions: [
      "Final expense / burial insurance",
      "Estate planning review",
      "Own coverage review prompted by loss",
    ],
    suggestedScript: "I'm sorry for your loss. Many people going through this realize how important it is to have their own affairs in order. Would it help if I reviewed your current coverage to make sure your family wouldn't face the same financial burden?",
    priority: "medium",
  },
  {
    id: "business_owner",
    event: "Business Owner",
    emoji: "\uD83C\uDFE2",
    keywords: [
      "own business", "started a company", "entrepreneur",
      "self-employed", "LLC", "my company", "business partner",
      "small business",
    ],
    crossSellSuggestions: [
      "Key person insurance",
      "Buy-sell agreement funded by life insurance",
      "Business loan protection",
    ],
    suggestedScript: "As a business owner, have you thought about key person insurance? If something happened to you, your business would need cash to survive the transition. A lot of my business clients also set up buy-sell agreements funded by life insurance.",
    priority: "medium",
  },
  {
    id: "empty_nest",
    event: "Empty Nest",
    emoji: "\uD83C\uDF93",
    keywords: [
      "kids moved out", "empty nester", "college", "last one left",
      "dropped off at college", "all grown up", "on their own",
    ],
    crossSellSuggestions: [
      "Coverage reduction (lower need)",
      "Convert term to permanent",
      "Wealth accumulation (IUL)",
    ],
    suggestedScript: "With the kids on their own, your coverage needs change. Some clients reduce their term coverage and put the savings into a permanent policy that builds cash value. Want me to show you what that looks like?",
    priority: "medium",
  },
  {
    id: "debt_free",
    event: "Debt Free",
    emoji: "\uD83C\uDF89",
    keywords: [
      "paid off mortgage", "debt free", "no more payments",
      "paid off the house", "mortgage free", "last payment",
    ],
    crossSellSuggestions: [
      "Coverage adjustment (lower mortgage protection need)",
      "Redirect premium savings to IUL",
      "Legacy planning",
    ],
    suggestedScript: "That's a huge accomplishment! Now that the mortgage is paid off, you might not need as much term coverage. Some clients redirect those savings into a policy with cash value — it's like forced savings with a death benefit built in.",
    priority: "medium",
  },
  {
    id: "inheritance",
    event: "Received Inheritance",
    emoji: "\uD83D\uDCB0",
    keywords: [
      "inheritance", "inherited", "left me money", "estate",
      "trust fund", "will", "bequest",
    ],
    crossSellSuggestions: [
      "Wealth preservation strategy",
      "IUL for tax-advantaged growth",
      "Estate planning review",
    ],
    suggestedScript: "An inheritance is a great opportunity to set up protection that lasts. Have you considered using part of it for a permanent policy? It can grow tax-deferred and pass to your beneficiaries tax-free.",
    priority: "medium",
  },
  {
    id: "military_transition",
    event: "Military Transition",
    emoji: "\uD83C\uDF96\uFE0F",
    keywords: [
      "leaving the military", "veteran", "transitioning out",
      "ETS", "discharged", "SGLI ending", "VA benefits",
    ],
    crossSellSuggestions: [
      "Replace SGLI coverage with individual term",
      "VGLI conversion review (often overpriced)",
      "Veteran-friendly carrier matching",
    ],
    suggestedScript: "Your SGLI coverage ends pretty quickly after separation, and VGLI rates go up fast as you age. A private term policy is usually much cheaper. Want me to compare some options?",
    priority: "medium",
  },
  {
    id: "adoption",
    event: "Adoption",
    emoji: "\u2764\uFE0F",
    keywords: [
      "adopting", "adoption", "foster child", "adopted",
      "adoption agency", "waiting to adopt",
    ],
    crossSellSuggestions: [
      "Term for new parent",
      "Children's rider",
      "Increase coverage for larger family",
    ],
    suggestedScript: "Adoption is such a wonderful step. Just like with a birth, your financial responsibilities are growing. This is a great time to make sure your family has the right amount of coverage.",
    priority: "medium",
  },
  {
    id: "chronic_diagnosis",
    event: "Chronic Condition Diagnosis",
    emoji: "\uD83C\uDFE5",
    keywords: [
      "just found out", "chronic condition", "lifelong medication",
      "managing my condition", "long-term treatment",
    ],
    crossSellSuggestions: [
      "Apply before condition is rated",
      "Simplified issue if standard declines",
      "Carrier matching for specific condition",
    ],
    suggestedScript: "Getting coverage with a chronic condition is absolutely possible — it just depends on matching you with the right carrier. Some carriers are much more lenient than others for specific conditions. Want me to check which ones would work best?",
    priority: "medium",
  },
  {
    id: "spouse_no_coverage",
    event: "Spouse Has No Coverage",
    emoji: "\uD83D\uDC6B",
    keywords: [
      "my wife doesn't have", "husband has no insurance",
      "spouse isn't covered", "partner has no policy",
      "only I have coverage",
    ],
    crossSellSuggestions: [
      "Spousal term policy",
      "Joint/dual policy options",
      "Stay-at-home spouse coverage for childcare replacement",
    ],
    suggestedScript: "Even if your spouse doesn't have income, replacing childcare, household management, and other contributions would cost a lot. A policy for both partners is usually the smartest move.",
    priority: "medium",
  },
  {
    id: "group_coverage_ending",
    event: "Group Coverage Ending",
    emoji: "\uD83D\uDCC9",
    keywords: [
      "losing my coverage", "group plan ending", "benefits ending",
      "layoff", "company closing", "COBRA running out",
      "leaving my job",
    ],
    crossSellSuggestions: [
      "Individual term to replace group",
      "Portable coverage that follows you",
      "Bridge coverage during transition",
    ],
    suggestedScript: "Group coverage is great while you have it, but it doesn't follow you. Converting to COBRA is expensive, and it's temporary. An individual policy locks in your rate regardless of future job changes.",
    priority: "medium",
  },
  {
    id: "significant_birthday",
    event: "Approaching Rate Increase Age",
    emoji: "\uD83C\uDF82",
    keywords: [
      "turning 40", "turning 50", "turning 60", "turning 65",
      "birthday coming up", "about to turn",
    ],
    crossSellSuggestions: [
      "Lock in rate before age band increase",
      "Coverage review at milestone age",
    ],
    suggestedScript: "Rates go up at each age band, so applying before your next birthday can save you real money over the life of the policy. Want me to show you the difference?",
    priority: "medium",
  },
  {
    id: "college_savings",
    event: "Planning for College",
    emoji: "\uD83D\uDCDA",
    keywords: [
      "college fund", "saving for college", "529 plan",
      "tuition", "education savings",
    ],
    crossSellSuggestions: [
      "Term to cover education costs if parent passes",
      "IUL as supplemental college funding vehicle",
    ],
    suggestedScript: "If something happened to you before the kids finish school, would there be enough to cover tuition? A lot of parents add a term policy specifically for education costs — it's a small premium for a big safety net.",
    priority: "medium",
  },
  {
    id: "caring_for_parent",
    event: "Caring for Aging Parent",
    emoji: "\uD83E\uDDD3",
    keywords: [
      "taking care of my mom", "caring for parent",
      "aging parent", "nursing home", "assisted living",
      "long-term care", "caregiver",
    ],
    crossSellSuggestions: [
      "Final expense for the parent",
      "Living benefits rider for own policy",
      "Long-term care rider",
    ],
    suggestedScript: "Being a caregiver is tough. Have you thought about coverage for your parent? Final expense insurance can cover those end-of-life costs so the financial burden doesn't fall on you. And for yourself, a living benefits rider can help if you ever need care too.",
    priority: "medium",
  },
] as const

/* ── Trigger Lookup ──────────────────────────────────────────────────── */

/**
 * Find a trigger by ID.
 */
export function findTrigger(id: string): LifeEventTrigger | null {
  return LIFE_EVENT_TRIGGERS.find((t) => t.id === id) ?? null
}
