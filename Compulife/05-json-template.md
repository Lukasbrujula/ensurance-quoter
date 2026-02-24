# Task: Create JSON Output Template for CQS

## Tools
- SSH terminal connection
- Text editor (nano or vim on server)
- curl (for testing CGI directly)

## Guardrails (What NOT to do)
- ❌ Do NOT modify cqsl.cgi — it's proprietary
- ❌ Do NOT try to get CQS to output "real" JSON natively — it only does template substitution
- ❌ Do NOT use dollar codes outside $prodline$ that belong inside it (like $company$, $premium$)
- ❌ Do NOT forget the $prodline=N$ and $/prodline$ markers — without them, no results render
- ❌ Do NOT exceed 4000 characters inside the prodline block

## Knowledge (Context needed)
- **Why do we need this?** CQS outputs HTML by default. Our Node.js API wrapper needs structured data (JSON) to send to the Ensurance frontend.
- **How templates work:** CQS reads a template file (TEMPLATE.HTM), finds dollar codes (like `$company$`, `$Premium$`), and replaces them with actual data. Everything else passes through as-is.
- **$prodline=50$:** This marks the start of a repeating block. CQS loops once per product result. `50` = max results to show.
- **$/prodline$:** Marks the end of the repeating block.
- **The trick:** Instead of HTML in the template, we put a JSON-like structure with dollar codes. CQS substitutes the values, giving us parseable structured output.
- **Not real JSON:** The output won't be perfectly valid JSON (no escaping of special characters in carrier names). Our Node.js wrapper will handle parsing and cleanup.

## Memory (Does past context matter?)
- ✅ YES — CQS is installed and producing HTML output (Task 4)
- ✅ YES — We know the input parameters and dollar codes (from readme.html)
- ✅ YES — Template files are in COMPLIFE/USER/ENSURANCE/
- ❌ NO — No API wrapper exists yet (Task 6)

## Success Criteria (How to verify it worked)
You'll know this task succeeded when:
1. ✅ JSON template file exists: `ls ~/public_html/cgi-bin/COMPLIFE/USER/ENSURANCE/JSON_TEMPLATE.HTM`
2. ✅ Submitting a quote request with TEMPLATEFILE=JSON_TEMPLATE.HTM returns semicolon-delimited structured data
3. ✅ Output contains company name, product, premium, health class for each result
4. ✅ Output is parseable by a simple line-by-line parser (one product per line)

## Dependencies (What must exist first)
**Required before starting:**
- [x] Task 4 complete (CQS installed and producing HTML results)
- [x] Template files in UserLocation directory
- [x] Nginx + fcgiwrap serving CGI

## Failure Handling (What if it fails?)
| Error | Cause | Solution |
|-------|-------|----------|
| Blank output | Template not found | Check file exists in correct UserLocation dir |
| HTML output instead of structured data | TEMPLATEFILE not passed in form | Add hidden input: `<input type="hidden" name="TEMPLATEFILE" value="JSON_TEMPLATE.HTM">` |
| Missing data in output | Wrong dollar code | Double-check dollar codes from readme.html |
| $prodline$ loop not rendering | Missing $/prodline$ end marker | Ensure both markers present |

---

## Step-by-Step Instructions

### Step 1: Create the JSON Template

This template outputs structured data instead of HTML. We use a semicolon-delimited format because carrier names might contain commas.

```bash
ssh compulife@YOUR_SERVER_IP
nano ~/public_html/cgi-bin/COMPLIFE/USER/ENSURANCE/JSON_TEMPLATE.HTM
```

**Paste this:**
```
Content-type: text/plain

:::HEADER:::
face=$face$
state=$state$
sex=$sex$
smoker=$smoker$
health=$health$
category=$cat$
modeused=$modeused$
birthyear=$year$
birthmonth=$month$
birthday=$day$
:::RESULTS:::
$prodline=50$
$comp$;$prod$;$company$;$product$;$healthcat$;$PremiumAnnual$;$Premium$;$policyfee$;$guar$;$rgpfpp$
$/prodline$
:::END:::
```

**Save:** Ctrl+O, Enter, Ctrl+X

**What this does:**
- The header section echoes back the input parameters (for verification)
- The `$prodline=50$` loop iterates over up to 50 matching products
- Each line contains semicolon-separated fields:
  - Company code, Product code, Company name, Product name, Health category, Annual premium, Modal premium, Policy fee, Guaranteed flag, Rate class
- The `:::HEADER:::`, `:::RESULTS:::`, `:::END:::` markers make parsing easy

**Expected time:** 5 minutes

### Step 2: Create a Test Form

Create a simple HTML form that posts to CQS using the JSON template:

```bash
nano ~/public_html/test-json.html
```

