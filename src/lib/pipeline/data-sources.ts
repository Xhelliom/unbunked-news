import "server-only";

// Unified access to the external data sources that feed the scoring decision
// (docs/SCORING.md §6). Every source degrades gracefully: a missing API key, a
// network error or a malformed payload yields `null` ("unknown") — NEVER an
// invented result. Unknown lowers confidence; it never fabricates a verdict.
//
// Status: the fact-check connector is wired to the ClaimReview API and active
// when GOOGLE_FACTCHECK_API_KEY is set. The unreliable-domain and WHOIS
// connectors are stubs behind the same interface, returning "unknown" until
// their sources are configured. See the TODOs below.

const FACTCHECK_ENDPOINT =
  "https://factchecktools.googleapis.com/v1alpha1/claims:search";
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_FACTCHECK_CLAIMS = 5;
const FACTCHECK_TIMEOUT_MS = 8000;

export type FactCheckReview = {
  claim: string;
  publisher: string;
  rating: string;
  url: string;
};

// Per-claim outcome of the ClaimReview lookup: "found" = at least one review,
// "none" = the database was queried and returned nothing, "unknown" = the query
// could not run (no key, network/timeout/parse failure). "none" and "unknown"
// are NOT the same: the assessor should treat "unknown" as missing evidence
// (lower confidence), never as a clean record.
export type FactCheckStatus = "found" | "none" | "unknown";
export type ClaimFactCheck = { claim: string; status: FactCheckStatus };

// Aggregated evidence for one article. `available` is false only when EVERY
// source came back unknown, which the caller uses to lower global confidence.
export type ExternalEvidence = {
  factChecks: FactCheckReview[];
  // Per-claim coverage of the fact-check lookup (one entry per queried claim).
  factCheckStatuses: ClaimFactCheck[];
  // null = unknown (source not configured / unreachable); never a guessed bool.
  unreliableDomain: boolean | null;
  domainAgeDays: number | null;
  available: boolean;
  notes: string[];
};

type CacheEntry<T> = { value: T; expires: number };
const cache = new Map<string, CacheEntry<unknown>>();

async function cached<T>(key: string, produce: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await produce();
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// --- ClaimReview fact-check search (active when the API key is present) ---

function parseFactCheckPayload(
  claim: string,
  payload: unknown,
): FactCheckReview[] {
  if (!payload || typeof payload !== "object") return [];
  const claims = (payload as { claims?: unknown }).claims;
  if (!Array.isArray(claims)) return [];
  return claims.flatMap((entry) => {
    const reviews = (entry as { claimReview?: unknown }).claimReview;
    if (!Array.isArray(reviews)) return [];
    return reviews.flatMap((review) => {
      const r = review as Record<string, unknown>;
      const url = typeof r.url === "string" ? r.url : null;
      if (!url) return [];
      const publisher =
        r.publisher && typeof r.publisher === "object"
          ? String((r.publisher as { name?: unknown }).name ?? "unknown")
          : "unknown";
      return [
        {
          claim,
          publisher,
          rating: typeof r.textualRating === "string" ? r.textualRating : "",
          url,
        },
      ];
    });
  });
}

async function searchOneFactCheck(
  claim: string,
  key: string,
): Promise<FactCheckReview[] | null> {
  const url = `${FACTCHECK_ENDPOINT}?query=${encodeURIComponent(claim)}&languageCode=&key=${key}`;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FACTCHECK_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return parseFactCheckPayload(claim, await response.json());
  } catch {
    // Network/timeout/parse failure → unknown, not an empty confirmation.
    return null;
  }
}

