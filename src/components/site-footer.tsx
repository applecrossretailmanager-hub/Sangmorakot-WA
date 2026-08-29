import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-24">
      <div className="container-page py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-muted">
        <p>
          © {new Date().getFullYear()} {site.name}. All rights reserved.
        </p>
        <div className="flex gap-6">
          <Link href="/membership" className="hover:text-foreground">
            Membership
          </Link>
          <Link href="/personal-training" className="hover:text-foreground">
            Personal Training
          </Link>
          <Link href="/contact" className="hover:text-foreground">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
