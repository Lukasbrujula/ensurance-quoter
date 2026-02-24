# Task: Connect Compulife API to Ensurance (Vercel)

## Tools
- Vercel dashboard (for environment variables)
- Code editor (local development)
- Git (for deploying changes)

## Guardrails (What NOT to do)
- ❌ Do NOT hardcode the API URL or API key in source code
- ❌ Do NOT remove the mock pricing provider — keep it as fallback
- ❌ Do NOT break the /quote route — it's the quick-quote fallback
- ❌ Do NOT change the PricingProvider interface

## Knowledge (Context needed)
- **How pricing works today:** Ensurance uses a `PricingProvider` interface (`lib/engine/pricing.ts`). Currently `MockPricingProvider` is active.
- **What we're doing:** Creating a `CompulifePricingProvider` that implements the same interface but calls the real Compulife API instead of returning mock data.
- **Config swap:** `lib/engine/pricing-config.ts` is the single config point where we switch from mock to Compulife.
- **Graceful fallback:** If the Compulife API is down, we can fall back to mock pricing with a warning.

## Memory (Does past context matter?)
- ✅ YES — Compulife API is live at https://compulife-api.yourdomain.com (Tasks 4-8)
- ✅ YES — `PricingProvider` interface is defined in `lib/engine/pricing.ts`
- ✅ YES — `MockPricingProvider` implements this interface
- ✅ YES — `pricing-config.ts` is where we swap providers

## Success Criteria (How to verify it worked)
1. ✅ `CompulifePricingProvider` implements `PricingProvider` interface
2. ✅ `pricing-config.ts` uses Compulife when env vars are set
3. ✅ Submitting a quote in Ensurance returns real Compulife premiums
4. ✅ Falls back to mock if Compulife API is unreachable
5. ✅ No changes to the frontend — pricing provider is transparent

---

## Step-by-Step Instructions

### Step 1: Add Environment Variables to Vercel

In Vercel dashboard → Your project → Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `COMPULIFE_API_URL` | `https://compulife-api.yourdomain.com/api` | Production, Preview |
| `COMPULIFE_API_KEY` | (your API key from Task 6) | Production, Preview |

### Step 2: Create CompulifePricingProvider

Create `lib/engine/compulife-provider.ts` in your local codebase:

```typescript
import { PricingProvider, PricingRequest, PricingResult } from './pricing';

const COMPULIFE_API_URL = process.env.COMPULIFE_API_URL;
const COMPULIFE_API_KEY = process.env.COMPULIFE_API_KEY;

export class CompulifePricingProvider implements PricingProvider {
  readonly name = 'compulife';

  async getQuotes(request: PricingRequest): Promise<PricingResult[]> {
    if (!COMPULIFE_API_URL || !COMPULIFE_API_KEY) {
      throw new Error('Compulife API not configured');
    }

    const response = await fetch(`${COMPULIFE_API_URL}/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': COMPULIFE_API_KEY,
      },
      body: JSON.stringify({
        age: request.age,
        dateOfBirth: request.dateOfBirth,
        gender: request.gender,
        state: request.state,
        coverage: request.faceAmount,
        term: request.term,
        smoker: request.tobacco,
        healthClass: request.healthClass,
        mode: 'annual',
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Compulife API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.results)) {
      throw new Error('Invalid response from Compulife API');
    }

    return data.results.map((r: Record<string, unknown>) => ({
      carrier: String(r.carrier ?? ''),
      product: String(r.product ?? ''),
      annualPremium: Number(r.annualPremium ?? 0),
      monthlyPremium: Number(r.annualPremium ?? 0) / 12,
      healthCategory: String(r.healthCategory ?? ''),
      guaranteed: Boolean(r.guaranteed),
      rateClass: String(r.rateClass ?? ''),
      companyCode: String(r.companyCode ?? ''),
      productCode: String(r.productCode ?? ''),
      policyFee: Number(r.policyFee ?? 0),
    }));
  }
}
```

### Step 3: Update pricing-config.ts

```typescript
import { PricingProvider } from './pricing';
import { MockPricingProvider } from './mock-provider';
import { CompulifePricingProvider } from './compulife-provider';

function createPricingProvider(): PricingProvider {
  if (process.env.COMPULIFE_API_URL && process.env.COMPULIFE_API_KEY) {
    return new CompulifePricingProvider();
  }
  console.warn('Compulife API not configured, using mock pricing');
  return new MockPricingProvider();
}

export const pricingProvider = createPricingProvider();
```

### Step 4: Test Locally

```bash
# Add to .env.local
COMPULIFE_API_URL=https://compulife-api.yourdomain.com/api
COMPULIFE_API_KEY=your-key

# Start dev server
bun dev

# Submit a quote in the UI — should show real premiums
```

### Step 5: Deploy to Vercel

```bash
git add lib/engine/compulife-provider.ts lib/engine/pricing-config.ts
git commit -m "feat: add Compulife pricing provider with fallback to mock"
git push origin feature/lukas
```

Vercel will auto-deploy. The env vars you set in Step 1 will be used.

---

## Validation Checklist

- [ ] CompulifePricingProvider created and type-checks
- [ ] pricing-config.ts auto-selects Compulife when env vars present
- [ ] Quotes show real premiums (different from mock values)
- [ ] Falls back to mock pricing if COMPULIFE_API_URL not set
- [ ] No frontend changes needed
- [ ] /quote route still works (quick quote)
- [ ] /leads/[id] quote still works (lead-centric quote)

**This completes the Compulife integration!**

---

## Monthly Maintenance

Compulife updates rate data monthly. To update:

1. Install new data on your desktop CQS
2. Upload updated data files to server:
   ```bash
   scp /path/to/Complife/GO.PRM compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/COMPLIFE/
   scp /path/to/Complife/COMP.* compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/COMPLIFE/
   scp /path/to/Complife/RATE.* compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/COMPLIFE/
   scp /path/to/Complife/COMPANY.DAT compulife@YOUR_SERVER_IP:~/public_html/cgi-bin/COMPLIFE/
   ```
3. Test a quote to verify new data works
4. No service restart needed — CQS reads data files fresh each request
