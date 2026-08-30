"use client";

import { useState } from "react";
import { formatDayHeading } from "@/lib/format";
import { BookClassButton } from "./book-class-button";

type ScheduleItem = {
  id: string;
  name: string;
  start_time: string;
  day_of_week: number;
  trainer: { name: string } | null;
};

type Occurrence = {
  schedule_id: string;
  class_date: string;
  capacity: number;
  booked_count: number;
};

const DAY_LABELS_FULL: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function ClassTimetable({
  schedule,
  occurrences,
  isLoggedIn,
}: {
  schedule: ScheduleItem[];
  occurrences: Occurrence[];
  isLoggedIn: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const scheduleByDay = new Map<number, ScheduleItem[]>();
  for (const c of schedule) {
    const list = scheduleByDay.get(c.day_of_week) ?? [];
    list.push(c);
    scheduleByDay.set(c.day_of_week, list);
  }

  const selected = schedule.find((c) => c.id === selectedId) ?? null;
  const selectedOccurrences = selected
    ? occurrences
        .filter((o) => o.schedule_id === selected.id)
        .sort((a, b) => a.class_date.localeCompare(b.class_date))
    : [];

  return (
    <div className="mb-16">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
        {WEEK_ORDER.map((day) => (
          <div key={day} className="card">
            <h3 className="font-semibold text-gold mb-3">{DAY_LABELS_FULL[day]}</h3>
            <div className="space-y-1">
              {(scheduleByDay.get(day) ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                  className={`block w-full text-left rounded-md -mx-1 px-1 py-1.5 transition-colors ${
                    c.id === selectedId ? "bg-gold/10 text-gold" : "hover:bg-surface-2"
                  }`}
                >
                  <p className="text-sm font-medium">{c.start_time.slice(0, 5)}</p>
                  <p className="text-sm">{c.name}</p>
                  {c.trainer?.name && <p className="text-xs text-muted">{c.trainer.name}</p>}
                </button>
              ))}
              {!scheduleByDay.get(day)?.length && <p className="text-sm text-muted">—</p>}
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted mb-6">Tap a class above to see spots left</p>

      {selected && (
        <div className="card max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-lg">{selected.name} — spots left</h3>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-sm text-muted hover:text-foreground"
            >
              Close
            </button>
          </div>
          {selectedOccurrences.length ? (
            <div className="space-y-2">
              {selectedOccurrences.map((o) => {
                const spotsLeft = o.capacity - o.booked_count;
                const full = spotsLeft <= 0;
                return (
                  <div
                    key={`${o.schedule_id}_${o.class_date}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {formatDayHeading(`${o.class_date}T00:00:00`)}
                      </p>
                      <p className="text-sm text-muted">
                        {full ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}{" "}
                        ({o.booked_count}/{o.capacity})
                      </p>
                    </div>
                    <BookClassButton
                      scheduleId={o.schedule_id}
                      classDate={o.class_date}
                      full={full}
                      isLoggedIn={isLoggedIn}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted text-sm">No upcoming dates in the next two weeks.</p>
          )}
        </div>
      )}
    </div>
  );
}
