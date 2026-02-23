# T4b: Profile Settings Page

**Priority:** Medium — highest-value settings page after commissions  
**Estimate:** 1 hr  
**Phase:** 5 (UI Polish)  
**Depends on:** T4a (Settings Layout & Sidebar)

---

## Context

The Figma designs show a Profile Settings page with two card sections: Personal Information and Professional Information. This is the first page agents see in settings and establishes their identity in the platform. Some fields can be wired to Supabase user metadata now; others will be placeholder until we build the full profile backend.

## Tasks

### 1. Personal Information card
- **Profile Photo** — Circular avatar with "Change Photo" button and "Remove" link
  - For now: show the user's initials (already available from auth context) as fallback
  - Photo upload can be a placeholder button that shows a toast "Photo upload coming soon"
- **Full Name** — Text input, pre-filled from Supabase `user_metadata.full_name` if available
- **Email Address** — Text input, pre-filled from Supabase auth email (read-only or with change flow)
- **Phone Number** — Text input with phone formatting
- **Licensed State** — Select dropdown with US states (reuse the state list from the quote intake form)

### 2. Professional Information card
- **Brokerage Name** — Text input
- **License Number (NPN)** — Text input (collected during registration — should be pre-filled)
- **Years of Experience** — Select dropdown (ranges: "0-2 Years", "3-5 Years", "6-10 Years", "10+ Years")
- **Specializations** — Checkbox group: Term Life, Whole Life, Universal Life, Final Expense, Annuities

### 3. Form behavior
- Use React Hook Form + Zod validation (matches existing patterns)
- "Save Changes" button at bottom right, "Cancel" button to revert
- Debounced auto-save OR manual save — match the commission settings pattern for consistency
- Loading skeleton while fetching existing profile data
- Success toast on save ("Profile updated")
- Wire save to Supabase `user_metadata` update for fields that map (name, phone)
- For fields without a backend destination yet (brokerage, experience, specializations), save to `agent_settings` jsonb column or a new profile jsonb field

### 4. Layout matching Figma
- Two card sections stacked vertically with gap
- Cards use `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` from shadcn/ui
- Form fields in 2-column grid on desktop (`grid-cols-2`), single column on mobile
- Photo section is a special layout row within the first card

---

## Success Criteria

- [ ] `/settings/profile` renders with Personal Information and Professional Information cards
- [ ] Name and email pre-fill from Supabase auth context
- [ ] License number pre-fills if available from registration
- [ ] All form fields validate (email format, required fields, phone format)
- [ ] Save button persists data (to Supabase user_metadata or agent_settings)
- [ ] Cancel button reverts unsaved changes
- [ ] Loading skeleton shows while data loads
- [ ] Success/error toasts on save
- [ ] Responsive: 2-column fields on desktop, 1-column on mobile
- [ ] `npx tsc --noEmit` passes

## Dependencies

- T4a completed (settings layout with sidebar exists)
- `lib/supabase/auth-server.ts` — `getCurrentUser()` for pre-filling fields
- `lib/supabase/settings.ts` — May need to extend `agent_settings` for profile data
- `components/auth/auth-provider.tsx` — `useAuth()` for client-side user data
- React Hook Form + Zod (already installed)
- shadcn/ui Card, Input, Select, Checkbox, Button, Skeleton (all installed)

## Guardrails

- Do NOT modify the auth registration flow to collect more fields at signup
- Do NOT create a separate `profiles` table — extend `agent_settings` or use Supabase `user_metadata`
- Do NOT make the email field editable without a proper email change flow (keep read-only for now)
- Do NOT upload actual photos — just the UI placeholder with "coming soon" toast

## Failure Handling

- If Supabase `user_metadata` update fails, show error toast and keep form in dirty state
- If `agent_settings` table doesn't have a profile jsonb column, store profile fields as top-level columns or create a migration
- If the NPN field from registration isn't stored in user_metadata, check what data the register form actually saves and pull from there
