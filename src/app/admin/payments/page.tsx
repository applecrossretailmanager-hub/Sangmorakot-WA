import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import { markMembershipPaid, markPtPurchasePaid, markClassBookingPaid, archivePayment } from "../actions";

export const revalidate = 0;

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  membership: "Membership",
  pt_package: "PT Package",
  class: "Class",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isWithinLast30Days(iso: string) {
  return new Date(iso).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminPaymentsPage() {
  const supabase = await createClient();

  const [{ data: pendingMemberships }, { data: pendingPurchases }, { data: unpaidClassBookings }, { data: payments }] =
    await Promise.all([
      supabase
        .from("memberships")
        .select("*, profile:profiles(full_name, phone), plan:membership_plans(name, price_cents, currency)")
        .eq("status", "pending_cash")
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("pt_purchases")
        .select("*, profile:profiles(full_name), package:pt_packages(name, price_cents, currency)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("class_bookings")
        .select("*, profile:profiles(full_name, phone), schedule:class_schedule(name)")
        .eq("requires_payment", true)
        .is("paid_at", null)
        .eq("status", "booked")
        .order("class_date", { ascending: true }),
      supabase
        .from("payments")
        .select("*, profile:profiles!payments_user_id_fkey(full_name)")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(150),
    ]);

  const outstanding = [
    ...(pendingMemberships ?? []).map((m) => ({
      key: `membership_${m.id}`,
      memberName: m.profile?.full_name ?? "Member",
      type: "Membership",
      description: m.plan?.name ?? "Membership",
      date: m.created_at,
      amountCents: m.plan?.price_cents ?? 0,
      currency: m.plan?.currency?.toUpperCase() ?? "AUD",
      action: markMembershipPaid.bind(null, m.id),
    })),
    ...(pendingPurchases ?? []).map((p) => ({
      key: `pt_${p.id}`,
      memberName: p.profile?.full_name ?? "Member",
      type: "PT Package",
      description: p.package?.name ?? "PT Package",
      date: p.created_at,
      amountCents: p.package?.price_cents ?? 0,
      currency: p.package?.currency?.toUpperCase() ?? "AUD",
      action: markPtPurchasePaid.bind(null, p.id),
    })),
    ...(unpaidClassBookings ?? []).map((b) => ({
      key: `class_${b.id}`,
      memberName: b.profile?.full_name ?? "Member",
      type: "Class",
      description: `${b.schedule?.name ?? "Class"} — ${formatDate(b.class_date)}`,
      date: b.class_date,
      amountCents: b.amount_due_cents ?? 0,
      currency: b.currency ?? "AUD",
      action: markClassBookingPaid.bind(null, b.id),
    })),
  ].sort((a, b) => (a.date && b.date ? a.date.localeCompare(b.date) : 0));

  const totalOutstandingCents = outstanding.reduce((s, o) => s + o.amountCents, 0);
  const outstandingCurrency = outstanding[0]?.currency ?? "AUD";

  const totalCollected30d =
    payments
      ?.filter((p) => p.status === "succeeded" && isWithinLast30Days(p.created_at))
      .reduce((s, p) => s + p.amount_cents, 0) ?? 0;

  return (
    <div className="space-y-16">
      <section>
        <h2 className="text-xl font-bold mb-4">Payments Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card border-danger/40">
            <p className="text-sm text-muted mb-1">Outstanding right now</p>
            <p className="text-2xl font-bold text-danger">
              {formatMoney(totalOutstandingCents, outstandingCurrency)}
            </p>
            <p className="text-sm text-muted mt-1">
              {outstanding.length} invoice{outstanding.length === 1 ? "" : "s"} due
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-muted mb-1">Collected — last 30 days</p>
            <p className="text-2xl font-bold text-gold">
              {formatMoney(totalCollected30d, outstandingCurrency)}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Invoices Due</h2>
          {!!outstanding.length && (
            <span className="text-sm text-danger font-medium">
              {outstanding.length} to collect
            </span>
          )}
        </div>
        <div className="scroll-dark overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 pr-4">Member</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Since</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {outstanding.map((o) => (
                <tr key={o.key} className="border-b border-border/60">
                  <td className="py-3 pr-4 font-medium">{o.memberName}</td>
                  <td className="py-3 pr-4">{o.type}</td>
                  <td className="py-3 pr-4 text-muted">{o.description}</td>
                  <td className="py-3 pr-4 text-muted">{formatDate(o.date)}</td>
                  <td className="py-3 pr-4 text-danger font-medium">
                    {formatMoney(o.amountCents, o.currency)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <form action={o.action}>
                      <button type="submit" className="btn-primary text-xs py-1 px-2">
                        Mark cash received
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {!outstanding.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted">
                    Nothing outstanding — everyone&rsquo;s paid up.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Payment History</h2>
        <div className="scroll-dark overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Member</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Method</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {payments?.map((p) => (
                <tr key={p.id} className="border-b border-border/60">
                  <td className="py-3 pr-4 text-muted">{formatDateTime(p.created_at)}</td>
                  <td className="py-3 pr-4">{p.profile?.full_name ?? "—"}</td>
                  <td className="py-3 pr-4">{PAYMENT_TYPE_LABEL[p.type] ?? p.type}</td>
                  <td className="py-3 pr-4">{formatMoney(p.amount_cents, p.currency)}</td>
                  <td className="py-3 pr-4 capitalize">{p.method}</td>
                  <td className="py-3 pr-4 capitalize">
                    <span className={p.status === "succeeded" ? "text-gold" : "text-danger"}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <form action={archivePayment.bind(null, p.id)}>
                      <button type="submit" className="text-xs text-muted hover:text-danger">
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {!payments?.length && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted">
                    No payments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
