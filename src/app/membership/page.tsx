import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatInterval } from "@/lib/format";
import type { Json } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Membership",
  description: "Muay Thai membership plans in WA — pay by card with automatic direct debit, or cash at the gym. Your first class is free.",
};
export const revalidate = 0;

export default async function MembershipPage() {
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("membership_plans")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  return (
    <div className="container-page py-16">
      <div className="max-w-2xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-extrabold mb-4">Membership Plans</h1>
        <p className="text-muted">
          Pay by card for automatic recurring billing, or choose to pay cash in person at the
          gym — either way you pick the plan online.
        </p>
      </div>

      {!plans?.length ? (
        <p className="text-center text-muted">Plans are being updated — check back soon.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div key={plan.id} className="card flex flex-col">
              <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
              {plan.description && (
                <p className="text-sm text-muted mb-4">{plan.description}</p>
              )}
              <div className="mb-6">
                <span className="text-3xl font-extrabold">
                  {formatMoney(plan.price_cents, plan.currency.toUpperCase())}
                </span>
                <span className="text-muted text-sm ml-1">
                  {formatInterval(plan.interval, plan.interval_count)}
                </span>
              </div>
              <FeatureList features={plan.features} />
              <Link href={`/membership/join/${plan.id}`} className="btn-primary mt-auto">
                Choose {plan.name}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeatureList({ features }: { features: Json }) {
  const list = Array.isArray(features) ? (features as string[]) : [];
  if (!list.length) return null;
  return (
    <ul className="space-y-2 mb-6 flex-1 text-sm text-muted">
      {list.map((f, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-gold">✓</span>
          {String(f)}
        </li>
      ))}
    </ul>
  );
}
