import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { DAY_LABELS } from "@/lib/days";
import {
  createTrainer,
  toggleTrainerActive,
  addAvailability,
  removeAvailability,
  cancelBookingAdmin,
} from "../actions";

export const revalidate = 0;

export default async function AdminPersonalTrainingPage() {
  const supabase = await createClient();

  const [{ data: trainers }, { data: availability }, { data: bookings }] = await Promise.all([
    supabase.from("pt_trainers").select("*").order("created_at"),
    supabase.from("pt_availability").select("*, trainer:pt_trainers(name)").order("day_of_week"),
    supabase
      .from("pt_bookings")
      .select("*, trainer:pt_trainers(name), profile:profiles(full_name)")
      .eq("status", "booked")
      .gt("start_at", new Date().toISOString())
      .order("start_at")
      .limit(50),
  ]);

  const availabilityByTrainer = new Map<string, typeof availability>();
  for (const a of availability ?? []) {
    const list = availabilityByTrainer.get(a.trainer_id) ?? [];
    list.push(a);
    availabilityByTrainer.set(a.trainer_id, list);
  }

  return (
    <div className="space-y-16">
      <section>
        <h2 className="text-xl font-bold mb-4">Upcoming Bookings</h2>
        <div className="space-y-2">
          {bookings?.map((b) => (
            <div key={b.id} className="card flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{formatDateTime(b.start_at)}</p>
                <p className="text-sm text-muted">
                  {b.profile?.full_name ?? "Member"} with {b.trainer?.name}
                </p>
              </div>
              <form action={cancelBookingAdmin.bind(null, b.id)}>
                <button type="submit" className="text-sm text-muted hover:text-primary">
                  Cancel
                </button>
              </form>
            </div>
          ))}
          {!bookings?.length && <p className="text-muted">No upcoming bookings.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Trainers</h2>
        <div className="space-y-3 mb-6">
          {trainers?.map((t) => (
            <div key={t.id} className="card flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  {t.name} {!t.active && <span className="text-xs text-muted">(hidden)</span>}
                </p>
                {t.bio && <p className="text-sm text-muted">{t.bio}</p>}
              </div>
              <form action={toggleTrainerActive.bind(null, t.id, !t.active)}>
                <button type="submit" className="btn-outline text-sm py-1.5 px-3">
                  {t.active ? "Hide" : "Show"}
                </button>
              </form>
            </div>
          ))}
          {!trainers?.length && <p className="text-muted">No trainers yet.</p>}
        </div>

        <details className="card">
          <summary className="cursor-pointer font-medium">+ New trainer</summary>
          <form action={createTrainer} className="mt-4 space-y-3 max-w-lg">
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Name</span>
              <input name="name" required className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Bio</span>
              <textarea name="bio" rows={2} className="input" />
            </label>
            <button type="submit" className="btn-primary">Add trainer</button>
          </form>
        </details>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Weekly Availability</h2>

        <div className="space-y-8 mb-6">
          {trainers?.map((t) => {
            const windows = availabilityByTrainer.get(t.id) ?? [];
            if (!windows.length) return null;
            return (
              <div key={t.id}>
                <h3 className="font-semibold text-gold mb-2">{t.name}</h3>
                <div className="space-y-2">
                  {windows.map((a) => (
                    <div
                      key={a.id}
                      className="card flex items-center justify-between gap-4 py-3"
                    >
                      <p className="text-sm">
                        {DAY_LABELS[a.day_of_week]} {a.start_time.slice(0, 5)}–
                        {a.end_time.slice(0, 5)} ({a.slot_minutes} min slots)
                      </p>
                      <form action={removeAvailability.bind(null, a.id)}>
                        <button type="submit" className="text-sm text-muted hover:text-primary">
                          Remove
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {!availability?.length && <p className="text-muted">No availability windows set.</p>}
        </div>

        <details className="card">
          <summary className="cursor-pointer font-medium">+ New availability window</summary>
          <form action={addAvailability} className="mt-4 space-y-3 max-w-lg">
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Trainer</span>
              <select name="trainer_id" required className="input">
                {trainers?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="mb-1.5 block text-sm text-muted">
                Days (pick as many as share these hours)
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
                <span className="mb-1.5 block text-sm text-muted">End time</span>
                <input name="end_time" type="time" required className="input" />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Slot length (minutes)</span>
              <input name="slot_minutes" type="number" min="15" step="15" defaultValue={60} className="input" />
            </label>
            <button type="submit" className="btn-primary">Add window(s)</button>
          </form>
        </details>
      </section>
    </div>
  );
}
