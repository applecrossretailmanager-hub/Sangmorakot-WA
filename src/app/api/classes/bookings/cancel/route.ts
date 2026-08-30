import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, classCancelledEmail } from "@/lib/resend";
import { formatDayHeading } from "@/lib/format";

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

  const { data: existing } = await supabase
    .from("class_bookings")
    .select("class_date, schedule:class_schedule(name, start_time)")
    .eq("id", parsed.data.bookingId)
    .single();

  const { data, error } = await supabase.rpc("cancel_class_booking", {
    p_booking_id: parsed.data.bookingId,
  });

  if (error) {
    return NextResponse.json({ error: "Could not cancel that booking." }, { status: 400 });
  }

  if (user.email && existing?.schedule) {
    const whenLabel = `${formatDayHeading(`${existing.class_date}T00:00:00`)} at ${existing.schedule.start_time.slice(0, 5)}`;
    await sendEmail({
      to: user.email,
      subject: `Booking cancelled — ${existing.schedule.name}`,
      html: classCancelledEmail(existing.schedule.name, whenLabel),
    });
  }

  return NextResponse.json({ booking: data });
}
