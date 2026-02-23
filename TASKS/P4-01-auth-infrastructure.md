# Task: P4-01-auth-infrastructure

## Status
- [x] Pending
- [x] In Progress
- [x] Verified
- [x] Complete

## Pillars

- **Model**: sonnet
- **Tools**: Antigravity (Claude Code)
- **Human Checkpoint**: Confirm Supabase Auth email/password provider is enabled in dashboard before starting

## Description

Set up all foundational auth infrastructure in one task: Supabase Auth client helpers for server and browser, cookie-based session management using `@supabase/ssr`, Next.js middleware for route protection, auth context provider for client components, and the OAuth callback route. This is the plumbing that all other P4 tasks build on.

## Pre-requisites

Lukas must confirm these are done in Supabase Dashboard BEFORE this task runs:
- Authentication → Providers → Email/Password is ENABLED
- Authentication → URL Configuration → Site URL = `http://localhost:3000`
- Authentication → URL Configuration → Redirect URLs include:
  - `http://localhost:3000/auth/confirm`
  - `http://localhost:3000/auth/password/reset`

## Packages

`@supabase/ssr` should already be installed (v0.8.0 in package.json). If not: `bun add @supabase/ssr`

## Files to Create

### 1. `lib/supabase/auth-server.ts` (~50 lines)

Server-side Supabase client that reads/writes session cookies. Used in Server Components, API routes, and server actions.

```typescript
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

// Create a Supabase client that uses the user's session cookies
// This respects RLS — queries only return data the user is allowed to see
export async function createAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll can fail in Server Components (read-only cookies)
            // This is fine — the middleware handles cookie refreshing
          }
        },
      },
    }
  )
}

// Get current authenticated user or null (for optional auth checks)
export async function getCurrentUser() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Get current authenticated user or throw (for required auth in API routes/actions)
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  return user
}
```

### 2. `lib/supabase/auth-client.ts` (~15 lines)

Browser-side Supabase client for auth operations (sign in, sign up, sign out). Used in client components.

```typescript
import { createBrowserClient } from "@supabase/ssr"

export function createAuthBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 3. `middleware.ts` (~60 lines, PROJECT ROOT — not in app/)

Next.js middleware that runs on every request. Three jobs:
1. Refresh the Supabase session (keeps cookies alive so users stay logged in)
2. Redirect unauthenticated users to `/auth/login` when they try to access protected routes
3. Redirect authenticated users away from `/auth/*` pages to `/leads` (they're already logged in)

Route classification:
- **Public**: `/`, `/auth/*` (landing page + auth flows)
- **Protected**: `/leads/*`, `/quote/*`, `/settings/*` (require login)
- **API**: `/api/*` (have their own auth via auth-guard.ts — don't redirect, let them 401)
- **Static**: `/_next/*`, images, favicon (skip entirely)

```typescript
import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This refreshes the session and must be called
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isAuthPage = path.startsWith("/auth")
  const isPublicPage = path === "/"
  const isApiRoute = path.startsWith("/api")

  // Don't redirect API routes — they handle their own auth
  if (isApiRoute) return response

  // Redirect unauthenticated users to login
  if (!user && !isAuthPage && !isPublicPage) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("redirect", path)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/leads", request.url))
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

### 4. `components/auth/auth-provider.tsx` (~40 lines)

React context provider that makes the current user available to all client components via `useAuth()` hook. Listens for auth state changes (login, logout, token refresh).

```typescript
"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createAuthBrowserClient } from "@/lib/supabase/auth-client"
import type { User } from "@supabase/supabase-js"

interface AuthContextValue {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
})

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser: User | null
}) {
  const [user, setUser] = useState<User | null>(initialUser)
  const [loading, setLoading] = useState(!initialUser)

  useEffect(() => {
    const supabase = createAuthBrowserClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

### 5. `app/auth/callback/route.ts` (~20 lines)

Server-side route handler that Supabase redirects to after email confirmation. Exchanges the temporary code from the email link for a real session, then redirects to the app.

```typescript
import { createAuthClient } from "@/lib/supabase/auth-server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const redirect = searchParams.get("redirect") || "/leads"

  if (code) {
    const supabase = await createAuthClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(redirect, request.url))
}
```

## Files to Modify

### 6. `app/layout.tsx`

Wrap the app in AuthProvider so all client components can access the current user:
- Import `getCurrentUser` from auth-server.ts
- Import `AuthProvider` from auth-provider.tsx
- In the root layout (server component), call `const user = await getCurrentUser()`
- Wrap `{children}` in `<AuthProvider initialUser={user}>`
- Keep all existing providers/wrappers (Sonner, CallNotificationHandler, etc.)

### 7. `lib/middleware/auth-guard.ts`

Update the existing shared-secret auth guard to ALSO accept Supabase session cookies:
- Current logic: check `X-API-Secret` header → allow if matches
- New logic: check `X-API-Secret` header → allow if matches. Otherwise, check Supabase session from cookies → allow if valid user. Otherwise, return 401.
- Import `createAuthClient` and check `supabase.auth.getUser()` from the request cookies
- This means the browser (with session cookies) can call APIs without needing the shared secret header
- The shared secret still works for server-to-server calls and development

**Important**: The auth-guard function receives a `Request` object, not `cookies()` from next/headers. To read cookies from Request in API routes, use `request.headers.get("cookie")` and pass to createServerClient manually, OR restructure to use `cookies()` from next/headers (which works in route handlers).

## What This Task Does NOT Do

- Does NOT wire up the login/register forms (that's P4-02)
- Does NOT replace DEV_AGENT_ID (that's P4-03)
- Does NOT create RLS policies (that's P4-03)
- Does NOT migrate commission settings (that's P4-04)

After this task, the infrastructure is ready but the auth pages are still non-functional UI shells. The middleware will redirect to login, but you can't actually log in yet until P4-02.

## Testing After Completion

To verify it works without the auth pages wired:
1. Visit `/leads` → should redirect to `/auth/login` (middleware working)
2. Visit `/auth/login` → should show the login form (public route)
3. Visit `/` → should show landing page (public route)
4. Check browser console for any auth provider errors
5. `bunx tsc --noEmit` passes clean

## Success Criteria
1. `bunx tsc --noEmit` passes clean
2. `middleware.ts` exists in project root and runs
3. `/leads` redirects to `/auth/login` for unauthenticated users
4. `/auth/login` is accessible without login
5. `/` (landing page) is accessible without login
6. AuthProvider wraps the app in root layout
7. `useAuth()` hook is exported and usable
8. `getCurrentUser()` and `requireUser()` work in server contexts
9. Auth guard accepts both shared secret AND session cookies
10. No existing functionality broken (landing page, auth page UI still renders)

## On Completion
- Update CLAUDE.md with new auth files and middleware
- Commit: `feat: add Supabase Auth infrastructure (helpers, middleware, provider, callback)`
