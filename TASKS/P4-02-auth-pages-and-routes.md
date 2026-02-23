# Task: P4-02-auth-pages-and-routes

## Status
- [ ] Pending
- [ ] In Progress
- [ ] Verified
- [ ] Complete

## Pillars

- **Model**: sonnet
- **Tools**: Antigravity (Claude Code)
- **Human Checkpoint**: Test full login/register/sign-out flow manually

## Depends On
- P4-01 (auth infrastructure) must be complete and committed

## Description

Wire the existing auth page UI to real Supabase Auth AND update protected routes to show real user info. This is one task because both sides consume P4-01's auth helpers and together they complete the "can I log in and see my name" experience.

**Part A**: Connect login, register, password reset, and email confirm forms to Supabase Auth.
**Part B**: Show real user info in TopNav, add sign out, update agent card in intake form.

## Part A: Wire Auth Pages

### Files to Modify

#### 1. `components/auth/login-form.tsx`
- Import `createAuthBrowserClient` from `lib/supabase/auth-client`
- Import `useRouter` from `next/navigation`
- In the form's onSubmit handler:
  ```typescript
  const supabase = createAuthBrowserClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) { /* show error in form */ }
  else { router.push("/leads"); router.refresh() }
  ```
- Add loading state to submit button (disabled + spinner while signing in)
- Display error messages inline below the form (use existing form error UI patterns)
- Read `redirect` query param: if present, redirect there instead of `/leads`
- Ensure "Forgot password?" link exists, pointing to `/auth/password`
- Ensure "Create account" link exists, pointing to `/auth/register`

#### Error mapping for login:
| Supabase error message (contains) | Show to user |
|---|---|
| "Invalid login credentials" | "Invalid email or password." |
| "Email not confirmed" | "Please check your email to confirm your account." |
| Any other | "Something went wrong. Please try again." |

#### 2. `components/auth/register-form.tsx`
- On submit:
  ```typescript
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: { first_name: firstName, last_name: lastName }
    }
  })
  ```
- On success: redirect to `/auth/confirm?email={email}`
- On error: show inline error message

#### Error mapping for register:
| Supabase error message (contains) | Show to user |
|---|---|
| "User already registered" | "An account with this email already exists." |
| "Password should be at least" | "Password must be at least 6 characters." |
| Any other | "Something went wrong. Please try again." |

#### 3. `components/auth/password-reset-form.tsx`
- On submit:
  ```typescript
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/password/reset`
  })
  ```
- On success: redirect to `/auth/confirm?email={email}&type=recovery`
- On error: show inline error

#### 4. `components/auth/set-password-form.tsx` (at `/auth/password/reset`)
- This page loads when user clicks the password reset link in their email
- Supabase automatically exchanges the token via the URL hash
- On submit:
  ```typescript
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (!error) router.push("/leads")
  ```
- On error: show inline error (token expired, weak password)

#### 5. `components/auth/check-email-card.tsx`
- Read `email` and `type` from URL search params
- Display: "We sent a confirmation email to {email}"
- If type=recovery: "We sent a password reset link to {email}"
- Add "Resend email" button:
  ```typescript
  await supabase.auth.resend({ type: 'signup', email })
  ```
- Add "Back to login" link

#### 6. `app/auth/confirm/page.tsx`
- Read search params and pass to CheckEmailCard
- If there's a `code` or auth hash in the URL (user clicked the confirmation link directly), handle the exchange and redirect to `/leads`

## Part B: Protected Routes & User Info

### Files to Modify

#### 7. `components/navigation/top-nav.tsx`
- Import `useAuth` from `components/auth/auth-provider`
- Import `createAuthBrowserClient` and `useRouter`
- Replace hardcoded "MV" avatar with user's initials derived from:
  - `user.user_metadata.first_name` + `user.user_metadata.last_name` first letters
  - Fallback: first two letters of `user.email`
- Replace hardcoded agent name with user's full name or email
- Add dropdown menu (use shadcn DropdownMenu) on avatar click:
  - User's email (display, muted text)
  - "Settings" link → `/settings`
  - Separator
  - "Sign out" button → calls `supabase.auth.signOut()` then `router.push("/auth/login"); router.refresh()`

#### 8. `components/quote/intake-form.tsx`
- Find the agent card section (currently shows hardcoded demo agent)
- Replace with real user data from `useAuth()`:
  - Name from `user.user_metadata.first_name` + `last_name`
  - Email from `user.email`
  - Fallback gracefully if metadata is missing

## UI Rules
- Do NOT redesign any auth page — the existing designs are from Figma and look correct
- Only add: loading spinners on buttons, inline error messages, functional links between pages
- Sign out dropdown should be minimal and clean — not a full profile menu
- Use existing shadcn components (Button, DropdownMenu, Avatar) for consistency

## Auth Flow Summary After This Task

```
Register:
  Fill form → signUp() → redirect /auth/confirm → check email → click link → /auth/callback → /leads

Login:
  Fill form → signInWithPassword() → redirect /leads

Forgot Password:
  Fill email → resetPasswordForEmail() → redirect /auth/confirm → check email → click link → /auth/password/reset → updateUser() → /leads

Sign Out:
  Click avatar → Sign out → signOut() → redirect /auth/login
```

## Development Note: Email Delivery

In development, Supabase uses its built-in email service. Confirmation/reset emails appear in:
- Supabase Dashboard → Authentication → Users (click the user to see confirmation link)
- OR Supabase logs

For production, configure a real SMTP provider (Resend, SendGrid) in Supabase Dashboard → Authentication → SMTP Settings.

## Success Criteria
1. `bunx tsc --noEmit` passes clean
2. Can register a new account → confirmation email appears in Supabase dashboard
3. Can confirm email via the link → redirected to /leads
4. Can log in with confirmed account → see leads page
5. Can reset password via email flow
6. TopNav shows real user initials and email
7. Sign out works → redirected to login page
8. Error messages display correctly for invalid inputs
9. Loading states on all auth form buttons
10. Existing app functionality unbroken (leads, quotes, calls all still work)

## On Completion
- Update CLAUDE.md with auth callback route
- Commit: `feat: wire auth pages to Supabase Auth + user info in navigation`
