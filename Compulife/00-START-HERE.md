# Compulife Integration — Task-Based Implementation Guide

**Built with Context Engineering Principles**

Every task file follows this structure:
- **Tools** — What you need before starting
- **Guardrails** — What NOT to do (prevents mistakes)
- **Knowledge** — Context needed to understand the task
- **Memory** — How this connects to previous work
- **Success Criteria** — Clear verification steps
- **Dependencies** — What must exist first
- **Failure Handling** — Specific error solutions
- **Learning** — What to document if it fails

---

## Complete Task List (9 Tasks)

### Phase 1: Server Infrastructure (Tasks 1-3)

#### Task 1: Provision DigitalOcean Server
**File:** `01-provision-server.md`
**Time:** 15 minutes
**Prerequisites:** Credit card, email address
**Outcome:** Running Ubuntu 24.04 server accessible via SSH

#### Task 2: Initial Server Hardening
**File:** `02-initial-hardening.md`
**Time:** 20 minutes
**Prerequisites:** Task 1 complete
**Outcome:** Non-root user 'compulife', firewall, fail2ban, auto-updates

#### Task 3: Install Dependencies
**File:** `03-install-dependencies.md`
**Time:** 10 minutes
**Prerequisites:** Task 2 complete
**Outcome:** Node.js 20, Nginx, Certbot installed

---

### Phase 2: Compulife Engine (Tasks 4-5)

#### Task 4: Install Compulife Engine
**File:** `04-install-compulife.md`
**Time:** 30 minutes
**Prerequisites:** Task 3 + Compulife purchased + files downloaded
**Outcome:** cqsl.cgi serving comparison pages via Nginx CGI

#### Task 5: Create JSON Output Template
**File:** `05-json-template.md`
**Time:** 15 minutes
**Prerequisites:** Task 4 complete
**Outcome:** Custom template producing structured (parseable) output instead of HTML

---

### Phase 3: API Wrapper + Deployment (Tasks 6-8)

#### Task 6: Build Node.js API Wrapper
**File:** `06-build-api-wrapper.md`
**Time:** 20 minutes
**Prerequisites:** Task 5 complete
**Outcome:** Express server translates JSON requests → CQS form params → JSON responses

#### Task 7: Systemd Service + Nginx Proxy
**File:** `07-systemd-service.md`
**Time:** 15 minutes
**Prerequisites:** Task 6 complete
**Outcome:** API auto-starts on boot, Nginx reverse proxy at /api/

#### Task 8: DNS + SSL Certificate
**File:** `08-ssl-and-dns.md`
**Time:** 10 minutes (+ 60 min DNS propagation)
**Prerequisites:** Task 7 + domain/subdomain
**Outcome:** HTTPS endpoint for the API

---

### Phase 4: Vercel Integration (Task 9)

#### Task 9: Connect to Ensurance
**File:** `09-connect-to-vercel.md`
**Time:** 30 minutes
**Prerequisites:** Task 8 complete
**Outcome:** Real Compulife premiums in the Ensurance quote engine

---

## How CQS Actually Works (Critical Context)

The Compulife Quote System (CQS) is a **CGI binary**, not a CLI tool:

1. **Executable:** `cqsl.cgi` (Linux) — lives in `cgi-bin/` directory
2. **Input:** HTTP POST form data (not command-line arguments)
3. **Output:** HTML via template file dollar-code substitution (not JSON)
4. **Data files:** Proprietary binary files in `COMPLIFE/` directory (UPPERCASE!)
5. **Templates:** `TEMPLATE.HTM` files with `$company$`, `$Premium$`, etc.

**Our strategy:** Create a custom template (`JSON_TEMPLATE.HTM`) that outputs structured text instead of HTML. A Node.js wrapper calls CQS via HTTP POST and parses the structured output into real JSON.

### Key Parameter Differences from Original Task MDs

| What the MDs assumed | What CQS actually uses |
|---------------------|----------------------|
| `age=35` | `BirthYear=1990`, `BirthMonth=6`, `Birthday=15` |
| `gender=M` | `Sex=M` |
| `state=44` | `State=44` (correct — numeric codes) |
| `coverage=500000` | `FaceAmount=500000` |
| `term=20` | `NewCategory=5` (coded, not just the number) |
| `health=NS` | `Health=PP` + `Smoker=N` (separate fields) |
| `mode=json` | `TEMPLATEFILE=JSON_TEMPLATE.HTM` (custom template) |
| `./CQS args...` | HTTP POST to cqsl.cgi |

---

## Progress Tracker

```markdown
## Server Infrastructure
- [ ] Task 1: Provision Server (est: 15 min)
- [ ] Task 2: Harden Server (est: 20 min)
- [ ] Task 3: Install Dependencies (est: 10 min)

## Compulife Engine
- [ ] Task 4: Install CQS Engine (est: 30 min)
- [ ] Task 5: JSON Output Template (est: 15 min)

## API Wrapper + Deployment
- [ ] Task 6: Node.js API Wrapper (est: 20 min)
- [ ] Task 7: Systemd + Nginx Proxy (est: 15 min)
- [ ] Task 8: DNS + SSL (est: 10 min + 60 min wait)

## Vercel Integration
- [ ] Task 9: Connect to Ensurance (est: 30 min)

Total estimated time: 3 hours active work + DNS propagation wait
```

---

## Critical Paths & Blockers

### You Can't Proceed Without:

**To start Task 1:**
- DigitalOcean account + payment method

**To start Task 4:**
- Compulife Engine purchased ($1,650-2,000/year)
- CQS desktop software installed on Windows (data files come from C:\Complife)

**To start Task 8:**
- Domain or subdomain for API (e.g., compulife-api.yourdomain.com)

### Parallel Work Possible:

**While waiting for DNS (Task 8, 60 min):**
- Review the API wrapper code for edge cases
- Test with different quote scenarios

**While waiting for Compulife purchase:**
- Complete Tasks 1-3 (server setup)

---

## File Structure

```
Compulife/
├── 00-START-HERE.md           ← This file
├── 01-provision-server.md     ← Task 1: DigitalOcean server
├── 02-initial-hardening.md    ← Task 2: Firewall, SSH, fail2ban
├── 03-install-dependencies.md ← Task 3: Node.js, Nginx, Certbot
├── 04-install-compulife.md    ← Task 4: CQS engine + data files
├── 05-json-template.md        ← Task 5: Structured output template
├── 06-build-api-wrapper.md    ← Task 6: Express JSON API
├── 07-systemd-service.md      ← Task 7: Service + reverse proxy
├── 08-ssl-and-dns.md          ← Task 8: HTTPS endpoint
├── 09-connect-to-vercel.md    ← Task 9: Wire into Ensurance
└── readme.html                ← Official Compulife documentation
```

---

## Support

**If a task file is confusing:**
- Ask Claude Code: "Explain the Knowledge section of [task file]"

**If you get stuck on a specific error:**
- Check Failure Handling section in that task file
- Ask Claude Code: "I'm on Task X and got error Y, help me debug"

**Compulife support:**
- Email: service@compulife.com
- Phone: (888) 798-3488
