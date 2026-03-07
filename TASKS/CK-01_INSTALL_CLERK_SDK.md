# CK-01: Install Clerk SDK + ClerkProvider + Middleware

**Priority:** Critical — foundation for all other tasks
**Estimate:** 20 min
**Model:** Sonnet

---

## 1. Tools

- Codebase on `feature/lukas` branch
- Bun package manager
- `.env.local` with Clerk keys already added (Lukas prereq)
- Terminal: `bun add`, `npx tsc --noEmit`, `bun run dev`

## 2. Guardrails

- ❌ Do NOT modify `components/ui/` or `styles/globals.css`
- ❌ Do NOT delete any auth files yet — CK-02 handles that
- ❌ Do NOT touch any API routes — CK-04 handles that
- ❌ Do NOT modify Supabase client files — CK-03 and CK-06 handle that
- ❌ Do NOT remove the existing AuthProvider import until ClerkProvider is confirmed working
- ❌ Do NOT install any package other than `@clerk/nextjs`

## 3. Knowledge

- Clerk's Next.js SDK (`@clerk/nextjs`) provides:
  - `ClerkProvider` — React context wrapper (replaces our custom AuthProvider)
  - `clerkMiddleware` — route protection middleware (replaces our Supabase session middleware)
  - `auth()` — server-side helper to get current user
  - `useUser()` / `useAuth()` — client-side hooks
  - `<SignIn/>`, `<SignUp/>`, `<UserButton/>` — pre-built UI components
- `ClerkProvider` wraps the app in `layout.tsx`, same position as the current `AuthProvider`
- The middleware uses `createRouteMatcher` to define which routes are public (no auth required)
- Clerk's middleware matcher pattern excludes static files and `_next` paths automatically

## 4. Memory

- Phase 4 built Supabase Auth with middleware at root `middleware.ts`
- Current middleware refreshes Supabase session cookies + redirects unauthenticated users to `/auth/login`
- Public routes: `/`, `/auth/*`
- Protected routes: `/leads/*`, `/quote/*`, `/settings/*`, `/agents/*`
- API routes use `auth-guard.ts` which checks shared secret OR Supabase session cookies
- Telnyx webhook routes (`/api/telnyx/*`, `/api/ai-agent/*`) must remain public — they use shared secret auth, not user sessions

## 5. Success Criteria

1. ✅ `bun add @clerk/nextjs` completes without errors
2. ✅ `.env.local` contains all 6 Clerk env vars:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/register`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/leads`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/leads`
3. ✅ `app/layout.tsx` wraps children in `<ClerkProvider>`
4. ✅ `middleware.ts` uses `clerkMiddleware()` with correct public route matchers
5. ✅ `npx tsc --noEmit` passes (warnings from old auth imports are expected and OK)
6. ✅ `bun run dev` starts without crashes
7. ✅ Visiting `/` (landing page) loads normally without redirect
8. ✅ Visiting `/leads` redirects to Clerk's sign-in page

## 6. Dependencies

**Prereqs (Lukas manual):**
- Clerk account created with "Ensurance" application
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` added to `.env.local`

**Files to read before starting:**
```bash
cat middleware.ts
cat app/layout.tsx
cat components/auth/auth-provider.tsx
```

## 7. Failure Handling

| Error | Cause | Solution |
|-------|-------|---------|
| `Missing publishable key` | Env var not set or wrong name | Must be `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (not `CLERK_PUBLISHABLE_KEY`) |
| Infinite redirect loop | Public routes not matched | Verify `createRouteMatcher` includes `/` and `/auth/(.*)` |
| ClerkProvider error on render | Provider wrapping order wrong | ClerkProvider must be the outermost provider in layout.tsx |
| Type errors on old auth imports | Expected — old code still references Supabase auth | These get resolved in CK-02 through CK-06. Ignore for now. |
| `Module not found: @clerk/nextjs` | Install failed | Run `bun add @clerk/nextjs` again, check bun.lockb |

## 8. Learning

- Log the exact Clerk SDK version installed (for future reference in CODEBASE_AUDIT.md)
- Note if middleware matcher pattern needed adjustment for any custom routes
- Document if any providers had ordering conflicts with ClerkProvider

---

## 9. Step-by-Step Instructions

### Step 1: Install the SDK

```bash
bun add @clerk/nextjs
```

### Step 2: Verify environment variables exist in `.env.local`

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/leads
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/leads
```

If they don't exist, add them (Lukas should have provided the keys).

### Step 3: Update `app/layout.tsx`

Replace the AuthProvider wrapping with ClerkProvider. Keep all other providers (Sonner, CallNotificationHandler, etc.) intact.

```typescript
// Add import at top:
import { ClerkProvider } from "@clerk/nextjs"

// Replace:
//   <AuthProvider initialUser={user}>{children}</AuthProvider>
// With:
//   <ClerkProvider>{children}</ClerkProvider>

// Remove the getCurrentUser() server call if it exists
// ClerkProvider does not need an initial user prop
```

### Step 4: Replace `middleware.ts`

Replace the ENTIRE contents of root `middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isPublicRoute = createRouteMatcher([
  "/",                    // Landing page
  "/auth/(.*)",           // Auth pages
  "/api/telnyx/(.*)",     // Telnyx webhooks (no user session)
  "/api/ai-agent/(.*)",   // AI agent webhooks
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)","/" , "/(api|trpc)(.*)"],
}
```

### Step 5: Verify

```bash
npx tsc --noEmit    # May have warnings from old auth imports — OK
bun run dev          # Should start without crashes
# Visit http://localhost:3000 → landing page loads
# Visit http://localhost:3000/leads → redirects to Clerk sign-in
```

---

**Next task:** CK-02
