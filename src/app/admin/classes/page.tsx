import { createClient } from "@/lib/supabase/server";
import { DAY_LABELS } from "@/lib/days";
import { formatDayHeading } from "@/lib/format";
import { createClassSchedule, bulkDeleteClassSchedule, cancelClassBookingAdmin } from "../actions";
import { AdminClassGrid } from "./class-grid";

export const revalidate = 0;

export default async function AdminClassesPage() {
  const supabase = await createClient();

  const todayIso = new Date().toISOString().slice(0, 10);

  const [{ data: schedule }, { data: trainers }, { data: roster }] = await Promise.all([
    supabase
      .from("class_schedule")
      .select("*, trainer:pt_trainers(name)")
      .order("day_of_week")
      .order("start_time"),
    supabase.from("pt_trainers").select("*").eq("active", true),
    supabase
      .from("class_bookings")
      .select("*, profile:profiles(full_name), schedule:class_schedule(name, start_time, capacity)")
      .eq("status", "booked")
      .gte("class_date", todayIso)
      .order("class_date")
      .limit(300),
  ]);

  const rosterByOccurrence = new Map<
    string,
    {
      className: string;
      date: string;
      time: string;
      capacity: number;
      attendees: { id: string; name: string }[];
    }
  >();
  for (const b of roster ?? []) {
    const key = `${b.schedule_id}_${b.class_date}`;
    if (!rosterByOccurrence.has(key)) {
      rosterByOccurrence.set(key, {
        className: b.schedule?.name ?? "Class",
        date: b.class_date,
        time: b.schedule?.start_time?.slice(0, 5) ?? "",
        capacity: b.schedule?.capacity ?? 0,
        attendees: [],
      });
    }
    rosterByOccurrence
      .get(key)!
      .attendees.push({ id: b.id, name: b.profile?.full_name ?? "Member" });
  }
  const occurrences = Array.from(rosterByOccurrence.entries()).sort(([, a], [, b]) =>
    a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date),
  );

  return (
    <div className="space-y-16">
      <section>
        <h2 className="text-xl font-bold mb-4">Weekly Timetable</h2>
        <p className="text-muted text-sm mb-4">
          Tap a class in the grid to view, edit, hide, or delete it, or tick it for bulk delete.
        </p>

        <AdminClassGrid schedule={schedule ?? []} trainers={trainers ?? []} />

        <form id="bulk-classes" action={bulkDeleteClassSchedule} className="flex justify-end mb-6">
          <button type="submit" className="btn-outline text-sm py-1.5 px-3 hover:text-primary">
            Delete selected
          </button>
        </form>

        <details className="card">
          <summary className="cursor-pointer font-medium">+ New class</summary>
          <form action={createClassSchedule} className="mt-4 space-y-3 max-w-lg">
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Class name</span>
              <input name="name" required className="input" placeholder="Muay Thai Fundamentals" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Description</span>
              <input name="description" className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Trainer (optional)</span>
              <select name="trainer_id" className="input" defaultValue="">
                <option value="">— none —</option>
                {trainers?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="mb-1.5 block text-sm text-muted">
                Days (pick as many as run at this time)
              </span>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((label, i) => (
                  <label
                    key={i}
                    className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm cursor-pointer has-[:checked]:border-gold has-[:checked]:text-gold"
                  >
                    <input
                      type="checkbox"
                      name="day_of_week"
                      value={i}
                      defaultChecked={i >= 1 && i <= 5}
                      className="accent-current"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-sm text-muted">Start time</span>
                <input name="start_time" type="time" required className="input" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-muted">Duration (minutes)</span>
                <input
                  name="duration_minutes"
                  type="number"
                  min="15"
                  step="15"
                  defaultValue={60}
                  className="input"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Max people per class</span>
              <input name="capacity" type="number" min="1" defaultValue={10} className="input" />
            </label>
            <button type="submit" className="btn-primary">Add class</button>
          </form>
        </details>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Upcoming Class Rosters</h2>
        <div className="space-y-3">
          {occurrences.map(([key, o]) => (
            <div key={key} className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">
                  {o.className} — {formatDayHeading(`${o.date}T00:00:00`)} {o.time}
                </p>
                <span className="text-sm text-muted">
                  {o.attendees.length}/{o.capacity} booked
                </span>
              </div>
              <ul className="text-sm text-muted space-y-1">
                {o.attendees.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-4">
                    {a.name}
                    <form action={cancelClassBookingAdmin.bind(null, a.id)}>
                      <button type="submit" className="text-xs text-muted hover:text-primary">
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {!occurrences.length && <p className="text-muted">No upcoming class bookings.</p>}
        </div>
      </section>
    </div>
  );
}
