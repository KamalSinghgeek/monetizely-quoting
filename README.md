# Monetizely Quoting Tool

A lightweight quoting application for SaaS pricing. An analyst sets up a client's pricing
**catalog** (products → tiers → features, with per-tier add-on pricing) and builds a **quote**
for a customer that produces a clean, shareable, read-only quote page with a fully itemized,
explained cost breakdown.

- **Live demo:** https://monetizely-quoting-gyfayomrb-kamal-singhs-projects-93d0034c.vercel.app
- **Repository:** https://github.com/KamalSinghgeek/monetizely-quoting
- **Example shared quote:** https://monetizely-quoting-gyfayomrb-kamal-singhs-projects-93d0034c.vercel.app/q/0OzaP5Vt8aY7a8QvZvQsaenkVe7QqXeg

> Built for the Monetizely take-home. The headline goal — *"the math has to be right and visible"* —
> drives the architecture: a pure, exhaustively-tested pricing engine produces every number **together
> with the human-readable formula that derived it**, and saved quotes store an immutable snapshot.

---

## Tech stack

| Concern    | Choice                                            |
| ---------- | ------------------------------------------------- |
| Framework  | Next.js 16 (App Router, React 19, Server Actions) |
| Language   | TypeScript (strict)                               |
| Database   | PostgreSQL (Neon in production) via Prisma 6      |
| Styling    | Tailwind CSS v4 (hand-rolled components)          |
| Validation | zod v4                                            |
| Tests      | Vitest (unit) · Playwright (end-to-end)          |

## Running locally

