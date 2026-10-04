# Harbour

Harbour is a private household finance app for Android and iPhone browsers. The first build includes the dashboard, transaction review and merchant rules, monthly category budgets and person allocations, recurring income/bill schedules, a 12 month forecast, person-filtered insights, CSV export and a JSON backup.

## Run locally

1. Use Node.js 24 and install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local`.
3. Run `pnpm dev`.
4. Open [http://localhost:3000](http://localhost:3000).

Local development starts with a sample household when credentials are absent. The dev server binds to localhost. Preview changes are isolated from live household records. Server records are encrypted with AES-256-GCM in `.harbour-data/`, which is ignored by Git; the generated `local.key` is required to read those local records.

## Live Redbark data

Set these server environment variables:

- `REDBARK_API_KEY`: Redbark developer API key. It is never sent to browser code.
- `REDBARK_VERSION`: pinned API release, currently `2026-10-01.wattle`.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`: Clerk application credentials.
- `HOUSEHOLD_EMAILS`: comma separated allowlist containing one or two verified email addresses. Configure Clerk for invitation-only membership and invite those members.
- `DATABASE_URL`: durable PostgreSQL connection string. Include your provider's required TLS settings. The app creates `harbour_records` on first access; the database role needs permission to create that table.
- `DATA_ENCRYPTION_KEY`: 64 hexadecimal characters representing 32 random bytes. Keep this stable and separate from database backups.

For local development only, `ALLOW_LIVE_DATA_WITHOUT_AUTH=true` enables live Redbark data without Clerk. Keep it disabled in deployments.

Clerk middleware initializes sessions; the server rechecks the verified email allowlist on every financial read, mutation and export. Production denies access when login is unconfigured and requires PostgreSQL plus the encryption key. Configure passkeys/MFA in your Clerk application. Visit `/sign-in` to authenticate.

The ChatGPT Redbark MCP connection lets this chat inspect the feed. The running app uses its own server API key, which must be entered in `.env.local` or the hosting provider's secret settings.

Supabase transaction-pooler URLs are supported. The app verifies TLS using the bundled public Supabase CA certificate in `certs/supabase-ca.crt`, downloaded from the certificate URL used by Supabase's dashboard. Household records have row-level security enabled and access revoked from Supabase's browser API roles; only Harbour's authenticated server reads them. The certificate is public; database credentials remain in environment variables.

## Current data behaviour

- Account IDs are passed to the Redbark balances endpoint. Transactions follow all pages for the last three calendar months; older posted history already fetched is retained in the server snapshot.
- Pending transactions are included.
- Card payments are automatically excluded only when an opposite movement on another owned account is matched. A transaction can be manually marked as Transfer.
- Corrections, budget limits, allocations, rules and schedules are stored on the server with an audit record. Manual corrections take precedence over merchant rules.
- Visible clients refresh the household view every 15 seconds. Redbark reads reuse the latest snapshot for 60 seconds to limit provider requests. NAB upstream latency still applies.
- Feed failures show the last successful snapshot with an explicit warning. Missing balances are never presented as zero.
- Refunds reduce category spending. Forecasts use planned monthly income minus the larger of each category budget or its scheduled bills, avoiding double counting.
- Redbark’s current transaction payload does not identify an individual cardholder, so person attribution starts as `Unknown` for live purchases.

The product and technical plan is in `PRODUCT_PLAN.md`.

## Validation and deployment

Run `pnpm lint`, `pnpm test`, and `pnpm build`. After configuring production secrets, use `pnpm start` or deploy to a Node.js host that supports Next.js and can reach your PostgreSQL database. Use HTTPS before installing Harbour on phone home screens; the manifest and Android/iOS icons are provided. Financial pages are not cached offline.

## Remaining pilot work

Clerk sign-in and the deployed application have not yet been tested with household credentials. The Redbark API key and Supabase encrypted storage round trip have been verified locally. Reconcile monthly totals against NAB before relying on the live view. Pending-to-posted records with different IDs still require review; the app does not claim individual cardholder detection. Historical file import, split transactions, daily cash-flow projections, signed event webhooks, scheduled background ingestion, and automated backup restoration remain follow-up work from the plan. JSON backup download is implemented; automated restore is not.
