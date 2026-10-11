import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/format";
import {
  adminCheckInWalkIn,
  adminRecordCashMembership,
  adminRecordCashPtPackage,
  toggleClassCheckIn,
  markClassBookingPaid,
} from "../actions";

export const revalidate = 0;

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending_cash: "Pending — pay at gym",
  past_due: "Payment past due",
  canceled: "Cancelled",
  incomplete: "Payment processing",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatClassDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

export default async function AdminCheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; member?: string }>;
}) {
  const { q, member: memberId } = await searchParams;
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: plans }, { data: packages }] = await Promise.all([
    supabase.from("membership_plans").select("*").eq("active", true).order("sort_order"),
    supabase.from("pt_packages").select("*").eq("active", true).order("sort_order"),
  ]);

  const query = q?.trim() ?? "";
  const { data: results } = query
    ? await admin
        .from("profiles")
        .select("*")
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .order("full_name")
        .limit(20)
    : { data: null };

  let member: { id: string; full_name: string | null; phone: string | null } | null = null;
  let membership: {
    id: string;
    status: string;
    plan: { name: string } | null;
  } | null = null;
  let sessionsRemaining = 0;
  let todaysClasses: {
    id: string;
    name: string;
    start_time: string;
    checkedIn: boolean;
    bookingId: string | null;
  }[] = [];
  let unpaidClasses: {
    bookingId: string;
    name: string;
    classDate: string;
    amountCents: number;
    currency: string;
  }[] = [];

  if (memberId) {
    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", memberId)
      .maybeSingle();
    member = profile;

    if (member) {
      const [{ data: membershipRow }, { data: purchases }, { data: classSchedule }, { data: bookings }, { data: unpaid }] =
        await Promise.all([
          admin
            .from("memberships")
            .select("*, plan:membership_plans(name)")
            .eq("user_id", member.id)
            .in("status", ["active", "pending_cash", "past_due"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          admin
            .from("pt_purchases")
            .select("sessions_remaining, status")
            .eq("user_id", member.id)
            .eq("status", "paid"),
          admin
            .from("class_schedule")
            .select("*")
            .eq("active", true)
            .eq("day_of_week", new Date().getDay())
            .order("start_time"),
          admin
            .from("class_bookings")
            .select("id, schedule_id, checked_in_at")
            .eq("user_id", member.id)
            .eq("class_date", todayIso())
            .eq("status", "booked"),
          admin
            .from("class_bookings")
            .select("id, class_date, amount_due_cents, currency, schedule:class_schedule(name)")
            .eq("user_id", member.id)
            .eq("status", "booked")
            .eq("requires_payment", true)
            .is("paid_at", null)
            .order("class_date"),
        ]);

      membership = membershipRow;
      sessionsRemaining = purchases?.reduce((s, p) => s + p.sessions_remaining, 0) ?? 0;

      const bookingByScheduleId = new Map(bookings?.map((b) => [b.schedule_id, b]) ?? []);
      todaysClasses = (classSchedule ?? []).map((c) => {
        const booking = bookingByScheduleId.get(c.id);
        return {
          id: c.id,
          name: c.name,
          start_time: c.start_time,
          checkedIn: !!booking?.checked_in_at,
          bookingId: booking?.id ?? null,
        };
      });

      unpaidClasses = (unpaid ?? []).map((b) => ({
        bookingId: b.id,
        name: b.schedule?.name ?? "Class",
        classDate: b.class_date,
        amountCents: b.amount_due_cents ?? 0,
        currency: b.currency ?? "AUD",
      }));
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xl font-bold mb-4">Find a Member</h2>
        <form action="/admin/checkin" className="flex flex-wrap gap-2 mb-4">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search name or phone"
            className="input max-w-sm"
            autoFocus
          />
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>

        {!!query && (
          <div className="space-y-2">
            {results?.map((r) => (
              <Link
                key={r.id}
                href={`/admin/checkin?q=${encodeURIComponent(query)}&member=${r.id}`}
                className={`card block hover:border-gold transition-colors ${
                  memberId === r.id ? "border-gold" : ""
                }`}
              >
                <p className="font-medium">{r.full_name ?? "Unnamed member"}</p>
                <p className="text-sm text-muted">{r.phone ?? "No phone on file"}</p>
              </Link>
            ))}
            {!results?.length && <p className="text-muted">No members match &ldquo;{query}&rdquo;.</p>}
          </div>
        )}
      </section>

      {member && (
        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">{member.full_name ?? "Unnamed member"}</h2>
            <p className="text-muted text-sm">{member.phone ?? "No phone on file"}</p>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3">Membership</h3>
            {membership ? (
              <p className="text-sm">
                {membership.plan?.name} —{" "}
                <span className={membership.status === "active" ? "text-gold" : "text-danger"}>
                  {STATUS_LABEL[membership.status] ?? membership.status}
                </span>
              </p>
            ) : (
              <>
                <p className="text-sm text-muted mb-3">No active membership.</p>
                {!!plans?.length && (
                  <form
                    action={adminRecordCashMembership.bind(null, member.id)}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <select name="plan_id" required className="input max-w-xs">
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {formatMoney(p.price_cents, p.currency.toUpperCase())}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn-primary text-sm py-2 px-3">
                      Record cash payment
                    </button>
                  </form>
                )}
              </>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3">
              Personal Training — <span className="text-gold">{sessionsRemaining}</span> session
              {sessionsRemaining === 1 ? "" : "s"} left
            </h3>
            {!!packages?.length && (
              <form
                action={adminRecordCashPtPackage.bind(null, member.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <select name="package_id" required className="input max-w-xs">
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatMoney(p.price_cents, p.currency.toUpperCase())}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn-primary text-sm py-2 px-3">
                  Record cash payment
                </button>
              </form>
            )}
          </div>

          {!!unpaidClasses.length && (
            <div className="card border-danger/40">
              <h3 className="font-semibold mb-3 text-danger">
                Outstanding Class Payments —{" "}
                {formatMoney(
                  unpaidClasses.reduce((s, c) => s + c.amountCents, 0),
                  unpaidClasses[0]?.currency,
                )}
              </h3>
              <div className="space-y-2">
                {unpaidClasses.map((c) => (
                  <div key={c.bookingId} className="flex items-center justify-between gap-4 py-1">
                    <p className="text-sm">
                      {formatClassDate(c.classDate)} — {c.name} —{" "}
                      {formatMoney(c.amountCents, c.currency)}
                    </p>
                    <form action={markClassBookingPaid.bind(null, c.bookingId)}>
                      <button type="submit" className="btn-primary text-sm py-1.5 px-3">
                        Mark paid
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="font-semibold mb-3">Today&rsquo;s Classes</h3>
            {todaysClasses.length ? (
              <div className="space-y-2">
                {todaysClasses.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-4 py-1">
                    <p className="text-sm">
                      {c.start_time.slice(0, 5)} — {c.name}
                    </p>
                    {c.checkedIn ? (
                      <form action={toggleClassCheckIn.bind(null, c.bookingId!, false)}>
                        <button type="submit" className="text-sm text-gold hover:text-muted">
                          ✓ Checked in
                        </button>
                      </form>
                    ) : (
                      <form action={adminCheckInWalkIn.bind(null, member.id, c.id, todayIso())}>
                        <button type="submit" className="btn-primary text-sm py-1.5 px-3">
                          Check in
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No classes scheduled today.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
