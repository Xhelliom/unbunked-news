"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  saveArticle,
  setPublished,
  type ActionState,
} from "@/app/[locale]/admin/actions";
import { VERDICTS, type Verdict } from "@/lib/verdicts";
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
  published: boolean;
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
      <form action={action} className="space-y-4">
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
          </div>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
      </form>

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
    </div>
  );
}
