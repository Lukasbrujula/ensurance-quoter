# Task: Build Node.js API Wrapper Around CQS

## Tools
- SSH terminal as 'compulife' user
- Node.js 20 (installed in Task 3)
- npm for package management
- Text editor (nano, or edit locally and scp)

## Guardrails (What NOT to do)
- ❌ Do NOT call cqsl.cgi via command-line arguments — it's a CGI binary, not a CLI tool
- ❌ Do NOT modify cqsl.cgi
- ❌ Do NOT expose the API without authentication (add API key requirement)
- ❌ Do NOT trust CQS output blindly — validate and sanitize before returning
- ❌ Do NOT use sudo with npm commands (nvm handles permissions)

## Knowledge (Context needed)
- **How the wrapper works:** Our Node.js Express server receives a JSON request from Ensurance → translates it to CQS form parameters → sends HTTP POST to the local Nginx CGI endpoint → parses the structured output from JSON_TEMPLATE.HTM → returns real JSON to Ensurance
- **Why not spawn CQS directly?** CQS is a CGI binary. While you *could* set CGI environment variables and pipe stdin, calling via HTTP POST through Nginx/fcgiwrap is simpler, more reliable, and matches how CQS is designed to work.
- **Parameter mapping:** Ensurance sends `age`, `gender`, `state`, `coverage`, `term` — the wrapper converts these to CQS parameters: `BirthYear`/`BirthMonth`/`Birthday`, `Sex`, `State` (numeric code), `FaceAmount`, `NewCategory`

## Memory (Does past context matter?)
- ✅ YES — CQS is installed and producing structured output via JSON_TEMPLATE.HTM (Tasks 4-5)
- ✅ YES — Node.js 20 is installed (Task 3)
- ✅ YES — Nginx is running and serving CGI (Task 4)
- ✅ YES — Ensurance quote engine currently uses mock pricing (`lib/engine/mock-provider.ts`) with a `PricingProvider` interface
- ✅ YES — The `PricingProvider` interface expects `PricingRequest` → `PricingResult[]`

## Success Criteria (How to verify it worked)
You'll know this task succeeded when:
1. ✅ Express server starts: `node server.js` runs without errors
2. ✅ Health check works: `curl http://localhost:3001/health` returns OK
3. ✅ Quote API works: `POST /quote` with JSON body returns carrier quotes as JSON
4. ✅ API key required: requests without `X-API-Key` header are rejected with 401
5. ✅ All CQS parameters are correctly mapped from the API input format

## Dependencies (What must exist first)
**Required before starting:**
- [x] Task 4 complete (CQS installed)
- [x] Task 5 complete (JSON template producing structured output)
- [x] Node.js 20 installed
- [x] Nginx serving CGI at http://localhost/cgi-bin/cqsl.cgi

---

## Step-by-Step Instructions

### Step 1: Create Project Directory

```bash
ssh compulife@YOUR_SERVER_IP

# Create project directory
mkdir -p ~/compulife-api
cd ~/compulife-api

# Initialize Node.js project
npm init -y
```

### Step 2: Install Dependencies

```bash
cd ~/compulife-api

# Express for HTTP server
# node-fetch for calling CQS via HTTP
npm install express

# No need for node-fetch — Node 20 has native fetch
```

### Step 3: Create the API Server

```bash
nano ~/compulife-api/server.js
```

