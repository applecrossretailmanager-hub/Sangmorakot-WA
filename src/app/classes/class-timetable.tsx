"use client";

import { useState } from "react";
import { formatDayHeading } from "@/lib/format";
import { BookClassButton } from "./book-class-button";

type ScheduleItem = {
  id: string;
  name: string;
  start_time: string;
  day_of_week: number;
  duration_minutes: number;
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
const HOUR_PX = 64;

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

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatHour(h: number) {
  const period = h < 12 || h === 24 ? "am" : "pm";
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return `${hour12}${period}`;
}

/** Simple greedy lane packing so overlapping classes on the same day sit
 * side by side instead of stacking on top of each other. */
function layoutDay(classes: ScheduleItem[]) {
  const sorted = [...classes].sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time),
  );
  const laneEnds: number[] = [];
  const placed: { item: ScheduleItem; lane: number }[] = [];
  for (const c of sorted) {
    const start = timeToMinutes(c.start_time);
    const end = start + c.duration_minutes;
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    placed.push({ item: c, lane });
  }
  return { placed, totalLanes: laneEnds.length || 1 };
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

  const typeColors = useTypeColors(schedule);

  const scheduleByDay = new Map<number, ScheduleItem[]>();
  for (const c of schedule) {
    const list = scheduleByDay.get(c.day_of_week) ?? [];
    list.push(c);
    scheduleByDay.set(c.day_of_week, list);
  }

  const allMinutes = schedule.flatMap((c) => {
    const start = timeToMinutes(c.start_time);
    return [start, start + c.duration_minutes];
  });
  const minMinutes = allMinutes.length ? Math.min(...allMinutes) : 9 * 60;
  const maxMinutes = allMinutes.length ? Math.max(...allMinutes) : 17 * 60;
  const dayStart = Math.floor(minMinutes / 60) * 60;
  const dayEnd = Math.max(Math.ceil(maxMinutes / 60) * 60, dayStart + 60);
  const hours: number[] = [];
  for (let h = dayStart / 60; h <= dayEnd / 60; h++) hours.push(h);
  const totalHeight = ((dayEnd - dayStart) / 60) * HOUR_PX;

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
        <div className="flex" style={{ minWidth: `${56 + WEEK_ORDER.length * 120}px` }}>
          <div className="w-14 shrink-0 border-r border-border bg-surface">
            <div className="h-10 border-b border-border" />
            <div className="relative" style={{ height: totalHeight }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-1 -translate-y-1/2 text-right text-[10px] text-muted"
                  style={{ top: ((h * 60 - dayStart) / 60) * HOUR_PX }}
                >
                  {formatHour(h)}
                </div>
              ))}
            </div>
          </div>

          {WEEK_ORDER.map((day) => {
            const { placed, totalLanes } = layoutDay(scheduleByDay.get(day) ?? []);
            return (
              <div key={day} className="flex-1 min-w-[110px] border-r border-border last:border-r-0">
                <div className="h-10 border-b border-border flex items-center justify-center text-gold font-semibold text-sm">
                  {DAY_LABELS_SHORT[day]}
                </div>
                <div className="relative" style={{ height: totalHeight }}>
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-border/40"
                      style={{ top: ((h * 60 - dayStart) / 60) * HOUR_PX }}
                    />
                  ))}
                  {placed.map(({ item, lane }) => {
                    const start = timeToMinutes(item.start_time);
                    const top = ((start - dayStart) / 60) * HOUR_PX;
                    const height = Math.max((item.duration_minutes / 60) * HOUR_PX - 2, 26);
                    const widthPct = 100 / totalLanes;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        title={item.name}
                        onClick={() => toggle(item.id)}
                        className={`absolute overflow-hidden rounded-md px-1.5 py-1 text-left text-[10px] sm:text-xs leading-tight font-medium transition-colors ${
                          typeColors.get(item.name)?.cell ?? "bg-surface-2"
                        } ${selectedIds.includes(item.id) ? "ring-2 ring-foreground" : ""}`}
                        style={{
                          top,
                          height,
                          left: `calc(${lane * widthPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                        }}
                      >
                        <div className="font-semibold truncate">{item.name}</div>
                        {height >= 40 && (
                          <div className="opacity-80 truncate">
                            {item.start_time.slice(0, 5)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
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
