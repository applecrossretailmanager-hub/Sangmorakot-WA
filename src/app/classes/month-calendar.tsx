"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDayHeading, formatTime } from "@/lib/format";
import { BookClassButton } from "./book-class-button";

type Occurrence = {
  schedule_id: string;
  name: string;
  trainer_name: string | null;
  class_date: string;
  start_at: string;
  capacity: number;
  booked_count: number;
};

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Cycled by first-seen class name so each class type gets a consistent color
// across the grid and the legend, however many class types end up existing.
const TYPE_COLORS = [
  { swatch: "bg-gold", cell: "bg-gold/90 text-background hover:bg-gold" },
  { swatch: "bg-primary", cell: "bg-primary/90 text-white hover:bg-primary" },
  { swatch: "bg-slate-400", cell: "bg-slate-400/80 text-background hover:bg-slate-400" },
  { swatch: "bg-emerald-500", cell: "bg-emerald-500/80 text-background hover:bg-emerald-500" },
];

function useTypeColors(names: string[]) {
  const map = new Map<string, (typeof TYPE_COLORS)[number]>();
  names.forEach((name, i) => map.set(name, TYPE_COLORS[i % TYPE_COLORS.length]));
  return map;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MonthCalendar({
  monthLabel,
  monthParam,
  prevMonthParam,
  nextMonthParam,
  days,
  occurrences,
  isLoggedIn,
  myBookingIds,
}: {
  monthLabel: string;
  monthParam: string;
  prevMonthParam: string;
  nextMonthParam: string;
  days: string[];
  occurrences: Occurrence[];
  isLoggedIn: boolean;
  myBookingIds: Record<string, string>;
}) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  function toggle(key: string) {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const byDate = new Map<string, Occurrence[]>();
  for (const o of occurrences) {
    const list = byDate.get(o.class_date) ?? [];
    list.push(o);
    byDate.set(o.class_date, list);
  }

  const names = Array.from(new Set(occurrences.map((o) => o.name)));
  const typeColors = useTypeColors(names);
  const today = todayKey();

  const selected = selectedKeys
    .map((key) => occurrences.find((o) => `${o.schedule_id}_${o.class_date}` === key))
    .filter((o): o is Occurrence => !!o);

  return (
    <div className="mb-16">
      <div className="flex items-center justify-between mb-4">
        <Link href={`/classes?month=${prevMonthParam}`} className="btn-outline text-sm py-1.5 px-3">
          ← Prev
        </Link>
        <h2 className="font-display uppercase text-xl tracking-tight">{monthLabel}</h2>
        <Link href={`/classes?month=${nextMonthParam}`} className="btn-outline text-sm py-1.5 px-3">
          Next →
        </Link>
      </div>

      {!!names.length && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 mb-4">
          {Array.from(typeColors.entries()).map(([name, color]) => (
            <div key={name} className="flex items-center gap-2 text-xs text-muted">
              <span className={`h-2.5 w-2.5 rounded-full ${color.swatch}`} />
              {name}
            </div>
          ))}
        </div>
      )}

      <div className="scroll-dark overflow-x-auto rounded-xl border border-border">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 bg-surface">
            {DAY_HEADERS.map((d) => (
              <div
                key={d}
                className="px-1 py-2 text-center text-xs font-semibold text-gold border-b border-border"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((dateKey) => {
              const inMonth = dateKey.slice(0, 7) === monthParam;
              const dayNum = Number(dateKey.slice(8, 10));
              const dayOccurrences = byDate.get(dateKey) ?? [];
              return (
                <div
                  key={dateKey}
                  className={`min-h-[96px] border-b border-r border-border p-1 ${
                    inMonth ? "" : "opacity-40"
                  } ${dateKey === today ? "bg-gold/5" : ""}`}
                >
                  <p className="text-xs text-muted mb-1 px-0.5">{dayNum}</p>
                  <div className="space-y-1">
                    {dayOccurrences.map((o) => {
                      const key = `${o.schedule_id}_${o.class_date}`;
                      return (
                        <button
                          key={key}
                          type="button"
                          title={o.name}
                          onClick={() => toggle(key)}
                          className={`w-full truncate rounded px-1 py-0.5 text-left text-[9px] sm:text-[10px] font-medium transition-colors ${
                            typeColors.get(o.name)?.cell ?? "bg-surface-2"
                          } ${selectedKeys.includes(key) ? "ring-2 ring-foreground" : ""}`}
                        >
                          {formatTime(o.start_at)} {o.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-muted mt-3 mb-6">
        Tap classes above to see spots left — select more than one to compare
      </p>

      {!!selected.length && (
        <div className="space-y-3 max-w-2xl mx-auto">
          {selected.map((o) => {
            const key = `${o.schedule_id}_${o.class_date}`;
            const spotsLeft = o.capacity - o.booked_count;
            const full = spotsLeft <= 0;
            return (
              <div key={key} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{o.name}</p>
                  <p className="text-sm text-muted">
                    {formatDayHeading(`${o.class_date}T00:00:00`)} · {formatTime(o.start_at)}
                    {o.trainer_name ? ` · ${o.trainer_name}` : ""}
                  </p>
                  <p className="text-sm text-muted">
                    {full ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`} (
                    {o.booked_count}/{o.capacity})
                  </p>
                </div>
                <BookClassButton
                  scheduleId={o.schedule_id}
                  classDate={o.class_date}
                  full={full}
                  isLoggedIn={isLoggedIn}
                  initialBookingId={myBookingIds[key]}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
