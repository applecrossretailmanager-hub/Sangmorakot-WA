"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

function num(formData: FormData, key: string) {
  const v = formData.get(key);
  return v ? Number(v) : null;
}

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

// ---------- front desk (walk-in check-in & cash payments) ----------

export async function adminCheckInWalkIn(userId: string, scheduleId: string, classDate: string) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("class_bookings").upsert(
    {
      user_id: userId,
      schedule_id: scheduleId,
      class_date: classDate,
      status: "booked",
      checked_in_at: new Date().toISOString(),
    },
    { onConflict: "schedule_id,class_date,user_id" },
  );
  revalidatePath("/admin/checkin");
  revalidatePath("/admin/classes");
}

export async function adminRecordCashMembership(userId: string, formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  const planId = str(formData, "plan_id");
  if (!planId) return;

  const { data: existing } = await admin
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["active", "pending_cash", "past_due"])
    .limit(1)
    .maybeSingle();
  if (existing) return;

  const { data: plan } = await admin
    .from("membership_plans")
    .select("*")
    .eq("id", planId)
    .single();
  if (!plan) return;

  const { data: membership } = await admin
    .from("memberships")
    .insert({
      user_id: userId,
      plan_id: planId,
      status: "active",
      payment_method: "cash",
    })
    .select()
    .single();

  if (membership) {
    await admin.from("payments").insert({
      user_id: userId,
      type: "membership",
      reference_id: membership.id,
      amount_cents: plan.price_cents,
      currency: plan.currency?.toUpperCase() ?? "AUD",
      method: "cash",
      status: "succeeded",
    });
  }

  revalidatePath("/admin/checkin");
  revalidatePath("/admin/members");
}

export async function adminRecordCashPtPackage(userId: string, formData: FormData) {
  await requireAdmin();
  const admin = createAdminClient();
  const packageId = str(formData, "package_id");
  if (!packageId) return;

  const { data: pkg } = await admin.from("pt_packages").select("*").eq("id", packageId).single();
  if (!pkg) return;

  const { data: purchase } = await admin
    .from("pt_purchases")
    .insert({
      user_id: userId,
      package_id: packageId,
      payment_method: "cash",
      status: "paid",
      sessions_total: pkg.session_count,
      sessions_remaining: pkg.session_count,
    })
    .select()
    .single();

  if (purchase) {
    await admin.from("payments").insert({
      user_id: userId,
      type: "pt_package",
      reference_id: purchase.id,
      amount_cents: pkg.price_cents,
      currency: pkg.currency?.toUpperCase() ?? "AUD",
      method: "cash",
      status: "succeeded",
    });
  }

  revalidatePath("/admin/checkin");
  revalidatePath("/admin/members");
  revalidatePath("/admin/personal-training");
}

// ---------- membership plans ----------

export async function createPlan(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const features = str(formData, "features")
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  await supabase.from("membership_plans").insert({
    name: str(formData, "name"),
    description: str(formData, "description") || null,
    price_cents: Math.round(Number(formData.get("price")) * 100),
    interval: str(formData, "interval"),
    interval_count: num(formData, "interval_count") ?? 1,
    features,
    sort_order: num(formData, "sort_order") ?? 0,
  });

  revalidatePath("/admin/plans");
  revalidatePath("/membership");
}

export async function updatePlan(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const features = str(formData, "features")
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  await supabase
    .from("membership_plans")
    .update({
      name: str(formData, "name"),
      description: str(formData, "description") || null,
      price_cents: Math.round(Number(formData.get("price")) * 100),
      interval: str(formData, "interval"),
      interval_count: num(formData, "interval_count") ?? 1,
      features,
      sort_order: num(formData, "sort_order") ?? 0,
    })
    .eq("id", id);

  revalidatePath("/admin/plans");
  revalidatePath("/membership");
}

export async function togglePlanActive(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("membership_plans").update({ active }).eq("id", id);
  revalidatePath("/admin/plans");
  revalidatePath("/membership");
}

export async function deletePlan(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("membership_plans").delete().eq("id", id);
  revalidatePath("/admin/plans");
  revalidatePath("/membership");
}

// ---------- pt packages ----------

export async function createPackage(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  await supabase.from("pt_packages").insert({
    name: str(formData, "name"),
    description: str(formData, "description") || null,
    session_count: num(formData, "session_count") ?? 1,
    price_cents: Math.round(Number(formData.get("price")) * 100),
    sort_order: num(formData, "sort_order") ?? 0,
  });

  revalidatePath("/admin/plans");
  revalidatePath("/personal-training");
}

