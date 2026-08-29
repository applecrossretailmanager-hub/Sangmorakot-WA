import "server-only";
import type { User } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Returns the Stripe customer id for a user, creating one (and persisting it
 * on their profile) the first time they check out.
 */
export async function getOrCreateStripeCustomerId(user: User): Promise<string> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id, full_name, phone")
    .eq("id", user.id)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    name: profile?.full_name ?? undefined,
    phone: profile?.phone ?? undefined,
    metadata: { supabase_user_id: user.id },
  });

  await admin
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", user.id);

  return customer.id;
}