**Paste this:**
```html
<!DOCTYPE html>
<html>
<head><title>CQS JSON Template Test</title></head>
<body>
<h2>CQS Structured Output Test</h2>
<form action="cgi-bin/cqsl.cgi" method="POST">
  <input type="hidden" name="TEMPLATEFILE" value="JSON_TEMPLATE.HTM">
  <input type="hidden" name="UserLocation" value="ENSURANCE">
  <input type="hidden" name="ModeUsed" value="A">

  State: <select name="State">
    <option value="44">Texas</option>
    <option value="5">California</option>
    <option value="10">Florida</option>
  </select><br><br>

  Birth Year: <input type="text" name="BirthYear" value="1990"><br>
  Birth Month: <input type="text" name="BirthMonth" value="6"><br>
  Birthday: <input type="text" name="Birthday" value="15"><br><br>

  Sex: <select name="Sex">
    <option value="M">Male</option>
    <option value="F">Female</option>
  </select><br><br>

  Smoker: <select name="Smoker">
    <option value="N">No</option>
    <option value="Y">Yes</option>
  </select><br><br>

  Health: <select name="Health">
    <option value="PP">Preferred Plus</option>
    <option value="P">Preferred</option>
    <option value="RP">Regular Plus</option>
    <option value="R">Regular</option>
  </select><br><br>

  Face Amount: <input type="text" name="FaceAmount" value="500000"><br><br>

  Category: <select name="NewCategory">
    <option value="3">10 Year Term</option>
    <option value="5" selected>20 Year Term</option>
    <option value="7">30 Year Term</option>
  </select><br><br>

  <input type="submit" value="Get Structured Quote">
</form>
</body>
</html>
```

**Save:** Ctrl+O, Enter, Ctrl+X

**Expected time:** 3 minutes

### Step 3: Test the Template

1. Open browser: `http://YOUR_SERVER_IP/test-json.html`
2. Leave defaults (35 year old male, non-smoker, TX, $500k, 20 year term)
3. Click "Get Structured Quote"

**Expected output (plain text, not HTML):**
```
:::HEADER:::
face=500,000
state=Texas
sex=Male
smoker=Non-Smoker
health=Preferred Plus
category=20 Year Level Term Guaranteed
modeused=Annual
birthyear=1990
birthmonth=6
birthday=15
:::RESULTS:::
SBL;001;SBLI;Saver 20;Super Preferred Non-Tobacco;345.00;345.00;0.00;gtd;P+
BAN;002;Banner Life;OPTerm 20;Preferred Plus Non-Tobacco;355.00;355.00;60.00;gtd;P+
...more results...
:::END:::
```

### Step 4: Test via curl (for API wrapper later)

```bash
# Test directly with curl — this is how the Node.js wrapper will call CQS
curl -X POST http://localhost/cgi-bin/cqsl.cgi \
  -d "FaceAmount=500000" \
  -d "State=44" \
  -d "BirthYear=1990" \
  -d "BirthMonth=6" \
  -d "Birthday=15" \
  -d "Sex=M" \
  -d "Smoker=N" \
  -d "Health=PP" \
  -d "NewCategory=5" \
  -d "ModeUsed=A" \
  -d "TEMPLATEFILE=JSON_TEMPLATE.HTM" \
  -d "UserLocation=ENSURANCE"
```

**This should return the same structured output as the browser test.**

**Expected time:** 2 minutes

---

## Validation Checklist

Before moving to next task, verify:

- [ ] JSON_TEMPLATE.HTM exists in UserLocation directory
- [ ] test-json.html form submits and returns structured (not HTML) output
- [ ] curl POST to cqsl.cgi with TEMPLATEFILE=JSON_TEMPLATE.HTM returns structured data
- [ ] Output contains :::HEADER:::, :::RESULTS:::, :::END::: markers
- [ ] Each result line has semicolon-separated fields (company, product, premiums, etc.)
- [ ] Multiple carriers appear in results (20+ for a standard lookup)

**If all checkboxes are ✅, proceed to next task: `06-build-api-wrapper.md`**

---

## Quick Reference

**Key file:**
```
JSON template:  ~/public_html/cgi-bin/COMPLIFE/USER/ENSURANCE/JSON_TEMPLATE.HTM
Test form:      ~/public_html/test-json.html
```

**curl test command:**
```bash
curl -X POST http://localhost/cgi-bin/cqsl.cgi \
  -d "FaceAmount=500000&State=44&BirthYear=1990&BirthMonth=6&Birthday=15&Sex=M&Smoker=N&Health=PP&NewCategory=5&ModeUsed=A&TEMPLATEFILE=JSON_TEMPLATE.HTM&UserLocation=ENSURANCE"
```

**Next task:** Build Node.js API wrapper that calls CQS and returns real JSON
