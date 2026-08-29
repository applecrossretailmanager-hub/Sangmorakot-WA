import Link from "next/link";
import { site } from "@/lib/site";

export default function Home() {
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

      <section className="container-page py-20">
        <div className="grid md:grid-cols-3 gap-6">
          <Feature
            title="Group Classes"
            body="Authentic Muay Thai coaching for beginners through to competitors, every day of the week."
          />
          <Feature
            title="Personal Training"
            body="One-on-one sessions with our coaches. Buy a session pack and book straight into their calendar."
          />
          <Feature
            title="Flexible Payment"
            body="Pay by card with automatic direct debit through Stripe, or pay cash in person at the gym."
          />
        </div>
      </section>

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

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <h3 className="font-bold text-lg mb-2 text-gold">{title}</h3>
      <p className="text-muted text-sm leading-relaxed">{body}</p>
    </div>
  );
}
