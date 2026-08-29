import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({ packageId: z.string().uuid() });

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
  const { data: pkg } = await admin
    .from("pt_packages")
    .select("*")
    .eq("id", parsed.data.packageId)
    .eq("active", true)
    .single();

  if (!pkg) {
    return NextResponse.json({ error: "Package not found." }, { status: 404 });
  }

  const { error } = await admin.from("pt_purchases").insert({
    user_id: user.id,
    package_id: pkg.id,
    sessions_total: pkg.session_count,
    sessions_remaining: 0,
    payment_method: "cash",
    status: "pending",
  });

  if (error) {
    return NextResponse.json({ error: "Could not create purchase." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
