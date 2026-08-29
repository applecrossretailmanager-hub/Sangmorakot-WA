import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ bookingId: z.string().uuid() });

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

  const { data, error } = await supabase.rpc("cancel_class_booking", {
    p_booking_id: parsed.data.bookingId,
  });

  if (error) {
    return NextResponse.json({ error: "Could not cancel that booking." }, { status: 400 });
  }

  return NextResponse.json({ booking: data });
}
