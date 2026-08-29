import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  trainerId: z.string().uuid(),
  startAt: z.string(),
  endAt: z.string(),
});

const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "You must be logged in.",
  invalid_time_range: "Invalid booking time.",
  slot_not_available: "That time is no longer available. Please pick another slot.",
  no_sessions_remaining: "You don't have any personal training sessions left. Buy a pack first.",
};

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

  const { data, error } = await supabase.rpc("book_pt_session", {
    p_trainer_id: parsed.data.trainerId,
    p_start_at: parsed.data.startAt,
    p_end_at: parsed.data.endAt,
  });

  if (error) {
    const message =
      ERROR_MESSAGES[error.message] ??
      (error.message.includes("duplicate key")
        ? "That time was just booked by someone else. Please pick another slot."
        : "Could not book that session.");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ booking: data });
}
