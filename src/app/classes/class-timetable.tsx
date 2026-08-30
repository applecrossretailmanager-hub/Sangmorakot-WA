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

const DAY_LABELS_SHORT: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
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

  const times = Array.from(new Set(schedule.map((c) => c.start_time))).sort();

  const byCell = new Map<string, ScheduleItem[]>();
  for (const c of schedule) {
    const key = `${c.day_of_week}_${c.start_time}`;
    const list = byCell.get(key) ?? [];
    list.push(c);
    byCell.set(key, list);
  }

  const selected = schedule.find((c) => c.id === selectedId) ?? null;
  const selectedOccurrences = selected
    ? occurrences
        .filter((o) => o.schedule_id === selected.id)
        .sort((a, b) => a.class_date.localeCompare(b.class_date))
    : [];

  return (
    <div className="mb-16">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface border-b border-r border-border px-3 py-3 text-left text-xs text-muted font-medium w-20">
                Time
              </th>
              {WEEK_ORDER.map((day) => (
                <th
                  key={day}
                  className="border-b border-border px-3 py-3 text-gold font-semibold whitespace-nowrap min-w-[140px]"
                >
                  {DAY_LABELS_SHORT[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((time) => (
              <tr key={time}>
                <td className="sticky left-0 z-10 bg-surface border-r border-b border-border px-3 py-2 text-xs font-medium text-muted whitespace-nowrap">
                  {time.slice(0, 5)}
                </td>
                {WEEK_ORDER.map((day) => {
                  const classes = byCell.get(`${day}_${time}`) ?? [];
                  return (
                    <td key={day} className="border-b border-border px-1.5 py-1.5 align-top">
                      <div className="flex flex-col gap-1">
                        {classes.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            title={c.name}
                            onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                            className={`w-full rounded-md px-2 py-1.5 text-left text-xs leading-tight transition-colors truncate ${
                              c.id === selectedId
                                ? "bg-gold text-background font-medium"
                                : "bg-surface-2 hover:bg-gold/20 hover:text-gold"
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-center text-xs text-muted mt-3 mb-6">Tap a class above to see spots left</p>

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
