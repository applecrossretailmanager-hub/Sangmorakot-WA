import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatInterval, formatDateTime } from "@/lib/format";
import { ManageBillingButton } from "./manage-billing-button";
import { CancelBookingButton } from "./cancel-booking-button";

export const metadata: Metadata = { title: "My Account" };
export const revalidate = 0;

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending_cash: "Pending — pay at gym",
  past_due: "Payment past due",
  canceled: "Cancelled",
  incomplete: "Payment processing — check back shortly",
};

const STATUS_COLOR: Record<string, string> = {
  active: "text-gold",
  pending_cash: "text-muted",
  past_due: "text-primary",
  canceled: "text-muted",
  incomplete: "text-primary",
};

export default async function AccountPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: membership }, { data: purchases }, { data: bookings }] = await Promise.all([
    supabase
      .from("memberships")
      .select("*, plan:membership_plans(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("pt_purchases")
      .select("*, package:pt_packages(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("pt_bookings")
      .select("*, trainer:pt_trainers(name)")
      .eq("user_id", user.id)
      .eq("status", "booked")
      .gt("start_at", new Date().toISOString())
      .order("start_at"),
  ]);

  const sessionsRemaining =
    purchases?.filter((p) => p.status === "paid").reduce((s, p) => s + p.sessions_remaining, 0) ??
    0;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const pendingPurchases =
    purchases?.filter((p) => p.status === "pending" && p.payment_method === "stripe") ?? [];
  const failedPurchases =
    purchases?.filter(
      (p) =>
        p.status === "canceled" &&
        p.payment_method === "stripe" &&
        new Date(p.created_at).getTime() > thirtyDaysAgo,
    ) ?? [];

  return (
    <div className="container-page py-16 max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">My Account</h1>
        <p className="text-muted">{user.email}</p>
      </div>

      <section className="card">
        <h2 className="font-bold text-lg mb-4">Membership</h2>
        {!membership ? (
          <div>
            <p className="text-muted mb-4">You don&rsquo;t have a membership yet.</p>
            <Link href="/membership" className="btn-primary inline-flex">
              View Plans
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-medium">{membership.plan?.name}</p>
              <p className="text-sm text-muted">
                {formatMoney(membership.plan?.price_cents ?? 0, membership.plan?.currency.toUpperCase())}{" "}
                {formatInterval(membership.plan?.interval ?? "month", membership.plan?.interval_count ?? 1)}
              </p>
              <p className={`text-sm mt-1 ${STATUS_COLOR[membership.status] ?? ""}`}>
                {STATUS_LABEL[membership.status] ?? membership.status}
                {membership.cancel_at_period_end && membership.current_period_end
                  ? ` — ends ${new Date(membership.current_period_end).toLocaleDateString("en-AU")}`
                  : membership.current_period_end && membership.status === "active"
                    ? ` — renews ${new Date(membership.current_period_end).toLocaleDateString("en-AU")}`
                    : ""}
              </p>
            </div>
            {membership.payment_method === "stripe" && <ManageBillingButton />}
          </div>
        )}
      </section>

      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Personal Training</h2>
          <span className="text-sm text-muted">
            <strong className="text-gold">{sessionsRemaining}</strong> session
            {sessionsRemaining === 1 ? "" : "s"} left
          </span>
        </div>

        {!!pendingPurchases.length && (
          <div className="mb-4 space-y-2">
            {pendingPurchases.map((p) => (
              <p
                key={p.id}
                className="rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold"
              >
                Payment processing for {p.package?.name} — this can take a few days for bank
                transfers. We&rsquo;ll add your sessions as soon as it clears.
              </p>
            ))}
          </div>
        )}

        {!!failedPurchases.length && (
          <div className="mb-4 space-y-2">
            {failedPurchases.map((p) => (
              <p
                key={p.id}
                className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary"
              >
                Your payment for {p.package?.name} didn&rsquo;t go through. No sessions were
                added — please try again.
              </p>
            ))}
          </div>
        )}

        {bookings?.length ? (
          <ul className="divide-y divide-border mb-4">
            {bookings.map((b) => (
              <li key={b.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{formatDateTime(b.start_at)}</p>
                  <p className="text-sm text-muted">with {b.trainer?.name}</p>
                </div>
                <CancelBookingButton bookingId={b.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted mb-4">No upcoming sessions booked.</p>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href="/personal-training/book" className="btn-outline">
            Book a Session
          </Link>
          <Link href="/personal-training" className="btn-outline">
            Buy More Sessions
          </Link>
        </div>
      </section>
    </div>
  );
}
