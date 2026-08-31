import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { MonthCalendar } from "./month-calendar";

export const metadata: Metadata = { title: "Class Timetable" };
export const revalidate = 0;

function parseMonthParam(param?: string) {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function toMonthParam(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const monthStart = parseMonthParam(monthParam);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

  // Monday-first grid covering every full week the month touches.
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - ((gridStart.getDay() + 6) % 7));
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - ((gridEnd.getDay() + 6) % 7)));

  const fromIso = toDateKey(gridStart);
  const toIso = toDateKey(gridEnd);

  const [{ data: schedule }, { data: occurrences }, { data: myBookings }] = await Promise.all([
    supabase.from("class_schedule").select("id").eq("active", true).limit(1),
    supabase.rpc("get_class_occurrences", { p_from: fromIso, p_to: toIso }),
    user
      ? supabase
          .from("class_bookings")
          .select("id, schedule_id, class_date")
          .eq("user_id", user.id)
          .eq("status", "booked")
          .gte("class_date", fromIso)
          .lte("class_date", toIso)
      : Promise.resolve({ data: null }),
  ]);

  const myBookingIds: Record<string, string> = {};
  for (const b of myBookings ?? []) {
    myBookingIds[`${b.schedule_id}_${b.class_date}`] = b.id;
  }

  const days: string[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    days.push(toDateKey(d));
  }

  const prevMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  return (
    <div className="container-page py-16">
      <div className="max-w-2xl mx-auto text-center mb-12">
        <h1 className="font-display uppercase text-4xl md:text-5xl tracking-tight mb-4">
          Class Timetable
        </h1>
        <p className="text-muted">
          Browse a full month, see live spots left, and log in to book any class.
        </p>
      </div>

      {!schedule?.length ? (
        <p className="text-center text-muted">No classes scheduled yet — check back soon.</p>
      ) : (
        <MonthCalendar
          monthLabel={monthStart.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
          monthParam={toMonthParam(monthStart)}
          prevMonthParam={toMonthParam(prevMonth)}
          nextMonthParam={toMonthParam(nextMonth)}
          days={days}
          occurrences={occurrences ?? []}
          isLoggedIn={!!user}
          myBookingIds={myBookingIds}
        />
      )}
    </div>
  );
}
