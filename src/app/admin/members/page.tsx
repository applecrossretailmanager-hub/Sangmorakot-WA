import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import { markMembershipPaid, cancelMembership, markPtPurchasePaid, setMemberRole } from "../actions";

export const revalidate = 0;

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending_cash: "Pending cash",
  past_due: "Past due",
  canceled: "Cancelled",
  incomplete: "Incomplete",
};

const STATUS_COLOR: Record<string, string> = {
  active: "text-gold",
  pending_cash: "text-primary font-medium",
  past_due: "text-primary font-medium",
  canceled: "text-muted",
  incomplete: "text-primary",
};

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  membership: "Membership",
  pt_package: "PT Package",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

export default async function AdminMembersPage() {
  const supabase = await createClient();

  const [{ data: memberships }, { data: pendingPurchases }, { data: profiles }, { data: payments }] =
    await Promise.all([
      supabase
        .from("memberships")
        .select("*, profile:profiles(full_name, phone), plan:membership_plans(name, price_cents, currency)")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("pt_purchases")
        .select("*, profile:profiles(full_name), package:pt_packages(name, price_cents, currency)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100),
      supabase
        .from("payments")
        .select("*, profile:profiles!payments_user_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(150),
    ]);

  const attentionCount =
    memberships?.filter((m) => m.status === "pending_cash" || m.status === "past_due").length ?? 0;

  return (
    <div className="space-y-16">
      {!!pendingPurchases?.length && (
        <section>
          <h2 className="text-xl font-bold mb-4">Pending Cash — Personal Training</h2>
          <div className="space-y-3">
            {pendingPurchases.map((p) => (
              <div key={p.id} className="card flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{p.profile?.full_name ?? "Member"}</p>
                  <p className="text-sm text-muted">
                    {p.package?.name} —{" "}
                    {formatMoney(p.package?.price_cents ?? 0, p.package?.currency?.toUpperCase())}
                  </p>
                </div>
                <form action={markPtPurchasePaid.bind(null, p.id)}>
                  <button type="submit" className="btn-primary text-sm py-1.5 px-3">
                    Mark cash received
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Memberships</h2>
          {attentionCount > 0 && (
            <span className="text-sm text-primary font-medium">
              {attentionCount} need{attentionCount === 1 ? "s" : ""} attention
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 pr-4">Member</th>
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2 pr-4">Method</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Renews / Ends</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {memberships?.map((m) => (
                <tr key={m.id} className="border-b border-border/60">
                  <td className="py-3 pr-4">
                    <p>{m.profile?.full_name ?? "—"}</p>
                    <p className="text-muted text-xs">{m.profile?.phone}</p>
                  </td>
                  <td className="py-3 pr-4">{m.plan?.name}</td>
                  <td className="py-3 pr-4 capitalize">{m.payment_method}</td>
                  <td className={`py-3 pr-4 ${STATUS_COLOR[m.status] ?? ""}`}>
                    {STATUS_LABEL[m.status] ?? m.status}
                  </td>
                  <td className="py-3 pr-4 text-muted">
                    {m.current_period_end
                      ? `${formatDate(m.current_period_end)}${m.cancel_at_period_end ? " (cancelling)" : ""}`
                      : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-2 justify-end">
                      {m.status === "pending_cash" && (
                        <form action={markMembershipPaid.bind(null, m.id)}>
                          <button type="submit" className="btn-primary text-xs py-1 px-2">
                            Mark paid
                          </button>
                        </form>
                      )}
                      {m.status !== "canceled" && (
                        <form action={cancelMembership.bind(null, m.id)}>
                          <button type="submit" className="btn-outline text-xs py-1 px-2 hover:text-primary">
                            Cancel
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!memberships?.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted">
                    No memberships yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Payment History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Member</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Method</th>
                <th className="py-2 pr-4">Status</th>
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
                    <span className={p.status === "succeeded" ? "text-gold" : "text-primary"}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!payments?.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted">
                    No payments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">All Members</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {profiles?.map((p) => (
                <tr key={p.id} className="border-b border-border/60">
                  <td className="py-3 pr-4">{p.full_name ?? "—"}</td>
                  <td className="py-3 pr-4">{p.phone ?? "—"}</td>
                  <td className="py-3 pr-4 capitalize">{p.role}</td>
                  <td className="py-3 pr-4 text-right">
                    <form action={setMemberRole.bind(null, p.id, p.role === "admin" ? "member" : "admin")}>
                      <button type="submit" className="btn-outline text-xs py-1 px-2">
                        {p.role === "admin" ? "Remove admin" : "Make admin"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
