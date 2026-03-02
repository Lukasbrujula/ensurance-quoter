# Task: 09-deploy-compulife-proxy

## Status
- [x] Pending
- [ ] In Progress
- [ ] Verified
- [ ] Complete

## Pillars

### 1. Model
opus

### 2. Tools Required
- [x] Bash: `git`, `openssl`, `curl`
- [x] Read (verify files exist)
- [ ] Edit, Write (no code changes needed)
- [ ] WebFetch
- [ ] Task

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify any code in the main ensurance-quoter project
- [ ] Do NOT commit the PROXY_SECRET value to any file — env vars only
- [ ] Do NOT run the first Compulife request until static IP is confirmed (it locks permanently)

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `compulife-proxy/` directory (verify it exists and has all required files)
- [ ] Specific files: `lib/engine/compulife-provider.ts` (verify proxy mode is implemented)

### 5. Memory
- [x] N/A

### 6. Success Criteria
- [ ] `compulife-proxy` exists as a separate GitHub repo with all proxy files pushed
- [ ] Proxy is deployed and running on Railway (health check passes)
- [ ] Static outbound IP is enabled on Railway
- [ ] PROXY_SECRET generated and stored securely
- [ ] Vercel env vars set: COMPULIFE_PROXY_URL, COMPULIFE_PROXY_SECRET
- [ ] Verification: `curl https://<railway-url>/health` returns `{"status":"ok"}`
- [ ] Verification: Vercel redeploy triggers and completes successfully

### 7. Dependencies
- [x] Task 01 complete (proxy code exists in compulife-proxy/)
- [x] Task 02 complete (provider supports proxy routing)
- [ ] GitHub account with repo creation access
- [ ] Railway account (will be created if needed)
- [ ] Vercel project access

### 8. Failure Handling
**Max attempts:** 2

**On failure (per attempt):**
- [ ] If git push fails: check SSH keys or use HTTPS remote
- [ ] If Railway deploy fails: check Dockerfile, check build logs

**After max attempts exhausted:**
- [ ] Save error details and STOP — infrastructure issues need human debugging

**Rollback command:** N/A (infrastructure, not code)

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] Railway deployment quirks with Hono/TypeScript
- [ ] Static IP provisioning delays

---

## Human Checkpoint
- [x] **REQUIRED** — multiple steps need human action (GitHub repo creation, Railway dashboard, Vercel dashboard)

---

## Description
Deploy the compulife-proxy service to Railway with a static outbound IP, then configure the main Vercel app to route Compulife API calls through it. This is an infrastructure task with CLI steps and dashboard actions.

## Step 1: Verify proxy code exists

```bash
ls -la compulife-proxy/
# Should see: src/server.ts, Dockerfile, package.json, tsconfig.json, .env.example, .gitignore
```

If files are missing, STOP — go back to Task 01.

## Step 2: Generate a strong PROXY_SECRET

```bash
openssl rand -hex 32
```

**SAVE THIS VALUE** — you'll need it twice (Railway + Vercel). Don't commit it anywhere.

## Step 3: Initialize separate git repo for proxy

```bash
cd compulife-proxy
git init
git add -A
git commit -m "init: Compulife API proxy for static IP routing"
```

## Step 4: HUMAN ACTION — Create GitHub repo

Go to github.com → New Repository:
- Name: `compulife-proxy`
- Visibility: **Private**
- Do NOT initialize with README (we already have files)
- Create repository

Copy the SSH or HTTPS URL.

## Step 5: Push to GitHub

```bash
# Replace with your actual repo URL
git remote add origin git@github.com:YOUR_USERNAME/compulife-proxy.git
git branch -M main
git push -u origin main
cd ..
```

## Step 6: HUMAN ACTION — Deploy on Railway

1. Go to [railway.app](https://railway.app)
2. Sign up / log in with GitHub
3. **New Project** → **Deploy from GitHub Repo**
4. Select `compulife-proxy` repository
5. Railway auto-detects the Dockerfile and starts building

## Step 7: HUMAN ACTION — Configure Railway env vars

In Railway dashboard → your service → **Variables** tab:

```
COMPULIFE_AUTH_ID=<your Compulife authorization ID — same one used in local .env>
PROXY_SECRET=<the value from Step 2>
PORT=3001
```

Click **Deploy** (or it may auto-redeploy after adding vars).

## Step 8: HUMAN ACTION — Enable Static Outbound IP

In Railway dashboard → your service → **Settings** tab → **Networking**:
- Enable **Static Outbound IP**
- This requires Railway Pro plan ($5/month)
- Note the static IP — this is what Compulife will lock to

**⚠️ IMPORTANT:** The first real Compulife API request through this proxy permanently locks your Compulife auth ID to this IP. Make sure the static IP is confirmed before testing.

## Step 9: Verify proxy is running

```bash
# Replace with your actual Railway URL
curl https://compulife-proxy-production.up.railway.app/health
```

Expected response: `{"status":"ok","timestamp":"2026-03-..."}`

If this works, the proxy is live.

## Step 10: HUMAN ACTION — Add env vars to Vercel

Go to Vercel dashboard → your project → **Settings** → **Environment Variables**:

```
COMPULIFE_PROXY_URL=https://compulife-proxy-production.up.railway.app
COMPULIFE_PROXY_SECRET=<the value from Step 2>
```

Add to **Production** and **Preview** environments.

## Step 11: Trigger Vercel redeploy

```bash
# From the main ensurance-quoter directory
git commit --allow-empty -m "trigger: redeploy with Compulife proxy env vars"
git push origin feature/lukas
```

Or click **Redeploy** in Vercel dashboard.

## Step 12: Verify end-to-end

Once Vercel redeploy completes:
1. Open the deployed app
2. Fill out a quote (30M, Texas, non-smoker, $500K, 20yr)
3. Check that real Compulife pricing appears (not mock estimates)
4. Check Vercel function logs — should see `[Compulife] Using proxy: https://...`
5. Check Railway logs — should see `[timestamp] Compulife 200 XXXms`

## On Completion
- **Commit:** No code changes needed
- **Update:** N/A
- **Handoff notes:** Proxy is live. Compulife API calls from Vercel now route through Railway's static IP. If Compulife IP lock needs to be reset (e.g., Railway IP changes), contact Compulife support.

## Notes
- Railway's static IP persists across deploys — it's tied to the service, not the container
- If Railway ever changes their IP infrastructure, the Compulife lock would break — this is unlikely but worth knowing
- The proxy has zero state — you can redeploy, restart, or scale it without any data concerns
- Local dev still calls Compulife directly (no COMPULIFE_PROXY_URL in local .env) or falls back to mock pricing
- Monitor Railway logs for the first few days to verify everything is stable
