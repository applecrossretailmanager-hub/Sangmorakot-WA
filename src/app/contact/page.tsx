import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="container-page py-16 max-w-xl">
      <h1 className="text-4xl font-extrabold mb-6">Contact Us</h1>
      <div className="card space-y-4">
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
    </div>
  );
}
