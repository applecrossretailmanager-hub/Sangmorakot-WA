import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe webhooks need the raw request body to verify the signature, so this
// route must not be parsed as JSON by the framework.
export const runtime = "nodejs";

function mapSubscriptionStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "paused":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "incomplete";
  }
}

function getPeriodEndIso(sub: Stripe.Subscription): string | null {
  const itemPeriodEnd = sub.items.data[0]?.current_period_end;
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  const seconds = itemPeriodEnd ?? legacy;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook signature." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, {
      status: 400,
    });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const type = session.metadata?.type;

        if (type === "membership" && session.mode === "subscription" && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const userId = session.metadata?.user_id;
          const planId = session.metadata?.plan_id;
          if (!userId || !planId) break;

          const { data: membership } = await admin
            .from("memberships")
            .upsert(
              {
                user_id: userId,
                plan_id: planId,
                payment_method: "stripe",
                status: mapSubscriptionStatus(subscription.status),
                stripe_subscription_id: subscription.id,
                stripe_customer_id:
                  typeof subscription.customer === "string"
                    ? subscription.customer
                    : subscription.customer.id,
                current_period_end: getPeriodEndIso(subscription),
                cancel_at_period_end: subscription.cancel_at_period_end,
              },
              { onConflict: "stripe_subscription_id" },
            )
            .select("id")
            .single();

          if (membership && session.amount_total) {
            await admin.from("payments").upsert(
              {
                user_id: userId,
                type: "membership",
                reference_id: membership.id,
                amount_cents: session.amount_total,
                currency: (session.currency ?? "aud").toUpperCase(),
                method: "stripe",
                stripe_event_id: event.id,
                status: "succeeded",
              },
              { onConflict: "stripe_event_id", ignoreDuplicates: true },
            );
          }
        }

        if (type === "pt_package" && session.mode === "payment") {
          const userId = session.metadata?.user_id;
          const packageId = session.metadata?.package_id;
          const sessionsTotal = Number(session.metadata?.session_count ?? 0);
          if (!userId || !packageId || !sessionsTotal) break;

          const { data: purchase } = await admin
            .from("pt_purchases")
            .upsert(
              {
                user_id: userId,
                package_id: packageId,
                sessions_total: sessionsTotal,
                sessions_remaining: sessionsTotal,
                payment_method: "stripe",
                status: "paid",
                stripe_checkout_session_id: session.id,
                stripe_payment_intent_id:
                  typeof session.payment_intent === "string"
                    ? session.payment_intent
                    : (session.payment_intent?.id ?? null),
              },
              { onConflict: "stripe_checkout_session_id" },
            )
            .select("id")
            .single();

          if (purchase && session.amount_total) {
            await admin.from("payments").upsert(
              {
                user_id: userId,
                type: "pt_package",
                reference_id: purchase.id,
                amount_cents: session.amount_total,
                currency: (session.currency ?? "aud").toUpperCase(),
                method: "stripe",
                stripe_event_id: event.id,
                status: "succeeded",
              },
              { onConflict: "stripe_event_id", ignoreDuplicates: true },
            );
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await admin
          .from("memberships")
          .update({
            status:
              event.type === "customer.subscription.deleted"
                ? "canceled"
                : mapSubscriptionStatus(subscription.status),
            current_period_end: getPeriodEndIso(subscription),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.parent?.subscription_details?.subscription === "string"
            ? invoice.parent.subscription_details.subscription
            : invoice.parent?.subscription_details?.subscription?.id;
        if (!subscriptionId) break;

        const { data: membership } = await admin
          .from("memberships")
          .select("id, user_id")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        if (membership && invoice.billing_reason === "subscription_cycle") {
          await admin.from("payments").upsert(
            {
              user_id: membership.user_id,
              type: "membership",
              reference_id: membership.id,
              amount_cents: invoice.amount_paid,
              currency: invoice.currency.toUpperCase(),
              method: "stripe",
              stripe_event_id: event.id,
              status: "succeeded",
            },
            { onConflict: "stripe_event_id", ignoreDuplicates: true },
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.parent?.subscription_details?.subscription === "string"
            ? invoice.parent.subscription_details.subscription
            : invoice.parent?.subscription_details?.subscription?.id;
        if (!subscriptionId) break;

        await admin
          .from("memberships")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", subscriptionId);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handling error", err);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
