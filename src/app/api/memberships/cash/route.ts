import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({ planId: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("membership_plans")
    .select("id")
    .eq("id", parsed.data.planId)
    .eq("active", true)
    .single();

  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  const { data: existing } = await admin
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["active", "pending_cash", "past_due"])
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You already have a membership. Manage it from your account." },
      { status: 409 },
    );
  }

  const { error } = await admin.from("memberships").insert({
    user_id: user.id,
    plan_id: parsed.data.planId,
    status: "pending_cash",
    payment_method: "cash",
  });

  if (error) {
    return NextResponse.json({ error: "Could not create membership." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
