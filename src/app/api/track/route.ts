import { isIP } from "node:net";

import { after } from "next/server";

import { EVENT_KINDS, type EventKind } from "@/lib/analytics/constants";
import { recordEvent } from "@/lib/analytics/track";

function parseKind(raw: unknown): EventKind {
  return (EVENT_KINDS as readonly string[]).includes(raw as string)
    ? (raw as EventKind)
    : "pageview";
}

// Honour Do-Not-Track and Global Privacy Control: when the visitor signals it,
// we record nothing at all.
function privacyOptOut(request: Request): boolean {
  return (
    request.headers.get("dnt") === "1" ||
    request.headers.get("sec-gpc") === "1"
  );
}

// Prefer x-real-ip, which the trusted ingress sets to the actual peer, over the
// client-spoofable left-most x-forwarded-for hop; validate the format either way
// so a forged header can't widen/split a visitor's analytics buckets. The IP
// only feeds the daily visitor hash, so an empty value here is acceptable.
function clientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && isIP(realIp)) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  const firstHop = forwarded?.split(",")[0]?.trim();
  return firstHop && isIP(firstHop) ? firstHop : "";
}

export async function POST(request: Request): Promise<Response> {
  if (privacyOptOut(request)) {
    return new Response(null, { status: 204 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  const body = payload as Record<string, unknown>;
  const path = body.path;
  if (typeof path !== "string") {
    return Response.json({ error: "Missing path" }, { status: 400 });
  }
  const referrer = typeof body.referrer === "string" ? body.referrer : null;
  const event = {
    path,
    referrer,
    kind: parseKind(body.kind),
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent") ?? "",
  };

  // The DB write must not block the response: schedule it after the 204 is
  // sent. A failure discovered here can no longer become a 400, so surface it
  // as a logged server error instead of swallowing it.
  after(async () => {
    try {
      await recordEvent(event);
    } catch (error) {
      console.error("Failed to record analytics event", error);
    }
  });

  return new Response(null, { status: 204 });
}
