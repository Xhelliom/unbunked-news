<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Coding rules — Unbunked

These rules apply to every change in this repo. They are short on purpose. If
you are about to break one, stop and ask.

## 1. The bar

- **Build green, types green.** A change is not done until `pnpm exec tsc --noEmit` and `pnpm build` both pass.
- **No `any`, no `@ts-ignore`, no `@ts-expect-error`** outside of clearly-marked third-party shims. Use `unknown` + a narrowing function instead.
- **No silent failures.** Either handle the error meaningfully, or let it bubble. Do not swallow with empty `catch`.
- **No dead code.** Unused imports, unused exports, commented-out blocks, `// TODO remove` — delete them in the same PR you noticed them.
- **No `console.log` left behind.** Use it for ad-hoc debugging, remove it before commit. `console.error` is acceptable on real error paths inside the server.
- **No `eslint-disable`** without a one-line reason on the same line.

## 2. File size and shape

- **Hard cap: 500 lines per file.** Split before you hit it. A 480-line file that is about to grow gets split now, not later.
- Soft cap: a server component file should rarely exceed **250 lines**. If it does, lift sub-sections into components in `src/components/`.
- **One concept per file.** A file named `review-form.tsx` exports `ReviewForm` and its tightly-coupled types. It does not also export `proposeArticle`.
- **Co-locate small types.** Types used by a single file live in that file. Types shared across files go into the closest `types.ts` or the module that owns them (e.g. pipeline types in `src/lib/pipeline/schemas.ts`).
- **No barrel files** (`index.ts` re-exporting everything). They make tree-shaking and refactoring worse and add a layer of indirection for no benefit.

## 3. DRY — but not too dry

- Two identical blocks: leave them.
- Three identical blocks: extract a helper.
- Two **almost** identical blocks where you'd need 4+ parameters or a config object to merge them: **leave them**. The duplication is cheaper than the abstraction.
- Premature abstraction is worse than duplication. The right time to extract is when the third occurrence shows you the actual shared shape.
- When you do extract, name the helper after **what it does**, not what it currently happens to be used by (`formatArticleForPrompt`, not `aggregateHelper`).

## 4. Magic numbers and strings

- **Every literal that carries meaning becomes a named constant.** `setTimeout(fn, 30000)` is forbidden; `setTimeout(fn, JOB_POLL_INTERVAL_MS)` is required.
- Constants live **as close as possible to where they are used**: top of the file if used once, top of the module if shared, in `src/lib/<domain>/constants.ts` if cross-module.
- The exceptions, always allowed inline: `0`, `1`, `-1`, `2` when truly arithmetic; HTTP status codes used once at a boundary (`return new Response(null, { status: 204 })` is fine).
- **Time constants in milliseconds carry the `_MS` suffix.** `JOB_TIMEOUT_MS = 30 * 60 * 1000`. Compose units; never write opaque large integers.
- **Enums and string unions never get duplicated.** A claim status lives in `src/lib/pipeline/schemas.ts` as `CLAIM_STATUSES`. The DB enum, the tool schema, and the runtime check all derive from that one list. If you find yourself typing `"supported" | "false"` in a second file, stop and import the source of truth.

## 5. Naming

- `camelCase` for variables, functions, props.
- `PascalCase` for React components, types, classes.
- `SCREAMING_SNAKE_CASE` for module-level constants and env keys.
- `kebab-case` for filenames (`review-form.tsx`, `job-status.tsx`).
- Boolean variables and props start with `is`, `has`, `should`, `can`. `isPublished`, not `published`, for a local variable. (DB columns are an exception — they match the schema.)
- Async functions return what they fetch/produce; don't prefix with `get` if the function performs a write. `fetchArticle` for a network call, `loadArticle` for a DB read, `createArticle` for an insert.
- Don't abbreviate. `req`, `res`, `cfg`, `usr` — no. `request`, `response`, `config`, `user` — yes. Standard short names (`id`, `db`, `url`, `i`, `ctx`) are fine.

## 6. Types