**Paste this:**
```javascript
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'change-me-in-production';
const CQS_URL = process.env.CQS_URL || 'http://localhost/cgi-bin/cqsl.cgi';

// --- State code mapping ---
const STATE_CODES = {
  'AL': 1, 'AK': 2, 'AZ': 3, 'AR': 4, 'CA': 5, 'CO': 6, 'CT': 7,
  'DE': 8, 'DC': 9, 'FL': 10, 'GA': 11, 'HI': 12, 'ID': 13, 'IL': 14,
  'IN': 15, 'IA': 16, 'KS': 17, 'KY': 18, 'LA': 19, 'ME': 20,
  'MD': 21, 'MA': 22, 'MI': 23, 'MN': 24, 'MS': 25, 'MO': 26,
  'MT': 27, 'NE': 28, 'NV': 29, 'NH': 30, 'NJ': 31, 'NM': 32,
  'NY': 33, 'NY_NON_BUS': 52, 'NC': 34, 'ND': 35, 'OH': 36,
  'OK': 37, 'OR': 38, 'PA': 39, 'RI': 40, 'SC': 41, 'SD': 42,
  'TN': 43, 'TX': 44, 'UT': 45, 'VT': 46, 'VA': 47, 'WA': 48,
  'WV': 49, 'WI': 50, 'WY': 51
};

// --- Term to NewCategory mapping ---
const TERM_TO_CATEGORY = {
  1: '1', 5: '2', 10: '3', 15: '4', 20: '5', 25: '6', 30: '7'
};

// --- Health class mapping ---
// Ensurance uses descriptive names; CQS uses codes
const HEALTH_CLASS_MAP = {
  'preferred_plus': 'PP',
  'preferred': 'P',
  'standard_plus': 'RP',  // CQS calls it "Regular Plus"
  'standard': 'R',        // CQS calls it "Regular"
};

// --- Auth middleware ---
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
}

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Quote endpoint ---
app.post('/quote', requireApiKey, async (req, res) => {
  try {
    const {
      age, dateOfBirth, gender, state, coverage, term,
      smoker, healthClass, mode
    } = req.body;

    // Calculate birth date from age if dateOfBirth not provided
    let birthYear, birthMonth, birthDay;
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      birthYear = dob.getFullYear();
      birthMonth = dob.getMonth() + 1;
      birthDay = dob.getDate();
    } else if (age) {
      const now = new Date();
      birthYear = now.getFullYear() - age;
      birthMonth = now.getMonth() + 1;
      birthDay = 1;
    } else {
      return res.status(400).json({ error: 'age or dateOfBirth required' });
    }

    // Map state abbreviation to numeric code
    const stateCode = typeof state === 'number' ? state : STATE_CODES[state?.toUpperCase()];
    if (!stateCode) {
      return res.status(400).json({ error: `Invalid state: ${state}` });
    }

    // Map term to NewCategory code
    const categoryCode = TERM_TO_CATEGORY[term];
    if (!categoryCode) {
      return res.status(400).json({
        error: `Invalid term: ${term}. Valid: ${Object.keys(TERM_TO_CATEGORY).join(', ')}`
      });
    }

    // Build CQS form parameters
    const params = new URLSearchParams({
      FaceAmount: String(coverage),
      State: String(stateCode),
      BirthYear: String(birthYear),
      BirthMonth: String(birthMonth),
      Birthday: String(birthDay),
      Sex: gender === 'F' ? 'F' : 'M',
      Smoker: smoker ? 'Y' : 'N',
      Health: HEALTH_CLASS_MAP[healthClass] || 'R',
      NewCategory: categoryCode,
      ModeUsed: mode === 'monthly' ? 'M' : 'A',
      TEMPLATEFILE: 'JSON_TEMPLATE.HTM',
      UserLocation: 'ENSURANCE'
    });

    // Call CQS via HTTP POST
    const response = await fetch(CQS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const rawOutput = await response.text();

    // Parse the structured output
    const results = parseOutput(rawOutput);

    res.json({
      success: true,
      input: {
        state, stateCode, birthYear, birthMonth, birthDay,
        gender, smoker: !!smoker, healthClass: healthClass || 'standard',
        coverage, term, mode: mode || 'annual'
      },
      results,
      resultCount: results.length
    });
  } catch (error) {
    console.error('Quote error:', error.message);
    res.status(500).json({ error: 'Quote engine error' });
  }
});

// --- Parse CQS structured output ---
function parseOutput(raw) {
  const results = [];

  // Find the RESULTS section
  const resultsStart = raw.indexOf(':::RESULTS:::');
  const resultsEnd = raw.indexOf(':::END:::');

  if (resultsStart === -1 || resultsEnd === -1) {
    console.error('Could not find RESULTS markers in CQS output');
    return results;
  }

  const resultSection = raw.substring(resultsStart + ':::RESULTS:::'.length, resultsEnd).trim();
  const lines = resultSection.split('\n').filter(line => line.trim().length > 0);

  for (const line of lines) {
    const parts = line.trim().split(';');
    if (parts.length < 10) continue;

    const annualPremium = parseFloat(parts[5]?.replace(/,/g, ''));
    const modalPremium = parseFloat(parts[6]?.replace(/,/g, ''));
    const policyFee = parseFloat(parts[7]?.replace(/,/g, ''));

    if (isNaN(annualPremium)) continue;

    results.push({
      companyCode: parts[0]?.trim(),
      productCode: parts[1]?.trim(),
      carrier: parts[2]?.trim(),
      product: parts[3]?.trim(),
      healthCategory: parts[4]?.trim(),
      annualPremium,
      modalPremium,
      policyFee,
      guaranteed: parts[8]?.trim() === 'gtd',
      rateClass: parts[9]?.trim()
    });
  }

  return results;
}

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Compulife API wrapper running on port ${PORT}`);
  console.log(`CQS endpoint: ${CQS_URL}`);
});
```

**Save:** Ctrl+O, Enter, Ctrl+X

**Expected time:** 5 minutes

### Step 4: Test the API

```bash
cd ~/compulife-api

