"use client";

import { useState } from "react";

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/billing-portal", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not open billing portal.");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div>
      <button onClick={onClick} disabled={loading} className="btn-outline">
        {loading ? "Opening…" : "Manage billing"}
      </button>
      {error && <p className="mt-2 text-sm text-primary">{error}</p>}
    </div>
  );
}
