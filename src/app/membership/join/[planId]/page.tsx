import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney, formatInterval } from "@/lib/format";
import { getPaymentSettings } from "@/lib/payment-settings";
import { JoinActions } from "./join-actions";

export default async function JoinPlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/membership/join/${planId}`)}`);
  }

  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("membership_plans")
    .select("*")
    .eq("id", planId)
    .eq("active", true)
    .single();

  if (!plan) notFound();

  const { cardEnabled, becsEnabled } = await getPaymentSettings();

  return (
    <div className="container-page py-16 max-w-lg">
      <h1 className="text-3xl font-bold mb-2">Join {plan.name}</h1>
      <p className="text-muted mb-8">
        {formatMoney(plan.price_cents, plan.currency.toUpperCase())}{" "}
        {formatInterval(plan.interval, plan.interval_count)}
      </p>

      <JoinActions planId={plan.id} cardEnabled={cardEnabled} becsEnabled={becsEnabled} />
    </div>
  );
}
