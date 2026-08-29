# Sangmorakot WA Muay Thai

Membership signups, Stripe subscriptions (card auto direct-debit or pay-cash-at-the-gym),
and personal training packages + booking, built on Next.js, Supabase, and Stripe.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4) — deployed on Vercel
- **Supabase** — Postgres, Auth, and Row Level Security
- **Stripe** — Checkout (subscriptions + one-off payments) and the Billing Portal

## How it works

- **Membership plans** live in the `membership_plans` table and are managed from `/admin/plans`.
  Prices are sent to Stripe Checkout dynamically (`price_data`), so there's nothing to keep in
  sync in the Stripe dashboard — add/edit/hide a plan in the admin panel and it's live.
- **Joining**: a member picks a plan at `/membership`, then chooses **card** (Stripe Checkout,
  subscription mode — auto direct debit on their card each billing period) or **cash** (creates
  a `pending_cash` membership; staff mark it paid from `/admin/members` once they've paid in
  person at the gym).
- **Personal training**: packages of sessions (`pt_packages`) are bought the same way (card via
  Stripe Checkout one-off payment, or cash). Trainers set **weekly recurring availability**
  windows in `/admin/personal-training`; the app turns those into bookable slots for the next
  14 days (`get_open_pt_slots`), and booking atomically consumes one session from the member's
  pack (`book_pt_session` / `cancel_pt_booking` — both run as Postgres functions so a session can
  never be double-booked or spent without a booking under concurrent requests).
- **Stripe webhook** (`/api/stripe/webhook`) is the source of truth for subscription status —
  it keeps `memberships`/`pt_purchases`/`payments` in sync with Stripe (renewals, failed
  payments, cancellations, the Billing Portal, etc).

## One-time setup

### 1. Supabase

Already provisioned and linked to this repo. All schema/RLS/functions live in
`supabase/migrations/`, applied in order — if you ever need to rebuild the database from
scratch, apply them in filename order (via the Supabase SQL editor, the `supabase` CLI, or the
Supabase MCP tools). `supabase/seed.sql` has optional starter content (a few plans, PT packages,
a trainer with sample availability).

Grab these from **Project Settings → API** for the env vars below:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key (⚠️ secret, server-only) → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Stripe

1. Create/open a Stripe account for the gym.
2. **Developers → API keys** → copy the secret key into `STRIPE_SECRET_KEY`. Start with a
   **test mode** key while you try things out.
3. **Developers → Webhooks → Add endpoint**:
   - URL: `https://<your-domain>/api/stripe/webhook`
   - Events to send: `checkout.session.completed`, `customer.subscription.updated`,
     `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
   - Copy the endpoint's **signing secret** into `STRIPE_WEBHOOK_SECRET`.
4. When you're ready to take real payments, switch to live mode keys and add a **second**
   webhook endpoint (live mode has its own signing secret) — or just swap the env vars over
   when you go live.

### 3. Environment variables

Copy `.env.example` to `.env.local` for local dev, and add the same variables in the Vercel
project (**Settings → Environment Variables**) for the deployed site. Set
`NEXT_PUBLIC_SITE_URL` to your real domain in production.

### 4. First admin user

Sign up for an account on the site as normal, then promote yourself to admin — either:

- Run this in the Supabase SQL editor: `update public.profiles set role = 'admin' where id = '<your-user-id>';`
  (find your user id under **Authentication → Users**), or
- Have an existing admin do it from `/admin/members` → **Make admin**.

## Local development

```bash
npm install
npm run dev
```

Runs at http://localhost:3000. For local Stripe webhook testing, use the
[Stripe CLI](https://docs.stripe.com/stripe-cli): `stripe listen --forward-to localhost:3000/api/stripe/webhook`
and use the CLI's printed webhook secret as `STRIPE_WEBHOOK_SECRET` while testing locally.

## Notable structure

```
src/app/                     marketing pages, auth, account, admin, API routes
src/app/api/checkout/        Stripe Checkout session creation (membership + PT package)
src/app/api/stripe/webhook/  Stripe → Supabase sync
src/app/api/pt/              booking + cancellation (calls Postgres functions)
src/app/admin/               admin dashboard (plans, members/payments, trainers/bookings)
src/lib/supabase/            browser/server/admin Supabase clients + generated types
src/lib/stripe*.ts           Stripe client + Stripe customer helper
supabase/migrations/         schema, RLS policies, and Postgres functions, in order
```
