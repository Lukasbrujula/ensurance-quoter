# Task: Install Dependencies

## Tools
- SSH terminal as 'compulife' user
- sudo access
- Internet connection on server

## Guardrails (What NOT to do)
- ❌ Do NOT install Node.js from Ubuntu's default repo (it's outdated)
- ❌ Do NOT skip verifying installations
- ❌ Do NOT install random PPAs (use official sources only)
- ❌ Do NOT use `sudo` with nvm commands
- ❌ Do NOT start services yet (we'll configure them first)

## Knowledge (Context needed)
- **What is Node.js?** JavaScript runtime - needed for our API wrapper
- **What is nvm?** Node Version Manager - installs specific Node versions
- **What is Nginx?** Web server / reverse proxy - handles HTTPS
- **What is Certbot?** Tool to get free SSL certificates from Let's Encrypt
- **Why these specific versions?** Node 20 LTS = long-term support, Nginx latest = security patches

## Memory (Does past context matter?)
- ✅ YES - Server is hardened (non-root user, firewall configured)
- ✅ YES - Ports 80/443 already allowed in firewall (for Nginx)
- ✅ YES - You're logged in as 'compulife' user
- ❌ NO - No software installed yet beyond basics

## Success Criteria (How to verify it worked)
You'll know this task succeeded when:
1. ✅ Node.js 20 installed: `node --version` shows v20.x.x
2. ✅ npm installed: `npm --version` shows v10.x.x
3. ✅ Nginx installed: `nginx -v` shows version
4. ✅ Nginx running: `sudo systemctl status nginx` shows "active"
5. ✅ Certbot installed: `certbot --version` shows version
6. ✅ Can access Nginx test page: `curl http://localhost` returns HTML

## Dependencies (What must exist first)
**Required before starting:**
- [x] Task 2 complete (server hardened)
- [x] Logged in as compulife user
- [x] Have sudo access
- [x] Internet connection working

**How to verify:**
```bash
# This should work:
ssh compulife@YOUR_SERVER_IP
sudo apt update
# If these work, you're ready
```

## Failure Handling (What if it fails?)
| Error | Cause | Solution |
|-------|-------|----------|
| "nvm: command not found" after install | Shell not reloaded | Close SSH session, reconnect |
| "node: command not found" | nvm not in PATH | Run: `source ~/.bashrc` |
| "Permission denied" on npm install | Using sudo with nvm | Never use sudo with nvm/node/npm |
| Nginx won't start | Port 80 already in use | Check: `sudo lsof -i :80`, kill process |
| Certbot not found | Wrong repo | Re-add universe repo, reinstall |
| "Could not resolve host" errors | DNS issue | Check: `/etc/resolv.conf` has nameservers |

**If completely stuck:**
- All software here is well-documented
- Search: "[error message] + ubuntu 24.04"
- Check official docs: nodejs.org, nginx.org, certbot.eff.org

## Learning (What to log if this fails)
If this task fails, document:
1. **Which software failed:** Node, Nginx, or Certbot?
2. **Error message:** Full output
3. **Output of:** `echo $PATH` (for nvm issues)
4. **Output of:** `which node npm nginx certbot` (what's installed)

---

## Step-by-Step Instructions

### Step 1: Install Node.js 20 via nvm

**Why nvm?** Ubuntu's default Node.js is v12 (ancient). nvm lets us install Node 20 LTS.

```bash
# SSH into server as compulife
ssh compulife@YOUR_SERVER_IP

# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload shell config
source ~/.bashrc

# Verify nvm installed
nvm --version
# Should show: 0.39.7 or similar

# Install Node.js 20 (LTS)
nvm install 20

# Set Node 20 as default
nvm use 20
nvm alias default 20

# Verify
node --version
# Should show: v20.11.0 or similar

npm --version
# Should show: v10.2.4 or similar
```

**What this does:**
- Downloads and runs nvm installer script
- Installs Node.js 20 in your home directory (no sudo needed)
- Sets Node 20 as the default version

**Expected time:** 3 minutes

**If "nvm: command not found":**
```bash
# Close SSH session and reconnect
exit
ssh compulife@YOUR_SERVER_IP
# Try again
nvm --version
```

### Step 2: Install Nginx

```bash
# Install Nginx
sudo apt update
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
# Should show: "active (running)" in green

# Test locally
curl http://localhost
# Should return HTML with "Welcome to nginx!"
```

**What this does:**
- Installs Nginx web server
- Starts it and enables auto-start on boot
- Opens port 80 (already allowed in firewall)

**Expected time:** 2 minutes

**Verify in browser (optional):**
- Visit: `http://YOUR_SERVER_IP`
- Should see "Welcome to nginx!" page
- (This will work because port 80 is allowed in firewall)

### Step 3: Install Certbot (for SSL certificates)

```bash
# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
# Should show: certbot 2.x.x
```

**What this does:**
- Installs Certbot (Let's Encrypt certificate tool)
- Installs Nginx plugin (makes SSL setup automatic)

**Note:** We won't get certificates yet (need domain first). This just installs the tool.

**Expected time:** 1 minute

### Step 4: Configure Nginx (Basic Setup)

```bash
# Check Nginx config syntax
sudo nginx -t
# Should show: "syntax is ok" and "test is successful"

# If OK, reload Nginx
sudo systemctl reload nginx

# Verify Nginx is serving pages
curl -I http://localhost
# Should show: "HTTP/1.1 200 OK" and "Server: nginx"
```

**Expected time:** 30 seconds

### Step 5: Install Additional Useful Tools

```bash
# Install utilities we'll need later
sudo apt install -y \
  build-essential \
  htop \
  net-tools \
  ufw

# Verify
htop --version
# Press 'q' to quit htop if it opens
```

**What these do:**
- `build-essential` - Compilers (needed for some npm packages)
- `htop` - Better process viewer (visual top)
- `net-tools` - Network utilities (netstat, ifconfig)
- `ufw` - Firewall (already installed, just making sure)

**Expected time:** 1 minute

---

## Validation Checklist

Before moving to next task, verify:

- [ ] Node.js 20 installed: `node --version` shows v20.x.x
- [ ] npm works: `npm --version` shows v10.x.x
- [ ] Nginx running: `sudo systemctl status nginx` shows "active (running)"
- [ ] Nginx test page loads: `curl http://localhost` returns HTML
- [ ] Certbot installed: `certbot --version` shows version
- [ ] Can see Nginx in browser: Visit http://YOUR_SERVER_IP (should see welcome page)

**Full verification command:**
```bash
# Run all checks at once
echo "Node: $(node --version)" && \
echo "npm: $(npm --version)" && \
echo "Nginx: $(nginx -v 2>&1)" && \
echo "Certbot: $(certbot --version 2>&1 | head -1)" && \
echo "Nginx status: $(sudo systemctl is-active nginx)"

# Expected output:
# Node: v20.11.0
# npm: 10.2.4
# Nginx: nginx/1.24.0
# Certbot: certbot 2.x.x
# Nginx status: active
```

**If all checkboxes are ✅, proceed to next task: `04-install-compulife.md`**

---

## What You've Installed

| Software | Version | Purpose | Auto-start? |
|----------|---------|---------|-------------|
| Node.js | 20.x LTS | Run JavaScript (API wrapper) | No |
| npm | 10.x | Package manager | N/A |
| Nginx | 1.24+ | Web server / reverse proxy | ✅ Yes |
| Certbot | 2.x | SSL certificates | No |

**What's next:**
- Task 4: Install Compulife engine
- Task 5: Build API wrapper (uses Node.js)
- Task 6: Configure Nginx as reverse proxy
- Task 7: Get SSL certificate with Certbot

---

## Cost Tracker

**Spent so far:**
- DigitalOcean server: $24/month (from Task 1)
- Software costs: $0 (all open source)
- Time investment: ~10 minutes

**Running total:** $24/month

---

## Quick Reference

**Check versions:**
```bash
node --version
npm --version
nginx -v
certbot --version
```

**Nginx commands:**
```bash
sudo systemctl status nginx   # Check status
sudo systemctl restart nginx  # Restart
sudo systemctl reload nginx   # Reload config
sudo nginx -t                 # Test config syntax
```

**Node/npm tips:**
```bash
# Never use sudo with npm!
npm install express           # ✅ Correct
sudo npm install express      # ❌ Wrong

# If you need global packages:
npm install -g <package>      # nvm handles permissions
```

**System monitoring:**
```bash
htop              # Visual process monitor (press q to quit)
sudo ufw status   # Check firewall
df -h             # Check disk space
free -h           # Check memory
```

**Next task:** Install Compulife CQS executable and data files
