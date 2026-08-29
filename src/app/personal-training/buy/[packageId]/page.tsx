import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { BuyActions } from "./buy-actions";

export default async function BuyPackagePage({
  params,
}: {
  params: Promise<{ packageId: string }>;
}) {
  const { packageId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/personal-training/buy/${packageId}`)}`);
  }

  const supabase = await createClient();
  const { data: pkg } = await supabase
    .from("pt_packages")
    .select("*")
    .eq("id", packageId)
    .eq("active", true)
    .single();

  if (!pkg) notFound();

  return (
    <div className="container-page py-16 max-w-lg">
      <h1 className="text-3xl font-bold mb-2">Buy {pkg.name}</h1>
      <p className="text-muted mb-8">
        {formatMoney(pkg.price_cents, pkg.currency.toUpperCase())} — {pkg.session_count} session
        {pkg.session_count > 1 ? "s" : ""}
      </p>

      <BuyActions packageId={pkg.id} />
    </div>
  );
}
