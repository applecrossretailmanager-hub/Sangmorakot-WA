import type { Metadata } from "next";
import { site } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "About" };
export const revalidate = 0;

const FAQS = [
  {
    q: "Do I need any experience?",
    a: "None at all. Most of our members start with zero background in Muay Thai — our coaches will walk you through the basics in your first class and build from there.",
  },
  {
    q: "What should I bring / wear?",
    a: "Comfortable workout clothes (shorts or leggings, a t-shirt) and a water bottle. Hand wraps and gloves are available to borrow for your first few sessions — you don't need to buy gear straight away.",
  },
  {
    q: "Do I need to book a class in advance?",
    a: "For your first visit, just come along — no booking required. Once you're a member, you can browse the timetable and reserve a spot online if you'd like to guarantee your place, especially for popular time slots.",
  },
  {
    q: "What's a typical first class like?",
    a: "A warm-up, pad and bag work to learn the fundamentals (jab, cross, kick, knee, clinch basics), and a cool-down. It's structured so beginners and experienced members can train side by side.",
  },
  {
    q: "Is Muay Thai good for fitness, or is it just for fighting?",
    a: "The large majority of our members train purely for fitness, strength, and stress relief — no interest in competing. It's a full-body workout that builds real skill along the way.",
  },
];

export default async function AboutPage() {
  const supabase = await createClient();
  const { data: trainers } = await supabase
    .from("pt_trainers")
    .select("*")
    .eq("active", true);

  return (
    <div className="container-page py-16 max-w-3xl">
      <h1 className="text-4xl font-extrabold mb-6">About {site.shortName}</h1>
      <div className="space-y-4 text-muted leading-relaxed mb-16">
        <p>
          {site.name} is a Muay Thai gym built around traditional coaching, a strong
          training community, and a genuine love of the art. Whether you&rsquo;re here for
          fitness, self-defence, or to step into the ring, our coaches will meet you where
          you&rsquo;re at.
        </p>
        <p>
          We run group classes throughout the week alongside one-on-one personal training,
          and keep membership simple: pick a plan, pay by card or cash, and start training.
        </p>
      </div>

      {!!trainers?.length && (
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Meet the Coaches</h2>
          <div className="grid sm:grid-cols-2 gap-6">
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
                  <p className="font-bold text-gold">{t.name}</p>
                  {t.bio && <p className="text-sm text-muted mt-1">{t.bio}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="card">
              <summary className="cursor-pointer font-medium">{f.q}</summary>
              <p className="text-sm text-muted mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
