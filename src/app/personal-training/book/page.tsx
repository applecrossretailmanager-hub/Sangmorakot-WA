import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { BookingCalendar } from "./booking-calendar";

export default async function BookPersonalTrainingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/personal-training/book")}`);
  }

  const supabase = await createClient();
  const [{ data: trainers }, { data: purchases }] = await Promise.all([
    supabase.from("pt_trainers").select("*").eq("active", true),
    supabase
      .from("pt_purchases")
      .select("sessions_remaining")
      .eq("user_id", user.id)
      .eq("status", "paid"),
  ]);

  const sessionsRemaining =
    purchases?.reduce((sum, p) => sum + p.sessions_remaining, 0) ?? 0;

  return (
    <div className="container-page py-16">
      <h1 className="text-3xl font-bold mb-2">Book Personal Training</h1>
      <p className="text-muted mb-8">
        You have <strong className="text-gold">{sessionsRemaining}</strong> session
        {sessionsRemaining === 1 ? "" : "s"} available.
      </p>

      {!trainers?.length ? (
        <p className="text-muted">No trainers are set up yet — check back soon.</p>
      ) : sessionsRemaining === 0 ? (
        <div className="card">
          <p className="mb-4">You don&rsquo;t have any sessions left to book.</p>
          <a href="/personal-training" className="btn-primary inline-flex">
            Buy a Session Pack
          </a>
        </div>
      ) : (
        <BookingCalendar trainers={trainers} />
      )}
    </div>
  );
}
