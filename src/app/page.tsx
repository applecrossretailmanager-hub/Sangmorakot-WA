import Link from "next/link";
import Image from "next/image";
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
      <section className="relative overflow-hidden border-b border-border">
        <Image
          src="/hero-fight.jpg"
          alt=""
          fill
          priority
          className="object-cover object-[center_30%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background from-10% via-background/90 via-55% to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
        <div className="relative container-page py-20 md:py-32">
          <div className="max-w-xl">
            <p className="text-gold uppercase tracking-[0.3em] text-xs font-medium mb-4">
              {site.tagline}
            </p>
            <h1 className="font-display uppercase leading-[0.95] tracking-tight text-5xl md:text-7xl mb-6">
              Train Muay Thai
              <br />
              at <span className="text-primary-text">Sangmorakot</span>{" "}
              <span className="text-gold">WA</span>
            </h1>
            <p className="text-muted text-lg mb-10">
              Group classes, memberships, and one-on-one personal training for every level —
              from your first pad session to fight camp.
            </p>
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <Link href="/classes" className="btn-primary text-base px-6 py-3">
                Claim My Free Class →
              </Link>
              <Link href="/membership" className="btn-outline text-base px-6 py-3">
                View Membership Plans
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-6 border-t border-white/10 text-sm text-muted">
              <span>
                <span className="text-gold font-semibold">All levels</span> welcome
              </span>
              <span>
                <span className="text-gold font-semibold">No experience</span> needed
              </span>
              <span>📍 <span className="text-gold font-semibold">Bibra Lake,</span> WA</span>
            </div>
          </div>

          <div className="mt-12 md:mt-0 md:absolute md:bottom-12 md:right-5 md:w-72 rounded-xl border border-white/15 bg-background/70 backdrop-blur-sm p-5 shadow-xl">
            <p className="text-gold uppercase tracking-[0.2em] text-[11px] font-semibold mb-2">
              New here?
            </p>
            <p className="font-display uppercase text-xl leading-tight mb-2">
              Your first class is free
            </p>
            <p className="text-sm text-muted mb-4">
              No experience, no contract — just come along and see what we&rsquo;re about.
            </p>
            <Link href="/classes" className="text-sm text-gold hover:underline font-medium">
              See class times →
            </Link>
          </div>
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
            title="Flexible Memberships"
            body="Casual drop-ins, unlimited weekly or monthly, and multi-month options — pick what suits your training."
          />
        </div>
      </section>

      <section className="border-t border-border bg-surface/50">
        <div className="container-page py-20">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <p className="text-gold uppercase tracking-[0.3em] text-xs font-medium mb-3">
              What We Stand On
            </p>
            <h2 className="font-display uppercase text-3xl md:text-4xl tracking-tight">
              Our Values
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <ValueCard
              number="01"
              title="Respect"
              body="For your coaches, your training partners, and the art itself. Every round is earned, not given."
            />
            <ValueCard
              number="02"
              title="Discipline"
              body="Show up, put in the work, and the progress follows. No shortcuts, no egos on the mats."
            />
            <ValueCard
              number="03"
              title="Community"
              body="Train alongside people who push you and have your back — beginners and fighters, side by side."
            />
          </div>
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

function ValueCard({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="card">
      <p className="text-xs text-primary-text font-medium mb-3">/{number}</p>
      <h3 className="font-display uppercase text-2xl tracking-tight text-gold mb-2">{title}</h3>
      <p className="text-muted text-sm leading-relaxed">{body}</p>
    </div>
  );
}
