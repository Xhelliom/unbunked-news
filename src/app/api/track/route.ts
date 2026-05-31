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

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "";
  }
  return request.headers.get("x-real-ip")?.trim() ?? "";
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

  try {
    await recordEvent({
      path,
      referrer,
      kind: parseKind(body.kind),
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent") ?? "",
    });
  } catch {
    return Response.json({ error: "Invalid path" }, { status: 400 });
  }

  return new Response(null, { status: 204 });
}
