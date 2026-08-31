"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BuyActions({
  packageId,
  cardEnabled,
  becsEnabled,
}: {
  packageId: string;
  cardEnabled: boolean;
  becsEnabled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"card" | "cash" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cashDone, setCashDone] = useState(false);
  const showCardButton = cardEnabled || becsEnabled;
  const cardLabel =
    cardEnabled && becsEnabled
      ? "Pay by card or bank debit"
      : becsEnabled
        ? "Pay by bank debit"
        : "Pay by card";

  async function payByCard() {
    setLoading("card");
    setError(null);
    const res = await fetch("/api/checkout/pt-package", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId }),
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
    const res = await fetch("/api/pt-packages/cash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId }),
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
          Pay cash at the gym and we&rsquo;ll add your sessions — then you can book a time.
          Redirecting to your account…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showCardButton && (
        <button onClick={payByCard} disabled={!!loading} className="btn-primary w-full">
          {loading === "card" ? "Redirecting to Stripe…" : cardLabel}
        </button>
      )}
      <button onClick={payByCash} disabled={!!loading} className="btn-outline w-full">
        {loading === "cash" ? "Setting up…" : "Pay cash at the gym"}
      </button>
      {error && <p className="text-sm text-primary">{error}</p>}
    </div>
  );
}
