# Task: Set Up DNS + SSL Certificate

## Tools
- Domain registrar dashboard (wherever your domain is)
- SSH terminal as 'compulife' user
- Certbot (installed in Task 3)

## Guardrails (What NOT to do)
- ❌ Do NOT run Certbot before DNS propagates (it will fail)
- ❌ Do NOT skip the DNS propagation check (can take up to 60 minutes)
- ❌ Do NOT forget to update Nginx server_name before running Certbot

## Knowledge (Context needed)
- **What is DNS?** Translates domain names (api.yourdomain.com) to IP addresses
- **What is an A record?** Maps a domain/subdomain to an IPv4 address
- **What is Certbot?** Gets free SSL certificates from Let's Encrypt
- **What does Certbot do?** Automatically modifies Nginx config to add HTTPS, sets up auto-renewal

## Memory (Does past context matter?)
- ✅ YES — Nginx is configured as reverse proxy (Task 7)
- ✅ YES — Certbot is installed (Task 3)
- ✅ YES — Port 443 is allowed in firewall (Task 2)

## Success Criteria (How to verify it worked)
1. ✅ DNS resolves: `dig api.yourdomain.com` shows your server IP
2. ✅ SSL works: `https://api.yourdomain.com/api/health` returns JSON
3. ✅ HTTP redirects to HTTPS
4. ✅ Auto-renewal configured: `sudo certbot renew --dry-run` succeeds

---

## Step-by-Step Instructions

### Step 1: Create DNS A Record

In your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.):

1. Go to DNS management
2. Add a new **A Record**:
   - **Host:** `compulife-api` (or whatever subdomain you want)
   - **Value:** `YOUR_SERVER_IP`
   - **TTL:** 300 (5 minutes)

**Result:** `compulife-api.yourdomain.com` → YOUR_SERVER_IP

### Step 2: Wait for DNS Propagation

```bash
# Check from your local machine
dig compulife-api.yourdomain.com +short

# Or use a web tool: https://dnschecker.org
# Enter: compulife-api.yourdomain.com
```

**Wait until it resolves to your server IP. Can take 5-60 minutes.**

### Step 3: Update Nginx server_name

```bash
sudo nano /etc/nginx/sites-available/compulife
```

**Change `server_name`:**
```nginx
server_name compulife-api.yourdomain.com;
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Step 4: Get SSL Certificate

```bash
sudo certbot --nginx -d compulife-api.yourdomain.com

# Follow prompts:
# 1. Enter email address (for renewal notices)
# 2. Agree to terms: Y
# 3. Share email with EFF: N (optional)
# 4. Redirect HTTP to HTTPS: 2 (Redirect)
```

Certbot will automatically:
- Get a certificate from Let's Encrypt
- Modify your Nginx config to add SSL
- Set up automatic renewal (via systemd timer)

### Step 5: Verify

```bash
# Test HTTPS
curl https://compulife-api.yourdomain.com/api/health

# Test auto-renewal
sudo certbot renew --dry-run

# Check certificate
echo | openssl s_client -connect compulife-api.yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Validation Checklist

- [ ] DNS resolves to server IP
- [ ] HTTPS works: `https://compulife-api.yourdomain.com/api/health`
- [ ] HTTP redirects to HTTPS
- [ ] Certificate is valid (not expired)
- [ ] Auto-renewal works: `sudo certbot renew --dry-run`
- [ ] Full quote works over HTTPS

**If all checkboxes are ✅, proceed to next task: `09-connect-to-vercel.md`**

**Next task:** Connect the Compulife API to Ensurance (Vercel)
