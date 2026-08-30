import Link from "next/link";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function Home() {
  const supabase = await createClient();
  const { data: testimonials } = await supabase
    .from("testimonials")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  return (
    <div>
      <section className="border-b border-border bg-gradient-to-b from-surface to-background">
        <div className="container-page py-24 md:py-32 text-center">
          <p className="text-gold uppercase tracking-[0.3em] text-xs font-medium mb-4">
            {site.tagline}
          </p>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Train Muay Thai at <span className="text-primary">Sangmorakot</span>{" "}
            <span className="text-gold">WA</span>
          </h1>
          <p className="max-w-xl mx-auto text-muted text-lg mb-10">
            Group classes, memberships, and one-on-one personal training for every level —
            from your first pad session to fight camp.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/membership" className="btn-primary text-base px-6 py-3">
              View Membership Plans
            </Link>
            <Link href="/personal-training" className="btn-outline text-base px-6 py-3">
              Book Personal Training
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-gold/10">
        <div className="container-page py-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
          <p className="font-medium">
            <span className="text-gold">New here?</span> Your first class is free — no
            experience necessary, just come along.
          </p>
          <Link href="/classes" className="text-sm text-gold hover:underline whitespace-nowrap">
            See class times →
          </Link>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="grid md:grid-cols-3 gap-6">
          <Feature
            href="/classes"
            title="Group Classes"
            body="Authentic Muay Thai coaching for beginners through to competitors, every day of the week."
          />
          <Feature
            href="/personal-training"
            title="Personal Training"
            body="One-on-one sessions with our coaches. Buy a session pack and book straight into their calendar."
          />
          <Feature
            href="/membership"
            title="Flexible Payment"
            body="Pay by card with automatic direct debit through Stripe, or pay cash in person at the gym."
          />
        </div>
      </section>

      {!!testimonials?.length && (
        <section className="container-page pb-20">
          <h2 className="text-2xl font-bold text-center mb-8">What Our Members Say</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.id} className="card">
                <p className="text-muted italic leading-relaxed mb-3">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-sm font-medium text-gold">— {t.name}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="container-page pb-24">
        <div className="card flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div>
            <h2 className="text-2xl font-bold mb-2">Ready to start training?</h2>
            <p className="text-muted">Pick a membership plan and join the gym today.</p>
          </div>
          <Link href="/membership" className="btn-primary whitespace-nowrap">
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}

function Feature({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="card block hover:border-gold transition-colors">
      <h3 className="font-bold text-lg mb-2 text-gold">{title}</h3>
      <p className="text-muted text-sm leading-relaxed">{body}</p>
    </Link>
  );
}
