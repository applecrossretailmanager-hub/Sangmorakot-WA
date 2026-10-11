import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatInterval, formatDateTime, formatDayHeading } from "@/lib/format";
import { ManageBillingButton } from "./manage-billing-button";
import { CancelBookingButton } from "./cancel-booking-button";
import { DismissNoticeButton } from "./dismiss-notice-button";
import { SignOutButton } from "@/components/sign-out-button";

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
  past_due: "text-danger",
  canceled: "text-muted",
  incomplete: "text-danger",
};

function isWithinLast30Days(iso: string) {
  return new Date(iso).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000;
}

export default async function AccountPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [
    { data: membership },
    { data: purchases },
    { data: bookings },
    { data: classBookings },
    { data: unpaidClassBookings },
  ] = await Promise.all([
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
    supabase
      .from("class_bookings")
      .select("*, schedule:class_schedule(name, start_time)")
      .eq("user_id", user.id)
      .eq("status", "booked")
      .gte("class_date", new Date().toISOString().slice(0, 10))
      .order("class_date"),
    supabase
      .from("class_bookings")
      .select("*, schedule:class_schedule(name)")
      .eq("user_id", user.id)
      .eq("status", "booked")
      .eq("requires_payment", true)
      .is("paid_at", null)
      .order("class_date"),
  ]);

  const sessionsRemaining =
    purchases?.filter((p) => p.status === "paid").reduce((s, p) => s + p.sessions_remaining, 0) ??
    0;

  const pendingPurchases =
    purchases?.filter(
      (p) => p.status === "pending" && p.payment_method === "stripe" && !p.dismissed_at,
    ) ?? [];
  const failedPurchases =
    purchases?.filter(
      (p) =>
        p.status === "canceled" &&
        p.payment_method === "stripe" &&
        isWithinLast30Days(p.created_at) &&
        !p.dismissed_at,
    ) ?? [];

  const totalOwedCents = unpaidClassBookings?.reduce((s, b) => s + (b.amount_due_cents ?? 0), 0) ?? 0;
  const owedCurrency = unpaidClassBookings?.[0]?.currency ?? "AUD";

  return (
    <div className="container-page py-16 max-w-3xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">My Account</h1>
          <p className="text-muted">{user.email}</p>
        </div>
        <SignOutButton className="rounded-md border border-border px-3 py-1.5 text-sm hover:border-gold hover:text-gold transition-colors whitespace-nowrap" />
      </div>

      {!!unpaidClassBookings?.length && (
        <section className="card border-danger/40 bg-danger/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg text-danger">What You Owe</h2>
            <span className="text-lg font-bold text-danger">
              {formatMoney(totalOwedCents, owedCurrency)}
            </span>
          </div>
          <p className="text-sm text-muted mb-3">
            Casual class bookings not covered by a membership — please pay in cash next time you&rsquo;re in.
          </p>
          <ul className="divide-y divide-border">
            {unpaidClassBookings.map((b) => (
              <li key={b.id} className="py-2 flex items-center justify-between gap-4 text-sm">
                <span>
                  {b.schedule?.name ?? "Class"} — {formatDayHeading(`${b.class_date}T00:00:00`)}
                </span>
                <span className="font-medium text-danger">
                  {formatMoney(b.amount_due_cents ?? 0, b.currency ?? "AUD")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

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
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold"
              >
                <p>
                  Payment processing for {p.package?.name} — this can take a few days for bank
                  transfers. We&rsquo;ll add your sessions as soon as it clears.
                </p>
                <DismissNoticeButton purchaseId={p.id} />
              </div>
            ))}
          </div>
        )}

        {!!failedPurchases.length && (
          <div className="mb-4 space-y-2">
            {failedPurchases.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
              >
                <p>
                  Your payment for {p.package?.name} didn&rsquo;t go through. No sessions were
                  added — please try again.
                </p>
                <DismissNoticeButton purchaseId={p.id} />
              </div>
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

      <section className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Group Classes</h2>
          <Link href="/classes" className="btn-outline">
            View Timetable
          </Link>
        </div>

        {classBookings?.length ? (
          <ul className="divide-y divide-border">
            {classBookings.map((b) => (
              <li key={b.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{b.schedule?.name}</p>
                  <p className="text-sm text-muted">
                    {formatDayHeading(`${b.class_date}T00:00:00`)}{" "}
                    {b.schedule?.start_time?.slice(0, 5) ?? ""}
                  </p>
                </div>
                <CancelBookingButton
                  bookingId={b.id}
                  endpoint="/api/classes/bookings/cancel"
                  confirmMessage="Cancel this class booking?"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No upcoming classes booked.</p>
        )}
      </section>

      <section className="card flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h2 className="font-bold text-lg text-gold">Know someone who&rsquo;d love it here?</h2>
          <p className="text-sm text-muted">Refer a friend and you&rsquo;ll both be rewarded.</p>
        </div>
        <Link href="/refer" className="btn-outline whitespace-nowrap">
          Refer a Friend
        </Link>
      </section>
    </div>
  );
}
