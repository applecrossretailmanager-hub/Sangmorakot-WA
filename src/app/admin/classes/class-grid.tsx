"use client";

import { useState } from "react";
import { DAY_LABELS } from "@/lib/days";
import { updateClassSchedule, toggleClassScheduleActive, deleteClassSchedule } from "../actions";

type Trainer = { id: string; name: string };

type ScheduleItem = {
  id: string;
  name: string;
  description: string | null;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  capacity: number;
  active: boolean;
  trainer_id: string | null;
  trainer: { name: string } | null;
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

const TYPE_COLORS = [
  { swatch: "bg-gold", cell: "bg-gold/90 text-background hover:bg-gold" },
  { swatch: "bg-primary", cell: "bg-primary/90 text-white hover:bg-primary" },
  { swatch: "bg-slate-400", cell: "bg-slate-400/80 text-background hover:bg-slate-400" },
  { swatch: "bg-emerald-500", cell: "bg-emerald-500/80 text-background hover:bg-emerald-500" },
];

export function AdminClassGrid({
  schedule,
  trainers,
}: {
  schedule: ScheduleItem[];
  trainers: Trainer[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const times = Array.from(new Set(schedule.map((c) => c.start_time))).sort();
  const names = Array.from(new Set(schedule.map((c) => c.name)));
  const colorFor = (name: string) => TYPE_COLORS[names.indexOf(name) % TYPE_COLORS.length];

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

  if (!schedule.length) {
    return <p className="text-muted mb-6">No classes scheduled yet — add one below.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-4">
        {names.map((name) => (
          <div key={name} className="flex items-center gap-2 text-xs text-muted">
            <span className={`h-2.5 w-2.5 rounded-full ${colorFor(name).swatch}`} />
            {name}
          </div>
        ))}
      </div>

      <div className="scroll-dark overflow-x-auto rounded-xl border border-border mb-6">
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
                              colorFor(c.name).cell
                            } ${!c.active ? "opacity-40" : ""} ${
                              selectedIds.includes(c.id) ? "ring-2 ring-foreground" : ""
                            }`}
                          >
                            {c.name}
                            {!c.active && " (hidden)"}
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
      <p className="text-xs text-muted mb-6">
        Tap a class to view, edit, hide, delete, or select it for bulk delete below.
      </p>

      {!!selected.length && (
        <div className="space-y-4 mb-6">
          {selected.map((c) => (
            <ClassManagePanel
              key={c.id}
              c={c}
              trainers={trainers}
              onClose={() => toggle(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassManagePanel({
  c,
  trainers,
  onClose,
}: {
  c: ScheduleItem;
  trainers: Trainer[];
  onClose: () => void;
}) {
  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <p className="font-bold text-lg">
            {c.name} {!c.active && <span className="text-xs text-muted">(hidden)</span>}
          </p>
          <p className="text-sm text-muted">
            {DAY_LABELS[c.day_of_week]} {c.start_time.slice(0, 5)} · {c.duration_minutes} min · max{" "}
            {c.capacity}
            {c.trainer?.name ? ` · ${c.trainer.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action={toggleClassScheduleActive.bind(null, c.id, !c.active)}>
            <button type="submit" className="btn-outline text-sm py-1.5 px-3">
              {c.active ? "Hide" : "Show"}
            </button>
          </form>
          <form action={deleteClassSchedule.bind(null, c.id)}>
            <button type="submit" className="btn-outline text-sm py-1.5 px-3 hover:text-primary">
              Delete
            </button>
          </form>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted hover:text-foreground px-1"
          >
            Close
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted mb-4">
        <input type="checkbox" name="ids" value={c.id} form="bulk-classes" />
        Select for bulk delete
      </label>

      <form action={updateClassSchedule.bind(null, c.id)} className="space-y-3 max-w-lg">
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Class name</span>
          <input name="name" required defaultValue={c.name} className="input" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Description</span>
          <input name="description" defaultValue={c.description ?? ""} className="input" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Trainer (optional)</span>
          <select name="trainer_id" className="input" defaultValue={c.trainer_id ?? ""}>
            <option value="">— none —</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Day</span>
          <select name="day_of_week" className="input" defaultValue={c.day_of_week}>
            {DAY_LABELS.map((label, i) => (
              <option key={i} value={i}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Start time</span>
            <input
              name="start_time"
              type="time"
              required
              defaultValue={c.start_time.slice(0, 5)}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Duration (minutes)</span>
            <input
              name="duration_minutes"
              type="number"
              min="15"
              step="15"
              defaultValue={c.duration_minutes}
              className="input"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Max people per class</span>
          <input name="capacity" type="number" min="1" defaultValue={c.capacity} className="input" />
        </label>
        <button type="submit" className="btn-primary">
          Save changes
        </button>
      </form>
    </div>
  );
}
