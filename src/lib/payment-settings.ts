import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getPaymentSettings() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("payment_settings")
    .select("card_enabled, becs_enabled")
    .eq("id", true)
    .single();

  return {
    cardEnabled: data?.card_enabled ?? false,
    becsEnabled: data?.becs_enabled ?? false,
  };
}