async function lookupFactChecks(
  claims: string[],
): Promise<{
  reviews: FactCheckReview[];
  known: boolean;
  statuses: ClaimFactCheck[];
}> {
  const queried = claims.slice(0, MAX_FACTCHECK_CLAIMS);
  const key = process.env.GOOGLE_FACTCHECK_API_KEY;
  if (!key) {
    return {
      reviews: [],
      known: false,
      statuses: queried.map((claim) => ({ claim, status: "unknown" })),
    };
  }

  const results = await Promise.all(
    queried.map((claim) =>
      cached(`factcheck:${claim}`, () => searchOneFactCheck(claim, key)),
    ),
  );
  const statuses: ClaimFactCheck[] = queried.map((claim, index) => {
    const result = results[index];
    const status: FactCheckStatus =
      result === null ? "unknown" : result.length > 0 ? "found" : "none";
    return { claim, status };
  });
  // known = at least one query actually completed (non-null).
  const known = results.some((r) => r !== null);
  const reviews = results.flatMap((r) => r ?? []);
  return { reviews, known, statuses };
}

// --- Unreliable-domain list (stub) ---
// TODO(#scoring-connectors): load a politically-neutral open list of domains
// that repeatedly fail fact-checks (JSON/CSV), cache it, and match `domain`.
// Returns null (unknown) until configured.
async function checkUnreliableDomain(domain: string): Promise<boolean | null> {
  if (!process.env.UNRELIABLE_DOMAINS_URL) return null;
  void domain; // matched against the configured list once it is wired
  return null;
}

// --- WHOIS / domain age (stub) ---
// TODO(#scoring-connectors): query a WHOIS provider for the registration date
// and return the domain age in days, to arm domainImpersonation on freshly
// registered look-alike domains. Returns null (unknown) until configured.
async function lookupDomainAgeDays(domain: string): Promise<number | null> {
  if (!process.env.WHOIS_API_URL) return null;
  void domain; // queried against the WHOIS provider once it is wired
  return null;
}

export async function gatherExternalEvidence(
  articleUrl: string,
  claims: string[],
): Promise<ExternalEvidence> {
  const domain = hostnameOf(articleUrl);
  const notes: string[] = [];

  const [factChecks, unreliableDomain, domainAgeDays] = await Promise.all([
    lookupFactChecks(claims),
    domain
      ? cached(`domain-rep:${domain}`, () => checkUnreliableDomain(domain))
      : Promise.resolve(null),
    domain
      ? cached(`domain-age:${domain}`, () => lookupDomainAgeDays(domain))
      : Promise.resolve(null),
  ]);

  if (!factChecks.known) notes.push("fact-check database unavailable");
  if (unreliableDomain === null) notes.push("domain reputation unknown");
  if (domainAgeDays === null) notes.push("domain age unknown");

  const available =
    factChecks.known || unreliableDomain !== null || domainAgeDays !== null;

  return {
    factChecks: factChecks.reviews,
    factCheckStatuses: factChecks.statuses,
    unreliableDomain,
    domainAgeDays,
    available,
    notes,
  };
}

// Prompt-facing rendering of the external evidence. Explicitly states what is
// unknown so the model lowers confidence rather than assuming a clean record.
export function formatExternalEvidence(evidence: ExternalEvidence): string {
  const lines: string[] = ["EXTERNAL DATABASES:"];
  if (evidence.factChecks.length > 0) {
    lines.push("- Fact-checks found:");
    for (const review of evidence.factChecks) {
      lines.push(
        `  · "${review.claim}" — ${review.publisher}: ${review.rating} (${review.url})`,
      );
    }
  } else {
    lines.push("- Fact-checks found: none");
  }
  if (evidence.factCheckStatuses.length > 0) {
    lines.push("- Fact-check coverage per claim:");
    for (const { claim, status } of evidence.factCheckStatuses) {
      lines.push(`  · [${status}] "${claim}"`);
    }
  }
  lines.push(
    `- Domain on an unreliable-source list: ${
      evidence.unreliableDomain === null
        ? "unknown"
        : evidence.unreliableDomain
          ? "yes"
          : "no"
    }`,
  );
  lines.push(
    `- Domain age (days): ${
      evidence.domainAgeDays === null ? "unknown" : String(evidence.domainAgeDays)
    }`,
  );
  if (evidence.notes.length > 0) {
    lines.push(`- Unavailable sources: ${evidence.notes.join("; ")}`);
  }
  return lines.join("\n");
}
