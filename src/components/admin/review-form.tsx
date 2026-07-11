"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  relaunchArticle,
  restoreArticle,
  saveArticle,
  setDeleted,
  setPublished,
  type ActionState,
} from "@/app/[locale]/admin/articles/[id]/actions";
import { VERDICTS, type Verdict } from "@/lib/verdicts";
import { CriteriaFieldset } from "@/components/admin/criteria-fieldset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ReviewFormProps = {
  id: string;
  title: string;
  summary: string | null;
  originalSummary: string | null;
  showOriginal: boolean;
  verdict: Verdict | null;
  reliabilityScore: number | null;
  factualityScore: number | null;
  corroborationScore: number | null;
  sourcingScore: number | null;
  completenessScore: number | null;
  transparencyScore: number | null;
  recencyScore: number | null;
  contributionsEnabled: boolean;
  published: boolean;
  isDeleted: boolean;
};

const selectClass =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]";

export function ReviewForm(props: ReviewFormProps) {
  const t = useTranslations("admin.review");
  const tv = useTranslations("verdicts");
  const [, action, pending] = useActionState<ActionState, FormData>(
    saveArticle,
    {},
  );

  return (
    <div className="space-y-6">
      {props.isDeleted && (
        <p className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {t("deletedBanner")}
        </p>
      )}
      <form id="review-form" action={action} className="space-y-4">
        <input type="hidden" name="id" value={props.id} />
        <div className="space-y-1.5">
          <label htmlFor="title" className="text-sm font-medium">
            {t("headline")}
          </label>
          <Input id="title" name="title" defaultValue={props.title} required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="summary" className="text-sm font-medium">
            {t("summary")}
          </label>
          <Textarea
            id="summary"
            name="summary"
            defaultValue={props.summary ?? ""}
            rows={3}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="originalSummary" className="text-sm font-medium">
            {t("originalSummary")}
          </label>
          <Textarea
            id="originalSummary"
            name="originalSummary"
            defaultValue={props.originalSummary ?? ""}
            rows={4}
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            {t("showOriginalLabel")}
          </legend>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="showOriginal"
              value="true"
              defaultChecked={props.showOriginal}
              className="mt-1"
            />
            <span>{t("showOriginalFull")}</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="showOriginal"
              value="false"
              defaultChecked={!props.showOriginal}
              className="mt-1"
            />
            <span>{t("showOriginalSummaryOnly")}</span>
          </label>
        </fieldset>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="verdict" className="text-sm font-medium">
              {t("verdict")}
            </label>
            <select
              id="verdict"
              name="verdict"
              defaultValue={props.verdict ?? ""}
              className={selectClass}
            >
              {VERDICTS.map((verdict) => (
                <option key={verdict} value={verdict}>
                  {tv(`${verdict}.label`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reliabilityScore" className="text-sm font-medium">
              {t("score")}
            </label>
            <Input
              id="reliabilityScore"
              name="reliabilityScore"
              type="number"
              min={0}
              max={100}
              defaultValue={props.reliabilityScore ?? ""}
            />
            <p className="text-muted-foreground text-xs">{t("scoreHint")}</p>
          </div>
        </div>
        <CriteriaFieldset initial={props} />
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="contributionsEnabled"
            value="true"
            defaultChecked={props.contributionsEnabled}
            className="mt-1"
          />
          <span>{t("contributionsEnabled")}</span>
        </label>
      </form>

      <div className="bg-background/95 sticky bottom-0 z-30 -mx-4 flex flex-wrap items-center gap-3 border-t px-4 py-3 backdrop-blur sm:-mx-0 sm:rounded-lg sm:border">
        <Button type="submit" form="review-form" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
        {props.isDeleted ? (
          <>
            <form action={restoreArticle}>
              <input type="hidden" name="id" value={props.id} />
              <Button type="submit" variant="secondary">
                {t("restore")}
              </Button>
            </form>
            <form action={relaunchArticle}>
              <input type="hidden" name="id" value={props.id} />
              <Button type="submit">{t("relaunch")}</Button>
            </form>
          </>
        ) : (
          <>
            <form action={setPublished}>
              <input type="hidden" name="id" value={props.id} />
              <input
                type="hidden"
                name="published"
                value={(!props.published).toString()}
              />
              <Button
                type="submit"
                variant={props.published ? "outline" : "default"}
              >
                {props.published ? t("unpublish") : t("publish")}
              </Button>
            </form>
            <form action={relaunchArticle}>
              <input type="hidden" name="id" value={props.id} />
              <Button type="submit" variant="secondary">
                {t("relaunch")}
              </Button>
            </form>
            <form action={setDeleted}>
              <input type="hidden" name="id" value={props.id} />
              <Button type="submit" variant="destructive">
                {t("delete")}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
