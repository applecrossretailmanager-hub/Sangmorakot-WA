import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateStripeCustomerId } from "@/lib/stripe-customer";
import { getStripe, getSiteUrl } from "@/lib/stripe";
import { getPaymentSettings } from "@/lib/payment-settings";

const bodySchema = z.object({ packageId: z.string().uuid() });

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
  const { data: pkg } = await admin
    .from("pt_packages")
    .select("*")
    .eq("id", parsed.data.packageId)
    .eq("active", true)
    .single();

  if (!pkg) {
    return NextResponse.json({ error: "Package not found." }, { status: 404 });
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
    mode: "payment",
    payment_method_types: paymentMethodTypes,
    customer: customerId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: pkg.currency,
          unit_amount: pkg.price_cents,
          product_data: {
            name: pkg.name,
            description: pkg.description ?? undefined,
          },
        },
      },
    ],
    metadata: {
      type: "pt_package",
      package_id: pkg.id,
      user_id: user.id,
      session_count: String(pkg.session_count),
    },
    success_url: `${siteUrl}/account?checkout=success`,
    cancel_url: `${siteUrl}/personal-training/buy/${pkg.id}?checkout=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
