"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { saveRewrite, type ActionState } from "@/app/[locale]/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RewriteBody } from "@/components/rewrite-body";
import {
  CODE_FENCE,
  HEADING_PREFIX,
  LINE_BLOCK_PREFIXES,
  QUOTE_PREFIX,
  SUBHEADING_PREFIX,
} from "@/lib/article-blocks";
import { lintRewriteBody } from "@/lib/rewrite-lint";

type Props = {
  articleId: string;
  locale: string;
  title: string;
  body: string;
  // Ordered claim texts; the Nth claim (1-based) is the target of [[claim:N]].
  claims: string[];
};

const CLAIM_OPTION_MAX_CHARS = 60;

function stripBlockPrefix(line: string): string {
  for (const prefix of LINE_BLOCK_PREFIXES) {
    if (line.startsWith(prefix)) return line.slice(prefix.length);
  }
  return line;
}

export function RewriteForm({ articleId, locale, title, body, claims }: Props) {
  const t = useTranslations("admin.review");
  const te = useTranslations("admin.review.rewrites.editor");
  const [, action, pending] = useActionState<ActionState, FormData>(
    saveRewrite,
    {},
  );
  const [value, setValue] = useState(body);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const claimCount = claims.length;
  const wordCount = useMemo(() => {
    const trimmed = value.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [value]);
  const warnings = useMemo(
    () => lintRewriteBody(value, claimCount),
    [value, claimCount],
  );

  function surround(before: string, after: string, placeholder: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end } = textarea;
    const selected = value.slice(start, end) || placeholder;
    setValue(value.slice(0, start) + before + selected + after + value.slice(end));
    requestAnimationFrame(() => {
      textarea.focus();
      const from = start + before.length;
      textarea.setSelectionRange(from, from + selected.length);
    });
  }

  function setBlockPrefix(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const pos = textarea.selectionStart;
    const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
    const lineEnd = value.indexOf("\n", pos) === -1 ? value.length : value.indexOf("\n", pos);
    const line = value.slice(lineStart, lineEnd);
    const stripped = stripBlockPrefix(line);
    // Toggle the marker off when it's already applied, else (re)apply it.
    const nextLine = line.startsWith(prefix) ? stripped : prefix + stripped;
    setValue(value.slice(0, lineStart) + nextLine + value.slice(lineEnd));
    requestAnimationFrame(() => {
      textarea.focus();
      const caret = pos + (nextLine.length - line.length);
      textarea.setSelectionRange(caret, caret);
    });
  }

  function insertText(text: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end } = textarea;
    setValue(value.slice(0, start) + text + value.slice(end));
    requestAnimationFrame(() => {
      textarea.focus();
      const caret = start + text.length;
      textarea.setSelectionRange(caret, caret);
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      surround("**", "**", "texte");
    } else if (key === "k") {
      event.preventDefault();
      surround("[", "](https://)", "texte");
    }
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="articleId" value={articleId} />
      <input type="hidden" name="locale" value={locale} />
      <div className="space-y-1.5">
        <label htmlFor={`rewrite-title-${locale}`} className="text-sm font-medium">
          {t("rewrites.rewriteTitle")}
        </label>
        <Input
          id={`rewrite-title-${locale}`}
          name="title"
          defaultValue={title}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`rewrite-body-${locale}`} className="text-sm font-medium">
          {t("rewrites.rewriteBody")}
        </label>

        <div className="flex flex-wrap items-center gap-1.5 rounded-md border p-1.5">
          <ToolbarButton onClick={() => surround("**", "**", "texte")} title={te("bold")}>
            <span className="font-bold">B</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => surround("[", "](https://)", "texte")} title={te("link")}>
            <span className="underline">{te("link")}</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => setBlockPrefix(HEADING_PREFIX)} title={te("heading")}>
            H2
          </ToolbarButton>
          <ToolbarButton onClick={() => setBlockPrefix(SUBHEADING_PREFIX)} title={te("subheading")}>
            H3
          </ToolbarButton>
          <ToolbarButton onClick={() => setBlockPrefix(QUOTE_PREFIX)} title={te("quote")}>
            &ldquo;&rdquo;
          </ToolbarButton>
          <ToolbarButton
            onClick={() => surround(`${CODE_FENCE}\n`, `\n${CODE_FENCE}`, "code")}
            title={te("code")}
          >
            &lt;/&gt;
          </ToolbarButton>

          {claimCount > 0 && (
            <select
              aria-label={te("insertClaim")}
              value=""
              onChange={(event) => {
                if (event.target.value) insertText(`[[claim:${event.target.value}]]`);
                event.target.value = "";
              }}
              className="border-input bg-background h-8 rounded-md border px-2 text-xs"
            >
              <option value="">{te("insertClaim")}</option>
              {claims.map((text, index) => (
                <option key={index} value={index + 1}>
                  {index + 1} —{" "}
                  {text.length > CLAIM_OPTION_MAX_CHARS
                    ? `${text.slice(0, CLAIM_OPTION_MAX_CHARS)}…`
                    : text}
                </option>
              ))}
            </select>
          )}

          <div className="text-muted-foreground ml-auto flex items-center gap-3 text-xs">
            <span className="tabular-nums">{te("words", { count: wordCount })}</span>
            <button
              type="button"
              onClick={() => setShowPreview((shown) => !shown)}
              className="hover:text-foreground font-medium underline"
            >
              {showPreview ? te("hidePreview") : te("showPreview")}
            </button>
          </div>
        </div>

        <div
          className={
            showPreview
              ? "grid gap-3 lg:grid-cols-2"
              : "grid gap-3"
          }
        >
          <Textarea
            ref={textareaRef}
            id={`rewrite-body-${locale}`}
            name="body"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKeyDown}
            rows={16}
            required
            className="font-mono text-sm"
          />
          {showPreview && (
            <div className="overflow-y-auto rounded-md border p-4">
              <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                {te("previewTitle")}
              </p>
              {value.trim() ? (
                <RewriteBody body={value} claimCount={claimCount} />
              ) : (
                <p className="text-muted-foreground text-sm">{te("previewEmpty")}</p>
              )}
            </div>
          )}
        </div>

        <p className="text-muted-foreground text-xs">{t("rewrites.hint")}</p>

        {warnings.length > 0 && (
          <div className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
            <p className="text-xs font-semibold uppercase tracking-wide">
              {te("warningsTitle")}
            </p>
            <ul className="list-inside list-disc text-sm text-amber-700 dark:text-amber-400">
              {warnings.map((warning, index) => (
                <li key={index}>
                  {warning.kind === "claimOutOfRange" &&
                    te("claimOutOfRange", { number: warning.number, max: claimCount })}
                  {warning.kind === "claimMalformed" &&
                    te("claimMalformed", { raw: warning.raw })}
                  {warning.kind === "badLink" &&
                    te("badLink", { target: warning.target })}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="hover:bg-accent text-muted-foreground hover:text-foreground inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors"
    >
      {children}
    </button>
  );
}
