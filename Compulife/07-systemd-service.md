# Task: Configure Systemd Service + Nginx Reverse Proxy

## Tools
- SSH terminal as 'compulife' user
- sudo access
- Text editor (nano)

## Guardrails (What NOT to do)
- ❌ Do NOT run the API as root
- ❌ Do NOT skip enabling the service (it won't auto-start on boot)
- ❌ Do NOT expose port 3001 directly — Nginx handles all external traffic
- ❌ Do NOT forget to reload Nginx after config changes

## Knowledge (Context needed)
- **What is systemd?** Linux service manager — keeps processes running, restarts on crash, starts on boot
- **Why Nginx reverse proxy?** Nginx handles HTTPS, rate limiting, compression. Our Node.js API runs on port 3001. Nginx forwards external requests to it.
- **Flow:** Internet → Nginx (port 443/80) → Node.js API (port 3001) → CQS CGI (via local HTTP)

## Memory (Does past context matter?)
- ✅ YES — API wrapper is built and tested (Task 6)
- ✅ YES — Nginx is already installed and running (Task 3)
- ✅ YES — API runs on port 3001

## Success Criteria (How to verify it worked)
1. ✅ Service starts: `sudo systemctl status compulife-api` shows "active (running)"
2. ✅ Auto-starts on boot: `sudo systemctl is-enabled compulife-api` shows "enabled"
3. ✅ Survives crash: `kill <pid>` → service restarts automatically
4. ✅ Nginx proxies: `curl http://YOUR_SERVER_IP/api/health` returns JSON
5. ✅ External access works: `curl https://YOUR_DOMAIN/api/quote` works (after SSL)

## Dependencies (What must exist first)
- [x] Task 6 complete (API wrapper runs on port 3001)
- [x] Nginx installed (Task 3)

---

## Step-by-Step Instructions

### Step 1: Find Node.js Path

nvm installs Node.js in a non-standard location. Systemd needs the full path.

```bash
# Find where node is installed
which node
# Example output: /home/compulife/.nvm/versions/node/v20.11.0/bin/node

# Save this path — you'll need it in the service file
```

### Step 2: Create Systemd Service

```bash
sudo nano /etc/systemd/system/compulife-api.service
```

**Paste this (replace the Node.js path if different):**
```ini
[Unit]
Description=Compulife API Wrapper
After=network.target nginx.service

[Service]
Type=simple
User=compulife
Group=compulife
WorkingDirectory=/home/compulife/compulife-api
ExecStart=/home/compulife/.nvm/versions/node/v20.11.0/bin/node server.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
EnvironmentFile=/home/compulife/compulife-api/.env

[Install]
WantedBy=multi-user.target
```

**Save:** Ctrl+O, Enter, Ctrl+X

### Step 3: Enable and Start

```bash
# Reload systemd to pick up new service
sudo systemctl daemon-reload

# Enable auto-start on boot
sudo systemctl enable compulife-api

# Start the service
sudo systemctl start compulife-api

# Check status
sudo systemctl status compulife-api
# Should show: "active (running)"

# Test health
curl http://localhost:3001/health
```

### Step 4: Test Crash Recovery

```bash
# Find the process ID
sudo systemctl status compulife-api | grep "Main PID"

# Kill it
sudo kill <PID>

# Wait 5 seconds, then check — should be running again
sleep 6 && sudo systemctl status compulife-api
```

### Step 5: Update Nginx as Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/compulife
```

**Add the /api location block to the existing server block:**
```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;  # Replace with your IP or domain

    root /home/compulife/public_html;
    index usmain.html index.html;

    # Serve static files (CQS sample pages)
    location / {
        try_files $uri $uri/ =404;
    }

    # Reverse proxy for Node.js API
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 30s;
    }

    # CGI scripts (direct CQS access for testing)
    location /cgi-bin/ {
        gzip off;
        root /home/compulife/public_html;
        fastcgi_pass unix:/var/run/fcgiwrap.socket;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME /home/compulife/public_html$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT /home/compulife/public_html;
    }
}
```

```bash
# Test Nginx config
sudo nginx -t

# Reload
sudo systemctl reload nginx

# Test external access
curl http://YOUR_SERVER_IP/api/health
```

### Step 6: Test Full Flow

```bash
# From your local machine (or any external machine)
curl -X POST http://YOUR_SERVER_IP/api/quote \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{"age":35,"gender":"M","state":"TX","coverage":500000,"term":20,"smoker":false,"healthClass":"preferred_plus"}'
```

---

## Validation Checklist

- [ ] Service is running: `sudo systemctl status compulife-api`
- [ ] Service is enabled: `sudo systemctl is-enabled compulife-api`
- [ ] Crash recovery works: kill process, it restarts in ~5s
- [ ] Nginx proxies /api/ to Node.js: `curl http://YOUR_SERVER_IP/api/health`
- [ ] Full quote works externally: POST to /api/quote returns JSON results
- [ ] Logs accessible: `journalctl -u compulife-api -f`

**If all checkboxes are ✅, proceed to next task: `08-ssl-and-dns.md`**

---

## Useful Commands

```bash
# View logs (live)
journalctl -u compulife-api -f

# View recent logs
journalctl -u compulife-api --since "1 hour ago"

# Restart service
sudo systemctl restart compulife-api

# Stop service
sudo systemctl stop compulife-api
```

**Next task:** Set up DNS and SSL certificate
