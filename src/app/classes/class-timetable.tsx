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

// Cycled by first-seen class name so each class type gets a consistent color
// across the grid and the legend, however many class types end up existing.
const TYPE_COLORS = [
  { swatch: "bg-gold", cell: "bg-gold/90 text-background hover:bg-gold" },
  { swatch: "bg-primary", cell: "bg-primary/90 text-white hover:bg-primary" },
  { swatch: "bg-slate-400", cell: "bg-slate-400/80 text-background hover:bg-slate-400" },
  { swatch: "bg-emerald-500", cell: "bg-emerald-500/80 text-background hover:bg-emerald-500" },
];

function useTypeColors(schedule: ScheduleItem[]) {
  const names = Array.from(new Set(schedule.map((c) => c.name)));
  const map = new Map<string, (typeof TYPE_COLORS)[number]>();
  names.forEach((name, i) => map.set(name, TYPE_COLORS[i % TYPE_COLORS.length]));
  return map;
}

export function ClassTimetable({
  schedule,
  occurrences,
  isLoggedIn,
  myBookingIds,
}: {
  schedule: ScheduleItem[];
  occurrences: Occurrence[];
  isLoggedIn: boolean;
  myBookingIds: Record<string, string>;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const times = Array.from(new Set(schedule.map((c) => c.start_time))).sort();
  const typeColors = useTypeColors(schedule);

  const byCell = new Map<string, ScheduleItem[]>();
  for (const c of schedule) {
    const key = `${c.day_of_week}_${c.start_time}`;
    const list = byCell.get(key) ?? [];
    list.push(c);
    byCell.set(key, list);
  }

  const selected = selectedIds
    .map((id) => schedule.find((c) => c.id === id))
    .filter((c): c is ScheduleItem => !!c);

  return (
    <div className="mb-16">
      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-4">
        {Array.from(typeColors.entries()).map(([name, color]) => (
          <div key={name} className="flex items-center gap-2 text-xs text-muted">
            <span className={`h-2.5 w-2.5 rounded-full ${color.swatch}`} />
            {name}
          </div>
        ))}
      </div>

      <div className="scroll-dark overflow-x-auto rounded-xl border border-border">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="bg-surface border-b border-r border-border px-2 py-3 text-left text-xs text-muted font-medium w-14 sm:w-20">
                Time
              </th>
              {WEEK_ORDER.map((day) => (
                <th
                  key={day}
                  className="border-b border-border px-1.5 sm:px-3 py-3 text-gold font-semibold whitespace-nowrap"
                >
                  {DAY_LABELS_SHORT[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((time) => (
              <tr key={time}>
                <td className="bg-surface border-r border-b border-border px-2 py-2 text-xs font-medium text-muted whitespace-nowrap">
                  {time.slice(0, 5)}
                </td>
                {WEEK_ORDER.map((day) => {
                  const classes = byCell.get(`${day}_${time}`) ?? [];
                  return (
                    <td key={day} className="border-b border-border p-1 sm:p-1.5 align-top">
                      <div className="flex flex-col gap-1">
                        {classes.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            title={c.name}
                            onClick={() => toggle(c.id)}
                            className={`w-full rounded-md px-1.5 sm:px-2.5 py-2 sm:py-3 text-left text-[11px] sm:text-sm leading-tight font-medium transition-colors ${
                              typeColors.get(c.name)?.cell ?? "bg-surface-2 hover:bg-gold/20"
                            } ${selectedIds.includes(c.id) ? "ring-2 ring-foreground" : ""}`}
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
      <p className="text-center text-xs text-muted mt-3 mb-6">
        Tap classes above to see spots left — select more than one to compare
      </p>

      {!!selected.length && (
        <div className="space-y-4 max-w-2xl mx-auto">
          {selected.map((sel) => (
            <ClassPanel
              key={sel.id}
              selected={sel}
              occurrences={occurrences.filter((o) => o.schedule_id === sel.id)}
              myBookingIds={myBookingIds}
              isLoggedIn={isLoggedIn}
              onClose={() => toggle(sel.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassPanel({
  selected,
  occurrences,
  myBookingIds,
  isLoggedIn,
  onClose,
}: {
  selected: ScheduleItem;
  occurrences: Occurrence[];
  myBookingIds: Record<string, string>;
  isLoggedIn: boolean;
  onClose: () => void;
}) {
  const sorted = [...occurrences].sort((a, b) => a.class_date.localeCompare(b.class_date));

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">{selected.name} — spots left</h3>
        <button type="button" onClick={onClose} className="text-sm text-muted hover:text-foreground">
          Close
        </button>
      </div>
      {sorted.length ? (
        <div className="space-y-2">
          {sorted.map((o) => {
            const spotsLeft = o.capacity - o.booked_count;
            const full = spotsLeft <= 0;
            return (
              <div
                key={`${o.schedule_id}_${o.class_date}`}
                className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{formatDayHeading(`${o.class_date}T00:00:00`)}</p>
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
                  initialBookingId={myBookingIds[`${o.schedule_id}_${o.class_date}`]}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted text-sm">No upcoming dates in the next two weeks.</p>
      )}
    </div>
  );
}
