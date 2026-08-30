"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DismissNoticeButton({ purchaseId }: { purchaseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function dismiss() {
    setLoading(true);
    const supabase = createClient();
    await supabase.rpc("dismiss_pt_purchase_notice", { p_id: purchaseId });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={dismiss}
      disabled={loading}
      aria-label="Dismiss"
      className="shrink-0 opacity-70 hover:opacity-100 transition-opacity leading-none text-lg"
    >
      ×
    </button>
  );
}
