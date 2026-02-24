# Task: Install Compulife Internet Engine

## Tools
- SCP or SFTP client (for file upload)
- SSH terminal connection
- Text editor (nano or vim on server)
- Compulife CQS package (downloaded from Compulife)
- Compulife data files (from your desktop CQS installation)

## Guardrails (What NOT to do)
- ❌ Do NOT run cqsl.cgi as root user
- ❌ Do NOT skip testing after installation
- ❌ Do NOT modify cqsl.cgi (it's proprietary)
- ❌ Do NOT rename the COMPLIFE data directory to lowercase (must be UPPERCASE)
- ❌ Do NOT forget to make cqsl.cgi executable (chmod +x)
- ❌ Do NOT use old/outdated data files
- ❌ Do NOT put template files (*.HTM) in the COMPLIFE data directory — they go in the UserLocation directory
- ❌ Do NOT assume CQS outputs JSON — it outputs HTML via template substitution

## Knowledge (Context needed)
- **What is CQS?** Compulife Quote System — a CGI binary that calculates insurance rates
- **What is a CGI binary?** A program that runs on a web server, reads HTTP POST data from stdin, and outputs HTML. It is NOT a CLI tool you run with command-line arguments.
- **Executable name:** `cqsl.cgi` (Linux) or `cqs32.exe` (Windows) — NOT "CQS"
- **What are data files?** Binary files with rate tables (COMP.*, RATE.*, COMPANY.DAT, HEALTH.DAT, GO.PRM, DECOMP.PRM, CQS.PRM)
- **COMPLIFE directory:** Must be UPPERCASE. Note spelling: COMPLIFE (not COMPULIFE)
- **Template files:** *.HTM files (TEMPLATE.HTM, TBLHDR.HTM, etc.) that control output formatting via dollar-code substitution
- **CQS.conf:** Only has an `[enginecounter]` section with a `location` field pointing to a writable logs directory. That's it.
- **UserLocation:** A subdirectory under COMPLIFE/USER/ where your template *.HTM files live. Keeps them organized and allows multiple configurations.
- **How it works:** An HTML form POSTs to cqsl.cgi → engine reads form data → looks up rates in data files → substitutes dollar codes in template files → outputs HTML

## Memory (Does past context matter?)
- ✅ YES — Server is already hardened (non-root user 'compulife' exists)
- ✅ YES — Node.js 20, Nginx, Certbot installed (Task 3)
- ✅ YES — You purchased Internet Engine + Agency PC Software from Compulife
- ✅ YES — You have the CQS desktop software installed on your local Windows machine (data files come from C:\Complife)
- ❌ NO — This is first-time installation on the server

## Success Criteria (How to verify it worked)
You'll know this task succeeded when:
1. ✅ cqsl.cgi exists and is executable: `ls -la /home/compulife/public_html/cgi-bin/cqsl.cgi` shows -rwxr-xr-x
2. ✅ Data files present: `ls /home/compulife/public_html/cgi-bin/COMPLIFE/` shows COMP.*, RATE.*, GO.PRM, etc.
3. ✅ Template files present: `ls /home/compulife/public_html/cgi-bin/COMPLIFE/USER/ENSURANCE/` shows TEMPLATE.HTM etc.
4. ✅ CQS.conf configured with correct log location
5. ✅ Nginx serves the sample HTML form at http://YOUR_IP/usmain.html
6. ✅ Submitting the form returns a comparison page with carrier premiums
7. ✅ No permission errors

## Dependencies (What must exist first)
**Required before starting:**
- [x] Server provisioned and accessible via SSH
- [x] Non-root user 'compulife' created
- [x] Node.js, Nginx installed (Task 3)
- [ ] Compulife Engine package downloaded (contains cqsl.cgi + template files)
- [ ] CQS desktop software installed on local Windows machine (for data files)

**How to check:**
```bash
# Verify user exists
id compulife  # Should show uid and gid

# Verify Nginx is running
sudo systemctl status nginx
```

**If dependencies missing:**
- Need to purchase? Email service@compulife.com
- Need hardening? Complete task `02-initial-hardening.md` first

## Failure Handling (What if it fails?)
| Error | Cause | Solution |
|-------|-------|----------|
| "Permission denied" when running cqsl.cgi | File not executable | `chmod +x cqsl.cgi` |
| "Internal Server Error" (500) | Nginx CGI not configured or permissions wrong | Check Nginx error log: `sudo tail -20 /var/log/nginx/error.log` |
| "cannot execute binary file" | Wrong OS architecture (Windows .exe on Linux) | Re-download Linux version (cqsl.cgi, not cqs32.exe) |
| Blank page or no results | Template files missing or in wrong directory | Verify *.HTM files in UserLocation dir |
| "404 Not Found" | Wrong path in form action or Nginx config | Check Nginx config and form action path |
| Error.log shows "file not found" | Data files missing or wrong directory | Upload all files from C:\Complife to COMPLIFE/ dir |

**If completely stuck:**
- Compulife support: service@compulife.com or (888) 798-3488
- They can verify your files are correct

## Learning (What to log if this fails)
If this task fails, document:
1. **Output of:** `ls -la /home/compulife/public_html/cgi-bin/` (verify files uploaded)
2. **Output of:** `file /home/compulife/public_html/cgi-bin/cqsl.cgi` (should say "ELF 64-bit LSB executable")
3. **Output of:** `ls /home/compulife/public_html/cgi-bin/COMPLIFE/` (verify data files)
4. **Nginx error log:** `sudo tail -50 /var/log/nginx/error.log`
5. **CQS Error.log:** Check the location specified in CQS.conf

---

## Step-by-Step Instructions

### Step 1: Understand the Directory Layout

The Compulife readme specifies this exact structure for Linux:

```
/home/compulife/
└── public_html/
    ├── usmain.html                    ← Sample input form (public)
    ├── css/
    │   └── *.css                      ← Style sheets
    ├── images/
    │   └── logos/                      ← Carrier logo images (optional)
    └── cgi-bin/
        ├── cqsl.cgi                   ← The engine executable
        ├── CQS.conf                   ← Counter/log configuration
        ├── COMPLIFE/                  ← Data directory (UPPERCASE!)
        │   ├── GO.PRM                 ← Engine parameters
        │   ├── DECOMP.PRM
        │   ├── CQS.PRM
        │   ├── COMP.*                 ← Company data files
        │   ├── RATE.*                 ← Rate data files
        │   ├── COMPANY.DAT
        │   ├── HEALTH.DAT
        │   ├── ROPF.D0*              ← Return of Premium (US only)
        │   ├── ROPFT.000             ← Return of Premium (US only)
        │   └── USER/
        │       └── ENSURANCE/        ← Our UserLocation
        │           ├── TEMPLATE.HTM  ← Main output template
        │           ├── ERRORTEM.HTM  ← Error template
        │           ├── COMP.INC      ← Company selection (optional)
        │           └── *.HTM         ← Other template files
        └── debug                     ← Empty file, enables $filename$ (optional)
```

**Expected time:** Read and understand, 5 minutes

### Step 2: Create Directory Structure on Server

```bash
# SSH into server
ssh compulife@YOUR_SERVER_IP

# Create the full directory tree
mkdir -p ~/public_html/cgi-bin/COMPLIFE/USER/ENSURANCE
mkdir -p ~/public_html/css
mkdir -p ~/public_html/images/logos
mkdir -p ~/logs/compulife

# Set permissions
chmod 755 ~/public_html
chmod 755 ~/public_html/cgi-bin
chmod 755 ~/public_html/cgi-bin/COMPLIFE
chmod 755 ~/public_html/cgi-bin/COMPLIFE/USER
chmod 755 ~/public_html/cgi-bin/COMPLIFE/USER/ENSURANCE

# Verify
ls -la ~/public_html/cgi-bin/
```

**Expected time:** 1 minute

### Step 3: Upload cqsl.cgi Executable

From the Compulife package, you need the Linux binary `cqsl.cgi`.

**On your local computer:**
```bash
# Upload cqsl.cgi to the cgi-bin directory
scp ~/Downloads/compulife/cqsl.cgi compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/

# If you get the Windows exe by mistake, contact Compulife for the Linux version
```

**On the server:**
```bash
# Make executable
chmod +x ~/public_html/cgi-bin/cqsl.cgi

# Verify it's a Linux binary
file ~/public_html/cgi-bin/cqsl.cgi
# Should show: ELF 64-bit LSB executable, x86-64

# Verify permissions
ls -la ~/public_html/cgi-bin/cqsl.cgi
# Should show: -rwxr-xr-x
```

**Expected time:** 2 minutes

### Step 4: Upload Data Files from Desktop CQS

The data files come from your local CQS desktop installation (`C:\Complife\` on Windows).

**On your local computer:**
```bash
# Upload the required data files
# These are the files you MUST upload from C:\Complife:
scp /path/to/Complife/GO.PRM compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/COMPLIFE/
scp /path/to/Complife/DECOMP.PRM compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/COMPLIFE/
scp /path/to/Complife/CQS.PRM compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/COMPLIFE/
scp /path/to/Complife/COMPANY.DAT compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/COMPLIFE/
scp /path/to/Complife/HEALTH.DAT compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/COMPLIFE/

# Upload wildcard files (multiple COMP.* and RATE.* files)
scp /path/to/Complife/COMP.* compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/COMPLIFE/
scp /path/to/Complife/RATE.* compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/COMPLIFE/

# For US Return of Premium categories:
scp /path/to/Complife/ROPF.D0* compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/COMPLIFE/
scp /path/to/Complife/ROPFT.000 compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/COMPLIFE/
```

**Or upload as a tar archive (faster):**
```bash
# On your local machine, create archive of C:\Complife data files
cd /path/to/Complife
tar -czf complife-data.tar.gz GO.PRM DECOMP.PRM CQS.PRM COMPANY.DAT HEALTH.DAT COMP.* RATE.* ROPF.D0* ROPFT.000

# Upload archive
scp complife-data.tar.gz compulife@YOUR_SERVER_IP:~/

# On server, extract to COMPLIFE directory
ssh compulife@YOUR_SERVER_IP
tar -xzf ~/complife-data.tar.gz -C ~/public_html/cgi-bin/COMPLIFE/
rm ~/complife-data.tar.gz
```

**Verify on server:**
```bash
ls ~/public_html/cgi-bin/COMPLIFE/
# Should show: COMP.* RATE.* GO.PRM DECOMP.PRM CQS.PRM COMPANY.DAT HEALTH.DAT etc.
ls ~/public_html/cgi-bin/COMPLIFE/ | wc -l
# Should show 10+ files
```

**Expected time:** 5 minutes

### Step 5: Upload Template Files

Template files (*.HTM) control how the engine formats its output. They come with the Compulife Internet Engine package.

```bash
# Upload sample template files to UserLocation directory
scp ~/Downloads/compulife/TEMPLATE.HTM compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/COMPLIFE/USER/ENSURANCE/
scp ~/Downloads/compulife/ERRORTEM.HTM compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/COMPLIFE/USER/ENSURANCE/
scp ~/Downloads/compulife/PICKVIEW.HTM compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/COMPLIFE/USER/ENSURANCE/

# Upload any other *.HTM files from the package
scp ~/Downloads/compulife/*.HTM compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/COMPLIFE/USER/ENSURANCE/

# Upload the sample start page
scp ~/Downloads/compulife/usmain.html compulife@YOUR_SERVER_IP:~/public_html/

# Upload CSS files
scp ~/Downloads/compulife/*.css compulife@YOUR_SERVER_IP:~/public_html/css/
```

**Verify on server:**
```bash
ls ~/public_html/cgi-bin/COMPLIFE/USER/ENSURANCE/
# Should show: TEMPLATE.HTM, ERRORTEM.HTM, etc.

ls ~/public_html/usmain.html
# Should exist
```

**Expected time:** 3 minutes

### Step 6: Create CQS.conf

```bash
# Create the config file
nano ~/public_html/cgi-bin/CQS.conf
```

**Paste this (the ONLY valid format):**
```ini
[enginecounter]
location=/home/compulife/logs/compulife
```

**Save:** Ctrl+O, Enter, Ctrl+X

**What this does:**
- Points to a writable directory where CQS will store monthly quote count CSV files and Error.log
- That's ALL CQS.conf does — counter location and error logging

**Expected time:** 1 minute

### Step 7: Edit usmain.html to Set UserLocation

The sample usmain.html needs to be modified to point to our UserLocation.

```bash
nano ~/public_html/usmain.html
```

**Find the hidden input for UserLocation and change it:**
```html
<!-- Change this line: -->
<input type="hidden" name="UserLocation" value="USER2">

<!-- To this: -->
<input type="hidden" name="UserLocation" value="ENSURANCE">
```

**Also verify the form action points to the correct CGI path:**
```html
<FORM action="cgi-bin/cqsl.cgi" method="POST">
```

**Save:** Ctrl+O, Enter, Ctrl+X

**Expected time:** 2 minutes

### Step 8: Configure Nginx to Serve CGI

Nginx doesn't natively execute CGI scripts. We need `fcgiwrap` to bridge Nginx and CGI.

```bash
# Install fcgiwrap
sudo apt install -y fcgiwrap

# Start and enable fcgiwrap
sudo systemctl start fcgiwrap
sudo systemctl enable fcgiwrap

# Verify it's running
sudo systemctl status fcgiwrap
```

**Create Nginx config:**
```bash
sudo nano /etc/nginx/sites-available/compulife
```

**Paste this:**
```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;  # Replace with your IP or domain

    root /home/compulife/public_html;
    index usmain.html index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ =404;
    }

    # Handle CGI scripts
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

**Enable the site:**
```bash
# Enable our config
sudo ln -sf /etc/nginx/sites-available/compulife /etc/nginx/sites-enabled/

# Optionally disable default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# If test passes, reload
sudo systemctl reload nginx
```

**Grant Nginx read access:**
```bash
# Nginx worker runs as www-data, needs read access
chmod o+rx /home/compulife
chmod -R o+rx /home/compulife/public_html
```

**Expected time:** 5 minutes

### Step 9: Test via Browser

1. Open your browser
2. Navigate to: `http://YOUR_SERVER_IP/usmain.html`
3. You should see the Compulife sample quote form
4. Fill in the form:
   - State: Texas (or any state)
   - Birth Year/Month/Day: 1990/6/15
   - Sex: Male
   - Smoker: No
   - Face Amount: 500000
   - Category: 20 Year Level Term Guaranteed
5. Click Submit
6. You should see a comparison table with carrier names and premiums

**If you get a blank page or error:**
```bash
# Check Nginx error log
sudo tail -20 /var/log/nginx/error.log

# Check CQS error log
cat ~/logs/compulife/Error.log

# Check fcgiwrap is running
sudo systemctl status fcgiwrap
```

**Expected time:** 2 minutes

---

## Validation Checklist

Before moving to next task, verify:

- [ ] cqsl.cgi exists and is executable: `-rwxr-xr-x`
- [ ] Data files in COMPLIFE directory (10+ files)
- [ ] Template files in COMPLIFE/USER/ENSURANCE/ directory
- [ ] CQS.conf exists with correct log location
- [ ] usmain.html accessible at http://YOUR_SERVER_IP/usmain.html
- [ ] Submitting form returns comparison results with carrier premiums
- [ ] No errors in Nginx error log or CQS Error.log

**If all checkboxes are ✅, proceed to next task: `05-json-template.md`**

---

## Input Parameter Reference (from readme.html)

These are the actual parameters CQS accepts via HTTP POST:

| Parameter | Values | Description |
|-----------|--------|-------------|
| FaceAmount | number | Coverage amount (e.g., 500000) |
| State | 1-56 | Numeric state code (see Appendix below) |
| BirthYear | 1900-present | Year of birth |
| BirthMonth | 1-12 | Month of birth |
| Birthday | 1-31 | Day of birth |
| Sex | "M" or "F" | Gender |
| Smoker | "Y" or "N" | Tobacco use |
| Health | "R","RP","P","PP","T1"-"T16" | Health class (Regular, Regular Plus, Preferred, Preferred Plus, Table Ratings) |
| NewCategory | "1"-"8","A"-"Y","Z:..." | Product category code (see below) |
| ModeUsed | "A","M","Q","H" | Premium mode (Annual, Monthly, Quarterly, Half-yearly) |
| UserLocation | string | Subdirectory name under COMPLIFE/USER/ |

### NewCategory Codes (US Term Products)
| Code | Product |
|------|---------|
| 1 | 1 Year Level Term |
| 2 | 5 Year Level Term Guaranteed |
| 3 | 10 Year Level Term Guaranteed |
| 4 | 15 Year Level Term Guaranteed |
| 5 | 20 Year Level Term Guaranteed |
| 6 | 25 Year Level Term Guaranteed |
| 7 | 30 Year Level Term Guaranteed |
| T | To Age 65 Level Guaranteed |
| U | To Age 70 Level Guaranteed |
| V | To Age 75 Level Guaranteed |
| 8 | To Age 121 Level (No Lapse U/L) |

### Common US State Codes
| Code | State |
|------|-------|
| 5 | California |
| 10 | Florida |
| 14 | Illinois |
| 33 | NY Business |
| 52 | NY Non-Business |
| 44 | Texas |

### Template Dollar Codes (inside $prodline$ loop)
| Code | Description |
|------|-------------|
| $company$ | Company name |
| $product$ | Product name |
| $healthcat$ | Health category (e.g., "Super Preferred Non-Tobacco") |
| $PremiumAnnual$ | Annual premium (always annual) |
| $Premium$ | Premium in selected ModeUsed |
| $comp$ | Internal company code |
| $prod$ | Internal product code |
| $guar$ | "gtd" if guaranteed, "**" if not |
| $policyfee$ | Annual policy fee |
| $rgpfpp$ | Rate class abbreviation (Rg, R+, Pf, P+) |

---

## Cost Tracker

**Spent so far:**
- DigitalOcean server: $24/month (from Task 1)
- Compulife Engine: ~$1,650-2,000/year (already purchased)
- Time investment: ~30 minutes

**Running total:** $24/month + $138-167/month (Compulife annual / 12)

---

## Quick Reference

**Important paths:**
```
CGI executable:     /home/compulife/public_html/cgi-bin/cqsl.cgi
Data files:         /home/compulife/public_html/cgi-bin/COMPLIFE/
Config file:        /home/compulife/public_html/cgi-bin/CQS.conf
Template files:     /home/compulife/public_html/cgi-bin/COMPLIFE/USER/ENSURANCE/
Logs:               /home/compulife/logs/compulife/
Sample form:        /home/compulife/public_html/usmain.html
```

**Next task:** Create a JSON output template to extract structured data from CQS
