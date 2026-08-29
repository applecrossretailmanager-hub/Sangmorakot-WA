"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelBookingButton({
  bookingId,
  endpoint = "/api/pt/bookings/cancel",
  confirmMessage = "Cancel this session? Your session will be credited back.",
}: {
  bookingId: string;
  endpoint?: string;
  confirmMessage?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!confirm(confirmMessage)) return;
    setLoading(true);
    setError(null);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not cancel.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="text-right">
      <button
        onClick={onClick}
        disabled={loading}
        className="text-sm text-muted hover:text-primary transition-colors"
      >
        {loading ? "Cancelling…" : "Cancel"}
      </button>
      {error && <p className="text-xs text-primary mt-1">{error}</p>}
    </div>
  );
}
