/**
 * Compulife API Test Script
 * 
 * Run from your dev environment with:
 *   npx tsx compulife-test.ts
 * 
 * ⚠️  FIRST REQUEST locks your auth ID to this machine's IP address.
 *     That's fine if this is your dev machine — just don't run from a 
 *     throwaway server.
 * 
 * Replace YOUR_AUTH_ID_HERE with your actual Compulife Authorization ID.
 */

const AUTH_ID = "78e9E6E0e";

// Test scenario: 35M non-smoker, $500K, 20yr term, Texas (state code 44)
const quoteRequest = {
  COMPULIFEAUTHORIZATIONID: AUTH_ID,
  BirthDay: "15",
  BirthMonth: "6",
  BirthYear: "1991",
  Sex: "M",
  Smoker: "N",
  Health: "PP",           // Preferred Plus
  NewCategory: "5",       // 20 Year Level Term
  FaceAmount: "500000",
  State: "44",            // Texas
  ModeUsed: "M",          // Include monthly premium
  SortOverride1: "A",     // Sort by annual premium
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function getPublicIP(): Promise<string> {
  const res = await fetch("https://api.ipify.org?format=text");
  return (await res.text()).trim();
}

async function testQuote() {
  console.log("=== Compulife API Test ===\n");
  console.log("Scenario: 35M, non-smoker, Preferred Plus, $500K, 20yr term, Texas\n");

  const publicIP = await getPublicIP();
  console.log(`Public IP: ${publicIP}\n`);

  const fullRequest = { ...quoteRequest, REMOTE_IP: publicIP };
  const json = JSON.stringify(fullRequest);
  const url = `https://www.compulifeapi.com/api/request/?COMPULIFE=${json}`;

  console.log("Request URL (truncated):", url.substring(0, 120) + "...\n");

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": UA },
    });

    if (!response.ok) {
      console.error(`HTTP Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error("Body:", text.substring(0, 500));
      return;
    }

    const data = await response.json();

    // Save full response to file for analysis
    const fs = await import("fs");
    fs.writeFileSync(
      "compulife-response-raw.json",
      JSON.stringify(data, null, 2)
    );
    console.log("✅ Full response saved to compulife-response-raw.json\n");

    // Parse and display summary
    const results = data.Compulife_ComparisonResults;
    if (!results) {
      console.error("No comparison results found. Full response:");
      console.log(JSON.stringify(data, null, 2).substring(0, 2000));
      return;
    }

    // Handle single category or array of categories
    const categories = Array.isArray(results) ? results : [results];

    for (const category of categories) {
      console.log(`📋 ${category.Compulife_title}`);
      console.log(`   ${category.Compulife_Results.length} carriers returned\n`);

      console.log(
        "   " +
        "Company".padEnd(45) +
        "Product".padEnd(30) +
        "Annual".padStart(10) +
        "Monthly".padStart(10) +
        "AMB".padStart(5) +
        "  Health Class"
      );
      console.log("   " + "-".repeat(120));

      for (const result of category.Compulife_Results) {
        const annual = `$${result.Compulife_premiumAnnual}`;
        const monthly = result.Compulife_premiumM
          ? `$${result.Compulife_premiumM}`
          : "N/A";

        console.log(
          "   " +
          result.Compulife_company.padEnd(45) +
          result.Compulife_product.padEnd(30) +
          annual.padStart(10) +
          monthly.padStart(10) +
          result.Compulife_amb.padStart(5) +
          `  ${result.Compulife_rgpfpp}`
        );
      }
    }

    // Show lookup metadata
    console.log("\n📊 Lookup Metadata:");
    if (data.Lookup) {
      console.log(`   Age (actual): ${data.Lookup.Birthdate?.ActualAge}`);
      console.log(`   Age (nearest): ${data.Lookup.Birthdate?.NearestAge}`);
      console.log(`   State resolved: ${data.Lookup.state_fromzipcode}`);
      console.log(`   Face amount: ${data.Lookup.faceamount}`);
      console.log(`   Health: ${data.Lookup.healthtxt}`);
    }

    // Show a single result object in full for structure reference
    if (categories[0]?.Compulife_Results?.[0]) {
      console.log("\n📦 First result object (full structure):");
      console.log(JSON.stringify(categories[0].Compulife_Results[0], null, 2));
    }

    // Check which of our carriers appeared
    console.log("\n🔍 Our carrier coverage check:");
    const ourCodes: Record<string, string> = {
      AMAM: "American Amicable (amam)",
      INDE: "Foresters (foresters)",
      UTOM: "Mutual of Omaha (moo)",
      JOHU: "John Hancock USA (jh)",
      BANN: "Banner Life / LGA (lga)",
      SBLI: "SBLI (sbli)",
      NATI: "National Life (nlg)",
      TRAN: "Transamerica (transam)",
      AMSV: "Americo (americo)",
      UTHO: "United Home Life (uhl)",
    };

    const allCodes = categories.flatMap((c) =>
      c.Compulife_Results.map((r: any) =>
        r.Compulife_compprodcode?.substring(1, 5)
      )
    );

    for (const [code, name] of Object.entries(ourCodes)) {
      const found = allCodes.includes(code);
      console.log(`   ${found ? "✅" : "❌"} ${code} — ${name}`);
    }
  } catch (error) {
    console.error("Request failed:", error);
  }
}

// Also test public endpoints (no auth needed)
async function testPublicEndpoints() {
  console.log("\n=== Public Endpoint Tests (no auth) ===\n");

  // Company list
  try {
    const res = await fetch("https://www.compulifeapi.com/api/CompanyList/", {
      headers: { "User-Agent": UA },
    });
    const companies = await res.json();
    console.log(`✅ CompanyList: ${companies.length} companies available`);
  } catch (e) {
    console.error("❌ CompanyList failed:", e);
  }
}

async function main() {
  if (AUTH_ID === "YOUR_AUTH_ID_HERE") {
    console.log("⚠️  Replace YOUR_AUTH_ID_HERE with your actual auth ID first!");
    console.log("   Then run: npx tsx compulife-test.ts\n");

    // Still run public endpoints
    await testPublicEndpoints();
    return;
  }

  await testQuote();
}

main();
