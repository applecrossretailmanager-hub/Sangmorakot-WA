import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateStripeCustomerId } from "@/lib/stripe-customer";
import { getStripe, getSiteUrl } from "@/lib/stripe";
import { getPaymentSettings } from "@/lib/payment-settings";

const bodySchema = z.object({ planId: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("membership_plans")
    .select("*")
    .eq("id", parsed.data.planId)
    .eq("active", true)
    .single();

  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  const { data: existing } = await admin
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["active", "pending_cash", "past_due"])
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You already have a membership. Manage it from your account." },
      { status: 409 },
    );
  }

  const { cardEnabled, becsEnabled } = await getPaymentSettings();
  const paymentMethodTypes: ("card" | "au_becs_debit")[] = [
    ...(cardEnabled ? (["card"] as const) : []),
    ...(becsEnabled ? (["au_becs_debit"] as const) : []),
  ];
  if (!paymentMethodTypes.length) {
    return NextResponse.json(
      { error: "Card payments aren't available right now — please pay cash at the gym." },
      { status: 400 },
    );
  }

  const customerId = await getOrCreateStripeCustomerId(user);
  const stripe = getStripe();
  const siteUrl = getSiteUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: paymentMethodTypes,
    customer: customerId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: plan.currency,
          unit_amount: plan.price_cents,
          recurring: {
            interval: plan.interval as "day" | "week" | "month" | "year",
            interval_count: plan.interval_count,
          },
          product_data: {
            name: plan.name,
            description: plan.description ?? undefined,
          },
        },
      },
    ],
    metadata: { type: "membership", plan_id: plan.id, user_id: user.id },
    subscription_data: {
      metadata: { type: "membership", plan_id: plan.id, user_id: user.id },
    },
    success_url: `${siteUrl}/account?checkout=success`,
    cancel_url: `${siteUrl}/membership/join/${plan.id}?checkout=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
