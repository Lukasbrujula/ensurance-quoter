# CK-05: Update Navigation + All useAuth() References

**Priority:** High — UI won't show user info without this
**Estimate:** 15 min
**Model:** Sonnet

---

## 1. Tools

- Codebase with CK-01 complete (minimum)
- Terminal: `grep`, `npx tsc --noEmit`

## 2. Guardrails

- ❌ Do NOT modify `components/ui/` or `styles/globals.css`
- ❌ Do NOT change any business logic — only auth hook references
- ❌ Do NOT remove the user's name/email display — use Clerk's `useUser()` to get the same data
- ❌ Do NOT restructure the navigation layout — only swap the auth data source

## 3. Knowledge

- Clerk provides:
  - `useUser()` — for user profile data (name, email, avatar, id). Returns `{ user, isLoaded }`.
  - `useAuth()` — for auth state (isSignedIn, userId, signOut). Returns `{ isSignedIn, userId, isLoaded }`.
  - `<UserButton/>` — drop-in component that replaces your custom dropdown. Shows avatar, profile management, sign out, active device management.
- The old `useAuth()` from `components/auth/auth-provider.tsx` returned `{ user, loading }`.
- Clerk's user object shape differs from Supabase's:
  - `user.email` → `user.emailAddresses[0]?.emailAddress`
  - `user.id` → `user.id` (same property name, but now a string not UUID)
  - `user.user_metadata?.full_name` → `user.fullName` or `user.firstName` + `user.lastName`

## 4. Memory

- `top-nav.tsx` shows user initials/email from `useAuth()` + dropdown with Settings + Sign Out
- `intake-form.tsx` shows agent card with real user name from auth context
- Any component importing `useAuth` from `components/auth/auth-provider` needs updating
- The AuthProvider was deleted in CK-02, so any remaining `useAuth` imports are broken

## 5. Success Criteria

1. ✅ `top-nav.tsx` uses `<UserButton/>` from `@clerk/nextjs` instead of custom dropdown
2. ✅ All `useAuth()` imports point to `@clerk/nextjs`, not the old auth-provider
3. ✅ Agent card in `intake-form.tsx` shows name from Clerk's `useUser()`
4. ✅ Sign out works correctly via Clerk's UserButton
5. ✅ No remaining imports from `components/auth/` anywhere in codebase
6. ✅ `npx tsc --noEmit` passes

## 6. Dependencies

- CK-01 (ClerkProvider wrapping app)
- CK-02 (old auth components deleted — imports are currently broken)

**Files to find and update:**
```bash
grep -rn 'useAuth\|from.*auth-provider' --include='*.ts' --include='*.tsx' components/ app/
grep -rn 'user\.email\|user\.id\|user\.user_metadata' --include='*.tsx' components/
```

## 7. Failure Handling

| Error | Cause | Solution |
|-------|-------|---------|
| `user.name` is undefined | Clerk user object structure differs | Use `user.firstName` + `user.lastName` or `user.fullName` |
| `<UserButton/>` not rendering | Not inside ClerkProvider | Verify ClerkProvider wraps entire app in layout.tsx |
| `useUser()` returns `{ user: null }` | User not signed in | Wrap in `isLoaded` check before accessing `user` |
| Email is undefined | Clerk stores emails differently | Use `user.emailAddresses[0]?.emailAddress` |

## 8. Learning

- Document the Clerk user object properties actually used (for reference in future components)
- Note if `<UserButton/>` needs `afterSignOutUrl` prop to redirect properly
- Log if any component relied on Supabase-specific user metadata fields

---

## 9. Step-by-Step Instructions

### Step 1: Find all files that need updating

```bash
grep -rn 'useAuth\|from.*auth-provider\|user\.email\b' --include='*.tsx' --include='*.ts' components/ app/
```

### Step 2: Update `top-nav.tsx`

Replace the custom user dropdown with Clerk's `<UserButton/>`:

```typescript
// Add import:
import { UserButton } from "@clerk/nextjs"

// Replace the entire custom dropdown menu (Avatar + DropdownMenu + Settings + Sign Out) with:
<UserButton afterSignOutUrl="/" />
```

If the nav also displays the user's name or email as text, use:

```typescript
import { useUser } from "@clerk/nextjs"

const { user, isLoaded } = useUser()
// user?.fullName or user?.firstName
// user?.emailAddresses[0]?.emailAddress
```

### Step 3: Update `intake-form.tsx` (agent card)

Replace the Supabase auth user data with Clerk:

```typescript
// BEFORE:
import { useAuth } from "@/components/auth/auth-provider"
const { user } = useAuth()
// user?.email, user?.user_metadata?.full_name

// AFTER:
import { useUser } from "@clerk/nextjs"
const { user } = useUser()
// user?.fullName
// user?.emailAddresses[0]?.emailAddress
```

### Step 4: Update any other files found in Step 1

Apply the same pattern: replace `useAuth` from auth-provider with `useUser` or `useAuth` from `@clerk/nextjs`.

```typescript
// Old pattern:
import { useAuth } from "@/components/auth/auth-provider"
const { user, loading } = useAuth()

// New pattern:
import { useUser } from "@clerk/nextjs"
const { user, isLoaded } = useUser()
// Note: loading → !isLoaded (inverted boolean)
```

### Step 5: Verify no old imports remain

```bash
grep -rn 'auth-provider\|components/auth' --include='*.ts' --include='*.tsx' .
# Should return zero results
```

### Step 6: Build check

```bash
npx tsc --noEmit
bun run dev
```

---

**Next task:** CK-06