# Start the server
API_KEY=your-secret-key node server.js

# In another terminal, test health check
curl http://localhost:3001/health

# Test a quote
curl -X POST http://localhost:3001/quote \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "age": 35,
    "gender": "M",
    "state": "TX",
    "coverage": 500000,
    "term": 20,
    "smoker": false,
    "healthClass": "preferred_plus",
    "mode": "annual"
  }'
```

**Expected output:**
```json
{
  "success": true,
  "input": {
    "state": "TX",
    "stateCode": 44,
    "birthYear": 1991,
    "birthMonth": 2,
    "birthDay": 1,
    "gender": "M",
    "smoker": false,
    "healthClass": "preferred_plus",
    "coverage": 500000,
    "term": 20,
    "mode": "annual"
  },
  "results": [
    {
      "companyCode": "SBL",
      "productCode": "001",
      "carrier": "SBLI",
      "product": "Saver 20",
      "healthCategory": "Super Preferred Non-Tobacco",
      "annualPremium": 345.00,
      "modalPremium": 345.00,
      "policyFee": 0.00,
      "guaranteed": true,
      "rateClass": "P+"
    }
  ],
  "resultCount": 30
}
```

### Step 5: Create Environment File

```bash
nano ~/compulife-api/.env
```

```bash
PORT=3001
API_KEY=generate-a-strong-key-here
CQS_URL=http://localhost/cgi-bin/cqsl.cgi
```

Update server.js to load .env:
```bash
# Install dotenv
npm install dotenv

# Add to top of server.js:
# require('dotenv').config();
```

**Expected time:** 2 minutes

---

## Validation Checklist

Before moving to next task, verify:

- [ ] `node server.js` starts without errors
- [ ] `GET /health` returns JSON status
- [ ] `POST /quote` returns carrier quotes as JSON
- [ ] API key is required (401 without it)
- [ ] State abbreviations map correctly (TX → 44)
- [ ] Term values map to correct categories (20 → "5")
- [ ] Health classes map correctly (preferred_plus → PP)
- [ ] Results contain carrier name, product, annual premium, rate class
- [ ] 20+ carriers returned for a standard quote

**If all checkboxes are ✅, proceed to next task: `07-systemd-service.md`**

---

## Quick Reference

**Start the API:**
```bash
cd ~/compulife-api && API_KEY=your-key node server.js
```

**Test command:**
```bash
curl -X POST http://localhost:3001/quote \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{"age":35,"gender":"M","state":"TX","coverage":500000,"term":20,"smoker":false,"healthClass":"preferred_plus"}'
```

**Next task:** Configure systemd service for auto-start and crash recovery
