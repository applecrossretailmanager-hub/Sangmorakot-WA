import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    { count: activeMembers },
    { count: pendingCashMembers },
    { count: pendingPtPurchases },
    { count: upcomingBookings },
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
  ]);

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat label="Active members" value={activeMembers ?? 0} />
      <Stat label="Pending cash memberships" value={pendingCashMembers ?? 0} highlight />
      <Stat label="Pending cash PT payments" value={pendingPtPurchases ?? 0} highlight />
      <Stat label="Upcoming PT bookings" value={upcomingBookings ?? 0} />
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
