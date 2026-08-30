import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refer a Friend",
  description: "Refer a friend to Sangmorakot WA Muay Thai and you both get rewarded.",
};

export default function ReferPage() {
  return (
    <div className="container-page py-16 max-w-xl">
      <h1 className="text-4xl font-extrabold mb-4">Refer a Friend</h1>
      <p className="text-muted mb-10">
        Training is always better with a mate. Bring a friend along and you&rsquo;ll both be
        rewarded.
      </p>

      <div className="card space-y-6">
        <div>
          <p className="font-bold text-gold mb-1">1. Bring them in</p>
          <p className="text-muted text-sm">
            Have your friend mention your name when they come in for their free first class, or
            get them to tell us in their{" "}
            <Link href="/contact" className="text-gold hover:underline">
              contact form
            </Link>{" "}
            message.
          </p>
        </div>
        <div>
          <p className="font-bold text-gold mb-1">2. They join up</p>
          <p className="text-muted text-sm">
            Once they sign up for a{" "}
            <Link href="/membership" className="text-gold hover:underline">
              membership
            </Link>
            , we&rsquo;ll know it was your referral.
          </p>
        </div>
        <div>
          <p className="font-bold text-gold mb-1">3. You both get rewarded</p>
          <p className="text-muted text-sm">
            Speak to a coach or reach out via{" "}
            <Link href="/contact" className="text-gold hover:underline">
              contact us
            </Link>{" "}
            for current referral rewards — we regularly run offers for both new and existing
            members.
          </p>
        </div>
      </div>

      <p className="text-sm text-muted mt-8">
        Questions about the referral program? Email {site.email} or ask a coach at the gym.
      </p>
    </div>
  );
}
