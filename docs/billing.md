# Matomari billing — architecture & operations

This document explains how subscriptions, payments, entitlements, and admin overrides work in Matomari. It is the reference for go-live, debugging, and support.

---

## Table of contents

1. [Overview](#overview)
2. [Tiers & entitlements](#tiers--entitlements)
3. [Environment variables](#environment-variables)
4. [Sandbox vs live](#sandbox-vs-live)
5. [New subscriptions (checkout)](#new-subscriptions-checkout)
6. [Plan changes (Plus ↔ Pro)](#plan-changes-plus--pro)
7. [Cancellation](#cancellation)
8. [Payment failure](#payment-failure)
9. [Webhooks](#webhooks)
10. [Database model](#database-model)
11. [Effective tier logic](#effective-tier-logic)
12. [Admin grants & revokes](#admin-grants--revokes)
13. [Customer portal](#customer-portal)
14. [User journeys](#user-journeys)
15. [Paddle dashboard setup](#paddle-dashboard-setup)
16. [Security hardening](#security-hardening)
17. [Troubleshooting](#troubleshooting)
18. [Key source files](#key-source-files)

---

## Overview

Matomari uses **Paddle Billing** as the payment processor. The app never stores card details.

```
User → Pricing / Settings UI
     → API routes (/api/billing/*)
     → PaddleBillingProvider (server)
     → Paddle API + webhooks
     → user_subscriptions (Supabase)
     → Entitlements enforced in app + DB triggers
```

**Three ways a user can have Plus/Pro:**

| Source | How it is identified | Billing |
|--------|----------------------|---------|
| **Paddle paid** | Real `paddle_subscription_id` (not `pad_sub_admin_*`) | Recurring charge via Paddle |
| **Admin grant** | `paddle_subscription_id` starts with `pad_sub_admin_*` (or legacy `pad_sub_comp_*` / `pad_sub_ovr_*`) | No Paddle charge |
| **None** | No row or `tier = free` | Free tier |

---

## Tiers & entitlements

Defined in `lib/constants/entitlements.ts` (keep in sync with Supabase SQL).

| Tier | Scenes | Sentences/scene | Notable features |
|------|--------|-----------------|------------------|
| **Free** | 3 | 20 | Core study loop |
| **Plus** | 15 | 50 | Narration, offline, deeper progress |
| **Pro** | 50 | 150 | Voice selection, scene export, priority AI |

**Catalog prices (USD):**

| Plan | Monthly | Annual |
|------|---------|--------|
| Plus | $8.99 | $89.99 |
| Pro | $17.99 | $179.99 |

Price IDs live in env vars (`PADDLE_PRICE_*`), not in code.

---

## Environment variables

### Paddle (required for paid plans)

| Variable | Where | Example |
|----------|-------|---------|
| `PADDLE_API_KEY` | Server only | `pdl_live_apikey_…` or `pdl_sdbx_…` |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Client (Paddle.js) | `live_…` or `test_…` |
| `NEXT_PUBLIC_PADDLE_ENV` | Client + server | `sandbox` or `production` |
| `PADDLE_WEBHOOK_SECRET` | Server (webhook verify) | `pdl_ntfset_…` |
| `PADDLE_PRICE_PLUS_MONTHLY` | Server | `pri_…` |
| `PADDLE_PRICE_PLUS_ANNUAL` | Server | `pri_…` |
| `PADDLE_PRICE_PRO_MONTHLY` | Server | `pri_…` |
| `PADDLE_PRICE_PRO_ANNUAL` | Server | `pri_…` |

Track production values in `.env.live` (gitignored). Use `.env.local` for sandbox dev.

### Other

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Absolute URLs for OG, redirects (`https://www.matomari.com`) |

**Admin → Health** runs `getPaddleBillingStatus()` and warns if keys don’t match `NEXT_PUBLIC_PADDLE_ENV`.

---

## Sandbox vs live

Paddle sandbox and live are **separate environments**:

- Separate API keys, client tokens, products/prices, webhooks, customers, subscriptions
- Sandbox: [sandbox-vendors.paddle.com](https://sandbox-vendors.paddle.com)
- Live: [vendors.paddle.com](https://vendors.paddle.com)

**Vercel:**

| Environment | Paddle |
|-------------|--------|
| Production | Live keys + live `pri_…` IDs |
| Preview / local | Sandbox keys + sandbox `pri_…` IDs |

You do **not** create subscriptions manually in the dashboard. Subscriptions are created automatically when checkout completes for a recurring price.

---

## New subscriptions (checkout)

### Flow

1. User opens `/pricing` (or legacy `/billing/checkout?plan=…` → redirects to pricing).
2. `useBillingPlanAction` checks `/api/billing/subscription`:
   - If **no active Paddle subscription** → open Paddle.js overlay checkout.
   - If **active Paddle subscription** → route to [plan change](#plan-changes-plus--pro) instead (no second checkout).
3. Paddle.js `Checkout.open` with `priceId` + `customData.userId`.
4. User pays → Paddle creates subscription + sends webhooks.
5. Webhook handler updates `user_subscriptions` → user gets Plus/Pro caps.

### Server guard

`createCheckoutSession` **rejects** checkout when the user already has:

1. An **active paid Paddle subscription** — use [plan change](#plan-changes-plus--pro) instead.
2. An **active admin grant** — complimentary access must be revoked (or expire) before starting a paid subscription. This prevents silently overwriting a timed grant with a Paddle row and avoids ambiguous double-access states.

### API

- `POST /api/billing/checkout` — server-side checkout session (legacy; pricing page uses Paddle.js directly)
- Webhook: `POST /api/webhooks/paddle`

---

## Plan changes (Plus ↔ Pro)

### Behavior (implemented)

When a user with an **active Paddle subscription** switches between Plus and Pro:

1. App calls `POST /api/billing/change-plan/preview` to fetch the exact prorated charge/credit.
2. User confirms in a dialog showing **charge today**, **credit today**, and **net today** (with an extra acknowledgement for large annual prorations).
3. App calls `POST /api/billing/change-plan` with `{ plan: "plus" | "pro" }`.
4. Server fetches the Paddle subscription and reads the **current price ID**.
5. Billing **interval is preserved** (monthly stays monthly, annual stays annual).
6. Paddle `subscriptions.update` replaces the line item with the new price.
7. **Proration:** `proration_billing_mode: prorated_immediately`
   - **Plus → Pro:** User is charged the prorated difference **now**; Pro access is **immediate**.
   - **Pro → Plus:** User receives a prorated credit; Plus caps apply **immediately**.
8. Local `user_subscriptions` row is synced; webhooks also keep state in sync.

### Where users can change plans

| Location | Action |
|----------|--------|
| **Settings** → Subscription card | “Upgrade to Pro” / “Switch to Plus” |
| **Pricing page** | “Upgrade to Pro” / “Switch to Plus” on tier cards |
| **Paddle customer portal** | “Manage billing” (Paddle-native UI) |

### What does *not* use plan change

- **Free users** → checkout (new subscription).
- **Admin-granted access** → cannot use Paddle plan change; use Admin grant/revoke.
- **Interval changes** (monthly ↔ annual) → not implemented in-app; use Paddle portal or cancel + resubscribe.

### API

```
POST /api/billing/change-plan/preview
Body: { "plan": "plus" | "pro" }
→ { preview: { chargeLabel, creditLabel, netLabel, interval, plan, … } }

POST /api/billing/change-plan
Body: { "plan": "plus" | "pro" }
```

---

## Cancellation

### User-initiated (Settings)

1. User clicks **Cancel at period end**.
2. `POST /api/billing/cancel` → Paddle `subscriptions.cancel` with `effectiveFrom: next_billing_period`.
3. `cancel_at_period_end = true`; tier stays Plus/Pro until `current_period_end`.
4. After period end, lazy downgrade in `getUserSubscriptionAdmin` → Free with grandfathered scene slots.

### Admin revoke (paid)

1. Strong confirmation modal (must type user email).
2. `cancelSubscriptionImmediate` in Paddle + `finalizeDowngradeToFree`.
3. Access ends **immediately**.

---

## Payment failure

**No grace period.** If Paddle cannot charge:

1. Webhook: `subscription.past_due` or `transaction.payment_failed`.
2. `finalizePaymentFailedDowngrade` → tier `free`, status `past_due`.
3. Scene **data is kept**; unlock limits revert to Free (up to 3 scenes unlocked — see [Grandfathered scene selection](#grandfathered-scene-selection)).
4. User sees “Resubscribe” in Settings; resubscribing restores full Plus/Pro access.

**Business choice:** Matomari does **not** offer a 3–7 day grace period. This is intentional (simpler entitlements, fewer edge cases) but harsher than typical SaaS — expect more support tickets for temporary card declines.

---

## Webhooks

**URL (production):** `https://www.matomari.com/api/webhooks/paddle`

### Events to subscribe (minimum)

```
subscription.activated
subscription.created
subscription.updated
subscription.canceled
subscription.past_due
subscription.paused
subscription.resumed
subscription.trialing
transaction.payment_failed
adjustment.created
adjustment.updated
```

### Handler (`paddle-billing-provider.handlePaddleEvent`)

| Event | Action |
|-------|--------|
| `subscription.created` / `activated` / `updated` / `resumed` / `trialing` | Sync tier, period end, cancel flag |
| `subscription.canceled` | Downgrade to Free |
| `subscription.paused` | Immediate downgrade to Free (pause = no access) |
| `subscription.past_due` | Immediate revoke (no grace) |
| `transaction.payment_failed` | Immediate revoke |
| `adjustment.created` / `adjustment.updated` | Refund/chargeback → immediate revoke (see below) |

**`subscription.trialing`:** Matomari does not sell a separate trial product today. This event is subscribed so that if Paddle ever marks a subscription as `trialing` (e.g. a future promo or Paddle-side trial), access is granted the same way as `activated`. No special trial caps — effective tier follows the subscribed plan.

**Refunds & chargebacks** (`paddle-adjustment-handler.ts`):

| Adjustment action | When access is revoked |
|-------------------|------------------------|
| `refund` | `status = approved` and adjustment affects the subscription |
| `chargeback` | Immediately |
| `chargeback_warning` | Immediately (conservative) |

Partial refunds on subscription payments also revoke access (conservative — closes pay → dispute → keep Pro abuse path).

### Webhook idempotency

Before processing, `claimPaddleWebhookEvent()` inserts the Paddle `event_id` into `paddle_webhook_events`. Duplicate deliveries (same `event_id`) return 200 without re-running handlers. Table is pruned after 90 days by the reconciliation cron.

Signatures verified via `PADDLE_WEBHOOK_SECRET` and Paddle SDK `unmarshal`.

---

## Database model

Table: `public.user_subscriptions`

| Column | Purpose |
|--------|---------|
| `user_id` | PK, references `auth.users` |
| `tier` | `free` \| `plus` \| `pro` |
| `status` | `active` \| `canceled` \| `past_due` |
| `paddle_customer_id` | Paddle customer |
| `paddle_subscription_id` | Paddle sub, or synthetic admin ID |
| `current_period_end` | Renewal / grant expiry |
| `cancel_at_period_end` | Scheduled cancellation |
| `unlocked_scene_keys` | Free-tier grandfathered unlocks after downgrade |

RLS: users can **read** their own row; mutations are server-only (service role).

---

## Effective tier logic

`computeEffectiveTier()` in `subscription-service.ts`:

| Condition | Effective tier |
|-----------|----------------|
| No sub or tier below Plus | `free` |
| `status = active` and admin grant expired (`current_period_end` in past) | `free` |
| `status = active` | stored `tier` |
| `status = canceled` + `cancel_at_period_end` + period not ended | stored `tier` |
| `status = past_due` | `free` (no grace) |
| Otherwise | `free` |

Supabase function `get_effective_subscription_tier()` mirrors this for DB triggers (migrations `017`, `018`).

### Grandfathered scene selection

When a user downgrades to Free (cancel, payment failure, refund, pause, admin revoke), scene **data is never deleted**. Only unlock slots are capped at 3.

`resolveFreeUnlockedSceneKeys()` in `scene-access-service.ts` picks which 3 scenes stay unlocked, in order:

1. **Stored keys** — intersection of `unlocked_scene_keys` with scenes the user still owns (preserves prior downgrade choices).
2. **Most recently opened** — from `last_opened` timestamps on owned scenes.
3. **Remaining owned keys** — stable fallback for any slots still unfilled.

The result is written to `unlocked_scene_keys` during downgrade.

---

## Admin grants & revokes

**Admin → Users → [user] → Subscription panel**

### Grant

- Choose tier (Plus/Pro) and duration: 7d / 30d / 90d / 1y / lifetime / custom days.
- Writes `user_subscriptions` with `pad_sub_admin_*` subscription ID.
- Does **not** charge Paddle.
- Timed grants expire automatically (app lazy downgrade + SQL function).

### Revoke

| User type | Confirmation | Action |
|-----------|--------------|--------|
| Admin grant | Type `REVOKE` | Downgrade to Free |
| Paid Paddle | Type user **email** | Cancel in Paddle immediately + downgrade |

Cannot grant admin access while a paid Paddle subscription is active (revoke paid sub first).

Cannot start Paddle checkout while an admin grant is still effective (see [checkout guard](#server-guard)).

Audit log: `comp_access`, `revoke_access` in `admin_audit_logs`.

---

## Customer portal

**Settings → Manage billing** → `POST /api/billing/portal` → Paddle customer portal session.

Users can update payment method, view invoices, and change plans in Paddle’s UI. Webhooks keep Matomari in sync.

---

## User journeys

### Free → Plus (monthly)

```
Pricing → Subscribe to Plus → Paddle checkout → pay
→ subscription.created webhook → tier=plus, status=active
→ immediate Plus caps
```

### Plus → Pro (upgrade)

```
Settings → Upgrade to Pro
→ POST /api/billing/change-plan { plan: "pro" }
→ Paddle subscription update (prorated_immediately)
→ tier=pro immediately, prorated charge on card
```

### Pro → Plus (downgrade)

```
Pricing → Switch to Plus
→ change-plan API → prorated credit, Plus caps immediately
```

### Cancel

```
Settings → Cancel at period end
→ cancel_at_period_end=true, keep Pro/Plus until period end
→ after period end: downgrade to Free, grandfather up to 3 scenes
```

### Payment fails

```
Paddle retry fails → past_due webhook
→ immediate Free tier, scenes saved
→ Settings shows Resubscribe
```

---

## Paddle dashboard setup

### Go-live checklist

1. Create **live** products + **recurring prices** (Plus/Pro, monthly + annual).
2. Copy live `pri_…` → Vercel Production `PADDLE_PRICE_*`.
3. **Developer tools → Authentication:** live API key + client token.
4. **Developer tools → Notifications:** webhook URL + secret; subscribe to all events in [Webhooks](#events-to-subscribe-minimum).
5. Apply migration `019_billing_hardening.sql` on Supabase (webhook dedup table).
6. Set `CRON_SECRET` in Vercel Production for billing reconciliation.
7. **Checkout settings:** default payment link `https://www.matomari.com/pricing`.
8. `NEXT_PUBLIC_PADDLE_ENV=production` in Production only.
9. Test one real checkout; verify webhook delivered in Paddle.
10. Check **Admin → Health** for green status.

### What each dashboard section is for

| Section | Purpose |
|---------|---------|
| **Catalog** | Products + prices (`pri_…`) — set up once per environment |
| **Subscriptions** (`/subscriptions-v2`) | View/manage **existing** customer subscriptions (support) |
| **Customers** | Lookup by email |
| **Notifications** | Webhook destinations + delivery logs |

---

## Security hardening

Responses to known billing edge cases (implemented in code as of migration `019`).

| Risk | Mitigation |
|------|------------|
| **Refund / chargeback abuse** | `adjustment.*` webhooks → immediate `finalizeDowngradeToFree` |
| **Dropped renewal webhook** | Daily cron (`/api/cron/content-invalidation`) also runs Paddle subscription reconciliation |
| **Admin grant + checkout collision** | Checkout blocked while admin grant is effective |
| **Paused subscription** | `subscription.paused` → immediate downgrade |
| **Duplicate webhooks** | `paddle_webhook_events` dedup by `event_id` |
| **Surprise annual proration** | Preview + confirm dialog before `change-plan` |
| **Undefined downgrade scene picks** | Documented algorithm in [Grandfathered scene selection](#grandfathered-scene-selection) |

### Reconciliation cron

Billing reconciliation runs inside the **single daily Vercel cron** (same job as content invalidation — one invocation/day on Hobby).

- **Schedule:** `0 3 * * *` — once per day at **03:00 UTC** (Hobby may fire anywhere in the 03:00–03:59 UTC window)
- **Route:** `GET /api/cron/content-invalidation`
- **Auth:** `Authorization: Bearer $CRON_SECRET` (or `?secret=` query param)
- **Behavior:** After content work, calls `reconcilePaddleSubscriptions()` so `current_period_end`, tier, and status match Paddle even if a webhook was missed.
- **Manual trigger:** `GET /api/cron/billing-reconcile` (billing-only, same auth)

Set `CRON_SECRET` in Vercel Production. Webhooks remain the primary sync path; reconciliation is a backstop.

### Known remaining gaps (lower priority)

| Item | Status |
|------|--------|
| Rate-limit / idempotency on `change-plan` for rapid double-clicks | Not implemented — Paddle `subscriptions.update` is likely safe; local double-sync is low risk |
| Automated live price-ID validation in CI | Manual checklist + Admin → Health env mismatch warning only |
| `chargeback_reverse` restoring access | Not handled — would need case-by-case if subscription is still active in Paddle |

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Checkout won’t open | Missing/wrong client token or `NEXT_PUBLIC_PADDLE_ENV` |
| Webhook 401/400 | Wrong `PADDLE_WEBHOOK_SECRET` or body parsed as JSON (must be raw) |
| Paid but still Free | Webhook not delivered; check Paddle Notifications log |
| “Already have subscription” on checkout | User has Paddle sub — use Settings to change plan |
| “Complimentary access” on checkout | Active admin grant — revoke or wait for expiry first |
| Paid but downgraded after dispute | Expected — adjustment webhook revoked access; resubscribe or contact support |
| Wrong tier after renewal | Wait for daily cron or trigger `/api/cron/billing-reconcile` manually |
| Admin Health key mismatch | Sandbox key with `production` env or vice versa |
| Plan change fails | No active Paddle sub, or admin grant (not Paddle-billed) |

**Webhook test:** Paddle Notifications → destination → send test event → should return 200.

**Subscription state:** `GET /api/billing/subscription` (authenticated) returns `effectiveTier`, `canChangePlan`, `billingSource`.

---

## Key source files

| Area | Path |
|------|------|
| Entitlements | `lib/constants/entitlements.ts` |
| Price IDs | `lib/constants/pricing.ts` |
| Billing provider interface | `lib/services/billing/billing-provider.ts` |
| Paddle implementation | `lib/services/billing/paddle-billing-provider.ts` |
| Subscription DB layer | `lib/services/billing/subscription-service.ts` |
| Admin grant helpers | `lib/services/billing/admin-subscription.ts` |
| Checkout / plan UI hook | `hooks/use-billing-plan-action.ts` |
| Paddle.js init | `components/billing/paddle-provider.tsx` |
| Webhook route + dedup | `app/api/webhooks/paddle/route.ts`, `lib/services/billing/paddle-webhook-dedup.ts` |
| Refund/chargeback handler | `lib/services/billing/paddle-adjustment-handler.ts` |
| Daily cron (content + billing) | `app/api/cron/content-invalidation/route.ts`, `vercel.json` |
| Reconciliation (manual) | `app/api/cron/billing-reconcile/route.ts`, `lib/services/billing/billing-reconcile.ts` |
| Change plan API + preview | `app/api/billing/change-plan/route.ts`, `app/api/billing/change-plan/preview/route.ts` |
| Plan change confirm UI | `components/billing/plan-change-confirm-dialog.tsx` |
| Grandfather scene picks | `lib/services/scene-access-service.ts` |
| Admin billing | `lib/services/admin-service.ts` |
| Live env status | `lib/paddle/billing-status.ts` |

---

## Summary

- **New users** subscribe via Paddle checkout → webhooks grant access.
- **Existing Paddle subscribers** change Plus ↔ Pro via subscription update with **immediate prorated billing** — not a second checkout.
- **Cancellations** keep access until period end unless admin force-revokes.
- **Failed payments** revoke access immediately with no grace period; data is preserved.
- **Refunds and chargebacks** revoke access immediately via adjustment webhooks.
- **Webhook dedup + daily reconciliation** protect against duplicate events and missed renewals.
- **Plan changes** require proration preview confirmation before charging.
- **Admin grants** bypass Paddle; timed grants expire; paid revokes cancel in Paddle first; checkout blocked during active grants.
- **Sandbox and live** are fully separate — recreate catalog and keys for production.
