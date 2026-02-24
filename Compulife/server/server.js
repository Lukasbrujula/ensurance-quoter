require('dotenv').config();
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
const HEALTH_CLASS_MAP = {
  'preferred_plus': 'PP',
  'preferred': 'P',
  'standard_plus': 'RP',
  'standard': 'R',
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
