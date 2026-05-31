// Privacy-first analytics knobs, shared between the tracking endpoint and the
// admin dashboard.

// GDPR data minimisation: raw events older than this window can be purged from
// the admin. Anonymous by construction, they are never kept indefinitely.
export const ANALYTICS_RETENTION_DAYS = 90;

// Time ranges the operator can switch between on the dashboard.
export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];
export const DEFAULT_ANALYTICS_RANGE: AnalyticsRange = 30;

// Reject absurdly long paths at the tracking boundary.
export const MAX_TRACK_PATH_LENGTH = 1024;

// How many rows the dashboard "top" lists show.
export const TOP_LIST_LIMIT = 10;

export const DAY_MS = 24 * 60 * 60 * 1000;

// Coarse device buckets derived from the user-agent at ingestion. We never
// store the raw user-agent: three buckets carry no fingerprinting risk.
// Kept in sync with the deviceTypeEnum in src/db/schema.ts.
export const DEVICE_TYPES = ["desktop", "mobile", "tablet"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export function parseRange(raw: string | undefined): AnalyticsRange {
  const value = Number(raw);
  return (ANALYTICS_RANGES as readonly number[]).includes(value)
    ? (value as AnalyticsRange)
    : DEFAULT_ANALYTICS_RANGE;
}
