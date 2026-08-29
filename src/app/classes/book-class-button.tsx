"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function BookClassButton({
  scheduleId,
  classDate,
  full,
  isLoggedIn,
}: {
  scheduleId: string;
  classDate: string;
  full: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);

  if (!isLoggedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent("/classes")}`} className="btn-outline text-sm py-1.5 px-3">
        Log in to book
      </Link>
    );
  }

  if (booked) {
    return <span className="text-sm text-gold">Booked ✓</span>;
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
    setBooked(true);
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
