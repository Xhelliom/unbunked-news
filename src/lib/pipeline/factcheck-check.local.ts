// Standalone smoke test for the Google ClaimReview connector. Verifies that
// GOOGLE_FACTCHECK_API_KEY is valid and the Fact Check Tools API is reachable,
// WITHOUT booting the pipeline. Run:
//   pnpm factcheck:check-local "the earth is flat"
// Exit 0 = key works (prints any reviews found); exit 1 = key/API problem.

const FACTCHECK_ENDPOINT =
  "https://factchecktools.googleapis.com/v1alpha1/claims:search";

async function main() {
  const key = process.env.GOOGLE_FACTCHECK_API_KEY;
  if (!key) {
    throw new Error(
      "GOOGLE_FACTCHECK_API_KEY is not set — add it to .env.local first",
    );
  }
  const query = process.argv[2] ?? "the earth is flat";
  const url = `${FACTCHECK_ENDPOINT}?query=${encodeURIComponent(query)}&key=${key}`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`HTTP ${response.status}`, await response.text());
    process.exit(1);
  }
  const payload = (await response.json()) as { claims?: unknown[] };
  const count = Array.isArray(payload.claims) ? payload.claims.length : 0;
  console.log(`OK — key valid, API reachable. ${count} claim(s) for "${query}".`);
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

void main();
