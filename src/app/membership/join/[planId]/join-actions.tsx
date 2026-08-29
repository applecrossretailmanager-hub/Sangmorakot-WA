"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinActions({ planId }: { planId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"card" | "cash" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cashDone, setCashDone] = useState(false);

  async function payByCard() {
    setLoading("card");
    setError(null);
    const res = await fetch("/api/checkout/membership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    window.location.href = data.url;
  }

  async function payByCash() {
    setLoading("cash");
    setError(null);
    const res = await fetch("/api/memberships/cash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setCashDone(true);
    setTimeout(() => router.push("/account"), 2000);
  }

  if (cashDone) {
    return (
      <div className="card">
        <p className="font-medium mb-1">You&rsquo;re all set.</p>
        <p className="text-muted text-sm">
          Your membership is pending — pay in cash next time you&rsquo;re at the gym and
          we&rsquo;ll activate it. Redirecting to your account…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={payByCard} disabled={!!loading} className="btn-primary w-full">
        {loading === "card" ? "Redirecting to Stripe…" : "Pay by card (auto direct debit)"}
      </button>
      <button onClick={payByCash} disabled={!!loading} className="btn-outline w-full">
        {loading === "cash" ? "Setting up…" : "Pay cash at the gym"}
      </button>
      {error && <p className="text-sm text-primary">{error}</p>}
      <p className="text-xs text-muted">
        Card payments are billed automatically each period via Stripe. Cash memberships are
        activated by staff once payment is received in person.
      </p>
    </div>
  );
}
