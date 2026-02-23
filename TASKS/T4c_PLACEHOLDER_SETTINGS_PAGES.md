# T4c: Placeholder Settings Pages

**Priority:** Low — cosmetic completeness for demo  
**Estimate:** 30 min  
**Phase:** 5 (UI Polish)  
**Depends on:** T4a (Settings Layout & Sidebar)

---

## Context

After T4a creates the settings sidebar with 8+ sections, and T4b builds the Profile page, the remaining sections need placeholder pages so the settings area feels complete during a demo. These are "Coming Soon" pages — not functional, just enough to show Max the product vision.

## Tasks

### 1. Create placeholder page component
- Build a reusable `SettingsPlaceholder` component that accepts:
  - `title: string` — Section name
  - `description: string` — What this section will contain
  - `icon: LucideIcon` — Matching the sidebar icon
  - `features: string[]` — Bullet list of planned features
- Layout: Centered content with icon, title, description, feature list, and a muted "Coming Soon" badge

### 2. Create placeholder pages for each section

**`/settings/licenses`** — Licenses & CE Credits
- Description: "Manage your state licenses and track continuing education requirements."
- Features: Active license management, Expiration tracking & renewal alerts, CE credit progress, Certificate uploads

**`/settings/business`** — Business Information
- Description: "Configure your brokerage details and business entity information."
- Features: Brokerage profile, EIN/Tax ID, E&O insurance info, Carrier appointment tracking

**`/settings/integrations`** — Integrations
- Description: "Connect third-party tools and services to streamline your workflow."
- Features: CRM integrations (Salesforce, HubSpot), Compulife API connection, E-signature providers, Lead sources

**`/settings/billing`** — Billing & Subscription
- Description: "Manage your subscription plan, payment methods, and billing history."
- Features: Current plan details, Usage statistics, Payment method management, Invoice history

**`/settings/team`** — Team Management
- Description: "Invite team members and manage roles and permissions."
- Features: Team member invitations, Role-based access control, Activity logs, Shared lead pools

**`/settings/preferences`** — Preferences
- Description: "Customize your Ensurance experience."
- Features: Default quote parameters, Notification preferences, Display settings, Keyboard shortcuts

**`/settings/security`** — Security
- Description: "Protect your account with security settings."
- Features: Password management, Two-factor authentication, Session management, API key management

### 3. Consistent page structure
- Each page uses the `SettingsPageHeader` component from T4a (breadcrumb + title + subtitle)
- Below the header, the `SettingsPlaceholder` component
- Pages are minimal — no forms, no interactions, just informational

---

## Success Criteria

- [ ] All 7 placeholder pages render at their respective routes
- [ ] Each page shows relevant title, description, icon, and feature list
- [ ] "Coming Soon" badge is visible on each placeholder
- [ ] Navigation between all settings sections works smoothly
- [ ] Clicking through settings sidebar shows content for every item (no blank pages)
- [ ] Consistent visual style across all placeholder pages
- [ ] `npx tsc --noEmit` passes

## Dependencies

- T4a completed (settings layout with sidebar and routes exist)
- Lucide React icons (already installed)
- shadcn/ui Badge, Card (already installed)

## Guardrails

- Do NOT add any functional logic to placeholder pages
- Do NOT create database tables or API routes for these sections
- Do NOT over-design the placeholders — they should look intentionally "coming soon", not half-built
- Do NOT modify the commission or profile settings pages

## Failure Handling

- If any route conflicts with existing routes, check `app/settings/` for naming collisions
- If 7 placeholder pages feels like too many files, they can share a single dynamic route `app/settings/[section]/page.tsx` with a config object mapping section slugs to content
