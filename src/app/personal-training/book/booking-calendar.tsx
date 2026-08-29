"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDayHeading, formatTime } from "@/lib/format";
import type { Tables } from "@/lib/supabase/types";

type Slot = { start_at: string; end_at: string };

export function BookingCalendar({ trainers }: { trainers: Tables<"pt_trainers">[] }) {
  const router = useRouter();
  const [trainerId, setTrainerId] = useState(trainers[0]?.id ?? "");
  const [slotsState, setSlotsState] = useState<{ trainerId: string; slots: Slot[] } | null>(
    null,
  );
  const [booking, setBooking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loading = slotsState?.trainerId !== trainerId;

  useEffect(() => {
    if (!trainerId) return;
    let cancelled = false;

    const supabase = createClient();
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14);

    supabase
      .rpc("get_open_pt_slots", {
        p_trainer_id: trainerId,
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      })
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) {
          setError("Could not load available times.");
          setSlotsState({ trainerId, slots: [] });
          return;
        }
        setSlotsState({ trainerId, slots: data ?? [] });
      });

    return () => {
      cancelled = true;
    };
  }, [trainerId]);

  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of slotsState?.trainerId === trainerId ? slotsState.slots : []) {
      const day = slot.start_at.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(slot);
    }
    return Array.from(map.entries());
  }, [slotsState, trainerId]);

  async function book(slot: Slot) {
    setBooking(slot.start_at);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/pt/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trainerId,
        startAt: slot.start_at,
        endAt: slot.end_at,
      }),
    });
    const data = await res.json();
    setBooking(null);

    if (!res.ok) {
      setError(data.error ?? "Could not book that session.");
      return;
    }

    setSlotsState((prev) =>
      prev ? { ...prev, slots: prev.slots.filter((s) => s.start_at !== slot.start_at) } : prev,
    );
    setSuccess(
      `Booked ${formatDayHeading(slot.start_at)} at ${formatTime(slot.start_at)}.`,
    );
    router.refresh();
  }

  return (
    <div>
      {trainers.length > 1 && (
        <label className="block max-w-xs mb-8">
          <span className="mb-1.5 block text-sm text-muted">Trainer</span>
          <select
            value={trainerId}
            onChange={(e) => setTrainerId(e.target.value)}
            className="input"
          >
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {success && (
        <p className="mb-6 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
          {success}{" "}
          <a href="/account" className="underline">
            View in your account
          </a>
        </p>
      )}
      {error && <p className="mb-6 text-sm text-primary">{error}</p>}

      {loading ? (
        <p className="text-muted">Loading available times…</p>
      ) : !grouped.length ? (
        <p className="text-muted">No open times in the next two weeks — check back soon.</p>
      ) : (
        <div className="space-y-8">
          {grouped.map(([day, daySlots]) => (
            <div key={day}>
              <h3 className="font-semibold mb-3">{formatDayHeading(daySlots[0].start_at)}</h3>
              <div className="flex flex-wrap gap-2">
                {daySlots.map((slot) => (
                  <button
                    key={slot.start_at}
                    onClick={() => book(slot)}
                    disabled={!!booking}
                    className="btn-outline text-sm py-2 px-3"
                  >
                    {booking === slot.start_at ? "Booking…" : formatTime(slot.start_at)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
