import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { sendEmail, contactMessageEmail } from "@/lib/resend";
import { site } from "@/lib/site";

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(50).optional(),
  message: z.string().trim().min(1).max(4000),
  recaptchaToken: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
  }

  const ok = await verifyRecaptcha(parsed.data.recaptchaToken);
  if (!ok) {
    return NextResponse.json(
      { error: "Captcha verification failed. Please try again." },
      { status: 400 },
    );
  }

  const { name, email, phone, message } = parsed.data;
  const supabase = createAdminClient();
  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    phone: phone || null,
    message,
  });

  if (error) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  await sendEmail({
    to: site.email,
    subject: `New contact form message from ${name}`,
    html: contactMessageEmail({ name, email, phone, message }),
  });

  return NextResponse.json({ ok: true });
}
