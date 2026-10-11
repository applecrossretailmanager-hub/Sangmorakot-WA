import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WAIVER_VERSIONS } from "@/lib/waiver";

export const revalidate = 0;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminMemberWaiverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: profile }, { data: waiver }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", id).maybeSingle(),
    supabase.from("waivers").select("*").eq("user_id", id).order("accepted_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!waiver) notFound();

  const waiverText = WAIVER_VERSIONS[waiver.version] ?? "(This waiver version is no longer on file.)";

  return (
    <div className="max-w-2xl">
      <Link href="/admin/members" className="text-sm text-gold hover:underline">
        ← Back to Members
      </Link>

      <h1 className="text-2xl font-bold mt-4 mb-1">Signed Waiver</h1>
      <p className="text-muted mb-6">
        {profile?.full_name ?? "Member"} {profile?.phone ? `— ${profile.phone}` : ""}
      </p>

      <div className="card mb-6">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted">Name on waiver</dt>
          <dd>{waiver.full_name}</dd>
          <dt className="text-muted">Accepted</dt>
          <dd>{formatDateTime(waiver.accepted_at)}</dd>
          <dt className="text-muted">Version</dt>
          <dd>{waiver.version}</dd>
        </dl>
      </div>

      <div className="card">
        <p className="text-sm whitespace-pre-line leading-relaxed">{waiverText}</p>
      </div>
    </div>
  );
}
