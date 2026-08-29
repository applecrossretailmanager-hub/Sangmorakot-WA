import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export const revalidate = 0;

const STATUS_LABEL: Record<string, string> = {
  pending_cash: "Pending cash",
  past_due: "Past due",
};

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    { count: activeMembers },
    { count: pendingCashMembers },
    { count: pendingPtPurchases },
    { count: upcomingBookingsCount },
    { data: upcomingBookings },
    { data: attentionMemberships },
  ] = await Promise.all([
    supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_cash"),
    supabase
      .from("pt_purchases")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("pt_bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "booked")
      .gt("start_at", new Date().toISOString()),
    supabase
      .from("pt_bookings")
      .select("*, trainer:pt_trainers(name), profile:profiles(full_name)")
      .eq("status", "booked")
      .gt("start_at", new Date().toISOString())
      .order("start_at")
      .limit(8),
    supabase
      .from("memberships")
      .select("*, profile:profiles(full_name, phone), plan:membership_plans(name)")
      .in("status", ["pending_cash", "past_due"])
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <div className="space-y-12">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active members" value={activeMembers ?? 0} />
        <Stat label="Pending cash memberships" value={pendingCashMembers ?? 0} highlight />
        <Stat label="Pending cash PT payments" value={pendingPtPurchases ?? 0} highlight />
        <Stat label="Upcoming PT bookings" value={upcomingBookingsCount ?? 0} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Upcoming Bookings</h2>
          <Link href="/admin/personal-training" className="text-sm text-gold hover:underline">
            View all →
          </Link>
        </div>
        <div className="space-y-2">
          {upcomingBookings?.map((b) => (
            <div key={b.id} className="card flex items-center justify-between gap-4 py-3">
              <p className="font-medium">{formatDateTime(b.start_at)}</p>
              <p className="text-sm text-muted">
                {b.profile?.full_name ?? "Member"} with {b.trainer?.name}
              </p>
            </div>
          ))}
          {!upcomingBookings?.length && (
            <p className="text-muted">No upcoming bookings.</p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Memberships Needing Attention</h2>
          <Link href="/admin/members" className="text-sm text-gold hover:underline">
            View all →
          </Link>
        </div>
        <div className="space-y-2">
          {attentionMemberships?.map((m) => (
            <div key={m.id} className="card flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{m.profile?.full_name ?? "Member"}</p>
                <p className="text-sm text-muted">
                  {m.plan?.name} — {m.profile?.phone}
                </p>
              </div>
              <span className="text-sm text-primary font-medium">
                {STATUS_LABEL[m.status] ?? m.status}
              </span>
            </div>
          ))}
          {!attentionMemberships?.length && (
            <p className="text-muted">Nothing needs attention right now.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="card">
      <p className="text-sm text-muted mb-1">{label}</p>
      <p className={`text-3xl font-extrabold ${highlight && value > 0 ? "text-gold" : ""}`}>
        {value}
      </p>
    </div>
  );
}
