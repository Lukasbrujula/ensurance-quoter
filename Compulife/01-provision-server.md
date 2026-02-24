# Task: Provision DigitalOcean Server

## Tools
- Web browser (DigitalOcean dashboard)
- Terminal (for SSH connection)
- SSH key generator (`ssh-keygen`)

## Guardrails (What NOT to do)
- ❌ Do NOT use password authentication (use SSH keys only)
- ❌ Do NOT skip SSH key generation
- ❌ Do NOT select Windows OS (must be Ubuntu 24.04 LTS)
- ❌ Do NOT choose less than 2 vCPU / 4GB RAM
- ❌ Do NOT enable unnecessary add-ons (managed databases, volumes)

## Knowledge (Context needed)
- **What is DigitalOcean?** Cloud hosting provider, offers "Droplets" (virtual private servers)
- **Why Ubuntu 24.04 LTS?** Long-term support, stable, Compulife supports Linux
- **Why 2 vCPU / 4GB RAM?** Minimum for Compulife engine + Node.js + Nginx
- **What is SSH?** Secure Shell - encrypted remote server access
- **Why SSH keys?** More secure than passwords, prevents brute-force attacks

## Memory (Does past context matter?)
- ✅ YES - You already decided on Internet Engine (not API) in blueprint
- ✅ YES - Budget is ~$24/month for server (from cost breakdown)
- ❌ NO - This is your first server provisioning (no prior setup)

## Success Criteria (How to verify it worked)
You'll know this task succeeded when:
1. ✅ You can log in: `ssh root@YOUR_SERVER_IP`
2. ✅ You see: `Welcome to Ubuntu 24.04 LTS`
3. ✅ Server responds to: `apt update` (no errors)
4. ✅ You have the server IP address saved

## Dependencies (What must exist first)
**Required before starting:**
- [ ] DigitalOcean account created (signup at digitalocean.com)
- [ ] Credit card on file (or PayPal)
- [ ] SSH key pair generated on your local machine

**Optional but recommended:**
- [ ] Domain name purchased (for SSL later)
- [ ] Password manager for storing IP address

## Failure Handling (What if it fails?)
| Error | Cause | Solution |
|-------|-------|----------|
| "Cannot connect" after creation | Firewall blocking SSH | Check your local firewall, try different network |
| "Permission denied (publickey)" | SSH key not added correctly | Re-add SSH key in DigitalOcean dashboard |
| Server creation fails | Payment issue | Check billing, contact DigitalOcean support |
| Can't find server after creation | Wrong project selected | Check "All Projects" dropdown |

**If completely stuck:**
- DigitalOcean has 24/7 chat support: https://docs.digitalocean.com/support/
- Cost so far: $0 (can delete server and start over)

## Learning (What to log if this fails)
If this task fails, document:
1. **Exact error message** (screenshot or copy/paste)
2. **What step you were on** (account creation, server creation, SSH connection)
3. **Your operating system** (Mac, Windows, Linux)
4. **Network situation** (home WiFi, corporate, VPN)

This helps debug and prevents repeating same mistakes.

---

## Step-by-Step Instructions

### Step 1: Create DigitalOcean Account

1. Visit https://www.digitalocean.com
2. Click "Sign Up"
3. Use email + password (or GitHub OAuth)
4. Verify email
5. Add payment method (card or PayPal)

**Expected time:** 5 minutes

### Step 2: Generate SSH Key (If You Don't Have One)

**On Mac/Linux:**
```bash
# Generate key
ssh-keygen -t ed25519 -C "your-email@example.com"

# Press Enter for default location (~/.ssh/id_ed25519)
# Enter passphrase (optional but recommended)

# Copy public key to clipboard
cat ~/.ssh/id_ed25519.pub | pbcopy  # Mac
# OR just display it:
cat ~/.ssh/id_ed25519.pub
```

**On Windows (PowerShell):**
```powershell
# Generate key
ssh-keygen -t ed25519 -C "your-email@example.com"

# Copy public key
Get-Content ~/.ssh/id_ed25519.pub | Set-Clipboard
```

**What the key looks like:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJl3dIeudNqd... your-email@example.com
```

**Expected time:** 2 minutes

### Step 3: Add SSH Key to DigitalOcean

1. In DigitalOcean dashboard, click "Settings" (left sidebar)
2. Click "Security" tab
3. Under "SSH Keys", click "Add SSH Key"
4. Paste your public key (the output from Step 2)
5. Give it a name: "My Laptop" or "Macbook Pro"
6. Click "Add SSH Key"

**Expected time:** 1 minute

### Step 4: Create Droplet

1. Click "Create" button (top right)
2. Select "Droplets"

**Configuration:**
- **Region:** Choose closest to your users (e.g., New York, San Francisco)
- **Image:** Ubuntu 24.04 LTS (x64)
- **Size:** 
  - Click "Shared CPU"
  - Select "Regular Intel" 
  - Choose: **2 vCPU / 4GB RAM / 80GB SSD** ($24/month)
- **Authentication:** 
  - Select "SSH keys" (NOT password)
  - Check the box next to your SSH key
- **Hostname:** `compulife-engine-prod`
- **Tags:** `production`, `compulife`
- **Enable:** 
  - ✅ IPv6
  - ✅ Monitoring (free basic monitoring)
- **Backups:** ❌ Skip for now (adds cost)

3. Click "Create Droplet"

**Wait 60 seconds** for provisioning.

**Expected time:** 3 minutes

### Step 5: Get Server IP Address

1. Once droplet is created, you'll see it in the dashboard
2. Copy the **IP address** (e.g., `123.45.67.89`)
3. Save it somewhere (Notes app, password manager)

### Step 6: Test SSH Connection

```bash
# Connect as root
ssh root@123.45.67.89  # Replace with your actual IP

# First time, you'll see a fingerprint warning:
# "The authenticity of host '123.45.67.89' can't be established."
# Type: yes

# You should now see:
Welcome to Ubuntu 24.04 LTS
root@compulife-engine-prod:~#
```

**If successful, you're logged into your server!**

**Expected time:** 1 minute

---

## Validation Checklist

Before moving to next task, verify:

- [ ] You can SSH into server: `ssh root@YOUR_IP`
- [ ] Server shows Ubuntu 24.04 LTS welcome message
- [ ] Command works: `apt update` (may take 30 seconds)
- [ ] You have server IP saved in secure location
- [ ] Server appears in DigitalOcean dashboard as "Active"

**If all checkboxes are ✅, proceed to next task: `02-initial-hardening.md`**

---

## Cost Tracker

**Spent so far:**
- DigitalOcean server: $0.03/hour = $0.72/day = $24/month
- If you delete server today: ~$1

**Running total:** $24/month recurring

---

## Quick Reference

**Server details to save:**
```
IP Address: ___________________
SSH Command: ssh root@___________________
Created Date: ___________________
Region: ___________________
```

**Next task:** Initial server hardening (create non-root user, configure firewall)
