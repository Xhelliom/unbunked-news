import { getFormatter, getTranslations } from "next-intl/server";

import { relaunchJob } from "@/app/[locale]/admin/actions";
import { db } from "@/db/client";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const JOBS_LIMIT = 100;

type JobStatus = "pending" | "running" | "succeeded" | "failed";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

// No "success" design token exists, so succeeded gets a named-color override on
// the outline variant; the others map onto existing semantic variants.
const STATUS_BADGE: Record<
  JobStatus,
  { variant: BadgeVariant; className?: string }
> = {
  pending: { variant: "secondary" },
  running: { variant: "default" },
  succeeded: {
    variant: "outline",
    className: "border-transparent bg-green-600 text-white",
  },
  failed: { variant: "destructive" },
};

const TERMINAL_STATUSES: ReadonlySet<JobStatus> = new Set([
  "succeeded",
  "failed",
]);

const JOB_STEPS = [
  "scraping",
  "extracting",
  "verifying",
  "aggregating",
  "rewriting",
  "saving",
  "done",
] as const;
type JobStep = (typeof JOB_STEPS)[number];

function isJobStep(value: string | null): value is JobStep {
  return value !== null && (JOB_STEPS as readonly string[]).includes(value);
}

export default async function AdminJobsPage() {
  const t = await getTranslations("admin.jobs");
  const tj = await getTranslations("admin.job");
  const format = await getFormatter();

  const rows = await db.query.jobs.findMany({
    orderBy: (job, { desc }) => [desc(job.createdAt)],
    limit: JOBS_LIMIT,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.url")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.step")}</TableHead>
                <TableHead className="text-right">
                  {t("table.progress")}
                </TableHead>
                <TableHead>{t("table.created")}</TableHead>
                <TableHead className="text-right">
                  {t("table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((job) => {
                const badge = STATUS_BADGE[job.status];
                return (
                  <TableRow key={job.id}>
                    <TableCell className="max-w-xs">
                      <span className="block max-w-xs truncate" title={job.url}>
                        {job.url}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={badge.variant}
                        className={badge.className}
                        title={job.error ?? undefined}
                      >
                        {tj(`statuses.${job.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {isJobStep(job.step) ? tj(`steps.${job.step}`) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {job.progress}%
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format.dateTime(job.createdAt, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/jobs/${job.id}`}>{t("view")}</Link>
                        </Button>
                        {TERMINAL_STATUSES.has(job.status) && (
                          <form action={relaunchJob}>
                            <input type="hidden" name="id" value={job.id} />
                            <Button type="submit" variant="secondary" size="sm">
                              {t("relaunch")}
                            </Button>
                          </form>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
