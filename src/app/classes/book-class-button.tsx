"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function BookClassButton({
  scheduleId,
  classDate,
  full,
  isLoggedIn,
  initialBookingId,
}: {
  scheduleId: string;
  classDate: string;
  full: boolean;
  isLoggedIn: boolean;
  initialBookingId?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(initialBookingId ?? null);

  if (!isLoggedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent("/classes")}`} className="btn-outline text-sm py-1.5 px-3">
        Log in to book
      </Link>
    );
  }

  if (bookingId) {
    return (
      <div className="text-right">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gold">Booked ✓</span>
          <button
            onClick={cancel}
            disabled={loading}
            className="text-xs text-muted hover:text-primary underline underline-offset-2"
          >
            {loading ? "Cancelling…" : "Cancel"}
          </button>
        </div>
        {error && <p className="text-xs text-primary mt-1">{error}</p>}
      </div>
    );
  }

  if (full) {
    return (
      <button disabled className="btn-outline text-sm py-1.5 px-3 opacity-50 cursor-not-allowed">
        Full
      </button>
    );
  }

  async function book() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/classes/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId, classDate }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not book that class.");
      return;
    }
    setBookingId(data.booking?.id ?? null);
    router.refresh();
  }

  async function cancel() {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/classes/bookings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not cancel that booking.");
      return;
    }
    setBookingId(null);
    router.refresh();
  }

  return (
    <div className="text-right">
      <button onClick={book} disabled={loading} className="btn-outline text-sm py-1.5 px-3">
        {loading ? "Booking…" : "Book"}
      </button>
      {error && <p className="text-xs text-primary mt-1">{error}</p>}
    </div>
  );
}
