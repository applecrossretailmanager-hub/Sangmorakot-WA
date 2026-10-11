import Link from "next/link";
import Image from "next/image";
import { getCurrentProfile } from "@/lib/auth";
import { site } from "@/lib/site";
import { SignOutButton } from "./sign-out-button";
import { MobileNav } from "./mobile-nav";

const links = [
  { href: "/", label: "Home" },
  { href: "/membership", label: "Membership" },
  { href: "/classes", label: "Classes" },
  { href: "/personal-training", label: "Personal Training" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur relative">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-wide">
          <Image
            src="/logo.jpg"
            alt={site.name}
            width={48}
            height={48}
            className="h-12 w-12 rounded-full"
            priority
          />
          <span className="hidden sm:inline text-gold text-lg leading-tight">
            Sangmorakot WA
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-muted">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {profile ? (
            <>
              {profile.role === "admin" && (
                <Link
                  href="/admin"
                  className="hidden sm:inline text-sm text-muted hover:text-foreground"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/account"
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:border-gold hover:text-gold transition-colors"
              >
                My Account
              </Link>
              <SignOutButton className="hidden sm:inline text-sm text-muted hover:text-foreground transition-colors" />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline text-sm text-muted hover:text-foreground"
              >
                Log in
              </Link>
              <Link
                href="/membership"
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
              >
                Join Now
              </Link>
            </>
          )}
          <MobileNav links={links} profile={profile ? { role: profile.role } : null} />
        </div>
      </div>
      <span className="sr-only">{site.name}</span>
    </header>
  );
}
