# T4a: Settings Layout & Sidebar Navigation

**Priority:** Medium — transforms flat commission page into a proper settings hub  
**Estimate:** 1.5 hrs  
**Phase:** 5 (UI Polish)

---

## Context

The current `/settings` page is a single flat page showing only Commission Settings. The Figma designs show a full settings hub with left sidebar navigation containing 8 sections: Profile, Licenses, Business Info, Integrations, Billing, Team, Preferences, Security. The commission settings need to become one section within this larger layout.

## Tasks

### 1. Create settings layout with sidebar
- Create `app/settings/layout.tsx` — a shared layout for all settings pages
- Left sidebar (desktop: ~220px fixed width, mobile: horizontal tabs or collapsible):
  - **Profile** — `/settings/profile` (icon: `User`)
  - **Licenses** — `/settings/licenses` (icon: `Award`)
  - **Business Info** — `/settings/business` (icon: `Building2`)
  - **Integrations** — `/settings/integrations` (icon: `Plug`)
  - **Billing** — `/settings/billing` (icon: `CreditCard`)
  - **Team** — `/settings/team` (icon: `Users`)
  - **Preferences** — `/settings/preferences` (icon: `Settings`)
  - **Security** — `/settings/security` (icon: `Shield`)
  - **Commissions** — `/settings/commissions` (icon: `DollarSign`)
- Active nav item highlighted (match Figma: blue text + blue left border or blue background)
- Sidebar should use `Link` from `next/link` with `usePathname()` for active state

### 2. Migrate commission settings to sub-route
- Move current `/settings/page.tsx` content to `app/settings/commissions/page.tsx`
- Update the default `/settings` route to redirect to `/settings/profile` (the first section)
- Ensure commission settings still work identically after the move (Supabase save, load, reset)

### 3. Page header pattern
- Each settings sub-page should have a consistent header:
  - Breadcrumb: `Settings > [Section Name]`
  - H1 title (e.g., "Commission Settings", "Profile Settings")
  - Subtitle description
- Create a reusable `SettingsPageHeader` component

### 4. Mobile layout
- On mobile (< 768px), sidebar becomes horizontal scrollable tabs at the top
- Content fills full width below
- Use `md:` breakpoint to switch between layouts

---

## Success Criteria

- [ ] `/settings` redirects to `/settings/profile`
- [ ] Left sidebar shows all 8 sections with icons and labels
- [ ] Active section is visually highlighted in sidebar
- [ ] `/settings/commissions` shows the existing commission settings, fully functional
- [ ] Breadcrumb shows correct hierarchy on each page
- [ ] Sidebar is responsive — horizontal tabs on mobile, vertical sidebar on desktop
- [ ] Navigation between settings sections works without full page reload
- [ ] `npx tsc --noEmit` passes
- [ ] No changes to commission settings functionality (save, load, reset all work)

## Dependencies

- `app/settings/page.tsx` — Current commission settings (will be moved)
- `components/settings/commission-settings.tsx` — Commission UI component
- `components/settings/carrier-commission-table.tsx` — Per-carrier table component
- `stores/commission-store.ts` — Zustand store for commission data
- Lucide React icons (already installed)

## Guardrails

- Do NOT modify commission settings logic or Supabase integration
- Do NOT create actual content for placeholder pages yet (that's T4b and T4c)
- Do NOT change the URL for commission settings API (`/api/settings` — still works)
- Do NOT modify the top navigation component — settings sidebar is WITHIN the settings section only
- Keep all existing route protection (middleware should already cover `/settings/*`)

## Failure Handling

- If `app/settings/layout.tsx` conflicts with the root layout, ensure it's a nested layout (not replacing)
- If commission settings break after moving to sub-route, check that the Zustand store initialization and API calls don't depend on the exact route path
- If middleware route protection doesn't cover `/settings/*` wildcard, verify the matcher pattern
