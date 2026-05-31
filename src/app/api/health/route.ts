// Cheap liveness/readiness probe target: never touches the DB so probes do
// not load-test Postgres. Forced dynamic so it is not statically optimized.
export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json({ status: "ok" }, { status: 200 });
}
