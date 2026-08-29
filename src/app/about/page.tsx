import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="container-page py-16 max-w-3xl">
      <h1 className="text-4xl font-extrabold mb-6">About {site.shortName}</h1>
      <div className="space-y-4 text-muted leading-relaxed">
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
    </div>
  );
}