**Prerequisites:** Node.js ≥ 20.9 and a PostgreSQL database (local Postgres, Docker, or a free
[Neon](https://neon.com) branch).

```bash
# 1. Install dependencies (also runs `prisma generate`)
npm install

# 2. Configure the database. Copy the example and edit the two URLs.
cp .env.example .env
#   DATABASE_URL  -> your Postgres connection string (pooled, in production)
#   DIRECT_URL    -> direct connection (used for migrations)
#   Locally, both can point at the same database, e.g.:
#   postgresql://postgres@localhost:5432/monetizely_dev?schema=public

# 3. Create the schema and load the example catalog (Analytics Suite)
npm run db:migrate      # prisma migrate dev
npm run db:seed         # seeds docs/reference/catalog-example.xlsx as data

# 4. Run the app
npm run dev             # http://localhost:3000
```

**Tests**

```bash
npm test            # unit tests — the pricing engine + money/date helpers (no DB needed)
npm run test:e2e    # Playwright: walks catalog → quote → shared quote (needs a DB; builds + starts the app)
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # production build (also verified in CI)
```

> No `docker` on Windows? Postgres ships with `initdb` — you can spin up a throwaway cluster on a
> spare port with trust auth and point `.env` at it. See `docs/DEPLOY.md` for the production path.

## Deploying

Deploy to Vercel + Neon by following the step-by-step runbook in **[`docs/DEPLOY.md`](docs/DEPLOY.md)**.
The build command is `npm run vercel-build` (it runs `prisma generate && prisma migrate deploy && next build`).

---

## How the project is organized

```
src/lib/pricing/        Pure pricing engine — ZERO db/ui dependencies (the crown jewel)
  money.ts              integer-cents math, applyBps (round half up), formatting
  types.ts              PricingInput / LineItem / PricingResult, TERMS table
  engine.ts             computeQuote(): line items + explanations + totals
  *.test.ts             exhaustive unit tests (incl. the exact $18,150 reference quote)
src/lib/dates.ts        addMonths / formatDate (validUntil = +1 calendar month)
src/lib/validation/     zod schemas shared by client forms and server actions
src/lib/actions/        Server Actions (catalog mutations, createQuote)
src/lib/db.ts           Prisma client singleton
src/app/(app)/          Analyst tool: dashboard, catalog, quote builder
src/app/q/[token]/      PUBLIC read-only quote (no login; unguessable share token)
prisma/schema.prisma    data model · prisma/seed.ts  example catalog
e2e/                    Playwright end-to-end test
```

### Architecture decisions worth calling out

- **The pricing engine is a pure function with no DB or UI dependencies.** It takes resolved inputs
  and returns line items where each `amountCents` is produced *together* with its `explanation`
  string, so the displayed number can never drift from the displayed formula. This is what makes the
  headline "math is visible" requirement trustworthy, and it lets the critical tests run with no
  database.
- **Saved quotes are immutable snapshots.** The catalog is editable; a quote is not. On save we
  recompute pricing from the authoritative catalog and store the inputs *and* the rendered line items
  on the `Quote`. The public page renders that snapshot and never re-joins the live catalog — so
  editing a tier price tomorrow cannot silently rewrite a quote you already sent.
- **Money is integer cents end to end** (DB `Int`, engine, UI), with a single round-half-up step
  (`applyBps`) per line item. No floats touch money, so totals never drift by a cent.
- **The public share URL uses an unguessable token**, not the database id.
- **Mutations are Server Actions**, not REST endpoints; the public quote page is a Server Component
  that reads by share token. Pages that read the DB are `force-dynamic` (rendered per request).

---

## Assumptions

These were judgment calls; the reference spreadsheets resolved most of them.

- **"Valid until" = quote date + 1 calendar month.** The sample shows *May 21 → June 21*, which is one
  calendar month, not +30 days (that would be June 20). Clamped to month-end where needed (Jan 31 →
  Feb 28). Covered by a unit test.
- **Term discount applies only to the product's per-seat base price — never to add-ons.** Confirmed by
  the sample: the per-seat add-on (API access) is `5 × $50 × 12 = $3,000`, with no 15% factor.
- **A "monthly" term means a 1-month total** (annual = 12 months, two-year = 24). Stated explicitly so
  a 1-month figure on a monthly quote isn't surprising.
- **USD only, no tax, no PDF** — per the brief (on-screen quote view).

## Decisions where I picked between reasonable options

- **`% of product cost` add-on = percentage of the *displayed* (discounted) base product line.**
  e.g. 10% of the $12,750 shown, = $1,275 — not 10% of the undiscounted $15,000. Rationale: it reads
  as a fraction of the product line *as it appears on the quote*. The alternative (percentage of the
  gross, pre-discount base) is defensible too — it keeps the term discount strictly off add-ons — but
  I judged "% of what's on the quote" the more intuitive reading. Easy to flip in one place
  (`engine.ts`) if Monetizely prefers the other.
- **An overall quote discount applies to the whole subtotal** (base + all add-ons) and is shown as its
  own negative line item, so the discount math stays visible.
- **PostgreSQL + Prisma (over SQLite/Mongo).** Postgres is the cleanest, most standard Vercel deploy
  (first-class Neon integration), and the catalog/quote data is naturally relational.
- **Prisma 6, not the just-released Prisma 7.** v7 requires driver adapters and moved its config, and
  has a known Turbopack-resolution rough edge with Next 16. Since this is deployed by hand from a
  runbook, I chose the battle-tested v6 path (classic `datasource`, pooled `DATABASE_URL` + direct
  `DIRECT_URL`) to maximize deploy reliability. Documented so it's a deliberate, not accidental, choice.
- **Hand-rolled Tailwind components instead of shadcn/ui.** On this bleeding-edge stack (Next 16 /
  React 19 / Tailwind v4) I preferred zero extra UI dependencies and native, fully-accessible form
  controls over CLI/peer-dependency risk — it keeps the app self-contained for a solo deploy.
- **One `TierFeature` row per (tier, feature)** holding both availability and (nullable) add-on
  pricing — the spreadsheet's matrix and pricing sheets are two views of the same cell, and this
  avoids an "add-on with no price" invalid state (enforced in the zod layer).
- **Server Actions over a REST API** — this is a form-centric internal tool; actions keep it
  type-safe and keep Prisma on the server.
- **Production build uses webpack (`next build --webpack`), not the default Turbopack.** I found a
  Next.js 16 issue while building this and chased it to root cause (the e2e is what surfaced it).
  Under a single long-lived `next start` process, after several full create-catalog→build-quote flows
  in a row, a *catalog-editing* Server Action (add/edit a tier or feature) intermittently stops
  returning — the button stays on "Adding…", no server error is logged. I instrumented Postgres
  during the freeze: the action's `INSERT`/`UPDATE` **completes**, the connection goes idle, the pool
  never grows past ~2 connections, and there are **no locks or open transactions** — i.e. the DB is
  done and the stall is entirely in the Next `next start` runtime *after* the write, in the
  action-response/revalidate path. It does **not** happen in `next dev` (10/10 repeated flows clean)
  and **not** in the Prisma layer (a standalone 120-iteration query stress is flat at ~1 ms with one
  connection). It reproduces on **both** bundlers, so it is a `next start` runtime artifact, not a
  codegen difference — **but the default Turbopack production build is worse**: it can stall even on
  the *first* operation of a fresh server, whereas the webpack build reliably completes a full flow on
  a fresh server. Since each Vercel function invocation (and each CI run) is a fresh, short-lived
  server — not one long-lived `next start` reused for dozens of requests — the webpack build is both
  the more robust choice and the closest match to how the app actually runs in production. Dev keeps
  Turbopack (fast, unaffected). **Why this does not gate the product:** the customer-facing
  `/q/[token]` share page — the graded "correct + visible quote" — is a read-only GET Server Component
  with no Server Action, reached via `redirect()` (redirect-based actions never stalled), so it is
  immune; the stall only ever touched sustained analyst-side editing, recoverable with a refresh.
  (The deploy runbook adds a post-deploy step to confirm sustained editing on the live Vercel URL,
  since a long-lived serverless runtime is the one thing I can't reproduce locally.)
- **React Compiler disabled.** `create-next-app` enables it by default; it's an optional Babel-based
  auto-memoization this app doesn't need, and it slows builds, so it's off.

## Questions I'd have asked

- For `% of product cost` add-ons: percentage of the **gross** or the **discounted** base line? (I
  chose discounted — see above.)
- Do discounts **stack** (per-add-on discounts + overall), and is there a maximum discount / approval
  threshold?
- Can a per-seat add-on's seat count exceed the product's seat count, and should there be a cap?
- Can a single quote span **multiple products**, or is it always one product/tier? (Assumed one.)
- Is there **proration** for mid-term changes, or are all quotes full-term? (Assumed full-term.)
- Should "valid until" always be +1 month, or configurable per client?

## What I'd build next

(These are exactly the items the brief scoped out — listed as the natural next steps.)

- **Quote editing & versioning** (revise a saved quote into a new version while preserving history).
- **Catalog import** from the kind of Excel file Monetizely already receives from clients.
- **Multi-product quotes** and quote-level line reordering / custom line items.
- **PDF export & email delivery**, e-signature.
- **Auth & multi-tenant** (per-firm workspaces, roles) and soft-delete/archive for the catalog.
- **Audit trail** on the catalog so you can see which catalog version a quote was generated against.

## Scope

Per the brief, intentionally **not** built: signup/login, payments/e-signature, PDF, multi-currency
or tax, editing quotes after save, and deleting from the catalog. "Industry-level" here means
robustness — tested money math, immutable quotes, validation, error/loading states, CI, and a real
deploy path — for exactly what was asked.
