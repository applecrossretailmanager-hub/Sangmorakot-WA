"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

function num(formData: FormData, key: string) {
  const v = formData.get(key);
  return v ? Number(v) : null;
}

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
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

// ---------- trainers & availability ----------

export async function createTrainer(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("pt_trainers").insert({
    name: str(formData, "name"),
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

export async function cancelClassBookingAdmin(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.rpc("cancel_class_booking", { p_booking_id: id });
  revalidatePath("/admin/classes");
}
