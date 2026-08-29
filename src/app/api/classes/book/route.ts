import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  scheduleId: z.string().uuid(),
  classDate: z.string(),
});

const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "You must be logged in.",
  class_not_found: "That class is no longer available.",
  invalid_date: "That's not a valid date for this class.",
  class_in_past: "That class has already happened.",
  class_full: "That class is full. Please pick another time.",
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

  const { data, error } = await supabase.rpc("book_class", {
    p_schedule_id: parsed.data.scheduleId,
    p_class_date: parsed.data.classDate,
  });

  if (error) {
    const message = ERROR_MESSAGES[error.message] ?? "Could not book that class.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ booking: data });
}
