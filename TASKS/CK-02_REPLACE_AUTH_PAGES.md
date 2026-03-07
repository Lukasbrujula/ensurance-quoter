# CK-02: Replace Auth Pages + Delete Old Auth Components

**Priority:** High — removes dead code that would cause confusion
**Estimate:** 15 min
**Model:** Sonnet

---

## 1. Tools

- Codebase with CK-01 complete
- Terminal: `find`, `rm`, `grep`, `npx tsc --noEmit`

## 2. Guardrails

- ❌ Do NOT delete `lib/supabase/auth-server.ts` or `auth-client.ts` yet — CK-06 handles that
- ❌ Do NOT modify API routes — CK-04 handles that
- ❌ Do NOT modify the Supabase client/data layer files — CK-06 handles that
- ❌ Do NOT customize Clerk component styling yet — get it working first, style later
- ❌ Do NOT delete any non-auth pages or routes

## 3. Knowledge

- Clerk's `<SignIn/>` and `<SignUp/>` components are fully self-contained. They handle: email/password input, validation, error messages, email verification, password reset, social login buttons, loading states, and redirect after success.
- All the logic in your 6 custom auth components is built into these two Clerk components.
- Clerk handles email verification internally — no separate `/auth/confirm` page needed.
- Password reset is built into Clerk's `<SignIn/>` component — no separate `/auth/password` pages needed.
- The `/auth/callback` route is unnecessary — Clerk manages OAuth/email callbacks itself.

## 4. Memory

- 6 auth components exist in `components/auth/`: LoginForm, RegisterForm, CheckEmailForm, PasswordResetForm, SetPasswordForm, AuthProvider
- 5 auth pages: `/auth/login`, `/auth/register`, `/auth/confirm`, `/auth/password`, `/auth/password/reset`
- 1 auth server route: `/auth/callback/route.ts`
- AuthProvider was already replaced by ClerkProvider in CK-01
- **The register page currently collects license number + agent name** — Clerk's sign-up only collects email + password + name. License number needs to move to a post-signup onboarding page (future task, not this one).

## 5. Success Criteria

1. ✅ `/auth/login` renders Clerk's `<SignIn/>` component
2. ✅ `/auth/register` renders Clerk's `<SignUp/>` component
3. ✅ `app/auth/confirm/` directory deleted
4. ✅ `app/auth/password/` directory deleted (both pages)
5. ✅ `app/auth/callback/` directory deleted
6. ✅ `components/auth/` directory deleted (all 6 files)
7. ✅ No remaining imports of old auth components anywhere in codebase
8. ✅ `npx tsc --noEmit` passes (errors from `auth-server`/`auth-client` imports in OTHER files are expected — those get fixed in CK-04/CK-06)

## 6. Dependencies

- CK-01 complete (ClerkProvider + middleware in place)

**Files to read before starting:**
```bash
cat app/auth/login/page.tsx
cat app/auth/register/page.tsx
ls -la app/auth/
ls -la components/auth/
grep -rn 'components/auth' --include='*.ts' --include='*.tsx' app/ components/ lib/
```

## 7. Failure Handling

| Error | Cause | Solution |
|-------|-------|---------|
| `<SignIn/>` renders blank | Publishable key not loaded | Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env.local` |
| Import errors after deletion | Something still imports old auth components | Run `grep -rn 'components/auth' .` to find remaining refs |
| `useAuth()` errors in other components | Other components use the old hook | CK-05 fixes these. Note them but don't fix now. |
| Build error from deleted AuthProvider | layout.tsx still imports it | Should have been replaced in CK-01. Verify layout.tsx uses ClerkProvider. |

## 8. Learning

- Document which files had imports of the old auth components (list them for CK-05)
- Note if any auth pages had custom logic beyond standard auth (e.g., license number field in register → log as follow-up for onboarding page)
- Record if register page had Zod schemas that should be preserved for the future onboarding page

---

## 9. Step-by-Step Instructions

### Step 1: Replace login page

Rewrite `app/auth/login/page.tsx`:

```typescript
import { SignIn } from "@clerk/nextjs"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignIn />
    </div>
  )
}
```

### Step 2: Replace register page

Rewrite `app/auth/register/page.tsx`:

```typescript
import { SignUp } from "@clerk/nextjs"

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignUp />
    </div>
  )
}
```

### Step 3: Delete pages that Clerk replaces

```bash
rm -rf app/auth/confirm/
rm -rf app/auth/password/
rm -rf app/auth/callback/
```

### Step 4: Delete old auth components

```bash
rm -rf components/auth/
```

### Step 5: Find and clean remaining imports

```bash
grep -rn 'components/auth' --include='*.ts' --include='*.tsx' app/ components/ lib/
grep -rn 'auth-provider' --include='*.ts' --include='*.tsx' app/ components/
# Remove any dead imports found
```

### Step 6: Verify

```bash
npx tsc --noEmit
bun run dev
# Visit /auth/login → Clerk sign-in form renders
# Visit /auth/register → Clerk sign-up form renders
```

---

**Next task:** CK-03
