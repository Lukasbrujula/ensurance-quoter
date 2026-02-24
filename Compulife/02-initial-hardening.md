# Task: Initial Server Hardening

## Tools
- SSH terminal connection to your server
- Text editor (nano - installed by default)
- Password manager (for storing passwords)

## Guardrails (What NOT to do)
- ❌ Do NOT skip creating non-root user (security risk)
- ❌ Do NOT use weak passwords (use 20+ random characters)
- ❌ Do NOT disable firewall before enabling it
- ❌ Do NOT skip testing new user login BEFORE logging out of root
- ❌ Do NOT enable UFW without allowing SSH first (you'll lock yourself out)
- ❌ Do NOT set PasswordAuthentication to 'no' until SSH key works

## Knowledge (Context needed)
- **Why not use root?** Root has unlimited power - if compromised, attacker owns everything
- **What is UFW?** Uncomplicated Firewall - easy-to-use firewall for Linux
- **What is fail2ban?** Automatically blocks IPs after repeated failed login attempts
- **What are unattended-upgrades?** Automatic security patches (like Windows Update)
- **SSH keys vs passwords:** Keys are 1000x harder to crack than passwords

## Memory (Does past context matter?)
- ✅ YES - You just provisioned a server in Task 1
- ✅ YES - You're currently logged in as root via SSH key
- ✅ YES - Server IP address is saved from Task 1
- ❌ NO - No security hardening done yet (server is vulnerable)

## Success Criteria (How to verify it worked)
You'll know this task succeeded when:
1. ✅ New user 'compulife' exists: `id compulife` shows uid/gid
2. ✅ You can log in as compulife: `ssh compulife@YOUR_IP` works
3. ✅ Compulife user can sudo: `sudo apt update` works (asks for password)
4. ✅ Root login disabled: `ssh root@YOUR_IP` is rejected
5. ✅ Firewall active: `sudo ufw status` shows "active" with SSH allowed
6. ✅ Fail2ban running: `sudo systemctl status fail2ban` shows "active"
7. ✅ Auto-updates enabled: `sudo systemctl status unattended-upgrades` is "loaded"

## Dependencies (What must exist first)
**Required before starting:**
- [x] Task 1 complete (server provisioned)
- [x] You can SSH as root: `ssh root@YOUR_IP`
- [x] Server responds to: `apt update`

**How to verify:**
```bash
# This should work:
ssh root@YOUR_IP
apt update
# If these work, you're ready
```

## Failure Handling (What if it fails?)
| Error | Cause | Solution |
|-------|-------|----------|
| "User 'compulife' already exists" | Already created | Check if login works: `ssh compulife@YOUR_IP` |
| "Permission denied" when testing compulife login | SSH key not copied | Re-run: `sudo cp ~/.ssh/authorized_keys /home/compulife/.ssh/` |
| "sudo: unable to resolve host" | Hostname not in /etc/hosts | Add line: `127.0.0.1 compulife-engine-prod` to /etc/hosts |
| "ufw: command not found" | Not installed (rare) | `apt install ufw` |
| Can't log in after disabling root | Compulife user not working | Reboot server from DigitalOcean console, login as root, fix |
| Locked out after enabling UFW | Forgot to allow SSH | Use DigitalOcean Recovery Console to fix |

**If completely locked out:**
1. Go to DigitalOcean dashboard
2. Click your droplet → Access → Launch Recovery Console
3. Run: `ufw allow 22/tcp && ufw reload`

## Learning (What to log if this fails)
If this task fails, document:
1. **Which step failed:** User creation, firewall, SSH test, etc.
2. **Error message:** Full text (screenshot or copy/paste)
3. **Current state:** Can you still log in as root?
4. **Commands run:** What did you execute before the error?

---

## Step-by-Step Instructions

### Step 1: Update System Packages

```bash
# SSH into server as root
ssh root@YOUR_SERVER_IP

# Update package list
apt update

# Upgrade all packages (takes 2-5 minutes)
apt upgrade -y

# Install essential tools
apt install -y curl wget git ufw fail2ban unattended-upgrades
```

**What this does:**
- `apt update` - Refreshes list of available packages
- `apt upgrade` - Updates all installed software to latest versions
- `apt install` - Installs security and utility tools

**Expected time:** 3 minutes

### Step 2: Create Non-Root User

```bash
# Create user 'compulife'
adduser compulife

# You'll be prompted for:
# - Password (IMPORTANT: Use a strong password, 20+ chars)
# - Full Name (can leave blank)
# - Room Number (can leave blank)
# - Work Phone (can leave blank)
# - Home Phone (can leave blank)
# - Other (can leave blank)
# - Is the information correct? (Y)
```

**Generate a strong password:**
```bash
# Option 1: Generate random password (recommended)
openssl rand -base64 20

# Option 2: Use a password manager
# Save to 1Password, LastPass, Bitwarden, etc.
```

**Save credentials:**
```
Username: compulife
Password: [paste from above]
Server: YOUR_SERVER_IP
```

**Expected time:** 2 minutes

### Step 3: Add User to Sudo Group

```bash
# Give compulife sudo (admin) privileges
usermod -aG sudo compulife

# Verify
groups compulife
# Should show: compulife sudo
```

**What this does:**
- Allows compulife user to run commands as root using `sudo`

**Expected time:** 30 seconds

### Step 4: Copy SSH Key to New User

```bash
# Create .ssh directory for compulife
mkdir -p /home/compulife/.ssh

# Copy your SSH keys from root to compulife
cp ~/.ssh/authorized_keys /home/compulife/.ssh/

# Set correct ownership
chown -R compulife:compulife /home/compulife/.ssh

# Set correct permissions
chmod 700 /home/compulife/.ssh
chmod 600 /home/compulife/.ssh/authorized_keys
```

**What this does:**
- Copies your SSH public key so you can log in as compulife
- Sets strict permissions (SSH requires this)

**Expected time:** 30 seconds

### Step 5: Test New User Login

**CRITICAL: Do this BEFORE logging out of root!**

Open a **NEW terminal window** (keep root session open):

```bash
# Test login as compulife
ssh compulife@YOUR_SERVER_IP

# You should see:
# Welcome to Ubuntu 24.04 LTS
# compulife@compulife-engine-prod:~$

# Test sudo access
sudo apt update
# Enter password when prompted

# If this works, SUCCESS! 
# Leave this session open, go back to root terminal
```

**Expected time:** 1 minute

### Step 6: Disable Root SSH Login

Back in the **root terminal**:

```bash
# Edit SSH config
nano /etc/ssh/sshd_config

# Find this line (use Ctrl+W to search):
#PermitRootLogin yes

# Change to:
PermitRootLogin no

# Also ensure these are set:
PubkeyAuthentication yes
PasswordAuthentication no  # Only if your SSH key works!

# Save: Ctrl+O, Enter, Ctrl+X
```

**IMPORTANT:** Only set `PasswordAuthentication no` if your SSH key worked in Step 5!

```bash
# Restart SSH service
systemctl restart sshd

# Test in your OTHER terminal (as compulife)
# Try: ssh root@YOUR_SERVER_IP
# Should be denied: "Permission denied (publickey)"
```

**Expected time:** 2 minutes

### Step 7: Configure Firewall (UFW)

```bash
# Still in root terminal (or compulife with sudo)

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# CRITICAL: Allow SSH FIRST (or you'll lock yourself out)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS (for Nginx later)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
# Type: y (yes)

# Verify
sudo ufw status verbose
```

**Expected output:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

**Expected time:** 1 minute

### Step 8: Configure Fail2Ban

```bash
# Copy default config (so we can customize)
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit config
sudo nano /etc/fail2ban/jail.local

# Find [sshd] section (use Ctrl+W to search for "sshd")
# Ensure these settings:
[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600

# Save: Ctrl+O, Enter, Ctrl+X
```

**What this does:**
- After 5 failed SSH login attempts, ban that IP for 1 hour

```bash
# Start fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Verify
sudo systemctl status fail2ban
# Should show: "active (running)"

# Check status
sudo fail2ban-client status sshd
```

**Expected time:** 2 minutes

### Step 9: Enable Automatic Security Updates

```bash
# Configure unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Select: Yes

# Verify configuration
cat /etc/apt/apt.conf.d/20auto-upgrades
```

**Expected output:**
```
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
```

**What this does:**
- Automatically installs security patches daily
- Like Windows Update, but just for security

**Expected time:** 1 minute

### Step 10: Final Security Tweaks

```bash
# Disable unused services (optional but recommended)
sudo systemctl disable bluetooth.service
sudo systemctl disable avahi-daemon.service

# Set timezone (optional)
sudo timedatectl set-timezone America/New_York
# Or: America/Chicago, America/Los_Angeles, Europe/London, etc.

# Update hostname (makes SSH sessions clearer)
sudo hostnamectl set-hostname compulife-engine-prod

# Verify
hostnamectl
```

**Expected time:** 1 minute

---

## Validation Checklist

Before moving to next task, verify:

- [ ] New user exists: `id compulife` shows output
- [ ] Can SSH as compulife: `ssh compulife@YOUR_IP` works
- [ ] Compulife has sudo: `sudo apt update` works (asks for password)
- [ ] Root SSH disabled: `ssh root@YOUR_IP` is rejected
- [ ] Firewall active: `sudo ufw status` shows "active"
- [ ] Fail2ban running: `sudo systemctl status fail2ban` shows "active"
- [ ] Auto-updates enabled: System will patch itself nightly

**Critical test:**
```bash
# From your local machine
ssh compulife@YOUR_SERVER_IP
sudo apt update
# If both work, you're good!
```

**If all checkboxes are ✅, proceed to next task: `03-install-dependencies.md`**

---

## Security Hardening Summary

**What you've done:**
1. ✅ Eliminated root login (attackers can't brute-force root)
2. ✅ Enabled firewall (only ports 22, 80, 443 open)
3. ✅ Enabled fail2ban (auto-blocks brute-force attempts)
4. ✅ Enabled auto-updates (patches vulnerabilities automatically)
5. ✅ Used SSH keys (1000x more secure than passwords)

**What's still at risk:**
- ⚠️ Server has no intrusion detection (acceptable for now)
- ⚠️ Logs not monitored (will add monitoring in Phase 5)
- ⚠️ No 2FA on server (SSH keys are sufficient for now)

**Good enough for production?** YES - This is industry-standard hardening.

---

## Cost Tracker

**Spent so far:**
- DigitalOcean server: $24/month (from Task 1)
- Time investment: ~15 minutes

**Running total:** $24/month

---

## Quick Reference

**Login from now on:**
```bash
ssh compulife@YOUR_SERVER_IP
```

**Run admin commands:**
```bash
sudo [command]
# Enter compulife password when prompted
```

**Check firewall:**
```bash
sudo ufw status
```

**Check fail2ban:**
```bash
sudo fail2ban-client status sshd
```

**Next task:** Install Node.js, Nginx, Certbot
