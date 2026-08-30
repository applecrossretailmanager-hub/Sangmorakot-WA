import type { Metadata } from "next";
import { site } from "@/lib/site";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Sangmorakot WA Muay Thai — questions about classes, membership, or personal training.",
};

export default function ContactPage() {
  return (
    <div className="container-page py-16 max-w-xl">
      <h1 className="font-display uppercase text-4xl md:text-5xl tracking-tight mb-6">
        Contact Us
      </h1>

      <div className="card space-y-4 mb-8">
        <div>
          <p className="text-sm text-muted">Email</p>
          <p className="font-medium">{site.email}</p>
        </div>
        <div>
          <p className="text-sm text-muted">Prefer to pay cash?</p>
          <p className="text-muted">
            No problem — sign up online and choose &ldquo;Pay cash at the gym&rdquo; at
            checkout, or just come in and see us on the mats.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4">Send us a message</h2>
      <ContactForm />
    </div>
  );
}
