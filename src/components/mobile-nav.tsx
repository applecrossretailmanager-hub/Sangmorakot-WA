"use client";

import { useState } from "react";
import Link from "next/link";
import { SignOutButton } from "./sign-out-button";

type Profile = { role: string } | null;

export function MobileNav({
  links,
  profile,
}: {
  links: { href: string; label: string }[];
  profile: Profile;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <nav className="absolute inset-x-0 top-16 border-b border-border bg-background px-4 py-4 text-sm shadow-lg">
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-2.5 text-muted hover:bg-surface-2 hover:text-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-2 border-t border-border pt-2">
            {profile ? (
              <>
                {profile.role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-2 py-2.5 text-gold hover:bg-surface-2"
                  >
                    Admin
                  </Link>
                )}
                <SignOutButton className="block w-full rounded-md px-2 py-2.5 text-left text-muted hover:bg-surface-2 hover:text-foreground" />
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block rounded-md px-2 py-2.5 text-muted hover:bg-surface-2 hover:text-foreground"
              >
                Log in
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
