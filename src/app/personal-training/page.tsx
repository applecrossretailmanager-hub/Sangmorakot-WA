import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = {
  title: "Personal Training",
  description: "Book one-on-one Muay Thai personal training with our coaches. Buy a session pack and book straight into their calendar.",
};
export const revalidate = 0;

export default async function PersonalTrainingPage() {
  const supabase = await createClient();
  const [{ data: packages }, { data: trainers }] = await Promise.all([
    supabase.from("pt_packages").select("*").eq("active", true).order("sort_order"),
    supabase.from("pt_trainers").select("*").eq("active", true),
  ]);

  return (
    <div>
      <div className="relative h-56 md:h-72 border-b border-border overflow-hidden">
        <Image
          src="/pt-action.jpg"
          alt=""
          fill
          priority
          className="object-cover object-[center_25%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
      </div>

      <div className="container-page py-16">
      <div className="max-w-2xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-extrabold mb-4">Personal Training</h1>
        <p className="text-muted">
          Buy a session pack, then book straight into your coach&rsquo;s calendar. Already
          have sessions? Head to your account to book a time.
        </p>
        <Link href="/personal-training/book" className="btn-outline inline-flex mt-6">
          Book a Session
        </Link>
      </div>

      {trainers?.length ? (
        <div className="max-w-3xl mx-auto mb-14 grid sm:grid-cols-2 gap-6">
          {trainers.map((t) => (
            <div key={t.id} className="card flex items-start gap-4">
              {t.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.photo_url}
                  alt={t.name}
                  className="h-16 w-16 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-surface-2 flex items-center justify-center text-gold font-bold text-lg shrink-0">
                  {t.name.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg text-gold mb-1">{t.name}</h3>
                {t.bio && <p className="text-sm text-muted">{t.bio}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!packages?.length ? (
        <p className="text-center text-muted">Session packs are being updated — check back soon.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {packages.map((pkg) => (
            <div key={pkg.id} className="card flex flex-col">
              <h2 className="text-xl font-bold mb-1">{pkg.name}</h2>
              {pkg.description && <p className="text-sm text-muted mb-4">{pkg.description}</p>}
              <div className="mb-6">
                <span className="text-3xl font-extrabold">
                  {formatMoney(pkg.price_cents, pkg.currency.toUpperCase())}
                </span>
                <p className="text-sm text-muted mt-1">
                  {pkg.session_count} session{pkg.session_count > 1 ? "s" : ""}
                </p>
              </div>
              <Link href={`/personal-training/buy/${pkg.id}`} className="btn-primary mt-auto">
                Buy {pkg.name}
              </Link>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