- **Prefer `type` over `interface`** unless you need declaration merging (you won't).
- Function signatures: be **explicit on inputs and the return type** for any exported function. Inference is fine for one-shot internal helpers.
- **Discriminated unions for state.** `type JobState = { status: 'pending' } | { status: 'running'; progress: number } | { status: 'failed'; error: string }`. Never `status: string; progress?: number; error?: string`.
- **Brand IDs** when the codebase grows enough that mixing them becomes plausible (`type ArticleId = string & { readonly _brand: 'ArticleId' }`). Don't do it speculatively.
- `null` for "absent value, intentionally", `undefined` for "not provided yet / optional argument". Pick one per field and stick with it; the DB layer returns `null` for nullable columns — match that.

## 7. Imports

- Use the `@/*` alias for `src/*`. Never use long relative paths (`../../../components/...`).
- Order, top to bottom: (a) `server-only` / `client-only` directives; (b) Node built-ins; (c) external packages; (d) `@/` aliases; (e) relative imports. One blank line between groups. ESLint enforces this; do not fight it.
- **Type-only imports** use the `import type` form. It keeps the runtime bundle clean.

## 8. React / Next 16 specifics

- **Server components by default.** Add `"use client"` only when the component genuinely needs interactivity, browser APIs, or hooks like `useState` / `useEffect`.
- **Push client boundaries as far down the tree as possible.** A whole page does not need to be a client component because one button inside it is.
- **Never** prop-drill a server-fetched value through a client component just to display it. Render it in the server parent, pass the client component as `children`.
- **`async` server components** for data fetching. No `useEffect` to load data on a page that the server could have produced.
- **`Suspense` + streaming** for slow data, not blocking the whole route.
- **Route params and search params are `Promise`s in Next 16.** Always `await params`. Never destructure synchronously.
- **Server actions** live next to the route that uses them, in `actions.ts`. They start with `"use server"`. They validate every input at the boundary, even if TypeScript says it can't fail — the wire is untyped.

## 9. Forms and state

- Forms use `useActionState` (React 19) + a server action. Do not reinvent it with `useState` + `fetch`.
- Validation at the boundary (server action): parse the FormData, reject early with a typed error state.
- Optimistic UI is allowed only when the server confirms quickly and the rollback is obvious. Otherwise show a pending state.

## 10. Data, DB, and queries

- **Drizzle is the only way to talk to the DB.** No raw `pg` clients, no string SQL except inside a `.sql` migration file.
- **Migrations are generated, never hand-edited** after they ship: `pnpm db:generate`. The only edits allowed in a generated migration are removing irrelevant statements before it's applied for the first time.
- **One transaction for one user-visible action.** Saving an article + its claims + its sources + its tags happens in a single `db.transaction(...)`. Half-saved state is a bug.
- **Indexes are not optional** on foreign keys you read by, and on columns used in `where` / `order by` in hot paths. Add them in the same migration as the column.
- **`server-only`** at the top of any module that touches the DB, BetterAuth, or the Anthropic client. It guarantees the bundle never leaks them to the browser.
- **No N+1.** If you fetch a parent then loop to fetch children, you're wrong. Use Drizzle relations (`with: { … }`) or a single join.

## 11. AI pipeline rules

- **One Claude call = one purpose.** Don't ask one prompt to extract, verify, and reformat. We have distinct phases for a reason; respect them.
- **Forced structured tool calls** (`tool_choice: { type: "tool", name: ... }`) whenever you need a parsed result. Free-form text + JSON.parse is forbidden.
- **Validate the tool input** with a small parsing function before trusting it (see `toClaims` in `aggregate.ts`). Claude can produce a wrong shape; the type system can't catch it.
- **Cache the article body** between phases with `cache_control: { type: "ephemeral" }`. Cap the body at `MAX_CONTENT_CHARS` before sending.
- **Handle `pause_turn`** when web search is active (see `verify.ts`). Don't assume one round-trip.
- **Never log full prompt or full article content** to stdout in production. Truncate or redact.

## 12. Error handling

- **Throw `Error` with a useful message**, not strings. `throw new Error("Aggregation did not return a structured analysis")`.
- **Server actions** catch at the boundary, convert to a typed error state, and return it. They do not re-throw to the React tree.
- **Pipeline jobs** catch in `runPipeline`, write the error to the `jobs.error` column, mark the job `failed`. The user sees a meaningful message in the admin UI.
- **API routes** return `Response.json({ error: "..." }, { status: NNN })`. Never an HTML error page from inside an API route.
- **Do not invent a fallback for an error you do not understand.** Surface it, let the calling code (or the operator) decide.

## 13. Comments and docs

- **Default: write no comment.** A well-named function and clear types usually carry the meaning.
- Comments answer **why**, never **what**. `// retry up to 3 times because the upstream rate-limits to 1 req/s` is good. `// loop over claims` is noise.
- **No `// TODO` without an associated GitHub issue number.** `// TODO(#42): support multi-page articles` is fine; bare `// TODO` is not.
- **No JSDoc on internal helpers.** Use it only on exported public-API functions where the signature isn't self-explanatory.

## 14. Styling

- Tailwind utilities, ordered logically (layout → spacing → typography → color → state). Don't fight the formatter.
- **Design tokens** (`--primary`, `--verdict-*`) over hard-coded colors. Never `text-[#6366f1]`.
- One semantic class per visual concept. A `<Card>` already has padding/border — don't add `p-4 border` on top.
- **Mobile-first.** Default classes target the smallest viewport; use `sm:` / `md:` / `lg:` to scale up. Never the reverse.
- Variants via `cva` (`class-variance-authority`), not via `cn(condition && "...", anotherCondition && "...")` chains longer than 3 items.

## 15. Internationalisation

- **Every user-facing string** goes through `next-intl`. No literal French or English in JSX.
- Keys are dot-paths matching the UI hierarchy: `admin.review.publish`, `article.claimsTitle`.
- **Both `fr.json` and `en.json` are updated in the same commit.** Missing-key errors at build time mean someone forgot one half.
- Pluralization uses ICU MessageFormat (`{count, plural, one {…} other {…}}`), not concatenation.
- Date and number formatting: `useFormatter` from `next-intl`. Never `toLocaleString` directly — locale leaks.

## 16. Security

- **Never trust the client.** Re-validate every server-action input, every API-route input, every URL parameter.
- **Session checks at the boundary**, every time. The `/admin` layout calls `getSession()`. The `/api/admin/*` routes call it too. One does not imply the other.
- **No secret in client code.** A constant referenced from a `"use client"` component is shipped to the browser. Secrets stay in `process.env`, used only from `server-only` modules.
- **URLs from users** are parsed via `new URL()`, protocol-checked (`http:` / `https:` only), before being persisted or fetched.
- **Open redirects forbidden.** A query param `?next=...` is validated against a list of internal paths, never used raw.
- **External `<a>` links carry `rel="noreferrer noopener"`** when they have `target="_blank"`.

## 17. Performance and bundling

- **No `lodash`, no `moment`, no `axios`.** The platform gives us `fetch`, `Intl.DateTimeFormat`, and tiny tree-shakable helpers.
- **One-off helpers belong inline.** Don't import a 30 KB library to do `cn(...)`.
- **Avoid `useEffect` for derived state** — derive it during render.
- **Memoize only after a measurement says you should.** `useMemo` and `useCallback` are not free; default to not using them.
- **Server actions and route handlers are not free either.** If a page can be statically generated, generate it.

## 18. Tests (when we add them)

- Co-locate `*.test.ts` next to the file under test. No top-level `__tests__/` directory.
- Test the behavior, not the implementation. A test that breaks when you rename an internal helper is a bad test.
- Pipeline phases get unit tests with **recorded** Anthropic responses, not live API calls. Live calls are reserved for a single nightly E2E.

## 19. Git hygiene

- Branch: `claude/<topic>-<rand>` for AI sessions, `<user>/<topic>` otherwise.
- Commit subject: imperative, **no period**, ≤ 72 chars. `Add Unbunked rewrite (multilingual)`.
- Commit body: explain **why**, in complete sentences. Reference the issue (`Closes #42`).
- One logical change per commit. Refactors and feature additions in separate commits.
- **Never force-push to a branch others may have pulled.** When in doubt, push a new commit that reverts.
- **Never commit `.env`, `.env.local`, `k8s/secret.yaml`, or any credential.** They are in `.gitignore` — keep it that way.

## 20. When in doubt

- **Match the surrounding code.** If the file uses `type`, you use `type`. If the file uses arrow functions, you use arrow functions. Consistency inside a file beats personal preference.
- **Read one neighbor file before writing a new one.** The patterns are already there; copy them.
- **Smaller PRs land faster.** When a change starts touching > 15 files, split it.
- **Stuck on architecture?** Ask before writing. A 30-second clarification beats a 30-minute rewrite.
