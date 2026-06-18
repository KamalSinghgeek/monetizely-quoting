# Deploying to Vercel + Neon

This walks you through deploying the quoting tool to **your own** GitHub, Neon, and Vercel accounts.
Everything that doesn't require your credentials has already been verified locally (the production
build, migrations, and the end-to-end test all pass). You only need to do the account-specific steps.

Total time: ~15 minutes. Free tiers are sufficient.

---

## 1. Push the code to GitHub

From the project root:

```bash
git add -A
git commit -m "Monetizely quoting tool"
git branch -M main
gh repo create monetizely-quoting --private --source=. --push
#   …or create an empty repo in the GitHub UI and:
#   git remote add origin https://github.com/<you>/monetizely-quoting.git
#   git push -u origin main
```

If the repo is **private**, share access with whoever sent you the exercise.

## 2. Create a Neon Postgres database

1. Sign in at <https://neon.com> and create a project (any region; pick one near your Vercel region).
2. In the project's **Connect** panel, copy two connection strings:
   - **Pooled** connection (the host contains `-pooler`) → this becomes `DATABASE_URL`.
   - **Direct** connection (host without `-pooler`) → this becomes `DIRECT_URL`.
3. Make sure `DATABASE_URL` ends with **`?sslmode=require&pgbouncer=true`** (the `pgbouncer=true` flag
   tells Prisma to disable prepared statements, which the pooler requires). `DIRECT_URL` ends with
   `?sslmode=require`.

You'll end up with two values like:

```
DATABASE_URL = postgresql://USER:PASS@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
DIRECT_URL   = postgresql://USER:PASS@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

## 3. Import the repo into Vercel

1. At <https://vercel.com> → **Add New… → Project** → import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Leave the root directory as-is.
3. **Override the Build Command** to:

   ```
   npm run vercel-build
   ```

   (This runs `prisma generate && prisma migrate deploy && next build` — so the database schema is
   created/updated on every production deploy.)
4. Add the two **Environment Variables** from step 2 — `DATABASE_URL` and `DIRECT_URL` — and make sure
   they are enabled for **both the Production and Preview environments** (a common mistake is setting
   them only for Production).
5. Click **Deploy**.

The first deploy will run the migrations against Neon and build the app.

## 4. (Optional) Load the example catalog

The app works on an empty database — just create a product in the UI. To pre-load the same
"Analytics Suite" example used in development, run the seed once from your machine against the **direct**
URL:

```bash
# bash / macOS / Linux
DATABASE_URL="<your DIRECT_URL>" DIRECT_URL="<your DIRECT_URL>" npm run db:seed
```

```powershell
# Windows PowerShell
$env:DATABASE_URL="<your DIRECT_URL>"; $env:DIRECT_URL="<your DIRECT_URL>"; npm run db:seed
```

(Use the direct, non-pooled URL for one-off scripts like seeding.)

## 5. Smoke-test the live app

Open the Vercel URL and confirm the full flow:

1. **Catalog → New product** → add a tier and a couple of features.
2. **Edit pricing matrix** → mark a feature as an add-on, set its model + value, **Save matrix**.
3. **New quote** → pick the product/tier, seats, term, add-ons → **Save quote**.
4. You land on `/q/<token>` — open that URL in a private window (no login) and confirm the quote
   renders with its itemized breakdown.
5. **Sustained-editing check (one-time):** back-to-back, create ~4 products and add a few tiers/
   features to each without pausing. Every add/edit should refresh immediately. This exercises the
   one behavior I could not reproduce on a long-lived serverless runtime locally — see the
   `next build --webpack` decision in `README.md`. The local reproduction was specific to a single
   long-lived `next start` process (Vercel uses fresh, short-lived function invocations), and the
   customer-facing `/q/<token>` page is a read-only view that is unaffected regardless. If an
   *editing* action ever appears to stall, a page refresh recovers it and the data is already saved.

Put the Vercel URL and a sample `/q/<token>` URL into the top of `README.md`.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Build fails on `prisma migrate deploy` | `DIRECT_URL` is missing/wrong, or not enabled for the deploy's environment. It must be the **direct** (non-pooler) Neon URL. |
| Runtime error: "too many connections" / pool timeouts | `DATABASE_URL` must be the **pooled** URL with `pgbouncer=true`. |
| "Environment variable not found: DATABASE_URL" | The env vars aren't set for the environment being deployed (set them for **Production and Preview**). |
| Prisma Client is stale after a schema change | `postinstall` runs `prisma generate`; redeploy. The build command also regenerates it. |

## How it's wired (reference)

- `package.json` → `"vercel-build": "prisma generate && prisma migrate deploy && next build --webpack"`
  and a `postinstall` that runs `prisma generate`. (The build uses webpack rather than the default
  Turbopack — see the README "Decisions" section for why.)
- `prisma/schema.prisma` → `datasource` reads `DATABASE_URL` (runtime, pooled) and `directUrl`
  (`DIRECT_URL`, migrations).
- Pages that read the database are `force-dynamic`, so they render per request against the live DB.
