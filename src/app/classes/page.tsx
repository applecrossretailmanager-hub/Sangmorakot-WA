import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { formatDayHeading, formatTime } from "@/lib/format";
import { BookClassButton } from "./book-class-button";
import { ClassTimetable } from "./class-timetable";

export const metadata: Metadata = { title: "Class Timetable" };
export const revalidate = 0;

export default async function ClassesPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 14);

  const [{ data: schedule }, { data: occurrences }] = await Promise.all([
    supabase
      .from("class_schedule")
      .select("*, trainer:pt_trainers(name)")
      .eq("active", true)
      .order("day_of_week")
      .order("start_time"),
    supabase.rpc("get_class_occurrences", {
      p_from: from.toISOString().slice(0, 10),
      p_to: to.toISOString().slice(0, 10),
    }),
  ]);

  const byDate = new Map<string, typeof occurrences>();
  for (const o of occurrences ?? []) {
    const list = byDate.get(o.class_date) ?? [];
    list.push(o);
    byDate.set(o.class_date, list);
  }
  const dates = Array.from(byDate.entries());

  return (
    <div className="container-page py-16">
      <div className="max-w-2xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-extrabold mb-4">Class Timetable</h1>
        <p className="text-muted">
          Our regular weekly schedule — see if our times work for you, then log in to reserve a
          spot. Each class has limited capacity.
        </p>
      </div>

      {!schedule?.length ? (
        <p className="text-center text-muted mb-16">No classes scheduled yet — check back soon.</p>
      ) : (
        <ClassTimetable schedule={schedule} occurrences={occurrences ?? []} isLoggedIn={!!user} />
      )}

      {!!dates.length && (
        <>
          <h2 className="text-2xl font-bold text-center mb-8">Book a Spot</h2>
          <div className="max-w-3xl mx-auto space-y-8">
            {dates.map(([date, classes]) => (
              <div key={date}>
                <h3 className="font-semibold text-lg mb-3">
                  {formatDayHeading(`${date}T00:00:00`)}
                </h3>
                <div className="space-y-2">
                  {classes!.map((c) => {
                    const spotsLeft = c.capacity - c.booked_count;
                    const full = spotsLeft <= 0;
                    return (
                      <div
                        key={`${c.schedule_id}_${c.class_date}`}
                        className="card flex flex-wrap items-center justify-between gap-4 py-3"
                      >
                        <div>
                          <p className="font-medium">
                            {formatTime(c.start_at)} — {c.name}
                          </p>
                          <p className="text-sm text-muted">
                            {c.trainer_name ? `${c.trainer_name} · ` : ""}
                            {full ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
                            {" "}
                            ({c.booked_count}/{c.capacity})
                          </p>
                        </div>
                        <BookClassButton
                          scheduleId={c.schedule_id}
                          classDate={c.class_date}
                          full={full}
                          isLoggedIn={!!user}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