export async function updatePackage(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  await supabase
    .from("pt_packages")
    .update({
      name: str(formData, "name"),
      description: str(formData, "description") || null,
      session_count: num(formData, "session_count") ?? 1,
      price_cents: Math.round(Number(formData.get("price")) * 100),
      sort_order: num(formData, "sort_order") ?? 0,
    })
    .eq("id", id);

  revalidatePath("/admin/plans");
  revalidatePath("/personal-training");
}

export async function togglePackageActive(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("pt_packages").update({ active }).eq("id", id);
  revalidatePath("/admin/plans");
  revalidatePath("/personal-training");
}

export async function deletePackage(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("pt_packages").delete().eq("id", id);
  revalidatePath("/admin/plans");
  revalidatePath("/personal-training");
}

// ---------- payment settings ----------

export async function updatePaymentSettings(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("payment_settings")
    .update({
      card_enabled: formData.get("card_enabled") === "on",
      becs_enabled: formData.get("becs_enabled") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  revalidatePath("/admin/plans");
  revalidatePath("/membership/join/[planId]", "page");
  revalidatePath("/personal-training/buy/[packageId]", "page");
}

// ---------- members & payments ----------

export async function markMembershipPaid(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("memberships")
    .select("id, user_id, plan_id, plan:membership_plans(price_cents, currency)")
    .eq("id", id)
    .single();

  if (!membership) return;

  await supabase.from("memberships").update({ status: "active" }).eq("id", id);

  await supabase.from("payments").insert({
    user_id: membership.user_id,
    type: "membership",
    reference_id: membership.id,
    amount_cents: membership.plan?.price_cents ?? 0,
    currency: membership.plan?.currency?.toUpperCase() ?? "AUD",
    method: "cash",
    status: "succeeded",
  });

  revalidatePath("/admin/members");
}

export async function cancelMembership(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("memberships").update({ status: "canceled" }).eq("id", id);
  revalidatePath("/admin/members");
}

export async function setMemberRole(userId: string, role: "member" | "admin") {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/admin/members");
}

export async function markPtPurchasePaid(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: purchase } = await supabase
    .from("pt_purchases")
    .select("id, user_id, sessions_total, package:pt_packages(price_cents, currency)")
    .eq("id", id)
    .single();

  if (!purchase) return;

  await supabase
    .from("pt_purchases")
    .update({ status: "paid", sessions_remaining: purchase.sessions_total })
    .eq("id", id);

  await supabase.from("payments").insert({
    user_id: purchase.user_id,
    type: "pt_package",
    reference_id: purchase.id,
    amount_cents: purchase.package?.price_cents ?? 0,
    currency: purchase.package?.currency?.toUpperCase() ?? "AUD",
    method: "cash",
    status: "succeeded",
  });

  revalidatePath("/admin/members");
  revalidatePath("/admin/personal-training");
}

export async function markClassBookingPaid(bookingId: string) {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("class_bookings")
    .select("id, user_id, amount_due_cents, currency, requires_payment, paid_at")
    .eq("id", bookingId)
    .single();

  if (!booking || !booking.requires_payment || booking.paid_at) return;

  await supabase.from("class_bookings").update({ paid_at: new Date().toISOString() }).eq("id", bookingId);

  await supabase.from("payments").insert({
    user_id: booking.user_id,
    type: "class",
    reference_id: booking.id,
    amount_cents: booking.amount_due_cents ?? 0,
    currency: booking.currency ?? "AUD",
    method: "cash",
    status: "succeeded",
    received_by: admin.id,
  });

  revalidatePath("/admin/members");
  revalidatePath("/admin/checkin");
  revalidatePath("/admin/classes");
}

// ---------- archiving stale records ----------
// We can't reliably delete rows outright, so "Remove" just hides a stale
// or mistaken record (an old cancelled membership, a test payment) from
// the admin lists. The underlying row — and the real financial history —
// stays intact.

export async function archiveMembership(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("memberships").update({ archived_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/members");
}

export async function archivePayment(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("payments").update({ archived_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/payments");
}

// ---------- trainers & availability ----------

export async function createTrainer(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("pt_trainers").insert({
    name: str(formData, "name"),
    title: str(formData, "title") || null,
    bio: str(formData, "bio") || null,
  });
  revalidatePath("/admin/personal-training");
}

export async function toggleTrainerActive(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("pt_trainers").update({ active }).eq("id", id);
  revalidatePath("/admin/personal-training");
}

export async function addAvailability(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const days = formData.getAll("day_of_week").map(Number);
  if (!days.length) return;

  const trainerId = str(formData, "trainer_id");
  const startTime = str(formData, "start_time");
  const endTime = str(formData, "end_time");
  const slotMinutes = num(formData, "slot_minutes") ?? 60;

  await supabase.from("pt_availability").insert(
    days.map((day) => ({
      trainer_id: trainerId,
      day_of_week: day,
      start_time: startTime,
      end_time: endTime,
      slot_minutes: slotMinutes,
    })),
  );
  revalidatePath("/admin/personal-training");
}

export async function updateAvailability(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  await supabase
    .from("pt_availability")
    .update({
      day_of_week: num(formData, "day_of_week") ?? 0,
      start_time: str(formData, "start_time"),
      end_time: str(formData, "end_time"),
      slot_minutes: num(formData, "slot_minutes") ?? 60,
    })
    .eq("id", id);

  revalidatePath("/admin/personal-training");
}

export async function bulkDeleteAvailability(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (!ids.length) return;
  await supabase.from("pt_availability").delete().in("id", ids);
  revalidatePath("/admin/personal-training");
}

export async function removeAvailability(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("pt_availability").delete().eq("id", id);
  revalidatePath("/admin/personal-training");
}

export async function cancelBookingAdmin(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.rpc("cancel_pt_booking", { p_booking_id: id });
  revalidatePath("/admin/personal-training");
}

// ---------- group class timetable ----------

export async function createClassSchedule(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const days = formData.getAll("day_of_week").map(Number);
  if (!days.length) return;

  const name = str(formData, "name");
  const description = str(formData, "description") || null;
  const trainerId = str(formData, "trainer_id") || null;
  const startTime = str(formData, "start_time");
  const durationMinutes = num(formData, "duration_minutes") ?? 60;
  const capacity = num(formData, "capacity") ?? 10;

  await supabase.from("class_schedule").insert(
    days.map((day) => ({
      name,
      description,
      trainer_id: trainerId,
      day_of_week: day,
      start_time: startTime,
      duration_minutes: durationMinutes,
      capacity,
    })),
  );
  revalidatePath("/admin/classes");
  revalidatePath("/classes");
}

export async function updateClassSchedule(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  await supabase
    .from("class_schedule")
    .update({
      name: str(formData, "name"),
      description: str(formData, "description") || null,
      trainer_id: str(formData, "trainer_id") || null,
      day_of_week: num(formData, "day_of_week") ?? 0,
      start_time: str(formData, "start_time"),
      duration_minutes: num(formData, "duration_minutes") ?? 60,
      capacity: num(formData, "capacity") ?? 10,
    })
    .eq("id", id);

  revalidatePath("/admin/classes");
  revalidatePath("/classes");
}

export async function bulkDeleteClassSchedule(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (!ids.length) return;
  await supabase.from("class_schedule").delete().in("id", ids);
  revalidatePath("/admin/classes");
  revalidatePath("/classes");
}

export async function toggleClassScheduleActive(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("class_schedule").update({ active }).eq("id", id);
  revalidatePath("/admin/classes");
  revalidatePath("/classes");
}

export async function deleteClassSchedule(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("class_schedule").delete().eq("id", id);
  revalidatePath("/admin/classes");
  revalidatePath("/classes");
}

export async function toggleClassCheckIn(id: string, checkedIn: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("class_bookings")
    .update({ checked_in_at: checkedIn ? new Date().toISOString() : null })
    .eq("id", id);
  revalidatePath("/admin/classes");
}

export async function cancelClassBookingAdmin(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.rpc("cancel_class_booking", { p_booking_id: id });
  revalidatePath("/admin/classes");
}

// ---------- testimonials ----------

export async function createTestimonial(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("testimonials").insert({
    name: str(formData, "name"),
    quote: str(formData, "quote"),
    sort_order: num(formData, "sort_order") ?? 0,
  });
  revalidatePath("/admin/site");
  revalidatePath("/");
}

export async function toggleTestimonialActive(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("testimonials").update({ active }).eq("id", id);
  revalidatePath("/admin/site");
  revalidatePath("/");
}

export async function deleteTestimonial(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("testimonials").delete().eq("id", id);
  revalidatePath("/admin/site");
  revalidatePath("/");
}

// ---------- contact messages ----------

export async function markContactMessageRead(id: string, read: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("contact_messages").update({ read }).eq("id", id);
  revalidatePath("/admin/site");
}

export async function deleteContactMessage(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("contact_messages").delete().eq("id", id);
  revalidatePath("/admin/site");
}

// ---------- trainer bio/photo ----------

export async function updateTrainerProfile(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  let photoUrl = str(formData, "photo_url") || null;

  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `trainers/${id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("photos").upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
    if (!error) {
      photoUrl = supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
    }
  }

  await supabase
    .from("pt_trainers")
    .update({
      title: str(formData, "title") || null,
      bio: str(formData, "bio") || null,
      photo_url: photoUrl,
    })
    .eq("id", id);
  revalidatePath("/admin/personal-training");
  revalidatePath("/about");
  revalidatePath("/personal-training");
}
